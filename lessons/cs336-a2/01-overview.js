/*
 * CS336 A2 · 第 1 章：作业 2 要做什么（只有前置知识页）
 */
(function (root) {
  'use strict';

  root.Catalog.addChapter('cs336-a2', {
    id: 'a2-overview',
    group: '开始',
    label: '总览',
    title: '作业 2 要做什么',
    summary: '四个部分各解决什么问题；没有 GPU 时怎么把每一行代码都真实跑通；这门课怎么用。',
    files: [],
    docName: '前置知识.md',
    docKicker: '总览',
    steps: [
      {
        section: '总览',
        title: '从「能训练」到「训练得快」',
        doc: [
          'CS336 是斯坦福的《从零构建语言模型》（Language Modeling from Scratch）。作业 1 从零写出了分词器、Transformer 语言模型、AdamW 和训练循环——模型**能训练**了。',
          '作业 2 的主题是**系统**：同一个模型，怎样训练得更快、用上更多的机器。它分成四个部分，每一部分都先**测量**、再**优化**：',
          {
            table: {
              head: ['部分', '要解决的问题', '本课的章节'],
              rows: [
                ['性能测量', '时间花在哪？怎么测才准？低精度能省多少？', '2 端到端基准测试 · 3 混合精度'],
                ['FlashAttention-2', '注意力的 n×n 矩阵太占显存、读写太多', '4 注意力为什么慢 · 5 PyTorch 版前向 · 6 Triton 版前向 · 7 反向传播'],
                ['分布式数据并行', '一张卡不够，怎么让几张卡一起训练同一个模型', '8 分布式基础 · 9 all-reduce · 10 朴素 DDP · 11 通信与计算重叠 · 12 分桶'],
                ['优化器状态分片', 'AdamW 的状态占的显存是参数的两倍，每张卡都存一份太浪费', '13 优化器状态分片'],
              ],
            },
          },
          '整门课接着写同一个项目：后一章从前一章写完的文件开始。最后一共 9 个文件：模型、测速、精度实验、两个 FlashAttention、测试，以及分布式的四个文件。',
        ],
      },
      {
        section: '总览',
        title: '没有 GPU，也要每一行都跑通',
        doc: [
          '作业 2 本来是在 GPU 上做的：Triton 写的是 GPU kernel，分布式训练要几张卡，NCCL 是 NVIDIA 的通信库。这门课的每一章最后都要**真实运行**，所以我们在一台只有 CPU 的机器上，用三个办法让每一行代码都真正跑起来：',
          {
            table: {
              head: ['作业里', '这里怎么跑', '到了 GPU 上'],
              rows: [
                ['`torch.cuda.synchronize()` 计时', '判断 `torch.cuda.is_available()`，CPU 上不需要同步', '代码不用改，同步自动生效'],
                ['Triton kernel', 'Triton 的**解释器模式**：设置环境变量 `TRITON_INTERPRET=1`，kernel 在 CPU 上逐块模拟执行', '不设这个变量，同一份 kernel 编译成 GPU 代码'],
                ['多卡分布式（NCCL）', '用 `gloo` 后端，在一台机器上起 4 个进程当 4 张卡', '把后端换成 `nccl`，张量放到各自的 GPU 上'],
              ],
            },
          },
          '在 CPU 上，**正确性**完全能验证：FlashAttention 的输出和梯度、DDP 训练出的参数，都会和标准答案逐个比较。但**速度**没有参考价值——CPU 上看不出 FlashAttention 比普通注意力快，也看不出通信和计算重叠的好处。涉及速度的地方，我们会说明在 GPU 上应该看到什么。',
          '作业里还有两项只能在 GPU 上做的分析：用 Nsight Systems 看每个 kernel 花了多少时间，用 PyTorch 的显存快照看显存怎么分配。这两项会在相关章节里讲清楚要看什么，但不在这里运行。',
        ],
      },
      {
        section: '总览',
        title: '这门课怎么用',
        doc: [
          '每一章和其他课一样：先读几页前置知识，再看代码一行一行写出来，旁白先说出下一个念头，最后真实运行一次。',
          '作业的题目说明在 <a href="https://github.com/stanford-cs336/assignment2-systems" target="_blank" rel="noopener">stanford-cs336/assignment2-systems ↗</a>，这里只用自己的话转述要做什么。作业要求通过它自带的测试（`tests/adapters.py` 里的几个接口），我们写的类和它要的接口一一对应，但测试本身用的是自己写的对照：和不分块的注意力、和单进程训练逐个比较。',
          '如果你正在上这门课，建议先自己写一遍，再回来对照。这里的代码追求的是**看得懂**：一个想法对应一段代码，不做与主题无关的优化。',
          '下一章从测速开始。',
        ],
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
