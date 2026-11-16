(function(root){
 root.Catalog.addChapter("c-intro", {
  "id": "intro-c-input",
  "title": "输入与地址",
  "summary": "scanf 按指定格式把输入写进变量。输入目标需要用地址指出来，&变量名 可以取得这个变量的位置。",
  "files": [
    "main.c"
  ],
  "docName": "学习笔记.md",
  "docKicker": "程序设计基础",
  "steps": [
    {
      "section": "前置知识",
      "title": "输入与地址",
      "doc": [
        "scanf 按指定格式把输入写进变量。输入目标需要用地址指出来，&变量名 可以取得这个变量的位置。",
        "地址告诉函数把结果放在哪里；变量的值则是那个位置里当前保存的内容。指针章会进一步解释这种区别。",
        "scanf 返回成功赋值的项数。读取两个整数时，返回值应为 2；格式不匹配或输入不足时不能继续使用未读到的值。",
        "<a href=\"https://www.gnu.org/software/c-intro-and-ref/manual/html_node/\" target=\"_blank\" rel=\"noopener\">查阅语言文档 ↗</a>"
      ]
    },
    {
      "section": "题目与思路",
      "title": "题目",
      "doc": [
        "输入两个整数 a、b，范围均为 -1000 到 1000，输出它们的和。格式不合法时输出 Invalid input。样例输入 3 4，输出 7。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "怎么想到的",
      "doc": [
        "直接把值交给输入函数，它就不知道该修改哪个变量。我们要交给它两个存储位置。",
        "读完后还要确认两个位置都写入成功，才能做加法。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "思路",
      "doc": [
        "**读入**：使用 %d 读取两个 int，参数传 &a 和 &b。",
        "**检查**：成功读取两项后输出和，否则报告输入错误。"
      ]
    },
    {
      "section": "写代码",
      "title": "准备输入位置",
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
          "type": "\n    int a, b;",
          "note": "预留两个整数变量，读取成功前不使用它们的值。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "检查读取结果",
      "say": [
        "给 scanf 两个地址，并检查是否成功赋值两项。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\n    if (scanf(\"%d %d\", &a, &b) != 2) {",
          "note": "给 scanf 两个地址，并检查是否成功赋值两项。"
        },
        {
          "type": "\n        printf(\"Invalid input\\n\");",
          "note": "输入不符合要求时说明失败。"
        },
        {
          "type": "\n        return 1;",
          "note": "提前结束，避免使用没有读到的值；非零状态表示失败。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "输出有效结果",
      "say": [
        "输入失败的处理到这里结束。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\n    }",
          "note": "输入失败的处理到这里结束。"
        },
        {
          "type": "\n    printf(\"%d\\n\", a + b);",
          "note": "两项都已读到，再计算它们的和。"
        },
        {
          "type": "\n    return 0;",
          "note": "工作完成，返回 0 表示正常结束。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "闭合程序",
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
            "7"
          ]
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "再试一步",
      "doc": [
        "输入 -3 3，结果应为 0。",
        "输入 abc 时会提示 Invalid input，并返回非零状态。",
        "练习：读取 double 使用 scanf 的 %lf，输出 double 则仍用 printf 的 %f。"
      ]
    }
  ],
  "preset": {
    "input.txt": "3 4\n"
  }
});
})(typeof window !== "undefined" ? window : globalThis);
