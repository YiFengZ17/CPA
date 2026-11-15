/*
 * CS336 A2 · 第 2 章：端到端基准测试
 * model.py 是 A1 的模型（preset，直接给出）；这一章写 benchmark.py：预热、同步、多次计时取平均。
 */
(function (root) {
  'use strict';

  const { ref, py } = root.LessonKit;
  const { MODEL } = root.A2;

  const OUT = ['forward              29.0 ms ± 3.9', 'forward+backward     94.2 ms ± 2.5', 'no warmup            91.4 ms ± 6.7'];
  const PATTERN = ['forward +\\d+\\.\\d ms ± \\d+\\.\\d', 'forward\\+backward +\\d+\\.\\d ms ± \\d+\\.\\d', 'no warmup +\\d+\\.\\d ms ± \\d+\\.\\d'];

  root.Catalog.addChapter('cs336-a2', {
    id: 'a2-benchmark',
    group: '性能测量',
    label: '测速',
    title: '端到端基准测试',
    summary: '先学会测时间：预热、等 GPU 算完、多次取平均。给 A1 的模型测一次前向、前向加反向各要多久。',
    files: ['benchmark.py', 'model.py'],
    preset: { 'model.py': MODEL },
    docName: '前置知识.md',
    steps: [
      /* ============================================================ 前置知识 */
      {
        section: '前置知识',
        title: 'A1 的模型已经在 model.py 里',
        doc: [
          '作业 2 测的是作业 1 写好的语言模型。编辑器里的 `model.py` 已经放好了一份精简版，结构和 A1 一样：',
          {
            table: {
              head: ['部件', '做什么'],
              rows: [
                ['`RMSNorm`', '把每个向量按均方根归一化，再乘一个可学习的缩放'],
                ['`attention(q, k, v, is_causal)`', '缩放点积注意力：算出完整的 n×n 分数矩阵，因果掩码，softmax，再乘 V'],
                ['`Block`', '预归一化（pre-norm）的一层：多头注意力 + SwiGLU 前馈网络，各带一条残差'],
                ['`TransformerLM`', '词嵌入 + 位置嵌入 → 若干层 Block → 最后的 RMSNorm → 输出每个词的分数'],
              ],
            },
          },
          '和 A1 唯一的不同：A1 用旋转位置编码（RoPE），这里为了篇幅换成了可学习的位置嵌入。这不影响作业 2 要测的任何东西。',
          '注意 `attention` 这个函数：它会把 n×n 的分数矩阵整个算出来。第 4 到 7 章的 FlashAttention 要解决的正是这件事，到时候它就是我们对照的标准答案。',
        ],
      },
      {
        section: '前置知识',
        title: '怎么测才准',
        doc: [
          '测一段代码要多久，最直接的写法是前后各取一次时间、相减。但在 GPU 上，这样测出来的数可能完全不对。要避开三个坑：',
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
          '作业要求测几种规模的模型（参数从约一亿到二十几亿），在 GPU 上分别测「只做前向」和「前向加反向」。我们在 CPU 上，把模型缩小到 4 层、宽 256，做法完全一样。',
        ],
      },
      {
        section: '前置知识',
        title: '更细的分析：Nsight Systems',
        doc: [
          '端到端的时间只告诉你「一共多久」。作业接下来用 NVIDIA 的 Nsight Systems（`nsys profile`）看清楚每个 GPU kernel 各花了多少时间：矩阵乘法占了多少，softmax 占了多少，前向和反向分别是哪些 kernel。',
          '为了在时间线上分清楚哪段是哪段，可以在代码里用 `torch.cuda.nvtx.range("名字")` 给一段代码打上标签。作业会让你回答这样的问题：前向里最耗时的 kernel 是什么？注意力里的 softmax 和矩阵乘法相比用了多少时间？',
          '这一步离不开 NVIDIA 的 GPU，这里不运行。但它说明了一件事：**先测量，再优化**——后面的 FlashAttention 和 DDP，都是看到瓶颈以后才去改的。',
        ],
      },

      /* ================================================================ 写代码 */
      {
        section: '写代码',
        title: '导入，和「等 GPU 算完」',
        file: 'benchmark.py',
        say: ['新建 `benchmark.py`。先想好要用到什么：计时、算平均和标准差、PyTorch，以及模型。第一个小函数解决第一个坑：取时间前等 GPU 算完。'],
        ops: [
          { type: 'import statistics\nimport timeit', note: '要计时，用标准库的 `timeit`；要算平均值和标准差，用 `statistics`。' },
          { type: '\n\nimport torch\nimport torch.nn.functional as F', note: '`F` 里有反向传播要用的交叉熵损失。' },
          { type: '\n\nfrom model import TransformerLM', note: '要测的对象：A1 的语言模型。' },
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
        say: ['主程序先造一个小号的模型和一批随机数据。作业里批大小是 4，词表 10000；我们在 CPU 上把模型缩到 4 层、宽 256，上下文 128。'],
        ops: [
          { type: '\n\n\nif __name__ == "__main__":\n    torch.manual_seed(0)', note: '直接运行这个文件时才测速。固定随机种子，每次的模型和数据都一样。' },
          { type: '\n    vocab = 10000', note: '词表大小，和作业一致。' },
          { type: '\n    model = TransformerLM(vocab_size=vocab, context_length=128, d_model=256,\n                          num_layers=4, num_heads=4, d_ff=1024)', note: 'CPU 能承受的规模：4 层，宽 256，4 个头，前馈层宽 1024（宽度的 4 倍）。到了 GPU 上，换成作业表格里的规模就行。' },
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
          { type: '\n        loss = F.cross_entropy(model(x).view(-1, vocab), y.view(-1))', note: '前向之后算交叉熵损失。`cross_entropy` 要的是二维的分数和一维的目标，所以先把「批 × 位置」摊平成一维。' },
          { type: '\n        loss.backward()', note: '反向传播，算出所有参数的梯度。测的就是前向加这一步一共多久。' },
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
          { run: 'python benchmark.py', output: OUT, pattern: PATTERN },
        ],
      },

      /* ================================================================ 小结 */
      {
        section: '小结',
        title: '读懂这几个数',
        say: [
          '前向加反向大约是只做前向的 3 倍：反向传播要为每一次矩阵乘法再算两次乘法（对输入的梯度、对权重的梯度）。',
          '在 CPU 上，预热与否差别不大，因为没有 kernel 要编译。到了 GPU 上，不预热的第一次往往慢得多，标准差也会大很多——这正是要预热的原因。',
          '下一章看另一个省时间、省显存的办法：混合精度。',
        ],
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
