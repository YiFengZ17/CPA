(function(root){
 root.Catalog.addChapter("c-intro", {
  "id": "intro-c-branches",
  "title": "比较、逻辑与分支",
  "summary": "条件决定程序走哪一条路径。C 中 0 表示假，非 0 表示真。比较运算得到 0 或 1。",
  "files": [
    "main.c"
  ],
  "docName": "学习笔记.md",
  "docKicker": "程序设计基础",
  "steps": [
    {
      "section": "前置知识",
      "title": "比较、逻辑与分支",
      "doc": [
        "条件决定程序走哪一条路径。C 中 0 表示假，非 0 表示真。比较运算得到 0 或 1。",
        "== 比较相等，= 是赋值。&& 表示并且，|| 表示或者，! 表示取反；&& 和 || 会短路，左边已能决定结果时不再计算右边。",
        "if / else if / else 按顺序选择分支。switch 适合按整数或字符的离散取值分类，case 后通常用 break 阻止继续落入下一段。",
        "<a href=\"https://www.gnu.org/software/c-intro-and-ref/manual/html_node/\" target=\"_blank\" rel=\"noopener\">查阅语言文档 ↗</a>"
      ]
    },
    {
      "section": "题目与思路",
      "title": "题目",
      "doc": [
        "输入 0 到 100 的分数。90 及以上输出 A，60 到 89 输出 Pass，其余输出 Retry。样例 60 输出 Pass。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "怎么想到的",
      "doc": [
        "分数段有明确边界，从高到低判断可以让条件互不重叠。",
        "进入第二个条件时，已经知道第一个条件不成立，不必再重复检查小于 90。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "思路",
      "doc": [
        "**顺序**：先 >=90，再 >=60，最后 else。",
        "**边界**：测试 59、60、89、90。"
      ]
    },
    {
      "section": "写代码",
      "title": "读入分数",
      "say": [
        "需要输入输出功能，先引入标准库的声明。#include 是预处理指令，末尾不写分号。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "#include <stdio.h>",
          "note": "需要输入输出功能，先引入标准库的声明。#include 是预处理指令，末尾不写分号。"
        },
        {
          "type": "\nint main(void) {",
          "note": "程序从 main 开始执行。int 表示返回整数状态，void 表示不接收参数，花括号围住函数体。"
        },
        {
          "type": "\n    int score;",
          "note": "准备保存输入的分数。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "判断高分与及格",
      "say": [
        "只在读到一个整数时继续。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\n    if (scanf(\"%d\", &score) != 1) return 1;",
          "note": "只在读到一个整数时继续。"
        },
        {
          "type": "\n    if (score >= 90) {",
          "note": "先判断最高一档。"
        },
        {
          "type": "\n        printf(\"A\\n\");",
          "note": "达到 90 就输出 A。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "处理其余分数",
      "say": [
        "前面没通过，再检查及格线。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\n    } else if (score >= 60) {",
          "note": "前面没通过，再检查及格线。"
        },
        {
          "type": "\n        printf(\"Pass\\n\");",
          "note": "分数在 60 到 89 之间。"
        },
        {
          "type": "\n    } else {",
          "note": "其余分数进入最后一段。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "结束程序",
      "say": [
        "输出需要再练习的标记。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\n        printf(\"Retry\\n\");",
          "note": "输出需要再练习的标记。"
        },
        {
          "type": "\n    }",
          "note": "三个分支都结束，后面继续执行共同代码。"
        },
        {
          "type": "\n    return 0;",
          "note": "工作完成，返回 0 表示正常结束。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "完成程序",
      "say": [
        "这一对花括号到这里闭合，main 结束。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\n}",
          "note": "这一对花括号到这里闭合，main 结束。"
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "编译并运行",
      "say": [
        "先用 GCC 把 main.c 编译成可执行程序 main，成功后再运行。`&&` 表示前一条命令成功才执行后一条。",
        "`-std=c11` 选择语言标准，`-Wall -Wextra` 打开常用警告，`-Werror` 把警告视为错误。示例输入放在 input.txt 中，`<` 把它送给程序；本地也可直接运行并手动输入。",
        "网页终端用于展示；修改程序、重新编译需要在本地编辑器中完成。"
      ],
      "ops": [
        {
          "run": "gcc -std=c11 -Wall -Wextra -Werror main.c -o main && ./main < input.txt",
          "output": [
            "Pass"
          ]
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "再试一步",
      "doc": [
        "练习：在分类前拒绝小于 0 或大于 100 的分数，用 || 连接两种情况。",
        "不要把条件写成 0 <= score <= 100。C 会先计算左边比较，再拿得到的 0 或 1 与 100 比。"
      ]
    }
  ],
  "preset": {
    "input.txt": "60\n"
  }
});
})(typeof window !== "undefined" ? window : globalThis);
