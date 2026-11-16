(function(root){
 root.Catalog.addChapter("c-intro", {
  "id": "intro-c-arrays",
  "title": "数组与遍历",
  "summary": "数组把同类型元素连续存放。int a[4] 预留四个整数位置，下标依次为 0、1、2、3。",
  "files": [
    "main.c"
  ],
  "docName": "学习笔记.md",
  "docKicker": "程序设计基础",
  "steps": [
    {
      "section": "前置知识",
      "title": "数组与遍历",
      "doc": [
        "数组把同类型元素连续存放。int a[4] 预留四个整数位置，下标依次为 0、1、2、3。",
        "C 不会自动检查下标。访问 a[4] 已经越界，即使程序偶尔没有报错，也不是合法用法。",
        "二维数组可以看成固定长度的行组成的数组，例如 int a[2][3] 有两行三列，需要两层循环遍历。",
        "<a href=\"https://www.gnu.org/software/c-intro-and-ref/manual/html_node/\" target=\"_blank\" rel=\"noopener\">查阅语言文档 ↗</a>"
      ]
    },
    {
      "section": "题目与思路",
      "title": "题目",
      "doc": [
        "给定数组 {72, 95, 60, 88}，输出最大值及其第一次出现的下标。输出 95 1。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "思路",
      "doc": [
        "**前提**：数组非空。",
        "**记录**：best 保存下标，不是最大值本身。",
        "**比较**：扫描剩余位置，严格更大才更新。时间 O(n)，额外空间 O(1)。"
      ]
    },
    {
      "section": "写代码",
      "title": "准备数组",
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
          "type": "\n    int scores[4] = {72, 95, 60, 88};",
          "note": "把四项分数放进长度明确的数组。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "保存最大值的位置",
      "say": [
        "先假定第 0 项是目前最大的。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\n    int best = 0;",
          "note": "先假定第 0 项是目前最大的。"
        },
        {
          "type": "\n    for (int i = 1; i < 4; i++) {",
          "note": "第一项已经用于初始化，从第二项开始，到 3 为止。"
        },
        {
          "type": "\n        if (scores[i] > scores[best]) {",
          "note": "比较的是下标对应的值，而不是下标大小。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "完成扫描",
      "say": [
        "更大时保存当前位置。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\n            best = i;",
          "note": "更大时保存当前位置。"
        },
        {
          "type": "\n        }",
          "note": "结束这次比较。"
        },
        {
          "type": "\n    }",
          "note": "所有候选位置都已检查。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "输出结果",
      "say": [
        "同时输出最大值和它的位置。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\n    printf(\"%d %d\\n\", scores[best], best);",
          "note": "同时输出最大值和它的位置。"
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
            "95 1"
          ]
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "再试一步",
      "doc": [
        "把数组改成 {95, 95, 60, 88}，应保留下标 0。",
        "练习：用嵌套循环计算一个 2×3 整数矩阵每一行的和，注意行下标与列下标的范围。"
      ]
    }
  ]
});
})(typeof window !== "undefined" ? window : globalThis);
