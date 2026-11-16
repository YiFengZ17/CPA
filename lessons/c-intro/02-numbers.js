(function(root){
 root.Catalog.addChapter("c-intro", {
  "id": "intro-c-numbers",
  "title": "变量、类型与整数除法",
  "summary": "C 的变量需要先声明类型。int 保存一定范围内的整数，double 保存近似的小数，char 保存字符。",
  "files": [
    "main.c"
  ],
  "docName": "学习笔记.md",
  "docKicker": "程序设计基础",
  "steps": [
    {
      "section": "前置知识",
      "title": "变量、类型与整数除法",
      "doc": [
        "C 的变量需要先声明类型。int 保存一定范围内的整数，double 保存近似的小数，char 保存字符。",
        "类型决定值的表示和运算方式。两个整数用 / 相除，商的小数部分向零截断；% 得到余数。",
        "printf 的格式说明要和参数类型对应：%d 用于 int，%f 用于 double，%.2f 表示小数点后显示两位。",
        "<a href=\"https://www.gnu.org/software/c-intro-and-ref/manual/html_node/\" target=\"_blank\" rel=\"noopener\">查阅语言文档 ↗</a>"
      ]
    },
    {
      "section": "题目与思路",
      "title": "题目",
      "doc": [
        "把 135 分钟拆成小时和剩余分钟，同时把 5 除以 2 的小数结果输出。输出 2 15 和 2.50。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "思路",
      "doc": [
        "**拆分**：分钟数除以 60 得小时，取余得剩余分钟。",
        "**小数**：用 5.0 / 2 保留小数部分。"
      ]
    },
    {
      "section": "写代码",
      "title": "准备变量",
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
          "type": "\n    int minutes = 135;",
          "note": "总分钟数是整数，在声明时给它初值。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "计算商、余数与小数",
      "say": [
        "整数除法留下完整小时数。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\n    int hours = minutes / 60;",
          "note": "整数除法留下完整小时数。"
        },
        {
          "type": "\n    int rest = minutes % 60;",
          "note": "取余得到不足一小时的分钟。"
        },
        {
          "type": "\n    double half = 5.0 / 2;",
          "note": "5.0 是浮点数，这次除法保留小数部分。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "输出并结束",
      "say": [
        "两个 %d 按顺序对应小时和剩余分钟。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\n    printf(\"%d %d\\n\", hours, rest);",
          "note": "两个 %d 按顺序对应小时和剩余分钟。"
        },
        {
          "type": "\n    printf(\"%.2f\\n\", half);",
          "note": "把浮点结果按两位小数显示。"
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
        "`-std=c11` 选择语言标准，`-Wall -Wextra` 打开常用警告，`-Werror` 把警告视为错误。",
        "网页终端用于展示；修改程序、重新编译需要在本地编辑器中完成。"
      ],
      "ops": [
        {
          "run": "gcc -std=c11 -Wall -Wextra -Werror main.c -o main && ./main",
          "output": [
            "2 15",
            "2.50"
          ]
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "再试一步",
      "doc": [
        "把 minutes 改为 0、59、60，检查边界。",
        "练习：先计算 5 / 2 再赋给 double，会得到 2.0 而非 2.5。赋值发生在除法完成之后。"
      ]
    }
  ]
});
})(typeof window !== "undefined" ? window : globalThis);
