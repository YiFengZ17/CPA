/*
 * CS336 A2 · 第 11 章：通信和计算重叠
 * ddp.py：DDPIndividualParameters——每个参数的梯度一算好，就在钩子里异步发起 all-reduce；
 * 优化器更新前，finish_gradient_synchronization 等所有通信完成。
 * test_ddp.py：和单进程训练比较。
 */
(function (root) {
  'use strict';

  const { ref } = root.LessonKit;

  root.Catalog.addChapter('cs336-a2', {
    id: 'a2-ddp-overlap',
    group: '分布式数据并行',
    label: '重叠',
    title: '通信和计算重叠',
    summary: '反向传播是从最后一层往前算的，后面的梯度先算好。给每个参数挂一个钩子，梯度一好就异步发出去，让通信和剩下的反向计算同时进行。',
    files: ['ddp.py', 'test_ddp.py'],
    docName: '前置知识.md',
    steps: [
      /* ============================================================ 前置知识 */
      {
        section: '前置知识',
        title: '不用等反向全部算完',
        doc: [
          '朴素 DDP 的时间线是这样的：反向传播从头算到尾，这期间网络空着；反向结束以后才开始通信，这期间计算单元空着。',
          '反向传播是**从最后一层往前**算的。最后一层的梯度最先算好，那时前面几层还在算。如果最后一层的梯度一好就开始同步，通信就藏在了剩下的反向计算后面——到反向结束时，大部分通信已经做完了。',
          '要做到这一点需要两样东西：',
          {
            list: [
              '**一个时机**：某个参数的梯度刚好算完的那一刻。',
              '**不阻塞的通信**：发起 all-reduce 以后马上返回，反向传播接着往下算，通信在后台进行。',
            ],
          },
        ],
      },
      {
        section: '前置知识',
        title: '钩子和异步通信',
        doc: [
          ref('Tensor.register_post_accumulate_grad_hook(hook)', 'generated/torch.Tensor.register_post_accumulate_grad_hook.html', 'Registers a backward hook that runs after grad accumulation. The hook will be called after all gradients for a tensor have been accumulated, meaning that the .grad field has been updated on that tensor.', '注册一个在梯度累加之后运行的反向钩子。当一个张量的梯度全部累加完毕、也就是它的 .grad 已经更新之后，这个钩子会被调用。'),
          '时机：给每个参数注册一个「梯度累加完以后」的钩子。反向传播一算好这个参数的 `.grad`，就会调用钩子，并把参数本身传进来。',
          '不阻塞：`dist.all_reduce(tensor, async_op=True)` 发起通信后立刻返回一个**句柄**（handle），不等通信完成。之后调用 `handle.wait()` 才会真正等它结束。',
          '所以我们写一个包装类 `DDPIndividualParameters`：构造时广播参数、给每个参数挂钩子；钩子里先把梯度除以进程数、再异步 all-reduce，句柄存起来；`opt.step()` 之前调用 `finish_gradient_synchronization()`，把所有句柄等完。这正是作业测试接口要的两个方法。',
        ],
      },

      /* ================================================================ 写代码 */
      {
        section: '写代码',
        title: '包装类：广播参数，挂上钩子',
        file: 'ddp.py',
        say: ['新建 `ddp.py`。包装类继承 `nn.Module`，把原来的模型存起来。构造时做两件事：每个参数从 rank 0 广播；需要梯度的参数都挂上同步梯度的钩子。'],
        ops: [
          { type: 'import torch\nimport torch.distributed as dist\nimport torch.nn as nn', note: '要用分布式通信和 `nn.Module`。' },
          { type: '\n\n\nclass DDPIndividualParameters(nn.Module):', note: '一个包装类：用起来和原来的模型一样，但会自动同步梯度。' },
          { type: '\n    def __init__(self, module: nn.Module):\n        super().__init__()\n        self.module = module', note: '把原来的模型存成子模块，它的参数也就成了包装类的参数。' },
          { type: '\n        self.world_size = dist.get_world_size()\n        self.handles = []', note: '进程数，平均梯度时要用；`handles` 收集这一步发起的所有异步通信。' },
          { type: '\n        for p in module.parameters():\n            dist.broadcast(p.data, src=0)', note: '和朴素 DDP 一样：开始前让所有进程的参数相同。' },
          { type: '\n            if p.requires_grad:\n                p.register_post_accumulate_grad_hook(self._sync)', note: '只有要训练的参数才需要同步梯度。给它挂上钩子：梯度一算好，就调用 `self._sync(p)`。' },
        ],
      },
      {
        section: '写代码',
        title: '钩子里：先平均，再异步发出',
        say: ['钩子收到的是参数本身。先把梯度除以进程数，再异步 all-reduce 求和——结果正好是平均。句柄存起来，之后再等。'],
        ops: [
          { type: '\n\n    def _sync(self, p):', note: '每个参数的梯度算好时，反向传播会调用它。' },
          { type: '\n        p.grad /= self.world_size', note: '先除再加，和先加再除结果一样。除在前面，通信结束以后就不用再处理了。' },
          { type: '\n        self.handles.append(dist.all_reduce(p.grad, async_op=True))', note: '`async_op=True`：发起通信后马上返回，反向传播接着算前面的层。返回的句柄存起来。' },
        ],
      },
      {
        section: '写代码',
        title: '前向照旧，更新前等通信结束',
        say: ['前向直接交给原来的模型。另一个方法在 `opt.step()` 之前调用：等每一个句柄完成，梯度才是同步好的。'],
        ops: [
          { type: '\n\n    def forward(self, *args, **kwargs):\n        return self.module(*args, **kwargs)', note: '包装类的前向什么都不加，参数原样转给原来的模型。' },
          { type: '\n\n    def finish_gradient_synchronization(self):', note: '训练循环里，反向之后、更新之前调用。' },
          { type: '\n        for handle in self.handles:\n            handle.wait()', note: '等每一次异步 all-reduce 真正完成。等完以后，每个参数的 .grad 都是平均梯度。' },
          { type: '\n        self.handles.clear()', note: '清空，下一步重新收集。' },
        ],
      },
      {
        section: '写代码',
        title: '测试：一样的训练，换成包装类',
        file: 'test_ddp.py',
        say: ['新建 `test_ddp.py`。训练流程写成一个函数，参数 `wrap` 决定用哪种 DDP 包装模型，下一章的分桶版也用它测。'],
        ops: [
          { type: 'import torch\nimport torch.distributed as dist\nimport torch.multiprocessing as mp\nimport torch.nn.functional as F', note: '和上一章一样的几个模块。' },
          { type: '\n\nfrom allreduce import setup\nfrom ddp import DDPIndividualParameters\nfrom naive_ddp import make_data, make_model, same_params, train_reference', note: '工具都是前面写好的：加入进程组、刚写的包装类、模型和数据、单进程对照、比较参数。' },
          { type: '\n\n\ndef train(rank, world_size, wrap):', note: '每个进程的训练过程，`wrap` 是包装模型的方式。' },
          { type: '\n    model = wrap(make_model(seed=rank))\n    opt = torch.optim.SGD(model.parameters(), lr=0.1)', note: '照样用不同的种子造模型，交给包装类——它在构造时会广播参数。' },
          { type: '\n    x, y = make_data()\n    shard = x.shape[0] // world_size\n    x, y = x[rank * shard:(rank + 1) * shard], y[rank * shard:(rank + 1) * shard]', note: '每个进程取自己那 1/4 的数据。' },
          { type: '\n    for _ in range(5):\n        opt.zero_grad()\n        F.mse_loss(model(x), y).backward()', note: '照常前向、反向。反向的过程中，钩子已经把通信一个个发出去了。' },
          { type: '\n        model.finish_gradient_synchronization()\n        opt.step()\n    return model', note: '和朴素 DDP 唯一的不同：更新前等通信完成，而不是自己逐个 all-reduce。' },
        ],
      },
      {
        section: '运行验证',
        title: '和单进程训练比较',
        say: ['每个进程的 `run`：先在本进程里跑单进程对照（每个进程都跑一遍，很快），再用包装类训练，rank 0 打印比较结果。'],
        ops: [
          { type: '\n\n\ndef run(rank, world_size):\n    setup(rank, world_size)', note: '每个进程的主函数。' },
          { type: '\n    ref = train_reference(5, lambda ps: torch.optim.SGD(ps, lr=0.1))', note: '单进程整批训练的对照结果。' },
          { type: '\n    overlap = train(rank, world_size, DDPIndividualParameters)', note: '用逐个参数重叠通信的 DDP 训练。' },
          { type: '\n    if rank == 0:\n        print("逐个参数重叠通信:", same_params(overlap.module, ref))', note: '比较的是包装类里面的原模型：`overlap.module`。' },
          { type: '\n    dist.barrier()\n    dist.destroy_process_group()\n\n\nif __name__ == "__main__":\n    mp.spawn(run, args=(4,), nprocs=4, join=True)', note: '等齐了再退出进程组（原因见上一章）；入口起 4 个进程。' },
          { pause: 500 },
          { run: 'python test_ddp.py', output: ['逐个参数重叠通信: True'] },
        ],
      },

      /* ================================================================ 小结 */
      {
        section: '小结',
        title: '通信藏到了计算后面',
        say: [
          '结果和单进程一致，说明异步通信、先除后加都没有出错。在 GPU 上，作业让你用 Nsight Systems 看时间线：通信的 kernel 和反向的计算 kernel 重叠在一起，每一步的时间明显变短。',
          '但它还是**一个参数一次通信**。小参数很多时，每次通信的固定开销加起来不小。下一章把参数分成几个桶，一个桶的梯度都好了才发一次。',
        ],
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
