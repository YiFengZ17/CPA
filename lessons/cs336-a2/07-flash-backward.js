/*
 * CS336 A2 · 第 7 章：FlashAttention-2 的反向传播
 * 把 flash_attention.py 里留空的 backward 写出来：用 L 重算 P，再按公式求 dQ、dK、dV。
 * Triton 版的 backward 借用它，所以两个版本的梯度一起验证。
 */
(function (root) {
  'use strict';

  const { ref } = root.LessonKit;

  root.Catalog.addChapter('cs336-a2', {
    id: 'a2-flash-backward',
    group: 'FlashAttention-2',
    label: '反向',
    title: '反向传播：重算而不是存',
    summary: '用前向存下的 L 重新算出 P，再按链式法则依次求 dV、dP、dS、dQ、dK。中间的 D 让 softmax 的梯度只要一次逐元素运算。',
    files: ['flash_attention.py', 'test_flash.py'],
    docName: '前置知识.md',
    steps: [
      /* ============================================================ 前置知识 */
      {
        section: '前置知识',
        title: '从输出往回推',
        doc: [
          '前向是三步：`S = Q Kᵀ · c`（c = 1/√d），`P = softmax(S)`（按行），`O = P V`。反向传播拿到输出的梯度 `dO`，按相反的顺序往回推：',
          {
            table: {
              head: ['前向这一步', '反向得到'],
              rows: [
                ['`O = P V`', '`dV = Pᵀ dO`，`dP = dO Vᵀ`'],
                ['`P = softmax(S)`', '`dS = P ∘ (dP − D)`，其中 `Dᵢ = Σⱼ Pᵢⱼ dPᵢⱼ`'],
                ['`S = Q Kᵀ · c`', '`dQ = dS K · c`，`dK = dSᵀ Q · c`'],
              ],
            },
          },
          '第一行和第三行就是矩阵乘法的求导：`Y = A B` 时，`dA = dY Bᵀ`，`dB = Aᵀ dY`。中间的 softmax 要多想一步。',
        ],
      },
      {
        section: '前置知识',
        title: 'softmax 的梯度，和那个 D',
        doc: [
          '对一行来说，`Pⱼ = e^(Sⱼ) / Σₖ e^(Sₖ)`。改变 Sⱼ 会影响这一行所有的 P：自己变大，别人都变小。算出来是：',
          '`dSⱼ = Pⱼ (dPⱼ − Σₖ Pₖ dPₖ)`',
          '括号里减去的那个和，对一整行是同一个数，记作 D。直接按定义算它要先有 dP，还要一次逐行求和。有一个更省的算法：因为 `dP = dO Vᵀ`，`O = P V`，',
          '`D = Σₖ Pₖ dPₖ = Σₖ Pₖ (dO · Vₖ) = dO · (Σₖ Pₖ Vₖ) = dO · O`',
          '也就是 `D = rowsum(dO ∘ O)`：dO 和 O 逐个相乘再按行求和，两个都是 n × d 的小矩阵，和 n × n 的 P 无关。FlashAttention-2 正是这样算 D 的。',
        ],
      },
      {
        section: '前置知识',
        title: '用 L 重新算出 P',
        doc: [
          '反向需要 P，但前向没有存它。前向存了每行的 logsumexp `L`，于是：',
          '`P = e^(S − L)`',
          '只要用 Q、K 重新算一遍 S，减去 L 取指数，P 就回来了——和前向里那个 P 完全一样（因果时同样要先遮住）。',
          '作业允许反向不分块，直接在整个矩阵上算，再用 `torch.compile` 让它更快；FlashAttention-2 论文里的反向也是分块的，原理一样，只是 dK、dV 要按 K 块累加。我们写不分块的版本，公式最清楚。',
          ref('Tensor.backward / torch.autograd.grad', 'generated/torch.autograd.grad.html', 'Compute and return the sum of gradients of outputs with respect to the inputs.', '计算并返回输出对输入的梯度之和。'),
          '测试时用 `torch.autograd.grad` 分别求出两种实现的梯度，逐个比较。',
        ],
      },

      /* ================================================================ 写代码 */
      {
        section: '写代码',
        title: '取出存下的东西，重算分数',
        file: 'flash_attention.py',
        say: ['回到 `flash_attention.py`，把留空的 backward 写出来。第一件事：取出前向存下的张量，用 Q、K 重新算一遍分数矩阵，因果时照样遮住。'],
        ops: [
          { replace: '\n        raise NotImplementedError', with: '\n        L, q, k, v, o = ctx.saved_tensors', note: '把占位的那一行换掉。`saved_tensors` 按存进去的顺序取出来：L、q、k、v、o。' },
          { type: '\n        scale = 1 / math.sqrt(q.shape[-1])', note: '前向用过的缩放系数，求导时还要用到。' },
          { type: '\n        s = q @ k.transpose(-2, -1) * scale', note: '重算分数。这里不分块，一次算出整个矩阵——这是作业允许的写法，公式最清楚。' },
          { type: '\n        if ctx.is_causal:\n            n_q, n_k = s.shape[-2:]\n            mask = torch.ones(n_q, n_k, dtype=torch.bool, device=q.device).tril()\n            s = s.masked_fill(~mask, float("-inf"))', note: '因果时和前向一样，把右上角遮成负无穷。`tril` 取下三角，就是看得见的位置。' },
        ],
      },
      {
        section: '写代码',
        title: '用 L 恢复 P，再一路往回推',
        say: ['有了 S 和 L，P 就是 e^(S − L)。然后按表格的顺序：先求 dV 和 dP，再用 D 求出 dS，最后求 dQ 和 dK。'],
        ops: [
          { type: '\n        p = torch.exp(s - L[..., None])', note: '用存下的 logsumexp 恢复 softmax：e^(S − L) 就是 e^S 除以整行的 Σe^S。被遮住的位置是 e^(−∞) = 0。' },
          { type: '\n        dv = p.transpose(-2, -1) @ do', note: 'O = P V，所以 V 的梯度是 Pᵀ 乘 dO。' },
          { type: '\n        dp = do @ v.transpose(-2, -1)', note: 'P 的梯度是 dO 乘 Vᵀ。' },
          { type: '\n        D = (do * o).sum(dim=-1, keepdim=True)', note: 'D 用 dO 和 O 逐个相乘再按行求和，不用碰 n × n 的矩阵。保留维度，下一行才能和 dp 广播相减。' },
          { type: '\n        ds = p * (dp - D)', note: 'softmax 的梯度：P 乘以（dP 减去这一行的 D）。' },
          { type: '\n        dq = ds @ k * scale\n        dk = ds.transpose(-2, -1) @ q * scale', note: 'S = Q Kᵀ · c，所以 dQ = dS K · c，dK = dSᵀ Q · c。' },
          { type: '\n        return dq, dk, dv, None', note: 'forward 有四个输入：q、k、v、is_causal。返回的梯度个数要一样，is_causal 不是张量，给 None。' },
        ],
      },

      /* ============================================================== 运行验证 */
      {
        section: '运行验证',
        title: '输出和梯度一起比较',
        file: 'test_flash.py',
        say: ['改测试：q、k、v 要能求梯度；两种实现各算一次输出，再用 `torch.autograd.grad` 求出梯度，输出和三个梯度都要和标准注意力一致。Triton 版的反向借用的就是刚写的这个，所以两个版本都会通过——或者都不通过。'],
        ops: [
          { replace: 'torch.randn(2, 64, 32)', with: 'torch.randn(2, 64, 32, requires_grad=True)', note: '要对 q、k、v 求梯度，造的时候就打开 `requires_grad`。' },
          {
            replace: '        out = fn(q, k, v, causal)\n        ref = attention(q, k, v, is_causal=causal)\n        print(name, "causal" if causal else "full  ", torch.allclose(out, ref, atol=1e-5))',
            with: '        ref = attention(q, k, v, is_causal=causal)\n        out = fn(q, k, v, causal)\n        ref_grads = torch.autograd.grad(ref.sum(), (q, k, v))\n        grads = torch.autograd.grad(out.sum(), (q, k, v))\n        same = torch.allclose(out, ref, atol=1e-5) and all(\n            torch.allclose(g, r, atol=1e-5) for g, r in zip(grads, ref_grads))\n        print(name, "causal" if causal else "full  ", same)',
            note: '对输出求和当作损失，分别求出标准答案和我们实现的 dq、dk、dv。输出相同、三个梯度也都相同，才算通过。',
          },
          { pause: 500 },
          { run: 'python test_flash.py', output: ['PyTorch full   True', 'PyTorch causal True', 'Triton full   True', 'Triton causal True'] },
        ],
      },

      /* ================================================================ 小结 */
      {
        section: '小结',
        title: 'FlashAttention-2 写完了',
        say: [
          '前向分块、在线 softmax，只存每行一个 L；反向用 L 重算 P，用 rowsum(dO ∘ O) 算 D。整个过程不需要在显存里保存 n × n 的矩阵。',
          '作业接着要你在 GPU 上比较它和普通注意力的前向、反向时间，序列长度从几百到几万。注意力讲完了，下一部分换一个方向：用好几张卡一起训练。',
        ],
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
