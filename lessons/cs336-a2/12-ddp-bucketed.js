/*
 * CS336 A2 · 第 12 章：分桶
 * ddp.py 里加 DDPBucketed：按反向的顺序把参数分进几个桶；一个桶里的梯度都好了，就拼成一个大张量异步 all-reduce 一次。
 * test_ddp.py 加上分桶版的比较。
 */
(function (root) {
  'use strict';

  root.Catalog.addChapter('cs336-a2', {
    id: 'a2-ddp-bucketed',
    group: '分布式数据并行',
    label: '分桶',
    title: '分桶',
    summary: '一个参数一次通信，开销太碎；整个模型一次通信，又没法和反向重叠。折中：按反向的顺序把参数装进几个桶，一个桶满了就通信一次。',
    files: ['ddp.py', 'test_ddp.py'],
    docName: '前置知识.md',
    steps: [
      /* ============================================================ 前置知识 */
      {
        section: '前置知识',
        title: '两头都不好，取中间',
        doc: [
          '到目前有两种极端：',
          {
            table: {
              head: ['做法', '通信次数', '能和反向重叠吗'],
              rows: [
                ['所有梯度拼成一个大张量，反向结束后通信一次', '1', '不能：要等所有梯度都算完'],
                ['每个参数一算好就通信（上一章）', '参数个数', '能，但每次都有固定开销'],
              ],
            },
          },
          '**分桶**取中间：把参数分成几组（桶），每个桶大约 `bucket_size_mb` 那么大。一个桶里所有参数的梯度都算好了，就把它们拼成一个大张量，发起一次异步 all-reduce。通信次数等于桶数，而且前面的桶在通信时，后面的桶还在算。',
          'PyTorch 自带的 `DistributedDataParallel` 就是这么做的，默认每个桶 25 MB。',
        ],
      },
      {
        section: '前置知识',
        title: '怎么分桶、什么时候发',
        doc: [
          '**按反向的顺序装桶**：`model.parameters()` 是从第一层到最后一层的顺序，反向传播大致是反过来算的。所以倒着遍历参数，依次往当前的桶里放，放不下了就开一个新桶。这样最先算完的那些梯度落在第一个桶里，第一个桶最先满、最先发出去。',
          '**数着发**：给每个桶记一个计数器。钩子每被调用一次，就给这个参数所在的桶加一；计数等于桶里参数的个数时，这个桶就齐了，马上发出去。',
          '**拼起来、拆回去**：一个桶里的梯度形状各不相同，先用 `_flatten_dense_tensors` 把它们首尾相接拼成一个一维张量，通信完再用 `_unflatten_dense_tensors` 按原来的形状拆开，拷回每个参数的 `.grad`。',
          '为了在小模型上也分出好几个桶，测试时把桶设得很小：0.001 MB，约 1 KB。我们的模型四个参数张量分别是 1280、128、640、20 字节，倒着装：20 + 640 + 128 = 788 字节一个桶，1280 字节一个桶，一共 2 个。',
        ],
      },

      /* ================================================================ 写代码 */
      {
        section: '写代码',
        title: '要用到的两个工具函数',
        file: 'ddp.py',
        say: ['回到 `ddp.py`。拼接和拆分梯度用 PyTorch 内部的两个工具函数，先导入。'],
        ops: [
          { type: '\nfrom torch._utils import _flatten_dense_tensors, _unflatten_dense_tensors', after: 'import torch.nn as nn', note: '`_flatten_dense_tensors` 把一组张量首尾相接拼成一个一维张量；`_unflatten_dense_tensors` 按一组张量的形状把它拆回去。' },
        ],
      },
      {
        section: '写代码',
        title: '倒着把参数装进桶',
        say: ['在文件末尾写第二个包装类。构造时按反向的顺序遍历参数：先广播；当前桶装不下了，就开一个新桶。'],
        ops: [
          { type: '\n\n\nclass DDPBucketed(nn.Module):\n    def __init__(self, module: nn.Module, bucket_size_mb: float):\n        super().__init__()\n        self.module = module\n        self.world_size = dist.get_world_size()', note: '和上一个类一样的开头，多一个参数：每个桶最多多大（MB）。' },
          { type: '\n        limit = bucket_size_mb * 1024 * 1024', note: '换算成字节。' },
          { type: '\n        self.buckets = [[]]\n        size = 0', note: '桶的列表，先放一个空桶；`size` 记当前这个桶已经装了多少字节。' },
          { type: '\n        for p in reversed(list(module.parameters())):', note: '倒着遍历：反向传播先算出的是后面几层的梯度，让它们进第一个桶。' },
          { type: '\n            dist.broadcast(p.data, src=0)\n            if not p.requires_grad:\n                continue', note: '照样先广播。不需要梯度的参数不进桶。' },
          { type: '\n            nbytes = p.numel() * p.element_size()', note: '这个参数占多少字节：元素个数乘每个元素的字节数。' },
          { type: '\n            if self.buckets[-1] and size + nbytes > limit:\n                self.buckets.append([])\n                size = 0', note: '当前的桶已经有东西、再放就超了，就开一个新桶。桶是空的时候，再大的参数也先放进去，否则会死循环地开空桶。' },
          { type: '\n            self.buckets[-1].append(p)\n            size += nbytes', note: '放进当前的桶。' },
        ],
      },
      {
        section: '写代码',
        title: '记下每个参数在哪个桶，挂钩子',
        say: ['钩子被调用时只知道是哪个参数，要能马上查到它在哪个桶。再给每个桶准备一个计数器，以及一个列表放发出去的通信。'],
        ops: [
          { type: '\n        self.bucket_of = {}', note: '参数 → 桶号。参数可以当字典的键。' },
          { type: '\n        for i, bucket in enumerate(self.buckets):\n            for p in bucket:\n                self.bucket_of[p] = i\n                p.register_post_accumulate_grad_hook(self._ready)', note: '登记每个参数的桶号，并挂上钩子：梯度好了就调用 `self._ready(p)`。' },
          { type: '\n        self.ready = [0] * len(self.buckets)\n        self.pending = []', note: '`ready[i]` 是第 i 个桶已经好了几个梯度；`pending` 放发出去的通信，以及之后拆回去要用的东西。' },
        ],
      },
      {
        section: '写代码',
        title: '一个桶齐了，就发出去',
        say: ['钩子里给这个参数的桶加一。如果这个桶的梯度都齐了，就把它们拼起来、除以进程数、异步 all-reduce。'],
        ops: [
          { type: '\n\n    def _ready(self, p):\n        i = self.bucket_of[p]\n        self.ready[i] += 1', note: '又一个梯度好了，给它所在的桶加一。' },
          { type: '\n        if self.ready[i] == len(self.buckets[i]):', note: '这个桶里的梯度全部算好了。' },
          { type: '\n            grads = [q.grad for q in self.buckets[i]]\n            flat = _flatten_dense_tensors(grads) / self.world_size', note: '把桶里的梯度拼成一个一维张量，顺便除以进程数。拼出来的是新张量，不是原来的 .grad。' },
          { type: '\n            handle = dist.all_reduce(flat, async_op=True)\n            self.pending.append((handle, flat, i))', note: '异步发起一次 all-reduce。句柄、拼好的张量、桶号一起存起来，通信完以后要把结果拆回去。' },
        ],
      },
      {
        section: '写代码',
        title: '等完，再拆回每个梯度',
        say: ['前向照旧。更新前，等每个桶的通信完成，然后把通信结果按原来的形状拆开，拷回每个参数的 `.grad`。最后把计数器清零，给下一步用。'],
        ops: [
          { type: '\n\n    def forward(self, *args, **kwargs):\n        return self.module(*args, **kwargs)', note: '前向原样转给原来的模型。' },
          { type: '\n\n    def finish_gradient_synchronization(self):\n        for handle, flat, i in self.pending:\n            handle.wait()', note: '逐个桶等通信完成。' },
          { type: '\n            grads = [q.grad for q in self.buckets[i]]\n            for g, synced in zip(grads, _unflatten_dense_tensors(flat, grads)):\n                g.copy_(synced)', note: '按桶里每个梯度的形状把一维张量拆开，再用 `copy_` 原地拷回去——优化器读的是参数自己的 .grad。' },
          { type: '\n        self.pending.clear()\n        self.ready = [0] * len(self.buckets)', note: '清空，下一步重新数。' },
        ],
      },
      {
        section: '运行验证',
        title: '两个版本一起比较',
        file: 'test_ddp.py',
        say: ['回到 `test_ddp.py`：导入分桶版，再用它训练一次，桶设成 0.001 MB。打印时带上桶的个数。'],
        ops: [
          { replace: 'from ddp import DDPIndividualParameters', with: 'from ddp import DDPBucketed, DDPIndividualParameters', note: '把分桶版也导入进来。' },
          { type: '\n    bucketed = train(rank, world_size, lambda m: DDPBucketed(m, bucket_size_mb=0.001))', after: '    overlap = train(rank, world_size, DDPIndividualParameters)', note: '用分桶版再训练一次。`wrap` 要的是一个只接收模型的函数，用 lambda 把桶的大小固定下来。' },
          { type: '\n        print("分桶 (" + str(len(bucketed.buckets)) + " 个桶):", same_params(bucketed.module, ref))', after: '        print("逐个参数重叠通信:", same_params(overlap.module, ref))', note: '打印桶的个数和比较结果，应该是 2 个桶。' },
          { pause: 500 },
          { run: 'python test_ddp.py', output: ['逐个参数重叠通信: True', '分桶 (2 个桶): True'] },
        ],
      },

      /* ================================================================ 小结 */
      {
        section: '小结',
        title: '数据并行写完了',
        say: [
          '两个包装类都和单进程训练一致。分桶版把通信次数从「参数个数」降到了「桶数」，同时保留了和反向的重叠。',
          '作业接着让你在 GPU 上比较几种桶大小：桶太小，开销又变碎；桶太大，第一个桶要等很久才满，重叠变少。在它们中间，有一个最快的大小。',
          '数据并行的每张卡上，模型、梯度、优化器状态都是完整的一份。最后一章先把其中最占地方的——优化器状态——切开。',
        ],
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
