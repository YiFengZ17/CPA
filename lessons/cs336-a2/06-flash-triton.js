/*
 * CS336 A2 · 第 6 章：FlashAttention-2 的 Triton 版前向
 * cs336_systems/flash_triton.py：一个 Triton kernel，每个程序实例负责一块 Q；外面包一层 autograd.Function。
 * 没有 GPU 时用 Triton 的解释器模式在 CPU 上运行。官方的 Triton 测试没有 GPU 会跳过，
 * 所以在文件末尾写一段自检，和 cs336_basics 的 scaled_dot_product_attention 比较；adapters.py 照样接上。
 */
(function (root) {
  'use strict';

  const { tritondoc } = root.LessonKit;
  const { trace } = root.A2;

  root.Catalog.addChapter('cs336-a2', {
    id: 'a2-flash-triton',
    group: 'FlashAttention-2',
    label: 'Triton',
    title: 'Triton 版前向',
    summary: '把上一章的外层循环交给 GPU：每个程序实例负责一块 Q，自己从显存里读块、在片上算完、只把结果写回去。',
    files: ['cs336_systems/flash_triton.py', 'tests/adapters.py'],
    docName: '前置知识.md',
    steps: [
      /* ============================================================ 前置知识 */
      {
        section: '前置知识',
        title: 'Triton：按「块」写 GPU 程序',
        doc: [
          tritondoc('triton.jit', 'generated/triton.jit.html', 'Decorator for JIT-compiling a function using the Triton compiler.', '用 Triton 编译器即时编译一个函数的装饰器。'),
          'CUDA 里要考虑每一个线程做什么；Triton 往上抽象了一层：你写的函数描述**一个程序实例**怎么处理**一块数据**，块里的元素怎么分给线程、怎么用上片上存储，交给编译器。',
          '启动 kernel 时给一个**网格**（grid），比如 `(Q 的块数, batch)`，就会同时启动这么多个程序实例。每个实例用 `tl.program_id(轴)` 知道自己是第几个，据此算出自己该处理哪一块。',
          {
            table: {
              head: ['上一章的 PyTorch 版', '这一章的 Triton 版'],
              rows: [
                ['外层 `for i in range(0, n_q, 16)`', '网格的第 0 维：每块 Q 一个程序实例，同时运行'],
                ['批次维度', '网格的第 1 维'],
                ['内层 `for j in range(0, n_k, 16)`', '实例内部的循环，一块块读 K、V'],
                ['`q[..., i:i+16, :]` 切片', '用指针加偏移算出地址，`tl.load` 读进来'],
              ],
            },
          },
        ],
      },
      {
        section: '前置知识',
        title: '指针、步长和读写',
        doc: [
          tritondoc('triton.language.program_id(axis)', 'generated/triton.language.program_id.html', 'Returns the id of the current program instance along the given axis.', '返回当前程序实例在给定轴上的编号。'),
          tritondoc('triton.language.load(pointer, mask=None, other=None, …)', 'generated/triton.language.load.html', 'Return a tensor of data whose values are loaded from memory at location defined by pointer:', '返回一个张量，它的值从 pointer 指定的内存位置读出：'),
          tritondoc('triton.language.dot(input, other, …)', 'generated/triton.language.dot.html', 'Returns the matrix product of two blocks.', '返回两个块的矩阵乘积。'),
          'kernel 拿到的张量只是一个**指向第一个元素的指针**。要读第 b 批、第 r 行、第 c 列，得自己算地址：`指针 + b × 批的步长 + r × 行的步长 + c`。步长（stride）就是在这一维上前进一格要跳过多少个元素，由外面用 `q.stride(0)`、`q.stride(1)` 传进来。',
          '把行号写成一列、列号写成一行，`rows[:, None] * 行步长 + dims[None, :]` 广播出一整块地址，一次 `tl.load` 就读进 16 × d 个数。为了简单，我们假定序列长度是 16 的倍数，不用处理越界；作业里的完整版本要用 `mask` 把越界的位置遮掉。',
          '标成 `tl.constexpr` 的参数（块大小、向量维度、是否因果）在编译时就是确定的常数，编译器会为每一组取值单独生成代码。',
        ],
      },
      {
        section: '前置知识',
        title: '没有 GPU 时：解释器模式',
        doc: [
          'Triton 提供一个**解释器模式**：设置环境变量 `TRITON_INTERPRET=1`，`@triton.jit` 的函数就不再编译成 GPU 代码，而是在 CPU 上逐个程序实例地模拟执行。速度很慢，但每一次读写、每一次 `tl.dot` 的结果都是真的，正好用来检查 kernel 写得对不对。',
          '这个变量必须在 `import triton` 之前设好。我们在文件开头判断：没有 GPU 才打开它。同一份代码放到有 GPU 的机器上，什么都不用改。',
          { viz: { kind: 'grid', title: '每个程序实例负责一行块（因果）', frames: trace.tiles(4, 4, true) } },
        ],
      },

      /* ================================================================ 写代码 */
      {
        section: '写代码',
        title: '导入：没有 GPU 就用解释器',
        file: 'cs336_systems/flash_triton.py',
        say: ['在 `cs336_systems/` 里新建 `flash_triton.py`。要先决定 Triton 怎么运行，再导入它。反向传播先借用上一章 PyTorch 版的（第 7 章会把它写好），所以也把它导入进来。'],
        ops: [
          { type: 'import math\nimport os\n\nimport torch', note: '`os` 用来设环境变量。' },
          { type: '\n\nif not torch.cuda.is_available():\n    os.environ.setdefault("TRITON_INTERPRET", "1")', note: '没有 GPU 时打开解释器模式。用 `setdefault`：如果已经设过这个变量，就尊重原来的设置。' },
          { type: '\n\nimport triton\nimport triton.language as tl', note: '环境变量设好之后才导入 Triton。`tl` 里是写 kernel 用的各种操作。' },
          { type: '\n\nfrom cs336_systems.flash_attention import FlashAttentionPyTorch', note: '反向传播借用 PyTorch 版的实现。它在同一个包里，按包名导入。' },
        ],
      },
      {
        section: '写代码',
        title: 'kernel 的参数',
        say: ['kernel 拿到的都是指针和整数：五个张量（Q、K、V、输出 O、logsumexp L）的指针，它们各自的步长，键的个数，缩放系数，以及几个编译期常数。'],
        ops: [
          { type: '\n\n\n@triton.jit\ndef flash_fwd_kernel(Q, K, V, O, L,', note: '`@triton.jit` 把下面的函数交给 Triton 编译。前五个参数是五个张量的起始指针。' },
          { type: '\n                     stride_qb, stride_qn, stride_kb, stride_kn,\n                     stride_vb, stride_vn, stride_ob, stride_on, stride_lb,', note: '每个张量在「批」和「行」这两维上的步长。最后一维（向量的 d 个数）是连续的，步长是 1，不用传。L 是二维的 (batch, n)，只要批的步长。' },
          { type: '\n                     N_KEYS, scale,', note: '键的个数决定内层循环几次；缩放系数 1/√d。' },
          { type: '\n                     D: tl.constexpr, Q_TILE: tl.constexpr, K_TILE: tl.constexpr,\n                     IS_CAUSAL: tl.constexpr):', note: '向量维度、两个块大小、是否因果：编译期就确定的常数。`tl.arange` 的长度必须是编译期常数，所以它们非标成 constexpr 不可。' },
        ],
      },
      {
        section: '写代码',
        title: '我是谁：找到自己的那块 Q',
        say: ['每个程序实例先问自己的编号：网格第 0 维是第几块 Q，第 1 维是第几批。据此算出要处理的行号，把这一块 Q 读进来，再初始化三个累加量。'],
        ops: [
          { type: '\n    tile = tl.program_id(0)\n    b = tl.program_id(1)', note: '我负责第几块 Q、第几批。' },
          { type: '\n    rows = tile * Q_TILE + tl.arange(0, Q_TILE)', note: '这一块的 16 个行号：起点加上 0 到 15。' },
          { type: '\n    dims = tl.arange(0, D)', note: '向量的 d 个列号。' },
          { type: '\n    q = tl.load(Q + b * stride_qb + rows[:, None] * stride_qn + dims[None, :])', note: '算出这一块每个元素的地址：起点 + 批的偏移 + 行的偏移 + 列号。行号写成一列、列号写成一行，广播成 16 × d 个地址，一次读进来。' },
          { type: '\n\n    m = tl.full((Q_TILE,), float("-inf"), dtype=tl.float32)\n    l = tl.zeros((Q_TILE,), dtype=tl.float32)\n    acc = tl.zeros((Q_TILE, D), dtype=tl.float32)', note: '和 PyTorch 版一样的三个累加量：每行的最大值、分母、输出累加值。都用 fp32。' },
        ],
      },
      {
        section: '写代码',
        title: '内层循环：读 K、V，算分数',
        say: ['内层循环一块块读 K 和 V，和 Q 块做一次矩阵乘法得到 16 × 16 的分数。因果时用 `tl.where` 把键在查询后面的位置换成 −∞。'],
        ops: [
          { type: '\n    for j in range(0, N_KEYS, K_TILE):', note: 'Triton 的 kernel 里可以写普通的 for 循环，j 是这一块键的起点。' },
          { type: '\n        keys = j + tl.arange(0, K_TILE)', note: '这一块的 16 个键的位置。' },
          { type: '\n        k = tl.load(K + b * stride_kb + keys[:, None] * stride_kn + dims[None, :])\n        v = tl.load(V + b * stride_vb + keys[:, None] * stride_vn + dims[None, :])', note: '和读 Q 一样的算地址方法，读进这一块的 K 和 V。' },
          { type: '\n        s = tl.dot(q, tl.trans(k)) * scale', note: '16 × d 乘 d × 16。`tl.trans` 转置，`tl.dot` 在 GPU 上会用到张量核心。' },
          { type: '\n        if IS_CAUSAL:\n            s = tl.where(rows[:, None] >= keys[None, :], s, float("-inf"))', note: '查询的位置不小于键的位置才看得见，否则换成负无穷。`IS_CAUSAL` 是编译期常数，不因果时这段代码根本不会被生成。' },
        ],
      },
      {
        section: '写代码',
        title: '在线 softmax 更新，写回结果',
        say: ['更新的公式和 PyTorch 版一字不差，只是函数换成了 `tl` 里的。循环结束后，把输出和 L 写回显存——整个 kernel 里，只有这两处写显存。'],
        ops: [
          { type: '\n        m_new = tl.maximum(m, tl.max(s, axis=1))', note: '新的最大值：`tl.max(s, axis=1)` 是每行的最大值。' },
          { type: '\n        p = tl.exp(s - m_new[:, None])\n        alpha = tl.exp(m - m_new)', note: '按新最大值算的指数，以及旧值的修正系数。' },
          { type: '\n        l = alpha * l + tl.sum(p, axis=1)\n        acc = acc * alpha[:, None] + tl.dot(p, v)', note: '修正旧的分母和累加值，再加上这一块的贡献。' },
          { type: '\n        m = m_new', note: '进入下一块。' },
          { type: '\n\n    tl.store(O + b * stride_ob + rows[:, None] * stride_on + dims[None, :], acc / l[:, None])', note: '这一块的输出写回显存，地址的算法和读 Q 时一样。' },
          { type: '\n    tl.store(L + b * stride_lb + rows, m + tl.log(l))', note: '每行的 logsumexp 写回 L，给反向传播用。' },
        ],
      },
      {
        section: '写代码',
        title: '包一层 autograd.Function',
        say: ['kernel 只是一个计算过程。外面还要包一层 autograd.Function：准备好输出张量，算出网格大小，启动 kernel，存下反向要用的东西。'],
        ops: [
          { type: '\n\n\nclass FlashAttentionTriton(torch.autograd.Function):\n    @staticmethod\n    def forward(ctx, q, k, v, is_causal=False):', note: '和 PyTorch 版一样的接口。' },
          { type: '\n        batch, n_q, d = q.shape\n        n_k = k.shape[1]', note: 'kernel 按三维 (batch, n, d) 写的，这里取出这三个尺寸。' },
          { type: '\n        o = torch.empty_like(q)\n        L = torch.empty((batch, n_q), dtype=torch.float32, device=q.device)', note: '输出和 L 的空张量，由 kernel 填。' },
          { type: '\n        grid = (triton.cdiv(n_q, 16), batch)', note: '网格：Q 的块数 × 批大小。`cdiv` 是向上取整的除法。' },
          { type: '\n        flash_fwd_kernel[grid](\n            q, k, v, o, L,', note: '用 `kernel[网格](参数…)` 启动。张量直接传进去，Triton 会把它们变成指针。' },
          { type: '\n            q.stride(0), q.stride(1), k.stride(0), k.stride(1),\n            v.stride(0), v.stride(1), o.stride(0), o.stride(1), L.stride(0),', note: '各张量的步长，顺序要和 kernel 的参数一一对应。' },
          { type: '\n            n_k, 1 / math.sqrt(d),\n            D=d, Q_TILE=16, K_TILE=16, IS_CAUSAL=is_causal,\n        )', note: '键的个数、缩放系数，以及几个编译期常数，用关键字传。' },
          { type: '\n        ctx.save_for_backward(L, q, k, v, o)\n        ctx.is_causal = is_causal\n        return o', note: '和 PyTorch 版存一样的东西，两个版本就能共用同一个反向。' },
          { type: '\n\n    @staticmethod\n    def backward(ctx, do):\n        return FlashAttentionPyTorch.backward(ctx, do)', note: '反向直接交给 PyTorch 版。它现在还会报错，第 7 章写好以后，这里自动就能用了。' },
        ],
      },

      /* ============================================================== 运行验证 */
      {
        section: '运行验证',
        title: '接口接上',
        file: 'tests/adapters.py',
        say: ['先在 `adapters.py` 里把 Triton 版也接上，和上一章一样，返回类本身。'],
        ops: [
          { replace: '    # For example: return MyTritonFlashAttentionAutogradFunctionClass\n    raise NotImplementedError', with: '    from cs336_systems.flash_triton import FlashAttentionTriton\n\n    return FlashAttentionTriton', note: '同样在函数里面导入。这一点在这里更重要：导入 `flash_triton` 会导入 Triton，只跑 DDP 测试时没必要。' },
        ],
      },
      {
        section: '运行验证',
        title: '官方测试要 GPU，先自己检查',
        file: 'cs336_systems/flash_triton.py',
        say: [
          '官方的 Triton 测试开头写着「没有 GPU 就跳过」（`pytest.mark.skipif`），在这台机器上不会真的运行。所以回到 `flash_triton.py`，在末尾加一段自检：直接运行这个文件时，和 A1 的 `scaled_dot_product_attention` 比较。',
          '尺寸照官方测试来：批 4、长 128、64 维。`scaled_dot_product_attention` 不认识「因果」这个开关，它要的是一个布尔掩码：True 的位置保留，False 的位置遮住。',
        ],
        ops: [
          { type: '\n\n\nif __name__ == "__main__":', note: '只有直接运行这个文件时才做检查；被 `adapters.py` 导入时不会执行。' },
          { type: '\n    from cs336_basics.model import scaled_dot_product_attention', note: '标准答案：A1 参考实现里的注意力，它会把整个 n × n 的分数矩阵算出来。' },
          { type: '\n\n    torch.manual_seed(0)\n    q, k, v = (torch.randn(4, 128, 64) for _ in range(3))', note: '和官方测试一样的尺寸：128 正好是 8 块。' },
          { type: '\n    mask = torch.ones(128, 128, dtype=torch.bool).tril()', note: '因果掩码：下三角是 True。第 i 个查询只能看见第 0 到 i 个键。' },
          { type: '\n    for is_causal in (False, True):', note: '普通注意力和因果注意力各比较一次。' },
          { type: '\n        o = FlashAttentionTriton.apply(q, k, v, is_causal)', note: '用 `.apply` 调用 Triton 版，在解释器里逐个程序实例地执行。' },
          { type: '\n        ref = scaled_dot_product_attention(q, k, v, mask if is_causal else None)', note: '普通注意力不传掩码。' },
          { type: '\n        print("causal" if is_causal else "full  ", torch.allclose(o, ref, atol=1e-3))', note: '分块改变了浮点运算的顺序，结果不会逐位相同。官方测试允许 10⁻²，这里取严一点的 10⁻³。' },
          { pause: 500 },
          { run: 'uv run python cs336_systems/flash_triton.py', output: ['full   True', 'causal True'] },
        ],
      },

      /* ================================================================ 小结 */
      {
        section: '小结',
        title: 'kernel 写对了',
        say: [
          'Triton 版和 PyTorch 版做的是同一件事，区别在于谁来安排：外层循环变成了同时运行的程序实例，每块数据从显存读一次，所有计算在片上完成，只有 O 和 L 写回显存。',
          '在 GPU 上，作业要你比较它和普通 PyTorch 注意力的速度：序列越长、FlashAttention 的优势越明显，长序列下普通版本甚至会因为放不下 n×n 的矩阵而直接报显存不足。',
          '下一章写反向传播：利用存下的 L，重新算出 P，不用存 n×n 的矩阵。',
        ],
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
