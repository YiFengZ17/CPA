(function(root){
 root.Catalog.addChapter("c-intro", {
  "id": "intro-c-pointers",
  "title": "地址、指针与交换",
  "summary": "地址标识一个对象在存储中的位置。指针是保存地址的值；int *p 声明一个指向 int 的指针变量。",
  "files": [
    "main.c"
  ],
  "docName": "学习笔记.md",
  "docKicker": "程序设计基础",
  "steps": [
    {
      "section": "前置知识",
      "title": "地址、指针与交换",
      "doc": [
        "地址标识一个对象在存储中的位置。指针是保存地址的值；int *p 声明一个指向 int 的指针变量。",
        "&x 取得 x 的地址，*p 访问 p 指向的对象。声明中的 * 表明类型，表达式中的 * 做间接访问。",
        "指针必须指向仍然存在且类型合适的对象才能解引用。空指针、未初始化指针和越界指针都不能随意解引用。",
        "<a href=\"https://www.gnu.org/software/c-intro-and-ref/manual/html_node/\" target=\"_blank\" rel=\"noopener\">查阅语言文档 ↗</a>"
      ]
    },
    {
      "section": "题目与思路",
      "title": "题目",
      "doc": [
        "写一个函数交换两个整数。main 中初始 a=3、b=7，调用后输出 7 3。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "怎么想到的",
      "doc": [
        "如果只把两个整数传进去，函数拿到的是副本，交换副本不会影响外面。",
        "需要把两个变量的位置交给函数，再通过位置修改原来的内容。交换时先暂存一个值，避免被覆盖后丢失。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "思路",
      "doc": [
        "**传入**：两个有效 int 对象的地址。",
        "**交换**：暂存第一个值，把第二个写入第一个，再把暂存值写入第二个。",
        "**区别**：指针本身仍按值传递，复制的地址指向同一个对象。"
      ]
    },
    {
      "section": "写代码",
      "title": "保存左边原值",
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
          "type": "\nvoid swap(int *left, int *right) {",
          "note": "函数需要修改外面的两个整数，所以接收它们的地址；void 表示不返回数值。"
        },
        {
          "type": "\n    int temp = *left;",
          "note": "先保存左边原值，后面覆盖它时才不会丢失。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "交换两个位置的内容",
      "say": [
        "通过地址把右边的值写进左边对象。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\n    *left = *right;",
          "note": "通过地址把右边的值写进左边对象。"
        },
        {
          "type": "\n    *right = temp;",
          "note": "把暂存的原左值写入右边，完成交换。"
        },
        {
          "type": "\n}",
          "note": "结束交换函数。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "传入变量地址",
      "say": [
        "程序从 main 开始执行。int 表示返回整数状态，void 表示不接收参数，花括号围住函数体。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\nint main(void) {",
          "note": "程序从 main 开始执行。int 表示返回整数状态，void 表示不接收参数，花括号围住函数体。"
        },
        {
          "type": "\n    int a = 3, b = 7;",
          "note": "建立两个有确定初值的整数。"
        },
        {
          "type": "\n    swap(&a, &b);",
          "note": "传的是地址，使函数能访问这两个对象。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "输出并结束",
      "say": [
        "调用结束后观察外部变量已经交换。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\n    printf(\"%d %d\\n\", a, b);",
          "note": "调用结束后观察外部变量已经交换。"
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
            "7 3"
          ]
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "再试一步",
      "doc": [
        "两个数相等时，交换后值不变。",
        "练习：交换数组的第一项和最后一项，把 &a[0] 和 &a[n-1] 传给函数。前提是 n 大于 0。",
        "不要返回函数内普通局部变量的地址，函数结束后它的生命周期已经结束。"
      ]
    }
  ]
});
})(typeof window !== "undefined" ? window : globalThis);
