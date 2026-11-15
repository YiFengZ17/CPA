/*
 * 课程：Stanford CS336 作业 2（系统）。
 *
 * 13 章接着写同一个项目：后一章从前一章结束时的文件开始（chain）。
 * A2 要用到 A1 写好的 Transformer 语言模型，这里放一份精简版（root.A2.MODEL），在第 2 章作为 preset 直接出现。
 *
 * 所有代码都在 CPU 上真实运行：Triton 用解释器模式（TRITON_INTERPRET=1），分布式用 gloo 后端起 4 个进程。
 * 计时类的输出每次不同，运行操作里另写 pattern（每行一个正则）供 tools/check-outputs.mjs 核对。
 *
 * root.A2.trace.*：前置知识页里的图形演示。
 */
(function (root) {
  'use strict';

  root.Catalog.defineCourse({
    id: 'cs336-a2',
    board: 'cs336',
    title: 'A2 · 系统：让训练更快',
    eyebrow: 'Stanford CS336 · Assignment 2 (Systems)',
    blurb: '作业 2 关心的不是模型本身，而是怎么让它跑得更快、用更多机器：先学会准确地测时间，再用混合精度省显存；把注意力改写成 FlashAttention-2，在 Triton 里写 GPU kernel；最后自己实现数据并行（DDP）的三种版本，以及优化器状态分片。所有代码都在 CPU 上真实跑过。',
    chain: true,
    source: { label: '作业要求', name: 'stanford-cs336/assignment2-systems', url: 'https://github.com/stanford-cs336/assignment2-systems' },
    stats: [
      ['4', '个部分'],
      ['13', '章'],
      ['9', '个文件'],
    ],
  });

  // A1 的 Transformer 语言模型（精简版）。A2 拿它来测速，注意力函数后面还会被 FlashAttention 拿来对照。
  const MODEL = [
    'import math',
    '',
    'import torch',
    'import torch.nn as nn',
    'import torch.nn.functional as F',
    '',
    '',
    'class RMSNorm(nn.Module):',
    '    def __init__(self, d_model: int, eps: float = 1e-5):',
    '        super().__init__()',
    '        self.weight = nn.Parameter(torch.ones(d_model))',
    '        self.eps = eps',
    '',
    '    def forward(self, x):',
    '        rms = torch.sqrt(x.pow(2).mean(dim=-1, keepdim=True) + self.eps)',
    '        return x / rms * self.weight',
    '',
    '',
    'def attention(q, k, v, is_causal=True):',
    '    scores = q @ k.transpose(-2, -1) / math.sqrt(q.shape[-1])',
    '    if is_causal:',
    '        n_q, n_k = scores.shape[-2:]',
    '        mask = torch.ones(n_q, n_k, dtype=torch.bool, device=q.device).tril()',
    '        scores = scores.masked_fill(~mask, float("-inf"))',
    '    return torch.softmax(scores, dim=-1) @ v',
    '',
    '',
    'class Block(nn.Module):',
    '    def __init__(self, d_model: int, num_heads: int, d_ff: int):',
    '        super().__init__()',
    '        self.num_heads = num_heads',
    '        self.norm1 = RMSNorm(d_model)',
    '        self.qkv = nn.Linear(d_model, 3 * d_model, bias=False)',
    '        self.out = nn.Linear(d_model, d_model, bias=False)',
    '        self.norm2 = RMSNorm(d_model)',
    '        self.w1 = nn.Linear(d_model, d_ff, bias=False)',
    '        self.w2 = nn.Linear(d_ff, d_model, bias=False)',
    '        self.w3 = nn.Linear(d_model, d_ff, bias=False)',
    '',
    '    def forward(self, x):',
    '        b, n, d = x.shape',
    '        q, k, v = self.qkv(self.norm1(x)).chunk(3, dim=-1)',
    '        q, k, v = (t.view(b, n, self.num_heads, -1).transpose(1, 2) for t in (q, k, v))',
    '        a = attention(q, k, v).transpose(1, 2).reshape(b, n, d)',
    '        x = x + self.out(a)',
    '        h = self.norm2(x)',
    '        return x + self.w2(F.silu(self.w1(h)) * self.w3(h))',
    '',
    '',
    'class TransformerLM(nn.Module):',
    '    def __init__(self, vocab_size: int, context_length: int, d_model: int,',
    '                 num_layers: int, num_heads: int, d_ff: int):',
    '        super().__init__()',
    '        self.embed = nn.Embedding(vocab_size, d_model)',
    '        self.pos = nn.Embedding(context_length, d_model)',
    '        self.blocks = nn.ModuleList(Block(d_model, num_heads, d_ff) for _ in range(num_layers))',
    '        self.norm = RMSNorm(d_model)',
    '        self.head = nn.Linear(d_model, vocab_size, bias=False)',
    '',
    '    def forward(self, ids):',
    '        positions = torch.arange(ids.shape[-1], device=ids.device)',
    '        x = self.embed(ids) + self.pos(positions)',
    '        for block in self.blocks:',
    '            x = block(x)',
    '        return self.head(self.norm(x))',
  ].join('\n');

  const range = (a, b) => Array.from({ length: Math.max(0, b - a) }, (_, i) => a + i);
  const r3 = (x) => Math.round(x * 1000) / 1000;

  const trace = {
    // 在线 softmax：一块一块地读一行分数，只记最大值 m 和分母 l
    onlineSoftmax(scores, tile) {
      let m = -Infinity;
      let l = 0;
      const frames = [{ cells: scores, ptrs: {}, vars: [['m', '−∞'], ['l', 0]], note: '一行注意力分数。普通 softmax 要先看完整行才知道最大值；这里一块一块地读，只记两个数：目前的最大值 m、目前的分母 l。' }];
      for (let j = 0; j < scores.length; j += tile) {
        const block = scores.slice(j, j + tile);
        const mNew = Math.max(m, ...block);
        const alpha = Math.exp(m - mNew);
        const add = block.reduce((s, x) => s + Math.exp(x - mNew), 0);
        const lOld = l;
        l = alpha * l + add;
        frames.push({
          cells: scores, win: [j, j + block.length - 1], ptrs: {}, vars: [['m', mNew], ['l', r3(l)]],
          note: (mNew > m && m !== -Infinity ? '新块里有更大的数，最大值从 ' + m + ' 变成 ' + mNew + '：旧的分母要乘 e^(' + m + '−' + mNew + ') = ' + r3(alpha) + ' 改成按新最大值算的，' : '最大值是 ' + mNew + '，') + '再加上这一块的 Σ e^(s−m) = ' + r3(add) + '：l = ' + (lOld ? r3(lOld) + ' × ' + r3(alpha) + ' + ' + r3(add) + ' = ' + r3(l) : r3(l)) + '。',
        });
        m = mNew;
      }
      const direct = scores.reduce((s, x) => s + Math.exp(x - Math.max(...scores)), 0);
      frames.push({ cells: scores, ptrs: {}, vars: [['m', m], ['l', r3(l)], ['一次算完', r3(direct)]], note: '读完了。和一次看完整行算出来的分母完全一样：' + r3(direct) + '。每一块读完就可以扔掉，内存里始终只有一块。' });
      return frames;
    },

    // FlashAttention 的分块：每个 Q 块和每个 K 块各算一次；因果注意力时右上角的块整块跳过
    tiles(nq, nk, causal) {
      const rows = range(0, nq).map((i) => 'Q 块 ' + i);
      const cols = range(0, nk).map((j) => 'K 块 ' + j);
      const cells = rows.map(() => cols.map(() => null));
      const frames = [{ rows, cols, cells: cells.map((r) => r.slice()), deps: [], vars: [], note: '把 Q 和 K、V 都按行切成块。每一格代表「一个 Q 块和一个 K 块」之间的一小块分数矩阵。' }];
      for (let i = 0; i < nq; i++) {
        for (let j = 0; j < nk; j++) {
          const skip = causal && j > i;
          cells[i][j] = skip ? '跳过' : j === i && causal ? '半' : '算';
          frames.push({
            rows, cols, cells: cells.map((r) => r.slice()), cur: [i, j], deps: [], vars: [['Q 块', i], ['K 块', j]],
            note: skip ? '因果注意力：这一块里的键都在这些查询的后面，整块都被遮住，直接跳过。' : (j === i && causal ? '对角线上的块：一半能看见、一半被遮住，要逐个位置做掩码。' : 'Q 块 ' + i + ' 和 K 块 ' + j + '：算出这一小块分数，更新这几行的 m、l 和输出累加值。'),
          });
        }
      }
      return frames;
    },

    // all-reduce：每个进程拿着自己的数，结束时每个进程都拿到所有人的和
    allReduce(values) {
      const n = values.length;
      const rows = range(0, n).map((r) => 'rank ' + r);
      const sum = values.reduce((a, b) => a + b, 0);
      const before = values.map((v) => [v, null]);
      const after = values.map((v) => [v, sum]);
      return [
        { rows, cols: ['开始时', 'all_reduce 之后'], cells: before, deps: [], vars: [], note: n + ' 个进程各自有一个张量（这里用一个数代表）。' },
        { rows, cols: ['开始时', 'all_reduce 之后'], cells: after, deps: range(0, n).map((r) => [r, 0]), picks: range(0, n).map((r) => [r, 1]), vars: [['和', sum]], note: 'all_reduce（求和）结束后，每个进程手里都是所有人的和 ' + sum + '。每个进程调用的都是同一行代码。' },
      ];
    },
  };

  root.A2 = { MODEL, trace };
})(typeof window !== 'undefined' ? window : globalThis);
