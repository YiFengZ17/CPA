// 真实运行每一章最后的那条终端命令，和课程脚本里写的输出逐行比较。
//
//   node tools/verify.mjs 输出目录
//   node tools/check-outputs.mjs 输出目录 [python 路径]
//
// 第一步导出每章结束时的全部文件，第二步在各章的目录里执行脚本里写的命令，
// 比如 python scratch.py、gcc solution.c -o solution && ./solution、javac Main.java && java Main。
// 命令开头的 python / python3 换成第二个参数给的解释器（Transformer 课程需要装好 PyTorch）。
// 只核对每章最后一次运行（同一章前面的运行，输出通常是最后一次的开头几行）；接续写的课程每一步的运行都核对。
// 命令开头的 uv run python / uv run pytest 也换成这个解释器（CS336 作业的项目用 uv 管理依赖）。
import { execSync } from 'node:child_process';
import { Catalog, eachVariant, chapterDir } from './load.mjs';

const [outDir, python = 'python3', only = ''] = process.argv.slice(2);
if (!outDir) {
  console.error('用法：node tools/check-outputs.mjs 输出目录 [python 路径] [只核对 id 以此开头的章]');
  process.exit(2);
}

// 「uv run」开头的命令（CS336 作业）：换成给的解释器，并让它找得到两个包——
// cs336-basics/ 里的 cs336_basics，和项目根目录下的 cs336_systems、tests。
function command(run, python) {
  const py = JSON.stringify(python);
  return run
    .replace(/^((?:\w+=\S+ )*)uv run python /, '$1' + py + ' ')
    .replace(/^((?:\w+=\S+ )*)uv run pytest /, '$1' + py + ' -m pytest ')
    .replace(/^python3? /, py + ' ');
}

let bad = 0;
let checked = 0;
for (const { course, lang, chapters } of eachVariant()) {
  for (const { lesson } of chapters) {
    if (only && !lesson.id.startsWith(only)) continue;
    // 要核对的运行：每章最后一次；接续写的课程，章里每一步的最后一次运行也核对（在 章@步号/ 里跑）
    const todo = [];
    lesson.steps.forEach((s, i) => {
      const runs = (s.ops || []).filter((o) => o.run);
      if (runs.length) todo.push({ op: runs[runs.length - 1], step: i + 1 });
    });
    if (!todo.length) continue;
    const lastStep = todo[todo.length - 1].step;
    const runsInLast = lesson.steps[lastStep - 1].ops.filter((o) => o.run);
    todo[todo.length - 1].op = runsInLast[runsInLast.length - 1];
    for (const { op, step } of course.chain ? todo : todo.slice(-1)) {
      const isLast = step === lastStep;
      const expected = op.output.join('\n');
      // 输出里有计时这类每次都不一样的数时，脚本用 pattern 写每一行的正则，页面上显示的仍是 output 里一次真实运行的结果
      const pattern = op.pattern ? new RegExp('^' + op.pattern.join('\n') + '$') : null;
      const cwd = chapterDir(outDir, course, lang, lesson) + (isLast ? '' : '@' + step);
      let got;
      try {
        got = execSync(command(op.run, python), {
          cwd,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: '/bin/bash',
          timeout: 300000,
          env: { ...process.env, PYTHONPATH: 'cs336-basics:.' },
        }).trimEnd();
      } catch (e) {
        got = '（运行出错）\n' + String(e.stdout || '') + String(e.stderr || e.message).trimEnd();
      }
      checked++;
      const label = course.id + (lang ? ' · ' + Catalog.LANGS[lang].name : '') + ' · ' + lesson.id + (isLast ? '' : ' 第 ' + step + ' 步');
      if (pattern ? pattern.test(got) : got === expected) {
        console.log('✓ ' + label);
      } else {
        bad++;
        console.log('✗ ' + label + '\n--- 脚本里写的：\n' + expected + '\n--- 实际输出：\n' + got);
      }
    }
  }
}
console.log(`核对了 ${checked} 次运行，${bad ? bad + ' 处不一致' : '全部一致'}`);
process.exit(bad ? 1 : 0);
