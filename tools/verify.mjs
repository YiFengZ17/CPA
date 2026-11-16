// 校验课程脚本，并把每一章写完后的文件导出来。
//
//   node tools/verify.mjs [输出目录]
//
// 对每门课的每种语言做三件事：
//   1. 把每一步都跑一遍，锚点写错、操作写错会在这里报出来；
//   2. 逐格播放，检查动画结果和直接跳转的结果相同，语法高亮切出来的行和源码一一对上；
//   3. 把每章结束时的全部文件存到 输出目录/课程/[语言/]章/，方便拿去真的运行一遍（见 check-outputs.mjs）。
// 接续写的课程（如 Transformer）后一章从前一章结束时的代码开始。
// 接续写的课程，章里中途也有运行时，再把那一步写完时的文件存到 章@步号/，让中途的运行也能核对。
// 文件名里的「/」是文件夹；课程带的二进制文件（course.assets）一起复制过去。
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function exportFiles(dir, course, st) {
  for (const name of st.order) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), st.files[name] + '\n');
  }
  for (const [name, src] of Object.entries(course.assets || {})) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    copyFileSync(join(ROOT, src), join(dir, name));
  }
}
import { Catalog, Engine, Highlight, eachVariant, chapterDir } from './load.mjs';

const outDir = process.argv[2];
let failed = false;

try {
  for (const { course, lang, chapters } of eachVariant()) {
    const label = course.id + (lang ? ' · ' + Catalog.LANGS[lang].name : '');
    let frames = 0;
    let typingMs = 0;
    for (const { lesson, compiled } of chapters) {
      const st = Engine.clone(compiled.initial);
      lesson.steps.forEach((step, i) => {
        for (const ms of Engine.runStep(st, step, Engine.rng(i + 1))) {
          frames++;
          typingMs += ms;
          if (!st.active) continue;
          const text = st.files[st.active];
          const lines = Highlight.tokenize(text, Catalog.langOfFile(st.active));
          if (lines.map((l) => l.map((t) => t.t).join('')).join('\n') !== text) {
            console.error(`✗ ${label} ${lesson.id} 第 ${i + 1} 步：高亮结果和源码不一致`);
            failed = true;
          }
        }
        if (JSON.stringify(st) !== JSON.stringify(compiled.after[i])) {
          console.error(`✗ ${label} ${lesson.id} 第 ${i + 1} 步：动画结果和直接计算的结果不一致`);
          failed = true;
        }
      });
      const final = compiled.after[compiled.after.length - 1];
      if (outDir) {
        const dir = chapterDir(outDir, course, lang, lesson);
        mkdirSync(dir, { recursive: true });
        exportFiles(dir, course, final);
        if (course.chain) {
          lesson.steps.forEach((step, i) => {
            if ((step.ops || []).some((o) => o.run)) exportFiles(dir + '@' + (i + 1), course, compiled.after[i]);
          });
        }
      }
    }
    const pages = chapters.reduce((n, c) => n + c.lesson.steps.length, 0);
    console.log(`✓ ${label}：${chapters.length} 章 ${pages} 页，${frames} 帧，1 倍速打字合计约 ${Math.round(typingMs / 1000)} 秒`);
  }
} catch (e) {
  console.error('✗ ' + e.message);
  failed = true;
}

process.exit(failed ? 1 : 0);
