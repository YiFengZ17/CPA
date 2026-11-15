/*
 * CS336 A2 · 第 4 章：注意力为什么慢（只有前置知识页）
 * n×n 矩阵的显存和读写；在线 softmax；分块；反向只需要存 logsumexp。
 */
(function (root) {
  'use strict';

  const { trace } = root.A2;

  root.Catalog.addChapter('cs336-a2', {
    id: 'a2-flash-idea',
    group: 'FlashAttention-2',
    label: '思路',
    title: '注意力为什么慢',
    summary: 'n×n 分数矩阵要写进显存再读回来；在线 softmax 让我们一块一块地算，永远不用把整个矩阵存下来。',
    files: [],
    docName: '前置知识.md',
    docKicker: 'FlashAttention-2',
    steps: [
      {
        section: 'FlashAttention-2',
        title: 'n×n 的矩阵有多大',
        doc: [
          '`model.py` 里的 `attention` 分三步：算分数 `S = QKᵀ/√d`，做 softmax 得到 `P`，再算 `P V`。中间的 S 和 P 都是 **n × n** 的——n 是序列长度。',
          {
            table: {
              head: ['序列长度 n', '一个头的 S（fp32）', '批 4、16 个头'],
              rows: [
                ['1,024', '4 MB', '256 MB'],
                ['4,096', '64 MB', '4 GB'],
                ['16,384', '1 GB', '64 GB'],
              ],
            },
          },
          '序列长度翻 4 倍，这块显存翻 16 倍。训练时还要把 P 留到反向传播用，每一层都要存一份。',
          '比「放不下」更隐蔽的问题是**慢**。GPU 有两种存储：容量大但慢的显存（HBM），和每个计算单元里容量很小但快得多的片上存储（SRAM）。普通注意力要把 S 写进显存、读出来做 softmax、把 P 写回显存、再读出来乘 V。真正的计算不多，时间都花在搬数据上——这类运算叫**受访存限制**（memory-bound）。',
          'FlashAttention 的目标：**一次把一小块数据搬进 SRAM，把能做的计算都做完，n×n 的矩阵从头到尾不写进显存。**',
        ],
      },
      {
        section: 'FlashAttention-2',
        title: '在线 softmax：一块一块地算',
        doc: [
          '障碍在 softmax：`softmax(s)ᵢ = e^(sᵢ − m) / Σⱼ e^(sⱼ − m)`，m 是整行的最大值（减去它是为了不溢出）。分母要整行求和，最大值要看完整行才知道——好像非得先把一整行都算出来。',
          '其实不用。从左往右一块一块地读，只记两个数：目前的最大值 `m`，以及按这个最大值算出的分母 `l`。读到新的一块时：',
          {
            list: [
              '新的最大值 `m_new = max(m, 这一块的最大值)`。',
              '旧的分母是按旧的 m 算的，乘上 `e^(m − m_new)` 就变成按新的 m 算的。',
              '再加上这一块的 `Σ e^(s − m_new)`。',
            ],
          },
          { viz: { kind: 'array', title: '一行 6 个分数，每块 2 个', frames: trace.onlineSoftmax([1, 3, 2, 0.5, 4, 1.5], 2) } },
          '输出也一样：用一个累加值 `acc` 记「Σ e^(s − m) · v」，每读一块，先乘 `e^(m − m_new)` 修正，再加上这一块的 `P̃ · V`。全部读完以后，`acc / l` 就是这一行的注意力输出。',
        ],
      },
      {
        section: 'FlashAttention-2',
        title: '分块：Q 一块，K、V 一块',
        doc: [
          '把 Q 按行切成若干块，每块若干行；K 和 V 也按行切块。外层循环取一块 Q，内层循环把 K、V 一块一块读进来，用在线 softmax 更新这几行的 m、l 和 acc。内层循环结束，这几行的输出就算好了。',
          { viz: { kind: 'grid', title: '4 个 Q 块 × 4 个 K 块（因果注意力）', frames: trace.tiles(4, 4, true) } },
          '每一步只用到一块 Q、一块 K、一块 V 和一小块分数，全都放得进 SRAM。在 GPU 上，**不同的 Q 块之间互不依赖**，可以交给不同的计算单元同时算——这正是第 6 章 Triton kernel 的写法：一个程序实例负责一块 Q。',
          '因果注意力还能省一半的计算：键在查询后面的块（右上角）整块都被遮住，可以直接跳过。我们的实现为了简单，仍然把它们算一遍再遮掉，结果一样；GPU 上追求速度时再跳过。',
        ],
      },
      {
        section: 'FlashAttention-2',
        title: '反向传播只要存一个数',
        doc: [
          '普通注意力把 n×n 的 P 留给反向传播。FlashAttention 不存 P，只给每一行存一个数：',
          '`L = m + log(l)`，也就是这一行分数的 logsumexp。',
          '有了它，反向传播时可以**重新算出** P：`P = e^(S − L)`。这一行的 S 用 Q 和 K 再乘一次就有了。多做一次矩阵乘法，换来不用存 n×n 的矩阵——在受访存限制的场景里，这笔交易很划算。',
          '接下来三章依次写出：PyTorch 版的分块前向（第 5 章）、Triton 版的前向 kernel（第 6 章）、利用 L 重算的反向传播（第 7 章）。',
        ],
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
