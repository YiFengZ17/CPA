(function(root){
 root.Catalog.addChapter("c-intro", {
  "id": "intro-c-functions",
  "title": "函数与值传递",
  "summary": "函数用输入参数和返回值表达一项可复用的计算。声明说明如何调用，定义还给出具体操作。",
  "files": [
    "main.c"
  ],
  "docName": "学习笔记.md",
  "docKicker": "程序设计基础",
  "steps": [
    {
      "section": "前置知识",
      "title": "函数与值传递",
      "doc": [
        "函数用输入参数和返回值表达一项可复用的计算。声明说明如何调用，定义还给出具体操作。",
        "C 的参数按值传递：函数得到实参值的副本。在函数内给参数重新赋值，不会改变调用者的变量。",
        "局部变量只在所属代码块中可见。函数可以调用自己形成递归，但必须有停止条件和规模缩小。",
        "<a href=\"https://www.gnu.org/software/c-intro-and-ref/manual/html_node/\" target=\"_blank\" rel=\"noopener\">查阅语言文档 ↗</a>"
      ]
    },
    {
      "section": "题目与思路",
      "title": "题目",
      "doc": [
        "定义整数平方函数，分别计算 3 与 -4 的平方，输出 9 和 16。输入范围限定为 -100 到 100。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "思路",
      "doc": [
        "**参数**：一个 int。",
        "**返回**：它与自己的乘积。",
        "**调用**：先定义函数，再在 main 中使用。"
      ]
    },
    {
      "section": "写代码",
      "title": "定义平方函数",
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
          "type": "\nint square(int value) {",
          "note": "先定义平方函数，参数和返回值都用 int。"
        },
        {
          "type": "\n    return value * value;",
          "note": "返回乘积，结束本次调用。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "建立程序入口",
      "say": [
        "函数定义在此闭合。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\n}",
          "note": "函数定义在此闭合。"
        },
        {
          "type": "\nint main(void) {",
          "note": "程序从 main 开始执行。int 表示返回整数状态，void 表示不接收参数，花括号围住函数体。"
        },
        {
          "type": "\n    printf(\"%d\\n\", square(3));",
          "note": "先调用函数得到 9，再输出。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "第二次调用并结束",
      "say": [
        "负数也使用相同规则，乘积为正。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\n    printf(\"%d\\n\", square(-4));",
          "note": "负数也使用相同规则，乘积为正。"
        },
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
        "`-std=c11` 选择语言标准，`-Wall -Wextra` 打开常用警告，`-Werror` 把警告视为错误。",
        "网页终端用于展示；修改程序、重新编译需要在本地编辑器中完成。"
      ],
      "ops": [
        {
          "run": "gcc -std=c11 -Wall -Wextra -Werror main.c -o main && ./main",
          "output": [
            "9",
            "16"
          ]
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "再试一步",
      "doc": [
        "练习：在 square 内给 value 赋新值，检查 main 中原变量是否改变。",
        "递归练习：写 0 到 10 的阶乘，先处理 n==0，再递归处理 n-1。与循环版本比较调用栈开销。"
      ]
    }
  ]
});
})(typeof window !== "undefined" ? window : globalThis);
