/*
 * CS336 A2 · 第 9 章：all-reduce 与通信测速
 * allreduce.py：起 4 个进程，看一次 all_reduce 前后每个进程的数据；再测不同大小的张量 all-reduce 要多久。
 * setup() 后面几章都会导入。
 */
(function (root) {
  'use strict';

  const { ref } = root.LessonKit;

  const OUT = [
    'rank 0 之前: [1.0, 1.0, 1.0]',
    'rank 1 之前: [2.0, 2.0, 2.0]',
    'rank 2 之前: [3.0, 3.0, 3.0]',
    'rank 3 之前: [4.0, 4.0, 4.0]',
    'rank 0 之后: [10.0, 10.0, 10.0]',
    'rank 1 之后: [10.0, 10.0, 10.0]',
    'rank 2 之后: [10.0, 10.0, 10.0]',
    'rank 3 之后: [10.0, 10.0, 10.0]',
    ' 1 MB all-reduce: 3.3 ms',
    '10 MB all-reduce: 14.6 ms',
  ];
  const PATTERN = OUT.slice(0, 8).map((line) => line.replace(/[.[\]]/g, '\\$&')).concat([' 1 MB all-reduce: \\d+\\.\\d ms', '10 MB all-reduce: \\d+\\.\\d ms']);

  root.Catalog.addChapter('cs336-a2', {
    id: 'a2-allreduce',
    group: '分布式数据并行',
    label: 'all-reduce',
    title: 'all-reduce 与通信测速',
    summary: '起 4 个进程，亲眼看一次 all_reduce：每个进程拿着不同的数进去，拿着同一个和出来。再测一测数据越大，通信要多久。',
    files: ['allreduce.py'],
    docName: '前置知识.md',
    steps: [
      /* ============================================================ 前置知识 */
      {
        section: '前置知识',
        title: '这一章要做的两件事',
        doc: [
          ref('torch.distributed.all_reduce(tensor, op=ReduceOp.SUM, group=None, async_op=False)', 'distributed.html#torch.distributed.all_reduce', 'Reduces the tensor data across all machines in a way that all get the final result.', '把所有机器上的张量数据规约起来，并让每台机器都得到最终结果。'),
          '第一件事：亲眼看一次 all-reduce。4 个进程各自造一个张量，rank 0 是 [1, 1, 1]，rank 1 是 [2, 2, 2]……调用 `all_reduce` 以后，每个进程手里都应该变成 [10, 10, 10]。注意它是**原地**修改的：调用前后是同一个张量。',
          '第二件事是作业要求的测速：all-reduce 不同大小的张量（作业里从 1 MB 到 1 GB）要多久。通信的时间大致和数据量成正比，再加上一点固定的启动开销。这决定了 DDP 里「梯度同步」要花多少时间。',
          '测通信时间有两个细节：先做一次预热；计时结束后，把每个进程测到的时间收集起来取最大的，因为最慢的那个进程才是大家真正要等的。',
        ],
      },
      {
        section: '前置知识',
        title: '多个进程一起打印',
        doc: [
          ref('torch.distributed.barrier(group=None, …)', 'distributed.html#torch.distributed.barrier', 'Synchronize all processes.', '同步所有进程。'),
          '4 个进程同时 `print`，输出的顺序是随机的，甚至会交错在一行里。要让它们按 rank 顺序打印，就轮流来：第 r 轮只让 rank r 打印，然后所有进程在 `barrier` 处等齐，再进入下一轮。',
          ref('torch.distributed.all_gather_object(object_list, obj, group=None)', 'distributed.html#torch.distributed.all_gather_object', 'Gathers picklable objects from the whole group into a list.', '把整个组里可以被 pickle 的对象收集到一个列表里。'),
          '计时的结果是普通的 Python 数，不是张量，用 `all_gather_object` 收集：每个进程都拿到一个列表，第 r 个元素是 rank r 测到的时间。',
        ],
      },

      /* ================================================================ 写代码 */
      {
        section: '写代码',
        title: '每个进程第一件事：加入进程组',
        file: 'allreduce.py',
        say: ['新建 `allreduce.py`。每个进程启动以后，第一件事都是加入进程组：约定好集合的地址和端口，然后初始化。这段后面几章都要用，单独写成一个函数。'],
        ops: [
          { type: 'import os\nimport timeit', note: '`os` 用来设环境变量，`timeit` 计时。' },
          { type: '\n\nimport torch\nimport torch.distributed as dist\nimport torch.multiprocessing as mp', note: '分布式通信在 `torch.distributed` 里，起多个进程用 `torch.multiprocessing`。' },
          { type: '\n\n\ndef setup(rank, world_size):', note: '每个进程都要调用的准备工作：知道自己是谁、一共几个。' },
          { type: '\n    os.environ["MASTER_ADDR"] = "127.0.0.1"\n    os.environ["MASTER_PORT"] = "29500"', note: '所有进程都到本机的 29500 端口集合。地址直接写 127.0.0.1，避免 localhost 被解析成 IPv6。' },
          { type: '\n    dist.init_process_group("gloo", rank=rank, world_size=world_size)', note: '加入进程组。CPU 上用 `gloo` 后端，GPU 上换成 `nccl`。' },
        ],
      },
      {
        section: '写代码',
        title: '按 rank 顺序打印',
        say: ['写一个小函数，让各个进程按 rank 的顺序轮流打印，输出才整齐、每次都一样。'],
        ops: [
          { type: '\n\n\ndef print_in_order(rank, world_size, text):', note: '每个进程都调用它，各自传入要打印的内容。' },
          { type: '\n    for r in range(world_size):', note: '一共 world_size 轮。' },
          { type: '\n        if r == rank:\n            print(text, flush=True)', note: '第 r 轮只有 rank r 打印。`flush=True` 让它马上写出去，不留在缓冲区里。' },
          { type: '\n        dist.barrier()', note: '每一轮结束所有进程都在这里等齐，谁也不会抢到下一轮前面去。' },
        ],
      },
      {
        section: '写代码',
        title: '看一次 all-reduce',
        say: ['每个进程都运行 `run`。先加入进程组，然后造一个和自己 rank 有关的张量，打印；all-reduce；再打印一次。'],
        ops: [
          { type: '\n\n\ndef run(rank, world_size):\n    setup(rank, world_size)', note: '每个进程的主函数，`mp.spawn` 会把 rank 作为第一个参数传进来。' },
          { type: '\n    data = torch.full((3,), float(rank + 1))', note: '每个进程的数据都不一样：rank 0 是三个 1，rank 1 是三个 2……' },
          { type: '\n    print_in_order(rank, world_size, f"rank {rank} 之前: {data.tolist()}")', note: '先看一眼每个进程手里的数。' },
          { type: '\n    dist.all_reduce(data)', note: '默认的操作是求和。它原地修改 data，结束时每个进程的 data 都是四份之和。' },
          { type: '\n    print_in_order(rank, world_size, f"rank {rank} 之后: {data.tolist()}")', note: '再看一眼：应该每个进程都是 10。' },
        ],
      },
      {
        section: '写代码',
        title: '测一测通信要多久',
        say: ['作业要测不同大小的数据 all-reduce 要多久。我们在 CPU 上测 1 MB 和 10 MB：先预热一次，再计时一次，收集所有进程的时间，取最慢的。'],
        ops: [
          { type: '\n\n    for size_mb in (1, 10):', note: '两种大小。作业里还会测到 1 GB，并比较 2、4、6 个进程。' },
          { type: '\n        x = torch.randn(size_mb * 1024 * 1024 // 4)', note: '1 MB 是 1024 × 1024 个字节，一个 fp32 占 4 个字节，所以要这么多个数。' },
          { type: '\n        dist.all_reduce(x)\n        dist.barrier()', note: '先预热一次，再让所有进程在同一时刻开始计时。' },
          { type: '\n        start = timeit.default_timer()\n        dist.all_reduce(x)\n        elapsed = timeit.default_timer() - start', note: '计时一次 all-reduce。GPU 上还要在取时间前同步。' },
          { type: '\n        times = [None] * world_size\n        dist.all_gather_object(times, elapsed)', note: '准备一个长 world_size 的列表，收集每个进程测到的时间。' },
          { type: '\n        if rank == 0:\n            print(f"{size_mb:>2} MB all-reduce: {max(times) * 1000:.1f} ms")', note: '只让 rank 0 打印。取最慢的那个：大家都要等它。' },
          { type: '\n    dist.barrier()\n    dist.destroy_process_group()', note: '所有进程先在这里等齐，再一起退出进程组。rank 0 还托管着大家集合用的那个地址，如果它先退出，还没走到这里的进程可能会一直卡住。' },
        ],
      },
      {
        section: '运行验证',
        title: '起 4 个进程',
        say: [
          '最后是入口：用 `mp.spawn` 起 4 个进程，每个都运行 `run(rank, 4)`。前 8 行每次都一样；最后两行的时间每次不同，核对时只检查格式。',
        ],
        ops: [
          { type: '\n\n\nif __name__ == "__main__":\n    mp.spawn(run, args=(4,), nprocs=4, join=True)', note: '起 4 个进程当 4 张卡。`args` 里的 4 会作为 world_size 传给 run，rank 由 spawn 自己补上。`join=True` 等它们全部结束。必须放在 `if __name__` 里：子进程会重新导入这个文件，不能再去 spawn。' },
          { pause: 500 },
          { run: 'python allreduce.py', output: OUT, pattern: PATTERN },
        ],
      },

      /* ================================================================ 小结 */
      {
        section: '小结',
        title: '同一行代码，不同的数据',
        say: [
          '4 个进程运行的是同一个函数，只是 rank 不同，造出的数据也不同；一次 all_reduce 以后，大家手里的数一样了。数据并行要的正是这个效果：每张卡的梯度不同，同步以后变成同一个。',
          '10 MB 的时间比 1 MB 多得多：通信时间主要取决于数据量。一个模型的梯度有多大，每一步就要传这么多数据——下一章先用最直接的办法把它们都传一遍。',
        ],
      },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
