/*
 * CS336 A2 · 第 5 章：FlashAttention-2 的 PyTorch 版前向
 * flash_attention.py：autograd.Function，分块 + 在线 softmax，保存 L；反向先留空。
 * test_flash.py：和 model.py 里的标准注意力比较输出。
 */
(function (root) {
  'use strict';

  const { ref } = root.LessonKit;
  const { trace } = root.A2;

  root.Catalog.addChapter('cs336-a2', {
    id: 'a2-flash-pytorch',
    group: 'FlashAttention-2',
    label: 'PyTorch',
    title: 'PyTorch 版前向',
    summary: '先用纯 PyTorch 把分块和在线 softmax 写对：外层一块 Q，内层一块块读 K、V，最后存下输出和每行的 logsumexp。',
    files: ['flash_attention.py', 'test_flash.py'],
    docName: '前置知识.md',
    steps: [
      /* ============================================================ 前置知识 */
      {
        section: '前置知识',
        title: '自己定义前向和反向：autograd.Function',
        doc: [
          ref('torch.autograd.Function', 'autograd.html#function', 'Base class to create custom autograd.Function.', '用来创建自定义 autograd.Function 的基类。'),
          '平时写模型，只写前向，反向由 PyTorch 根据前向里的每一步自动推出来。FlashAttention 不一样：我们不想让 PyTorch 记住前向里那一堆分块的中间结果，而要自己决定反向传播怎么算、需要存什么。',
          '办法是继承 `torch.autograd.Function`，写两个静态方法：',
          {
            table: {
              head: ['方法', '做什么'],
              rows: [
                ['`forward(ctx, q, k, v, is_causal)`', '算出输出。用 `ctx.save_for_backward(...)` 存下反向要用的张量'],
                ['`backward(ctx, do)`', '收到输出的梯度 `do`，返回每个输入的梯度，个数和 forward 的输入一一对应'],
              ],
            },
          },
          '使用时不直接调用 forward，而是写 `FlashAttentionPyTorch.apply(q, k, v, is_causal)`，PyTorch 会把它接进自动求导的图里。作业的测试接口就是要你返回这样一个类。',
        ],
      },
      {
        section: '前置知识',
        title: '要写出来的计算',
        doc: [
          '输入 q 的形状是 `(batch, n_q, d)`，k、v 是 `(batch, n_k, d)`。Q 每块 16 行，K、V 每块 16 行（作业要求块至少 16×16）。对每一块 Q（记作 Qᵢ）：',
          {
            list: [
              '初始化：`m = −∞`，`l = 0`，`acc = 0`。',
              '对每一块 Kⱼ、Vⱼ：算分数 `S = Qᵢ Kⱼᵀ / √d`；因果时把「键在查询后面」的位置设成 −∞；然后按在线 softmax 更新 m、l、acc。',
              '读完所有块：`Oᵢ = acc / l`，`Lᵢ = m + log(l)`。',
            ],
          },
          { viz: { kind: 'array', title: '在线 softmax（回顾）', frames: trace.onlineSoftmax([1, 3, 2, 0.5, 4, 1.5], 2) } },
          '最后存下 L、q、k、v、o，反向传播会用到。这一章先把反向留空，第 7 章再写。',
        ],
      },

      /* ================================================================ 写代码 */
      {
        section: '写代码',
        title: '类的外壳，和要用到的尺寸',
        file: 'flash_attention.py',
        say: ['新建 `flash_attention.py`。先写出 autograd.Function 的外壳，再在 forward 开头把要用的尺寸都准备好：块大小、序列长度、缩放系数，以及装输出 o 和 L 的空张量。'],
        ops: [
          { type: 'import math\n\nimport torch', note: '缩放系数要开平方，用 `math`。' },
          { type: '\n\n\nclass FlashAttentionPyTorch(torch.autograd.Function):', note: '继承 `torch.autograd.Function`，前向和反向都由我们自己写。' },
          { type: '\n    @staticmethod\n    def forward(ctx, q, k, v, is_causal=False):', note: 'forward 必须是静态方法。第一个参数 `ctx` 是 PyTorch 传进来的「上下文」，用来把东西留给反向。' },
          { type: '\n        q_tile, k_tile = 16, 16', note: 'Q 和 K、V 每块各 16 行。' },
          { type: '\n        n_q, d = q.shape[-2:]\n        n_k = k.shape[-2]', note: '取出查询的个数、向量维度和键的个数。用 `shape[-2:]` 从后往前取，前面有几维批次都不影响。' },
          { type: '\n        scale = 1 / math.sqrt(d)', note: '分数要除以 √d，先算好倒数，后面乘它。' },
          { type: '\n        o = torch.empty_like(q)', note: '输出和 q 一样形状，先占好位置，每算完一块 Q 就填进去。' },
          { type: '\n        L = torch.empty(q.shape[:-1], dtype=torch.float32, device=q.device)', note: '每一行一个 logsumexp，形状是 q 去掉最后一维。用 fp32 存，它要参与反向的指数运算。' },
        ],
      },
      {
        section: '写代码',
        title: '外层：一块 Q，三个累加量',
        say: ['外层循环每次取 16 行查询。这几行各自需要三样东西：目前的最大值 m、分母 l、输出的累加值 acc，一开始分别是 −∞、0、0。'],
        ops: [
          { type: '\n\n        for i in range(0, n_q, q_tile):', note: 'i 是这一块 Q 的起始行，每次跳 16 行。' },
          { type: '\n            qi = q[..., i:i + q_tile, :]', note: '切出这一块查询。`...` 表示前面的批次维度全要；切片超出末尾也没关系，会自动截断。' },
          { type: '\n            m = torch.full(qi.shape[:-1], float("-inf"), device=q.device)', note: '每一行目前的最大值，一开始是负无穷：还没看到任何分数。' },
          { type: '\n            l = torch.zeros(qi.shape[:-1], device=q.device)', note: '每一行的分母，一开始是 0。' },
          { type: '\n            acc = torch.zeros_like(qi)', note: '每一行输出的累加值，和这块 q 一样形状，一开始全是 0。' },
        ],
      },
      {
        section: '写代码',
        title: '内层：一块 K、V，算分数',
        say: ['内层循环把 K、V 一块一块读进来，先算出这一小块分数。因果注意力时，键的下标比查询的下标大的位置要遮住。'],
        ops: [
          { type: '\n            for j in range(0, n_k, k_tile):', note: 'j 是这一块键的起始位置。' },
          { type: '\n                kj = k[..., j:j + k_tile, :]\n                vj = v[..., j:j + k_tile, :]', note: '切出这一块键和值。' },
          { type: '\n                s = qi @ kj.transpose(-2, -1) * scale', note: '这一小块分数：(16, d) 乘 (d, 16)，得到 16 × 16，而不是整个 n × n。' },
          { type: '\n                if is_causal:', note: '因果注意力：每个查询只能看见它自己和前面的键。' },
          { type: '\n                    rows = torch.arange(i, i + qi.shape[-2], device=q.device)\n                    cols = torch.arange(j, j + kj.shape[-2], device=q.device)', note: '这一小块在整个矩阵里对应的行号和列号——要用真实的位置比较，不能用块内的 0 到 15。' },
          { type: '\n                    s = s.masked_fill(rows[:, None] < cols[None, :], float("-inf"))', note: '行号比列号小，就是「键在查询后面」，填成负无穷，softmax 以后就是 0。`[:, None]` 和 `[None, :]` 让两个向量广播成一个 16 × 16 的比较。' },
        ],
      },
      {
        section: '写代码',
        title: '在线 softmax 的更新',
        say: ['分数有了，按在线 softmax 的三步更新 m、l、acc：先求新的最大值，旧的 l 和 acc 乘上修正系数，再加上这一块的贡献。'],
        ops: [
          { type: '\n                m_new = torch.maximum(m, s.amax(dim=-1))', note: '新的最大值：旧的最大值和这一块每行的最大值，逐个取大的。' },
          { type: '\n                p = torch.exp(s - m_new[..., None])', note: '按新的最大值算 e^(s − m)。减去最大值以后指数最大是 1，不会溢出。`[..., None]` 给 m 补一维，才能和 16 列的 s 相减。' },
          { type: '\n                alpha = torch.exp(m - m_new)', note: '修正系数：旧的 l 和 acc 是按旧的最大值算的，乘上 e^(m − m_new) 就换成了新的。第一块时 m 是 −∞，系数是 0，正好把初始值清掉。' },
          { type: '\n                l = alpha * l + p.sum(dim=-1)', note: '分母：修正旧的，再加上这一块的和。' },
          { type: '\n                acc = alpha[..., None] * acc + p @ vj', note: '输出的累加值：修正旧的，再加上这一块的 P̃ 乘 V。' },
          { type: '\n                m = m_new', note: '最大值更新完，进入下一块。' },
        ],
      },
      {
        section: '写代码',
        title: '一块 Q 算完：写出 O 和 L',
        say: ['K、V 都读完了，这几行的结果就定了：输出是 acc 除以分母，L 是 m 加上 log l。全部 Q 块都算完以后，把反向要用的张量存进 ctx。'],
        ops: [
          { type: '\n            o[..., i:i + q_tile, :] = acc / l[..., None]', note: '除以分母，才是真正的 softmax 加权平均。写回这一块在输出里的位置。' },
          { type: '\n            L[..., i:i + q_tile] = m + torch.log(l)', note: '这几行的 logsumexp：log Σ e^s = m + log Σ e^(s − m) = m + log l。' },
          { type: '\n\n        ctx.save_for_backward(L, q, k, v, o)', note: '反向要用的东西：每行的 L，以及 q、k、v、o。注意没有 n × n 的 P。' },
          { type: '\n        ctx.is_causal = is_causal\n        return o', note: '是不是因果注意力不是张量，直接挂在 ctx 上。返回输出。' },
          { type: '\n\n    @staticmethod\n    def backward(ctx, do):\n        raise NotImplementedError', note: '反向先留空，第 7 章再写。现在只能做前向，调用反向会直接报错。' },
        ],
      },

      /* ============================================================== 运行验证 */
      {
        section: '运行验证',
        title: '和标准注意力比较',
        file: 'test_flash.py',
        say: [
          ref('torch.allclose(input, other, rtol=1e-05, atol=1e-08, equal_nan=False)', 'generated/torch.allclose.html', 'This function checks if input and other satisfy the condition: ∣input − other∣ ≤ atol + rtol × ∣other∣ elementwise, for all elements of input and other.', '检查 input 和 other 是否每个元素都满足 ∣input − other∣ ≤ atol + rtol × ∣other∣。'),
          '新建 `test_flash.py`：随机造 q、k、v，分别用 FlashAttention 和 `model.py` 里的 `attention` 算一遍，看两者是否几乎相等。分块改变了浮点运算的顺序，结果不会逐位相同，允许 10<sup>-5</sup> 的误差。',
        ],
        ops: [
          { type: 'import torch\n\nfrom flash_attention import FlashAttentionPyTorch\nfrom model import attention', note: '要比较的两个东西：刚写的 FlashAttention，和 model.py 里的标准注意力。' },
          { type: '\n\ntorch.manual_seed(0)\nq, k, v = (torch.randn(2, 64, 32) for _ in range(3))', note: '批 2，序列长 64（正好 4 块），每个向量 32 维。' },
          { type: '\nfor causal in (False, True):', note: '普通注意力和因果注意力都要验证。' },
          { type: '\n    out = FlashAttentionPyTorch.apply(q, k, v, causal)\n    ref = attention(q, k, v, is_causal=causal)', note: '用 `.apply` 调用自定义的 Function；标准答案用 model.py 里的写法。' },
          { type: '\n    print("causal" if causal else "full  ", torch.allclose(out, ref, atol=1e-5))', note: '误差在 10⁻⁵ 以内就算一致。名字补齐成一样宽，两行能对齐。' },
          { pause: 500 },
          { run: 'python test_flash.py', output: ['full   True', 'causal True'] },
        ],
      },

      /* ================================================================ 小结 */
      {
        section: '小结',
        title: '前向写对了',
        say: [
          '分块加在线 softmax，结果和一次算完整个矩阵一样。这个 PyTorch 版本并不快——两层 Python 循环、每块都是一次小的矩阵乘法——它的意义是先把算法写对，作为下一章 Triton kernel 的参照。',
          '下一章把同样的计算写成 Triton kernel：外层的循环交给 GPU，每个程序实例负责一块 Q。',
        ],
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
