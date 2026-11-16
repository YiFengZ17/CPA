/*
 * CS336 A2 · 第 2 章：端到端基准测试
 * 模型用作业仓库里 A1 的参考实现 cs336_basics.model.BasicsTransformerLM；
 * 这一章写 cs336_systems/benchmark.py：预热、同步、多次计时取平均。
 */
(function (root) {
  'use strict';

  const { ref, py } = root.LessonKit;

  const OUT = ['forward              36.6 ms ± 6.3', 'forward+backward    140.5 ms ± 13.8', 'no warmup           128.1 ms ± 4.1'];
  const PATTERN = ['forward +\\d+\\.\\d ms ± \\d+\\.\\d', 'forward\\+backward +\\d+\\.\\d ms ± \\d+\\.\\d', 'no warmup +\\d+\\.\\d ms ± \\d+\\.\\d'];

  root.Catalog.addChapter('cs336-a2', {
    id: 'a2-benchmark',
    group: '性能测量',
    label: '测速',
    title: '端到端基准测试',
    summary: '先学会测时间：预热、等 GPU 算完、多次取平均。给 A1 的模型测一次前向、前向加反向各要多久。',
    files: ['cs336_systems/benchmark.py'],
    docName: '前置知识.md',
    steps: [
      /* ============================================================ 前置知识 */
      {
        section: '前置知识',
        title: 'A1 的模型在 cs336_basics 里',
        doc: [
          '要测速，先得有被测的对象：作业 1 的语言模型。仓库里的 `cs336-basics/cs336_basics/model.py` 就是它的参考实现，可以在左边点开看。我们要用的是下面这几样：',
          {
            table: {
              head: ['名字', '做什么'],
              rows: [
                ['`BasicsTransformerLM(vocab_size, context_length, d_model, num_layers, num_heads, d_ff, rope_theta=10000.0)`', '整个语言模型：词嵌入 → 若干层 `TransformerBlock` → 最后的 `RMSNorm` → `lm_head` 输出每个词的分数'],
                ['`TransformerBlock`', '预归一化（pre-norm）的一层：`CausalMultiHeadSelfAttention`（带 RoPE）+ `SwiGLU` 前馈网络，各带一条残差'],
                ['`scaled_dot_product_attention(Q, K, V, mask)`', '缩放点积注意力：算出完整的 n×n 分数矩阵，`mask` 为 False 的位置填负无穷，softmax，再乘 V'],
                ['`cs336_basics.nn_utils.cross_entropy(inputs, targets)`', '交叉熵损失：`inputs` 是 (…, 词表大小) 的分数，`targets` 是同样前几维的词编号，返回平均损失'],
              ],
            },
          },
          '这些名字和参数，就是作业 1 要求实现的接口。A2 的代码只依赖这些接口，所以换成你自己作业 1 的实现也能跑，前提是接口一致。',
          '其中 `scaled_dot_product_attention` 值得多看一眼：它会把 n×n 的分数矩阵整个算出来。第 4 到 7 章的 FlashAttention 要解决的正是这件事，到时候它就是我们对照的标准答案。',
        ],
      },
      {
        section: '前置知识',
        title: '怎么测才准',
        doc: [
          '测一段代码要多久，最直接的写法是前后各取一次时间、相减。但在 GPU 上，这样测出来的数可能完全不对，因为有三个坑：',
          {
            table: {
              head: ['坑', '原因', '对策'],
              rows: [
                ['GPU 是**异步**的', 'CPU 把 kernel 交给 GPU 就返回了，不等它算完。只看 CPU 的时间，量到的是「交任务」的时间', '每次取时间之前调用 `torch.cuda.synchronize()`，等 GPU 真的算完'],
                ['第一次特别慢', '第一次运行要编译 kernel、申请显存、初始化各种缓存', '先空跑几次**预热**（warmup），不计入结果'],
                ['一次不可靠', '同一段代码每次时间都有波动', '跑很多次，报平均值和标准差'],
              ],
            },
          },
          '取时间用 `timeit.default_timer()`，它就是精度最高的 `time.perf_counter()`。',
          '作业要测几种规模的模型（参数从约一亿到二十几亿），在 GPU 上分别测「只做前向」和「前向加反向」。我们在 CPU 上把模型缩小到 4 层、宽 256，做法完全一样。',
        ],
      },
      {
        section: '前置知识',
        title: '更细的分析：Nsight Systems',
        doc: [
          '端到端的时间只说明「一共多久」，不说明时间花在哪。所以作业接下来用 NVIDIA 的 Nsight Systems（`nsys profile`）看每个 GPU kernel 各花了多少时间：矩阵乘法占多少，softmax 占多少，前向和反向分别是哪些 kernel。',
          '为了在时间线上分清楚哪段是哪段，可以在代码里用 `torch.cuda.nvtx.range("名字")` 给一段代码打上标签。作业会让你回答这样的问题：前向里最耗时的 kernel 是什么？注意力里的 softmax 和矩阵乘法相比用了多少时间？',
          '这一步离不开 NVIDIA 的 GPU，这里不运行。但它说明了一个原则：**先测量，再优化**。后面的 FlashAttention 和 DDP，都是看到瓶颈以后才去改的。',
        ],
      },

      /* ================================================================ 写代码 */
      {
        section: '写代码',
        title: '导入，和「等 GPU 算完」',
        file: 'cs336_systems/benchmark.py',
        say: ['在 `cs336_systems/` 里新建 `benchmark.py`。先想好要用到什么：计时、算平均和标准差、PyTorch，以及 A1 的模型和损失函数。第一个小函数解决第一个坑：取时间前等 GPU 算完。'],
        ops: [
          { type: 'import statistics\nimport timeit', note: '要计时，用标准库的 `timeit`；要算平均值和标准差，用 `statistics`。' },
          { type: '\n\nimport torch', note: '模型和数据都是 PyTorch 的张量。' },
          { type: '\n\nfrom cs336_basics.model import BasicsTransformerLM\nfrom cs336_basics.nn_utils import cross_entropy', note: '要测的对象：A1 的语言模型；反向传播前要算损失，也用 A1 的交叉熵。都从 `cs336_basics` 这个包里导入——它在 `cs336-basics/` 文件夹里，`uv` 已经把它装进了环境。' },
          { pause: 300 },
          { type: '\n\n\ndef sync():', note: '一个小函数，专门处理「GPU 是异步的」这个坑。' },
          { type: '\n    if torch.cuda.is_available():\n        torch.cuda.synchronize()', note: '有 GPU 时，等它把交出去的活都干完再返回。CPU 上的运算本来就是同步的，什么都不用做——所以同一份代码在两边都能用。' },
        ],
      },
      {
        section: '写代码',
        title: '先预热，再多次计时',
        say: [
          py('timeit.default_timer()', 'library/timeit.html#timeit.default_timer', 'The default timer, which is always time.perf_counter(), returns float seconds.', '默认计时器，总是 time.perf_counter()，返回以秒为单位的小数。'),
          ref('torch.cuda.synchronize(device=None)', 'generated/torch.cuda.synchronize.html', 'Wait for all kernels in all streams on a CUDA device to complete.', '等待一个 CUDA 设备上所有流里的所有 kernel 执行完。'),
          '计时函数接收一个「要测的动作」`fn`，先空跑几次预热，再正式跑几次，每次都在开始和结束之间计时。',
        ],
        ops: [
          { type: '\n\n\ndef benchmark(fn, warmup=2, steps=5):', note: '把「要测的动作」当成参数传进来，前向、前向加反向都能用同一个函数测。预热和正式测的次数给默认值。' },
          { type: '\n    for _ in range(warmup):\n        fn()\n        sync()', note: '第二个坑：先空跑几次预热，让 kernel 编译、显存申请这些一次性的开销在这里发生，不计时。每次也要等它算完。' },
          { type: '\n    times = []', note: '第三个坑：一次不可靠，把每次的时间都记下来。' },
          { type: '\n    for _ in range(steps):\n        start = timeit.default_timer()', note: '正式计时：每一次开始前取一个时间点。' },
          { type: '\n        fn()\n        sync()', note: '执行一次，并且等 GPU 真的算完——没有这一行，GPU 上量到的只是 CPU 交任务的时间。' },
          { type: '\n        times.append(timeit.default_timer() - start)', note: '结束时间减开始时间，就是这一次花的秒数。' },
          { type: '\n    return statistics.mean(times), statistics.stdev(times)', note: '返回平均值和标准差：平均值说明多快，标准差说明稳不稳。' },
        ],
      },
      {
        section: '写代码',
        title: '准备模型和一批数据',
        say: ['主程序先用 A1 的接口造一个小号的模型，再造一批随机数据。作业里批大小是 4，词表 10000；我们在 CPU 上把模型缩到 4 层、宽 256，上下文 128。'],
        ops: [
          { type: '\n\n\nif __name__ == "__main__":\n    torch.manual_seed(0)', note: '直接运行这个文件时才测速。固定随机种子，每次的模型和数据都一样。' },
          { type: '\n    vocab = 10000', note: '词表大小，和作业一致。' },
          { type: '\n    model = BasicsTransformerLM(vocab_size=vocab, context_length=128, d_model=256,\n                                num_layers=4, num_heads=4, d_ff=1024)', note: '参数名和 A1 的接口一一对应。CPU 能承受的规模：4 层，宽 256，4 个头，前馈层宽 1024（宽度的 4 倍）。到了 GPU 上，换成作业表格里的规模就行。`rope_theta` 用默认的 10000。' },
          { type: '\n    x = torch.randint(0, vocab, (4, 128))\n    y = torch.randint(0, vocab, (4, 128))', note: '测速不需要真实的文本，随机的词编号就够：一批 4 条、每条 128 个词，y 当作要预测的目标。' },
        ],
      },
      {
        section: '写代码',
        title: '两个要测的动作',
        say: ['作业要分别测「只做前向」和「前向加反向」。把它们写成两个不带参数的小函数，交给 `benchmark`。'],
        ops: [
          { type: '\n\n    def forward():\n        model(x)', note: '只做前向：把这批数据送进模型，算出每个位置的分数。' },
          { type: '\n\n    def forward_backward():', note: '前向加反向：训练时每一步真正要做的事。' },
          { type: '\n        cross_entropy(model(x), y).backward()', note: '前向之后算交叉熵损失，再反向传播算出所有参数的梯度。A1 的 `cross_entropy` 直接接收 (批, 位置, 词表) 的分数和 (批, 位置) 的目标，不用先摊平。' },
        ],
      },
      {
        section: '运行验证',
        title: '测一下，再看看不预热会怎样',
        say: [
          '两个动作各测一次，再把「前向加反向」不预热测一次作对比。打印成毫秒，保留一位小数。',
          '这一次的数是在 CPU 上测的，每次运行都会略有不同；核对时只检查格式，不检查具体数值。',
        ],
        ops: [
          { type: '\n\n    for name, fn in [("forward", forward), ("forward+backward", forward_backward)]:', note: '两个动作挨个测，名字一起带上，打印时用。' },
          { type: '\n        mean, std = benchmark(fn)', note: '用默认的 2 次预热、5 次计时。' },
          { type: '\n        print(f"{name:<18}{mean * 1000:7.1f} ms ± {std * 1000:.1f}")', note: '秒换成毫秒。`:<18` 让名字左对齐占 18 格，`:7.1f` 让数字右对齐、保留一位小数，几行能上下对齐。' },
          { type: '\n    mean, std = benchmark(forward_backward, warmup=0)\n    print(f"{\'no warmup\':<18}{mean * 1000:7.1f} ms ± {std * 1000:.1f}")', note: '对照组：不预热，第一次的开销会被算进来。' },
          { pause: 500 },
          { run: 'uv run python cs336_systems/benchmark.py', output: OUT, pattern: PATTERN },
        ],
      },

      /* ================================================================ 小结 */
      {
        section: '小结',
        title: '读懂这几个数',
        say: [
          '前向加反向是只做前向的三四倍：反向传播要为每一次矩阵乘法再算两次乘法（对输入的梯度、对权重的梯度），再加上损失函数和保存中间结果的开销。',
          '在 CPU 上，预热与否差别不大，因为没有 kernel 要编译。到了 GPU 上，不预热的第一次往往慢得多，标准差也大得多，这正是要预热的原因。',
          '下一章看另一个省时间、省显存的办法：混合精度。',
        ],
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
