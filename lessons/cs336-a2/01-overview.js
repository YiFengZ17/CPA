/*
 * CS336 A2 · 第 1 章：作业 2 要做什么（只有前置知识页）
 * 作业仓库原有的文件在这里作为 preset 放进项目（见 00-repo.js），左边的资源管理器从这一章起就能看到整个仓库。
 */
(function (root) {
  'use strict';

  root.Catalog.addChapter('cs336-a2', {
    id: 'a2-overview',
    group: '开始',
    label: '总览',
    title: '作业 2 要做什么',
    summary: '四个部分各解决什么问题；作业仓库里有哪些文件、我们的代码写在哪、怎么接上官方测试；没有 GPU 时怎么把每一行代码都真实跑通。',
    files: [],
    preset: root.A2REPO,
    docName: '前置知识.md',
    docKicker: '总览',
    steps: [
      {
        section: '总览',
        title: '从「能训练」到「训练得快」',
        doc: [
          'CS336 是斯坦福的《从零构建语言模型》（Language Modeling from Scratch）。作业 1 从零写出了分词器、Transformer 语言模型、AdamW 和训练循环，到那里模型已经**能训练**了。',
          '但能训练不等于训练得快。作业 2 的主题是**系统**：同一个模型，怎样训练得更快、怎样用上更多的机器。它分成四个部分，每一部分都先**测量**、再**优化**：',
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
          '整门课接着写同一个项目：后一章从前一章写完的文件开始。项目就是作业仓库本身，下一页先看看里面有什么。',
        ],
      },
      {
        section: '总览',
        title: '作业仓库里有什么',
        doc: [
          '左边的资源管理器就是作业 2 的仓库（assignment2-systems），文件和官方仓库一模一样，点开任何一个都能看。三个文件夹各有分工：',
          {
            table: {
              head: ['位置', '是什么', '我们要做的'],
              rows: [
                ['`cs336-basics/`', '作业 1 的参考实现，课程方给的，代码在里面的 `cs336_basics` 包里：`model.py` 里有语言模型 `BasicsTransformerLM` 和注意力函数 `scaled_dot_product_attention`，`nn_utils.py` 里有 `cross_entropy`，`optimizer.py` 里有 `AdamW`', '不改，用 `import cs336_basics` 直接拿来用'],
                ['`cs336_systems/`', '作业 2 的代码放这里，一开始只有一个 `__init__.py`', '每一章往里加文件'],
                ['`tests/`', '官方测试。`adapters.py` 是测试和我们代码之间的**接口**：测试只调用它里面的几个函数，函数体原来都是 `raise NotImplementedError`', '写好一个功能，就在 `adapters.py` 里把对应的函数接上'],
              ],
            },
          },
          '那为什么能直接 `import cs336_basics`？根目录的 `pyproject.toml` 在 `[tool.uv.sources]` 一段里把 `cs336-basics` 文件夹声明成依赖，`uv` 会把它和 `cs336_systems` 一起装进环境。所以作业里的命令都以 `uv run` 开头，比如 `uv run pytest`：先按 `pyproject.toml` 准备环境，再运行后面的命令。想用自己作业 1 的实现，把那一段的路径改成自己的仓库即可，这也是作业 1 的接口（类名、参数）要和参考实现一致的原因。',
          '数据也不用另外准备：作业 1 用的 TinyStories 和 OpenWebText 这里用不到，测速用随机生成的 token；DDP 测试的数据是 `tests/fixtures/` 里两个很小的 `.pt` 文件，它们是二进制的，编辑器里不显示。',
          '资源管理器里，课程中新建的文件标 **U**（绿色），改过的原有文件标 **M**（蓝色），和 VS Code 里 git 的标记一样。',
        ],
      },
      {
        section: '总览',
        title: '没有 GPU，也要每一行都跑通',
        doc: [
          '作业 2 本来是在 GPU 上做的：Triton 写的是 GPU kernel，分布式训练要几张卡，NCCL 是 NVIDIA 的通信库。可这门课的每一章最后都要**真实运行**，而我们只有一台 CPU 机器。好在有三个办法，能让每一行代码都真正跑起来：',
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
          '这样，**正确性**完全能验证：FlashAttention 的输出和梯度、DDP 训练出的参数，都会和标准答案逐个比较。但**速度**在 CPU 上没有参考价值，看不出 FlashAttention 比普通注意力快，也看不出通信和计算重叠的好处。涉及速度的地方，我们会说明在 GPU 上应该看到什么。',
          '作业里还有两项只能在 GPU 上做的分析：用 Nsight Systems 看每个 kernel 的耗时，用 PyTorch 的显存快照看显存怎么分配。相关章节会讲清楚要看什么，但不在这里运行。',
        ],
      },
      {
        section: '总览',
        title: '这门课怎么用',
        doc: [
          '每一章和其他课一样：先读几页前置知识，再看代码一行一行写出来，旁白先说出下一个念头，最后真实运行一次。',
          '作业的题目说明在 <a href="https://github.com/stanford-cs336/assignment2-systems" target="_blank" rel="noopener">stanford-cs336/assignment2-systems ↗</a>，这里只用自己的话转述要做什么。验证用两种办法：能接到官方测试上的（FlashAttention、DDP、分片优化器），就在 `adapters.py` 里接好，运行 `uv run pytest`；官方测试管不到的（测速、精度、Triton 在 CPU 上的结果、朴素 DDP），写一段自己的对照，和标准答案逐个比较。',
          '两处和最新版作业不同：第 12 章的分桶 DDP 是往年作业的内容（2026 版去掉了它，换成了 FSDP），它是从逐个参数通信到更复杂的方案之间最直接的一步，这里保留；FSDP（`tests/test_fsdp.py`）这门课暂时没有写。',
          '如果你正在上这门课，不妨先自己写一遍，再回来对照。这里的代码追求的是**看得懂**：一个想法对应一段代码，不做与主题无关的优化。',
          '下一章从测速开始。',
        ],
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
