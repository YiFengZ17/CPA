(function(root){
 root.Catalog.addChapter("c-intro", {
  "id": "intro-c-hello",
  "title": "源代码、编译与运行",
  "summary": "源代码是写给编译器看的文本。编译器把它翻译成机器能执行的程序；修改源代码后需要重新编译。",
  "files": [
    "main.c"
  ],
  "docName": "学习笔记.md",
  "docKicker": "程序设计基础",
  "steps": [
    {
      "section": "前置知识",
      "title": "源代码、编译与运行",
      "doc": [
        "源代码是写给编译器看的文本。编译器把它翻译成机器能执行的程序；修改源代码后需要重新编译。",
        "先安装 GCC，建立 main.c，在文件所在目录执行编译命令。Linux 和 macOS 可用 ./main 运行；Windows 的可执行文件通常叫 main.exe。",
        "函数是一段有名字的操作，main 是程序入口。语句通常以分号结束，花括号划出一组语句。",
        "<a href=\"https://www.gnu.org/software/c-intro-and-ref/manual/html_node/\" target=\"_blank\" rel=\"noopener\">查阅语言文档 ↗</a>",
        {
          "ref": {
            "api": "printf",
            "source": "glibc 手册源文件",
            "url": "https://www.gnu.org/software/libc/manual/html_node/Formatted-Output-Basics.html",
            "quote": "The printf function can be used to print any number of arguments.",
            "zh": "printf 函数可以输出任意数量的参数。"
          }
        }
      ]
    },
    {
      "section": "题目与思路",
      "title": "题目",
      "doc": [
        "不需要输入，输出一行 Hello, C。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "怎么想到的",
      "doc": [
        "先要有一个让程序开始执行的位置，再告诉它输出什么。",
        "输出不是 C 语法本身提供的语句，而是调用标准库函数。使用函数前，编译器需要知道它的声明。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "思路",
      "doc": [
        "**准备**：包含 stdio.h。",
        "**执行**：在 main 中调用 printf，最后返回状态。"
      ]
    },
    {
      "section": "写代码",
      "title": "建立入口，输出文本",
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
          "type": "\n    printf(\"Hello, C\\n\");",
          "note": "把文本交给 printf。引号里的 \\n 表示换行，不是屏幕上原样显示的两个字符。"
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
        "`-std=c11` 选择语言标准，`-Wall -Wextra` 打开常用警告，`-Werror` 把警告视为错误。",
        "网页终端用于展示；修改程序、重新编译需要在本地编辑器中完成。"
      ],
      "ops": [
        {
          "run": "gcc -std=c11 -Wall -Wextra -Werror main.c -o main && ./main",
          "output": [
            "Hello, C"
          ]
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "再试一步",
      "doc": [
        "练习：输出两行不同的文字。",
        "删掉一条语句末尾的分号，观察编译器报告的行号；恢复后再编译。不要把编译错误和程序运行后的错误混为一谈。"
      ]
    }
  ]
});
})(typeof window !== "undefined" ? window : globalThis);
