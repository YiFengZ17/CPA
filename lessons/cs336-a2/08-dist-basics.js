/*
 * CS336 A2 · 第 8 章：分布式基础（只有前置知识页）
 * 数据并行的想法；进程组和集合通信；在一台机器上用多个进程模拟多张卡；更多种并行。
 */
(function (root) {
  'use strict';

  const { ref } = root.LessonKit;
  const { trace } = root.A2;

  root.Catalog.addChapter('cs336-a2', {
    id: 'a2-dist-basics',
    group: '分布式数据并行',
    label: '基础',
    title: '分布式基础',
    summary: '每张卡一份完整的模型、一份不同的数据，梯度取平均。要做到这一点，需要进程组和 all-reduce 这样的集合通信。',
    files: [],
    docName: '前置知识.md',
    docKicker: '分布式',
    steps: [
      {
        section: '分布式',
        title: '数据并行：每张卡一份数据',
        doc: [
          '一张卡一步只能处理一批数据。有 4 张卡时，最简单的用法是**数据并行**：',
          {
            list: [
              '每张卡上放一份**完全相同**的模型。',
              '一大批数据切成 4 份，每张卡算自己那份的前向和反向，得到各自的梯度。',
              '4 份梯度**取平均**，每张卡都拿到同一个平均梯度，各自用它更新参数。',
            ],
          },
          '为什么这样是对的？损失是一批样本损失的平均，梯度也就是每个样本梯度的平均。4 份一样大的数据，各自的平均梯度再取平均，正好等于整批数据的平均梯度。所以 4 张卡一起训练，和一张卡用 4 倍大的批训练，**参数更新得完全一样**——后面每一章都会用这一点来验证实现是否正确。',
          '参数一开始就要相同，每一步又用同样的梯度更新，所以每张卡上的模型始终保持一致。',
        ],
      },
      {
        section: '分布式',
        title: '进程组和集合通信',
        doc: [
          ref('torch.distributed.init_process_group(backend, …)', 'distributed.html#torch.distributed.init_process_group', 'Initialize the default distributed process group.', '初始化默认的分布式进程组。'),
          '每张卡由一个进程负责。这些进程组成一个**进程组**，每个进程有一个编号 **rank**（0、1、2……），进程总数叫 **world size**。进程之间交换数据靠**集合通信**：组里每个进程都调用同一个函数，一起完成一次数据交换。',
          {
            table: {
              head: ['操作', '做什么', '用在哪'],
              rows: [
                ['`broadcast`', '把一个进程的张量复制给所有进程', '开始训练前，让每张卡的参数相同'],
                ['`all_reduce`', '把所有进程的张量加起来，每个进程都拿到结果', '梯度求和（再除以进程数就是平均）'],
                ['`reduce_scatter`', '加起来以后切成几份，每个进程只拿一份', 'FSDP 这类分片训练'],
                ['`all_gather`', '每个进程出一份，拼起来发给所有人', '把分片的参数重新拼完整'],
              ],
            },
          },
          { viz: { kind: 'grid', title: 'all_reduce（求和）', frames: trace.allReduce([1, 2, 3, 4]) } },
          '底层的通信库叫**后端**：GPU 之间用 NVIDIA 的 `nccl`，CPU 上用 `gloo`。我们没有 GPU，用 `gloo`；代码里只有这一个词不同。',
        ],
      },
      {
        section: '分布式',
        title: '在一台机器上起 4 个进程',
        doc: [
          ref('torch.multiprocessing.spawn(fn, args=(), nprocs=1, join=True, …)', 'multiprocessing.html#spawning-subprocesses', 'Spawns nprocs processes that run fn with args.', '启动 nprocs 个进程，每个都用 args 运行 fn。'),
          '`torch.multiprocessing.spawn(fn, args=(4,), nprocs=4)` 会启动 4 个进程，每个都运行 `fn(rank, 4)`，rank 分别是 0、1、2、3。**每个进程运行的是同一份代码**，靠 rank 区分自己该做什么——比如只让 rank 0 打印结果，或者每个 rank 取数据的不同部分。',
          '进程之间要能找到彼此：先约定一个地址和端口（环境变量 `MASTER_ADDR`、`MASTER_PORT`），所有进程连到那里集合，然后才能通信。',
          '在 GPU 上，每个进程还要把自己的张量放到第 rank 张卡上（`torch.device(f"cuda:{rank}")`）。我们的进程都在 CPU 上，省掉了这一步。',
        ],
      },
      {
        section: '分布式',
        title: '不止一种并行',
        doc: [
          '数据并行要求每张卡放得下**整个模型**，加上它的梯度和优化器状态。模型更大时，还要把模型本身切开。作业让你估算这些方法的通信量和显存，它们通常组合起来用：',
          {
            table: {
              head: ['并行方式', '切的是什么'],
              rows: [
                ['数据并行（DDP）', '数据。每张卡完整一份模型'],
                ['分片数据并行（FSDP / ZeRO）', '数据，同时把参数、梯度、优化器状态分到各张卡上，要用时再拼起来'],
                ['张量并行', '每一层里的矩阵，切成几块放在几张卡上'],
                ['流水线并行', '不同的层放在不同的卡上，数据依次流过'],
              ],
            },
          },
          '这一部分要实现的是数据并行的三个版本（第 10 到 12 章），以及 ZeRO 的第一步：优化器状态分片（第 13 章）。先从最基本的 all-reduce 开始。',
        ],
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
