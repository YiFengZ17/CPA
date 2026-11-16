(function(root){
 root.Catalog.addChapter("c-intro", {
  "id": "intro-c-strings",
  "title": "字符数组与字符串",
  "summary": "C 字符串是一串字符，以值为 0 的空字符结尾，写作 \\0。字符串 \"cat\" 需要四个 char 位置。",
  "files": [
    "main.c"
  ],
  "docName": "学习笔记.md",
  "docKicker": "程序设计基础",
  "steps": [
    {
      "section": "前置知识",
      "title": "字符数组与字符串",
      "doc": [
        "C 字符串是一串字符，以值为 0 的空字符结尾，写作 \\0。字符串 \"cat\" 需要四个 char 位置。",
        "字符用单引号，例如 'a'；字符串用双引号。char text[] = \"cat\" 建立可修改的数组；不要尝试修改字符串字面量本身。",
        "strlen 统计结尾空字符之前的长度，sizeof 数组得到整个数组占用的字节数。读入字符串必须预留终止符的位置。",
        "<a href=\"https://www.gnu.org/software/c-intro-and-ref/manual/html_node/\" target=\"_blank\" rel=\"noopener\">查阅语言文档 ↗</a>"
      ]
    },
    {
      "section": "题目与思路",
      "title": "题目",
      "doc": [
        "读取一行最多 99 个英文字符或空格，输出其中小写字母 a 的个数。样例 banana 输出 3。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "怎么想到的",
      "doc": [
        "文字长度可能改变，但字符串终止符能告诉我们扫描何时结束。",
        "逐个查看字符，只在等于 a 时加一；换行和空格不满足条件，自然跳过。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "思路",
      "doc": [
        "**输入**：用 fgets 读取到容量以内，检查是否成功。",
        "**扫描**：遇到 \\0 停止，只统计字符 a。",
        "**范围**：按单字节英文文本处理，不把字节下标当作中文字符下标。"
      ]
    },
    {
      "section": "写代码",
      "title": "准备字符缓冲区",
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
          "type": "\n    char text[101];",
          "note": "为最多 99 个输入字符、可能的换行和终止符预留空间。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "安全读入并遍历",
      "say": [
        "限制读入容量，并检查是否成功。fgets 可能保留换行，缓冲区足够时会写入终止符。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\n    if (fgets(text, sizeof text, stdin) == NULL) return 1;",
          "note": "限制读入容量，并检查是否成功。fgets 可能保留换行，缓冲区足够时会写入终止符。"
        },
        {
          "type": "\n    int count = 0;",
          "note": "还没有看到 a，计数从零开始。"
        },
        {
          "type": "\n    for (int i = 0; text[i] != '\\0'; i++) {",
          "note": "从第一个字符扫描，到终止符前停止。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "统计匹配字符",
      "say": [
        "只在当前字符是小写 a 时计数。"
      ],
      "file": "main.c",
      "ops": [
        {
          "type": "\n        if (text[i] == 'a') count++;",
          "note": "只在当前字符是小写 a 时计数。"
        },
        {
          "type": "\n    }",
          "note": "所有有效字符已经检查。"
        },
        {
          "type": "\n    printf(\"%d\\n\", count);",
          "note": "输出出现次数。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "输出并结束",
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
            "3"
          ]
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "再试一步",
      "doc": [
        "测试空行与 Apple，结果都为 0；本例区分大小写。",
        "练习：同时统计大写 A。",
        "超长一行可能被分成多次读取，本例约定不超过 99 个字符；处理任意长输入时需要额外的分段逻辑。"
      ]
    }
  ],
  "preset": {
    "input.txt": "banana\n"
  }
});
})(typeof window !== "undefined" ? window : globalThis);
