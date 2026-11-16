(function(root){
 root.Catalog.addChapter("python-intro", {
  "id": "intro-py-files",
  "title": "异常与文本文件",
  "summary": "异常表示当前操作无法按正常路径完成，例如把 abc 转成整数。try / except 可以专门处理预期的失败。",
  "files": [
    "main.py"
  ],
  "docName": "学习笔记.md",
  "docKicker": "程序设计基础",
  "steps": [
    {
      "section": "前置知识",
      "title": "异常与文本文件",
      "doc": [
        "异常表示当前操作无法按正常路径完成，例如把 abc 转成整数。`try / except` 可以专门处理预期的失败。",
        "文件把数据留在程序运行之外。文本文件读出的是字符串，数值仍需转换。",
        "`with open(..., encoding=\"utf-8\")` 在离开代码块时关闭文件。`r` 用于读取，`w` 写入时会覆盖原有内容。",
        "<a href=\"https://docs.python.org/3/tutorial/\" target=\"_blank\" rel=\"noopener\">查阅语言文档 ↗</a>"
      ]
    },
    {
      "section": "题目与思路",
      "title": "题目",
      "doc": [
        "读取 scores.txt，其中每行一个整数或无效文本。忽略不能转换为整数的行，把有效整数的和写到 total.txt 并输出。示例内容为 80、oops、90，输出 170。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "怎么想到的",
      "doc": [
        "文件不能保证每行都是数字。先尝试转换，只有转换成功才把数值加入和。",
        "错误处理只包住转换这件事，避免把别的程序错误也当成无效输入吞掉。最后再写出总和。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "思路",
      "doc": [
        "**读取**：逐行读取 UTF-8 文本。",
        "**筛选**：只捕获整数转换的 ValueError，无效行跳过。",
        "**保存**：写出总和。缺失文件会引发 FileNotFoundError，本例要求输入文件存在。"
      ]
    },
    {
      "section": "写代码",
      "title": "打开文件，逐行读取",
      "say": [
        "没有读入有效数字前，总和为 0。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "total = 0",
          "note": "没有读入有效数字前，总和为 0。"
        },
        {
          "type": "\nwith open(\"scores.txt\", encoding=\"utf-8\") as source:",
          "note": "打开准备好的文本文件，with 负责在结束后关闭它。"
        },
        {
          "type": "\n    for line in source:",
          "note": "逐行读取，不必一次把整个文件装进内存。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "尝试转换，识别失败",
      "say": [
        "这一小段可能遇到不能转成数字的文本。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "\n        try:",
          "note": "这一小段可能遇到不能转成数字的文本。"
        },
        {
          "type": "\n            value = int(line.strip())",
          "note": "去掉行尾换行和两端空白，再尝试转成整数。"
        },
        {
          "type": "\n        except ValueError:",
          "note": "只接住数字格式不合法这一类异常。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "跳过无效行，累计整数",
      "say": [
        "无效行不参与统计，继续处理下一行。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "\n            continue",
          "note": "无效行不参与统计，继续处理下一行。"
        },
        {
          "type": "\n        total += value",
          "note": "能走到这里，说明转换成功，加入总和。"
        },
        {
          "type": "\nwith open(\"total.txt\", \"w\", encoding=\"utf-8\") as target:",
          "note": "读取已结束，打开结果文件准备写入。w 会覆盖它原来的内容。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "写出结果",
      "say": [
        "把总和转成文本写入文件，并补上换行。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "\n    target.write(f\"{total}\\n\")",
          "note": "把总和转成文本写入文件，并补上换行。"
        },
        {
          "type": "\nprint(total)",
          "note": "同时在终端输出，方便检查。"
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "运行这个例子",
      "say": [
        "在本地保存代码后，运行下面的命令。",
        "网页终端展示此例的运行过程；修改代码和输入需要在本地编辑器中完成。"
      ],
      "ops": [
        {
          "run": "python3 main.py",
          "output": [
            "170"
          ]
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "再试一步",
      "doc": [
        "打开 total.txt，确认其中是一行 170。",
        "空文件或全是无效行时结果为 0。",
        "练习：另加一个计数器，输出有效行数量；再单独处理输入文件不存在的情况。"
      ]
    }
  ],
  "preset": {
    "scores.txt": "80\noops\n90\n"
  }
});
})(typeof window !== "undefined" ? window : globalThis);
