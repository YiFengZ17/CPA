/*
 * CS336 A2 · 第 13 章：优化器状态分片
 * cs336_systems/sharded_optimizer.py：每个参数只归一个进程管，只有它保存 AdamW 的状态、做更新，然后把新参数广播给大家。
 * 先自己和单进程 AdamW 比较、打印每个进程保存了几个参数的状态；再接上 adapters.py 的 get_sharded_optimizer，跑官方测试。
 */
(function (root) {
  'use strict';

  const { ref } = root.LessonKit;

  root.Catalog.addChapter('cs336-a2', {
    id: 'a2-sharded-optimizer',
    group: '优化器状态分片',
    label: '分片',
    title: '优化器状态分片',
    summary: 'AdamW 给每个参数存两份状态，每张卡都存一整份太浪费。把参数分给各个进程，各管各的状态和更新，更新完广播出去。',
    files: ['cs336_systems/sharded_optimizer.py', 'tests/adapters.py'],
    docName: '前置知识.md',
    steps: [
      /* ============================================================ 前置知识 */
      {
        section: '前置知识',
        title: '显存都花在哪了',
        doc: [
          '数据并行时，每张卡上都有完整的三样东西。以 fp32 训练、AdamW 优化器为例，每个参数要占：',
          {
            table: {
              head: ['东西', '每个参数占', '说明'],
              rows: [
                ['参数', '4 字节', ''],
                ['梯度', '4 字节', ''],
                ['优化器状态', '8 字节', 'AdamW 为每个参数存一阶矩和二阶矩两个数'],
              ],
            },
          },
          '优化器状态占了一半。而且每张卡存的都是**一模一样**的一份——4 张卡就存了 4 份。',
          '**优化器状态分片**（ZeRO 的第一阶段）的想法：每个参数只交给一个进程负责。只有它保存这个参数的优化器状态、用平均梯度更新它；更新完以后，把新的参数值广播给其他进程。这样每张卡只存约 1/4 的优化器状态。',
        ],
      },
      {
        section: '前置知识',
        title: '做成一个优化器',
        doc: [
          ref('Optimizer.add_param_group(param_group)', 'generated/torch.optim.Optimizer.add_param_group.html', 'Add a param group to the Optimizer s param_groups.', '给优化器的 param_groups 加一个参数组。'),
          '作业要求把它写成一个优化器类：`ShardedOptimizer(params, optimizer_cls, **kwargs)`，比如 `ShardedOptimizer(model.parameters(), torch.optim.AdamW, lr=0.01)`。用起来和普通优化器一样：`zero_grad()`、`step()`。',
          '我们继承 `torch.optim.Optimizer`，在里面另建一个**只管自己那份参数**的真正优化器（AdamW）：',
          {
            list: [
              '父类的构造函数会把每个参数组交给 `add_param_group`。我们重写它：给组里每个参数指定一个负责的进程（轮流分：第 i 个参数给 rank i % world_size），属于自己的放进内部优化器。',
              '`step()`：内部优化器只更新自己负责的参数；然后对每个参数，从它的负责进程 `broadcast` 新值。',
            ],
          },
          '梯度同步仍然交给 DDP：用第 11 章的包装类，`step()` 之前梯度已经是平均的了。分片优化器只管「谁来更新、谁存状态」。',
        ],
      },

      /* ================================================================ 写代码 */
      {
        section: '写代码',
        title: '类的外壳，构造函数',
        file: 'cs336_systems/sharded_optimizer.py',
        say: ['在 `cs336_systems/` 里新建 `sharded_optimizer.py`。构造时先记下自己的 rank、进程数、内部优化器的类和参数；再调用父类的构造函数，它会把参数组交给 `add_param_group`，所以这几个属性必须在那之前准备好。'],
        ops: [
          { type: 'import torch\nimport torch.distributed as dist\nimport torch.multiprocessing as mp\nimport torch.nn.functional as F', note: '和前几章一样的几个模块。' },
          { type: '\n\nfrom cs336_systems.allreduce import setup\nfrom cs336_systems.ddp import DDPIndividualParameters\nfrom cs336_systems.naive_ddp import make_data, make_model, same_params, train_reference', note: '都是 `cs336_systems` 包里前几章写好的：梯度同步用第 11 章的包装类；模型、数据、对照训练来自朴素 DDP 那一章。' },
          { type: '\n\n\nclass ShardedOptimizer(torch.optim.Optimizer):', note: '继承 PyTorch 的优化器基类，`zero_grad`、`param_groups` 这些就都有了。' },
          { type: '\n    def __init__(self, params, optimizer_cls, **kwargs):', note: '和作业要求的接口一致：参数、内部优化器的类、以及传给它的超参数（比如学习率）。' },
          { type: '\n        self.rank = dist.get_rank()\n        self.world_size = dist.get_world_size()', note: '当前进程是第几个，一共几个。' },
          { type: '\n        self.optimizer_cls = optimizer_cls\n        self.kwargs = kwargs', note: '先存起来，`add_param_group` 里要用它们建内部优化器。' },
          { type: '\n        self.owner = {}\n        self.local = None', note: '`owner`：每个参数由哪个 rank 负责。`local`：只管自己那份参数的内部优化器，第一次加参数组时再建。' },
          { type: '\n        super().__init__(params, kwargs)', note: '最后调用父类的构造函数。它会把参数整理成参数组，逐个交给下面的 `add_param_group`。' },
        ],
      },
      {
        section: '写代码',
        title: '给每个参数指定负责的进程',
        say: ['重写 `add_param_group`：先让父类照常登记（`zero_grad` 才能清掉所有梯度）；然后给组里每个参数指定负责的进程，挑出属于自己的，交给内部优化器。'],
        ops: [
          { type: '\n\n    def add_param_group(self, param_group):\n        super().add_param_group(param_group)', note: '父类照常登记整组参数，这样 `zero_grad()` 会清掉所有参数的梯度，不只是自己负责的。' },
          { type: '\n        mine = []\n        for p in param_group["params"]:', note: '逐个看这组里的参数，挑出自己负责的。' },
          { type: '\n            self.owner[p] = len(self.owner) % self.world_size', note: '轮流分配：已经分了几个，余数就是下一个的负责进程。每个进程按同样的顺序算，结果完全一致，不用通信。' },
          { type: '\n            if self.owner[p] == self.rank:\n                mine.append(p)', note: '轮到自己的，放进自己的那份。' },
          { type: '\n        group = {k: v for k, v in param_group.items() if k != "params"}\n        group["params"] = mine', note: '复制这一组的超参数（学习率等），参数换成只有自己的那些。' },
          { type: '\n        if self.local is None:\n            self.local = self.optimizer_cls([group], **self.kwargs)', note: '第一组：用它建出内部优化器。只有自己负责的参数会有优化器状态。' },
          { type: '\n        else:\n            self.local.add_param_group(group)', note: '之后再加的组，加进内部优化器。' },
        ],
      },
      {
        section: '写代码',
        title: 'step：各更新各的，再广播出去',
        say: ['`step()` 分两步：内部优化器只更新自己负责的参数；然后每个参数都从它的负责进程广播一次，大家的参数又一致了。'],
        ops: [
          { type: '\n\n    def step(self, closure=None):\n        self.local.step(closure)', note: '只更新自己负责的那份参数，AdamW 的状态也只为它们存。' },
          { type: '\n        for p, owner in self.owner.items():\n            dist.broadcast(p.data, src=owner)', note: '每个参数从负责它的进程广播出去。所有进程都按同样的顺序调用，broadcast 才能一一配对。' },
        ],
      },
      {
        section: '运行验证',
        title: '和单进程 AdamW 比较',
        say: [
          ref('torch.optim.AdamW(params, lr=0.001, …)', 'generated/torch.optim.AdamW.html', 'Implements AdamW algorithm.', '实现 AdamW 算法。'),
          '训练流程和前几章一样，只是优化器换成了分片的 AdamW。训练完，每个进程报告自己保存了几个参数的状态；rank 0 再和单进程 AdamW 整批训练的结果比较。',
        ],
        ops: [
          { type: '\n\n\ndef run(rank, world_size):\n    setup(rank, world_size)', note: '每个进程的主函数。' },
          { type: '\n    model = DDPIndividualParameters(make_model(seed=rank))', note: '梯度同步交给第 11 章的包装类。' },
          { type: '\n    opt = ShardedOptimizer(model.parameters(), torch.optim.AdamW, lr=0.01)', note: '分片的 AdamW，用法和普通优化器一样。' },
          { type: '\n    x, y = make_data()\n    shard = x.shape[0] // world_size\n    x, y = x[rank * shard:(rank + 1) * shard], y[rank * shard:(rank + 1) * shard]', note: '每个进程取自己那 1/4 的数据。' },
          { type: '\n    for _ in range(5):\n        opt.zero_grad()\n        F.mse_loss(model(x), y).backward()\n        model.finish_gradient_synchronization()\n        opt.step()', note: '和上一章一模一样的训练循环。' },
          { type: '\n\n    states = [None] * world_size\n    dist.all_gather_object(states, len(opt.local.state))', note: '每个进程的内部优化器为几个参数存了状态，收集起来。' },
          { type: '\n    if rank == 0:\n        ref = train_reference(5, lambda ps: torch.optim.AdamW(ps, lr=0.01))', note: '对照：单进程、整批数据、普通的 AdamW。' },
          { type: '\n        print("每个 rank 保存优化器状态的参数个数:", states)\n        print("和单进程 AdamW 一致:", same_params(model.module, ref))', note: '模型有 4 个参数张量，4 个进程应该各管 1 个。' },
          { type: '\n    dist.barrier()\n    dist.destroy_process_group()\n\n\nif __name__ == "__main__":\n    mp.spawn(run, args=(4,), nprocs=4, join=True)', note: '等齐了再退出进程组；入口起 4 个进程。' },
          { pause: 500 },
          { run: 'uv run python cs336_systems/sharded_optimizer.py', output: ['每个 rank 保存优化器状态的参数个数: [1, 1, 1, 1]', '和单进程 AdamW 一致: True'] },
        ],
      },
      {
        section: '运行验证',
        title: '接上官方测试',
        file: 'tests/adapters.py',
        say: [
          '`adapters.py` 里的 `get_sharded_optimizer(params, optimizer_cls, **kwargs)` 和我们的构造函数参数完全一样，直接转交。',
          '`tests/test_sharded_optimizer.py` 起 2 个进程，每个进程用同一个种子造同一个模型，一份交给普通的 AdamW，一份交给分片的 AdamW（带 `weight_decay`、`betas` 这些超参数），用同样的数据各训练 10 步，最后逐个参数比较。它不用 DDP：两个进程的数据本来就一样，梯度自然一样，测的只是「分开更新、再广播」对不对。',
        ],
        ops: [
          { replace: '        Instance of sharded optimizer.\n    """\n    raise NotImplementedError', with: '        Instance of sharded optimizer.\n    """\n    from cs336_systems.sharded_optimizer import ShardedOptimizer\n\n    return ShardedOptimizer(params, optimizer_cls, **kwargs)', note: '这个函数的文档字符串后面就是 `raise NotImplementedError`，换成我们的类：超参数原样传进去，它再传给内部的 AdamW。' },
          { pause: 300 },
          {
            run: 'uv run pytest -q tests/test_sharded_optimizer.py',
            output: ['', 'tests/test_sharded_optimizer.py::test_sharded_optimizer[ToyModel] PASSED', 'tests/test_sharded_optimizer.py::test_sharded_optimizer[ToyModelWithTiedWeights] PASSED', '', '============================== 2 passed in 5.46s ==============================='],
            pattern: ['', 'tests/test_sharded_optimizer\\.py::test_sharded_optimizer\\[ToyModel\\] PASSED', 'tests/test_sharded_optimizer\\.py::test_sharded_optimizer\\[ToyModelWithTiedWeights\\] PASSED', '', '=+ 2 passed in \\d+\\.\\d+s =+'],
          },
        ],
      },

      /* ================================================================ 小结 */
      {
        section: '小结',
        title: '作业 2 写完了',
        say: [
          '每个进程只保存了 1/4 的优化器状态，训练结果和单进程 AdamW 完全一样，官方测试也通过了。代价是每一步多了一轮广播。作业接着让你在 GPU 上测：显存省了多少，每一步慢了多少。',
          '回顾作业 2：先**测量**——计时、精度、显存；再针对瓶颈**优化**——FlashAttention 减少显存读写，DDP 让多张卡一起算、并把通信藏到计算后面，分片把重复存储的状态切开。每一步优化，都先确认结果和原来一模一样。',
        ],
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
