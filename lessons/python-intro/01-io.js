(function(root){
 root.Catalog.addChapter("python-intro", {
  "id": "intro-py-io",
  "title": "输入、变量与输出",
  "summary": "程序是一串按顺序执行的指令。我们先让它接收一个名字，再输出问候语。",
  "files": [
    "main.py"
  ],
  "docName": "学习笔记.md",
  "docKicker": "程序设计基础",
  "steps": [
    {
      "section": "前置知识",
      "title": "输入、变量与输出",
      "doc": [
        "程序是一串按顺序执行的指令。我们先让它接收一个名字，再输出问候语。",
        "解释器是执行 Python 代码的程序。安装 Python 3 后，把文本保存为 `main.py`，在文件所在目录运行 `python3 main.py`；Windows 也可使用 `py main.py`。",
        "变量是给一个值起的名字。`=` 把右边的值交给左边的名字，不是数学里的等号。字符串是文本，写在引号内；`input()` 读入一行文本，`print()` 输出内容。",
        "<a href=\"https://docs.python.org/3/tutorial/\" target=\"_blank\" rel=\"noopener\">查阅语言文档 ↗</a>",
        {
          "ref": {
            "api": "print",
            "source": "CPython 文档源文件",
            "url": "https://docs.python.org/3/library/functions.html#print",
            "quote": "Print objects to the text stream file, separated by sep and followed by end.",
            "zh": "把各项输出到文本流，项之间用 sep 分隔，末尾加上 end。"
          }
        }
      ]
    },
    {
      "section": "题目与思路",
      "title": "题目",
      "doc": [
        "输入一行名字，长度为 1 到 20 个字符，输出 Hello 和这个名字。样例输入：Ada；样例输出：Hello Ada。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "怎么想到的",
      "doc": [
        "问候语有固定的一部分，也有随输入改变的一部分。把名字直接写死，下次就得改程序。",
        "所以先接收名字，再把固定文字和名字一起交给输出功能。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "思路",
      "doc": [
        "**输入**：读取一行文本，保存在 `name` 中。",
        "**输出**：打印固定文字与名字，两个参数之间默认有一个空格。"
      ]
    },
    {
      "section": "写代码",
      "title": "读入名字，输出问候",
      "say": [
        "名字来自读者，先读一行文本，并用 `name` 留住它。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "name = input()",
          "note": "名字来自读者，先读一行文本，并用 `name` 留住它。"
        },
        {
          "type": "\nprint(\"Hello\", name)",
          "note": "现在把固定的 Hello 和名字一起输出。逗号分隔两个参数，`print` 默认在它们之间加空格，并在末尾换行。"
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "运行这个例子",
      "say": [
        "在本地保存代码后，运行下面的命令。示例输入已放在 `input.txt` 中；`<` 把文件内容送给程序，直接运行程序时也可以手动输入。",
        "网页终端展示此例的运行过程；修改代码和输入需要在本地编辑器中完成。"
      ],
      "ops": [
        {
          "run": "python3 main.py < input.txt",
          "output": [
            "Hello Ada"
          ]
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "再试一步",
      "doc": [
        "把输入换成 Lin，预测输出后再运行。",
        "思考：`print(\"name\")` 和 `print(name)` 有什么区别？引号内是原样输出的文本，引号外是变量名。",
        "练习：再读一行城市名，第二行输出 City 和城市名。"
      ]
    }
  ],
  "preset": {
    "input.txt": "Ada\n"
  }
});
})(typeof window !== "undefined" ? window : globalThis);
