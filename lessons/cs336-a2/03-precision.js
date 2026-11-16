/*
 * CS336 A2 · 第 3 章：混合精度
 * cs336_systems/precision.py：两个小实验——不同精度累加的误差；autocast 里每一处是什么类型。
 */
(function (root) {
  'use strict';

  const { ref } = root.LessonKit;

  const OUT = [
    'fp32 累加 fp32: 10.000133514404297',
    'fp16 累加 fp16: 9.953125',
    'fp32 累加 fp16: 10.00213623046875',
    '参数: torch.float32',
    'fc1 输出: torch.bfloat16',
    'LayerNorm 输出: torch.bfloat16',
    'logits: torch.bfloat16',
    'loss: torch.float32',
    '梯度: torch.float32',
  ];

  root.Catalog.addChapter('cs336-a2', {
    id: 'a2-precision',
    group: '性能测量',
    label: '精度',
    title: '混合精度',
    summary: '低精度更快、更省显存，但累加会出错。看清楚 autocast 把哪些运算换成了低精度、哪些留在 fp32。',
    files: ['cs336_systems/precision.py'],
    docName: '前置知识.md',
    steps: [
      /* ============================================================ 前置知识 */
      {
        section: '前置知识',
        title: '三种浮点格式',
        doc: [
          '一个浮点数由三部分组成：符号位、指数（决定能表示多大多小）、尾数（决定有几位有效数字）。深度学习里常用三种：',
          {
            table: {
              head: ['格式', '总位数', '指数位', '尾数位', '特点'],
              rows: [
                ['fp32', '32', '8', '23', '默认格式，约 7 位有效数字'],
                ['fp16', '16', '5', '10', '只有约 3 位有效数字，能表示的范围也小（最大约 65504）'],
                ['bf16', '16', '8', '7', '有效数字更少，但指数和 fp32 一样多，范围不会不够'],
              ],
            },
          },
          '16 位格式的好处很直接：存储减半，GPU 的张量核心（Tensor Core）算 16 位矩阵乘法也快得多。代价是精度：有效数字少了，加起来的误差会越积越大。',
          '**混合精度**就是两者兼顾：耗时的矩阵乘法用 16 位算，容易出问题的地方（累加、求和、指数、归一化）留在 fp32。',
        ],
      },
      {
        section: '前置知识',
        title: '累加为什么要用高精度',
        doc: [
          '把 0.01 加 1000 次，应该是 10。用 fp16 做，会差多少？',
          '问题出在「大数加小数」：总和越加越大，而 fp16 只有 10 位尾数，总和变大以后，相邻两个能表示的数之间的间隔也变大了。再加一个 0.01，结果只能被舍入到最近的那个能表示的数——一部分 0.01 就这样被「吃掉」了。',
          '所以矩阵乘法虽然用 16 位的输入，**累加器**要用 fp32：每一步加完都保留足够的精度，最后再转回去。这就是实验要验证的三种组合：fp32 累加 fp32、fp16 累加 fp16、fp32 累加 fp16。',
        ],
      },
      {
        section: '前置知识',
        title: 'autocast：自动挑选每个运算的精度',
        doc: [
          ref('torch.autocast(device_type, dtype=None, enabled=True)', 'amp.html#torch.autocast', 'Instances of autocast serve as context managers or decorators that allow regions of your script to run in mixed precision. In these regions, ops run in an op-specific dtype chosen by autocast to improve performance while maintaining accuracy.', 'autocast 的实例可以当作上下文管理器或装饰器，让脚本中的一段代码以混合精度运行。在这段代码里，每个运算以 autocast 为它选定的数据类型运行，在保持精度的同时提升性能。'),
          '我们不用手动把每个张量转来转去。在 `with torch.autocast(...)` 里，PyTorch 按一张事先定好的清单决定每个运算用什么类型：矩阵乘法、线性层这类转成低精度；求和、softmax、损失函数这类留在 fp32。**参数本身始终是 fp32**，梯度也是 fp32。',
          '清单在 CPU 和 GPU 上并不完全一样。比如层归一化（`layer_norm`）：在 CUDA 上它在「转成 fp32」的清单里，在 CPU 上不在。实验会把每一处的类型打印出来，亲眼看一下。',
          '作业接着还要你用 PyTorch 的显存分析工具（`torch.cuda.memory._record_memory_history`）比较混合精度前后的显存占用。这一项需要 GPU，这里不运行。',
        ],
      },

      /* ================================================================ 写代码 */
      {
        section: '写代码',
        title: '实验一：累加 1000 次 0.01',
        file: 'cs336_systems/precision.py',
        say: ['在 `cs336_systems/` 里新建 `precision.py`。第一个实验：用三种组合把 0.01 加 1000 次，看离 10 差多少。'],
        ops: [
          { type: 'import torch\nimport torch.nn as nn', note: '要用 PyTorch 的张量来控制精度；第二个实验还要用 `nn` 搭一个小模型。' },
          { type: '\n\n# 一、累加 1000 次 0.01，看不同精度差多少', note: '先用注释写下这个实验要回答的问题。' },
          { type: '\ntotal = torch.tensor(0.0, dtype=torch.float32)\nfor _ in range(1000):\n    total += torch.tensor(0.01, dtype=torch.float32)', note: '第一组是基准：累加器和每次加的数都是 fp32。' },
          { type: '\nprint("fp32 累加 fp32:", total.item())', note: '`item()` 把只有一个数的张量取成普通的 Python 数，打印出全部位数。' },
          { pause: 300 },
          { type: '\n\ntotal = torch.tensor(0.0, dtype=torch.float16)\nfor _ in range(1000):\n    total += torch.tensor(0.01, dtype=torch.float16)\nprint("fp16 累加 fp16:", total.item())', note: '第二组：两边都是 fp16。总和越大，fp16 能表示的相邻两个数间隔越大，加上去的 0.01 会被舍入掉一部分。' },
          { pause: 300 },
          { type: '\n\ntotal = torch.tensor(0.0, dtype=torch.float32)\nfor _ in range(1000):\n    total += torch.tensor(0.01, dtype=torch.float16)\nprint("fp32 累加 fp16:", total.item())', note: '第三组：每次加的数是 fp16，但累加器是 fp32。这正是混合精度里矩阵乘法的做法：输入低精度，累加高精度。' },
        ],
      },
      {
        section: '写代码',
        title: '实验二：一个会打印类型的小模型',
        say: ['第二个实验看 autocast 的效果。搭一个小模型：线性层、ReLU、层归一化、再一个线性层。在 `forward` 里每过一步就打印一次类型，autocast 改了什么一目了然。'],
        ops: [
          { type: '\n\n\n# 二、autocast 里各处是什么类型\nclass ToyModel(nn.Module):', note: '一个专门用来观察类型的小模型。' },
          { type: '\n    def __init__(self):\n        super().__init__()', note: '照常先调用父类的构造函数。' },
          { type: '\n        self.fc1 = nn.Linear(8, 16)\n        self.ln = nn.LayerNorm(16)\n        self.fc2 = nn.Linear(16, 4)', note: '三个有参数的层：线性层（矩阵乘法）、层归一化（要求和、求方差）、再一个线性层，正好覆盖两类运算。' },
          { type: '\n\n    def forward(self, x):\n        h = torch.relu(self.fc1(x))\n        print("fc1 输出:", h.dtype)', note: '过了第一个线性层，看看输出变成了什么类型。' },
          { type: '\n        h = self.ln(h)\n        print("LayerNorm 输出:", h.dtype)', note: '层归一化以后再看一次。' },
          { type: '\n        return self.fc2(h)', note: '最后一个线性层输出 logits，在外面打印它的类型。' },
        ],
      },
      {
        section: '写代码',
        title: '在 autocast 里跑一次前向和反向',
        say: [
          'CPU 上 autocast 用的低精度是 bf16。进入 `with torch.autocast` 以后，依次看参数、logits、损失的类型；出来以后再做反向传播，看梯度的类型。',
        ],
        ops: [
          { type: '\n\n\nmodel = ToyModel()\nx = torch.randn(2, 8)', note: '一个模型，一批 2 条、每条 8 维的随机输入。' },
          { type: '\nwith torch.autocast(device_type="cpu", dtype=torch.bfloat16):', note: '在 CPU 上开启 autocast，低精度选 bf16。到了 GPU 上写 `device_type="cuda"`，可以选 fp16 或 bf16。' },
          { type: '\n    print("参数:", model.fc1.weight.dtype)', note: '先看参数：autocast 不改参数本身。' },
          { type: '\n    logits = model(x)\n    print("logits:", logits.dtype)', note: '前向，看最后的输出类型。' },
          { type: '\n    loss = nn.functional.cross_entropy(logits, torch.tensor([0, 1]))\n    print("loss:", loss.dtype)', note: '损失函数里有 log 和求和，对精度很敏感，看看 autocast 怎么处理它。' },
          { type: '\nloss.backward()\nprint("梯度:", model.fc1.weight.grad.dtype)', note: '反向传播放在 autocast 外面（这是推荐的写法），最后看梯度的类型。' },
          { pause: 500 },
          { run: 'uv run python cs336_systems/precision.py', output: OUT },
        ],
      },

      /* ================================================================ 小结 */
      {
        section: '小结',
        title: '读懂这两组结果',
        say: [
          '实验一：fp32 累加只差万分之一；fp16 累加少了将近 0.05，因为总和大了以后很多个 0.01 被舍入掉了；fp32 累加 fp16 的数，误差又回到很小——剩下的误差来自 0.01 本身在 fp16 里就存不精确。结论：**低精度做运算可以，累加要用 fp32**。',
          '实验二：参数和梯度都是 fp32，线性层的输出变成了 bf16，损失被放回 fp32。层归一化在 CPU 上输出 bf16，在 CUDA 上它会被放回 fp32——这正是前置知识里说的「清单不完全一样」。',
          '下一章开始 FlashAttention：注意力的 n×n 分数矩阵，是长序列时最大的瓶颈。',
        ],
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
