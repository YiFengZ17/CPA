/*
 * CS336 A2 · 第 10 章：朴素 DDP
 * cs336_systems/naive_ddp.py：参数从 rank 0 广播；每个进程算自己那份数据的梯度；反向结束后逐个参数 all-reduce 取平均。
 * 和单进程用整批数据训练的结果比较。make_model、make_data 等工具后面几章会导入。
 */
(function (root) {
  'use strict';

  const { ref } = root.LessonKit;

  root.Catalog.addChapter('cs336-a2', {
    id: 'a2-naive-ddp',
    group: '分布式数据并行',
    label: '朴素 DDP',
    title: '朴素 DDP',
    summary: '最直接的数据并行：开始前广播参数，每一步反向之后把每个参数的梯度 all-reduce 取平均。结果要和单进程整批训练一模一样。',
    files: ['cs336_systems/naive_ddp.py'],
    docName: '前置知识.md',
    steps: [
      /* ============================================================ 前置知识 */
      {
        section: '前置知识',
        title: '三步，和一个检验',
        doc: [
          ref('torch.distributed.broadcast(tensor, src, group=None, async_op=False)', 'distributed.html#torch.distributed.broadcast', 'Broadcasts the tensor to the whole group.', '把这个张量广播给整个组。'),
          '把第 8 章的数据并行，用上一章的通信操作写出来，就是最朴素的 DDP：',
          {
            list: [
              '**开始前**：每个参数从 rank 0 `broadcast` 出去，所有进程的模型从同一份参数开始。',
              '**每一步**：每个进程只拿自己那 1/4 的数据，照常前向、反向。',
              '**更新前**：对每个参数的梯度做 `all_reduce` 求和，再除以进程数，变成平均梯度，然后照常 `opt.step()`。',
            ],
          },
          '怎么知道写对了？第 8 章说过：4 个进程各用 1/4 的数据、梯度取平均，和单进程用整批数据训练，参数更新得**完全一样**。所以训练完以后，在 rank 0 上用单进程从同样的初始参数再训练一遍，逐个参数比较即可。',
          '还有一个细节：为了验证 broadcast 真的起了作用，我们故意让每个进程用**不同**的随机种子创建模型；单进程的对照用 rank 0 的种子。',
        ],
      },
      {
        section: '前置知识',
        title: '一个小模型，16 条数据',
        doc: [
          '用一个很小的模型就够验证：两层的全连接网络，10 维输入、32 维隐藏层、5 维输出，均方误差损失。一共 16 条数据，4 个进程每个 4 条。',
          '损失是一批的平均，所以每个进程的梯度是它那 4 条的平均梯度；4 个平均梯度再取平均，正好是 16 条的平均梯度。如果每个进程分到的条数不一样，就不能简单地平均了，这也是数据并行通常要求每张卡的批大小相同的原因。',
          '这个模型、数据和单进程对照训练，后面三章都要用，写成可以导入的函数。',
        ],
      },

      /* ================================================================ 写代码 */
      {
        section: '写代码',
        title: '模型、数据和单进程对照',
        file: 'cs336_systems/naive_ddp.py',
        say: ['在 `cs336_systems/` 里新建 `naive_ddp.py`。先写几个后面都要用的工具：造模型（种子可选）、造数据（每次都一样）、单进程训练作对照、比较两个模型的参数。'],
        ops: [
          { type: 'import torch\nimport torch.distributed as dist\nimport torch.multiprocessing as mp\nimport torch.nn as nn\nimport torch.nn.functional as F', note: '分布式通信、多进程、搭模型、损失函数。' },
          { type: '\n\nfrom cs336_systems.allreduce import setup', note: '加入进程组的函数，上一章写过。它在 `cs336_systems` 包里，按包名导入。' },
          { type: '\n\n\ndef make_model(seed):\n    torch.manual_seed(seed)\n    return nn.Sequential(nn.Linear(10, 32), nn.ReLU(), nn.Linear(32, 5))', note: '造模型前先设种子：同一个种子造出的参数完全一样，不同的种子就不一样。' },
          { type: '\n\n\ndef make_data():\n    g = torch.Generator().manual_seed(1)\n    return torch.randn(16, 10, generator=g), torch.randn(16, 5, generator=g)', note: '数据用一个单独的随机数生成器，每个进程、每次调用拿到的都是同样的 16 条。' },
          { type: '\n\n\ndef train_reference(steps, make_opt):', note: '单进程的对照训练：从 rank 0 的初始参数开始，每一步用全部 16 条数据。优化器由调用方决定，最后一章还要换成 AdamW。' },
          { type: '\n    model = make_model(seed=0)\n    opt = make_opt(model.parameters())\n    x, y = make_data()', note: '种子 0，和 rank 0 的模型一样——广播以后所有进程的参数都等于它。' },
          { type: '\n    for _ in range(steps):\n        opt.zero_grad()\n        F.mse_loss(model(x), y).backward()\n        opt.step()\n    return model', note: '最普通的训练循环：清梯度、前向加反向、更新。' },
          { type: '\n\n\ndef same_params(a, b):\n    return all(torch.allclose(p, q, atol=1e-6) for p, q in zip(a.parameters(), b.parameters()))', note: '两个模型的参数逐个比较。求和的顺序不同会有极小的舍入误差，允许 10⁻⁶。' },
        ],
      },
      {
        section: '写代码',
        title: '开始前：广播参数',
        say: ['每个进程的 `run`：加入进程组，用自己的 rank 当种子造模型——此刻 4 份模型各不相同。然后把每个参数从 rank 0 广播出去。'],
        ops: [
          { type: '\n\n\ndef run(rank, world_size):\n    setup(rank, world_size)', note: '每个进程的主函数。' },
          { type: '\n    model = make_model(seed=rank)', note: '故意用不同的种子：不广播的话，4 个进程的模型就不一样，训练结果也会不一样。' },
          { type: '\n    for p in model.parameters():\n        dist.broadcast(p.data, src=0)', note: '每个参数都从 rank 0 复制过来。`p.data` 是参数里的张量本身，广播原地覆盖它。' },
          { type: '\n    opt = torch.optim.SGD(model.parameters(), lr=0.1)', note: '每个进程有自己的优化器，管自己的那份参数。' },
        ],
      },
      {
        section: '写代码',
        title: '每个进程只用自己那份数据',
        say: ['16 条数据切成 4 份，rank r 取第 r 份。'],
        ops: [
          { type: '\n\n    x, y = make_data()\n    shard = x.shape[0] // world_size', note: '每个进程拿到的都是全部 16 条，算出每份 4 条。' },
          { type: '\n    x, y = x[rank * shard:(rank + 1) * shard], y[rank * shard:(rank + 1) * shard]', note: 'rank 0 取第 0 到 3 条，rank 1 取第 4 到 7 条……互不重叠，合起来正好是全部。' },
        ],
      },
      {
        section: '写代码',
        title: '反向之后，逐个参数取平均',
        say: [
          '训练循环和单进程只差一处：反向之后、更新之前，把每个参数的梯度 all-reduce 求和，再除以进程数。',
        ],
        ops: [
          { type: '\n    for _ in range(5):\n        opt.zero_grad()\n        F.mse_loss(model(x), y).backward()', note: '照常训练 5 步：清梯度，用自己的 4 条数据前向、反向。此刻每个进程的梯度各不相同。' },
          { type: '\n        for p in model.parameters():\n            dist.all_reduce(p.grad)', note: '逐个参数同步：把 4 个进程的梯度加起来，每个进程都拿到和。' },
          { type: '\n            p.grad /= world_size', note: '和除以进程数就是平均梯度。现在 4 个进程的梯度完全一样。' },
          { type: '\n        opt.step()', note: '同样的参数、同样的梯度，更新以后依然一样。' },
        ],
      },
      {
        section: '运行验证',
        title: '和单进程训练比较',
        say: ['训练完以后，在 rank 0 上跑一遍单进程对照，逐个参数比较。最后加上入口，起 4 个进程。'],
        ops: [
          { type: '\n\n    if rank == 0:\n        ref = train_reference(5, lambda ps: torch.optim.SGD(ps, lr=0.1))', note: '只在 rank 0 上做对照：同样的初始参数、整批 16 条数据、同样的 SGD，训练 5 步。' },
          { type: '\n        print("和单进程训练一致:", same_params(model, ref))', note: '如果分布式的实现是对的，这里一定是 True。' },
          { type: '\n    dist.barrier()\n    dist.destroy_process_group()', note: 'rank 0 多做了一次对照训练，其他进程早就到了这里。'+'所有进程先在这里等齐，再一起退出进程组。rank 0 还托管着大家集合用的那个地址，如果它先退出，还没走到这里的进程可能会一直卡住。' },
          { type: '\n\n\nif __name__ == "__main__":\n    mp.spawn(run, args=(4,), nprocs=4, join=True)', note: '起 4 个进程。' },
          { pause: 500 },
          { run: 'uv run python cs336_systems/naive_ddp.py', output: ['和单进程训练一致: True'] },
        ],
      },

      /* ================================================================ 小结 */
      {
        section: '小结',
        title: '对了，但不够快',
        say: [
          '4 个进程训练出的参数，和单进程整批训练一模一样——朴素 DDP 是对的。',
          '慢在两个地方。一是**一个参数一次通信**：模型有几百个参数张量，就要发起几百次 all-reduce，每次都有固定的启动开销。二是**等反向全部算完才开始通信**：通信的时候，计算单元闲着。作业让你在 GPU 上测一测，梯度同步占了每一步多少时间。',
          '第一个问题，把所有梯度拼成一个大张量、只通信一次就能缓解（作业里叫 flat）。下一章解决第二个问题：反向还在算，算好的梯度就先送出去。',
        ],
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
