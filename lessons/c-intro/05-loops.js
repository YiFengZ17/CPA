(function(root){
 root.Catalog.addChapter("c-intro", {
  "id": "intro-c-loops",
  "title": "循环、更新与终止",
  "summary": "while 在每轮开始前检查条件；for 把初始化、条件和更新写在一起。do / while 至少执行一轮，再判断是否继续。",
  "files": [
    "main.c"
  ],
  "docName": "学习笔记.md",
  "docKicker": "程序设计基础",
  "steps": [
    {
      "section": "前置知识",
      "title": "循环、更新与终止",
      "doc": [
        "while 在每轮开始前检查条件；for 把初始化、条件和更新写在一起。do / while 至少执行一轮，再判断是否继续。",
        "每轮循环必须向结束条件推进。break 结束整个循环；continue 跳到下一轮，for 会先执行更新表达式。",
        "累加需要初始值：求和从 0 开始，求积通常从 1 开始。",
        "<a href=\"https://www.gnu.org/software/c-intro-and-ref/manual/html_node/\" target=\"_blank\" rel=\"noopener\">查阅语言文档 ↗</a>"
      ]
    },
    {
      "section": "题目与思路",
      "title": "题目",
      "doc": [
        "输入 n，1 ≤ n ≤ 1000，输出 1 到 n 的整数和。输入 5 输出 15。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "思路",
      "doc": [
        "**初始**：sum 为 0，i 为 1。",
        "**更新**：把 i 加进 sum，再让 i 增加 1。",
        "**结束**：i 超过 n。时间 O(n)，额外空间 O(1)。"
      ]
    },
    {
      "section": "写代码",
      "title": "准备输入",
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
          "type": "\n    int n;",
          "note": "先准备读取终点。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "检查范围，开始循环",
      "say": [
        "同时检查输入是否成功和是否在约定范围内。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\n    if (scanf(\"%d\", &n) != 1 || n < 1 || n > 1000) return 1;",
          "note": "同时检查输入是否成功和是否在约定范围内。"
        },
        {
          "type": "\n    int sum = 0;",
          "note": "未处理数字时和为零。"
        },
        {
          "type": "\n    for (int i = 1; i <= n; i++) {",
          "note": "从 1 开始，包含 n，每轮结束把 i 加一。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "累计并输出",
      "say": [
        "把当前数字计入已有总和。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\n        sum += i;",
          "note": "把当前数字计入已有总和。"
        },
        {
          "type": "\n    }",
          "note": "完成本轮后回到 for 的更新与判断。"
        },
        {
          "type": "\n    printf(\"%d\\n\", sum);",
          "note": "只在全部加完后输出一次。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "结束程序",
      "say": [
        "工作完成，返回 0 表示正常结束。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\n    return 0;",
          "note": "工作完成，返回 0 表示正常结束。"
        },
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
            "15"
          ]
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "再试一步",
      "doc": [
        "n=1 时输出 1，n=1000 时输出 500500。",
        "练习：用 while 改写，指出初始化、条件和更新各自移到了哪里。",
        "整数有范围限制。本例上界使结果在常见 32 位 int 中可表示；大规模输入不能默认不溢出。"
      ]
    }
  ],
  "preset": {
    "input.txt": "5\n"
  }
});
})(typeof window !== "undefined" ? window : globalThis);
