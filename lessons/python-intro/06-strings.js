(function(root){
 root.Catalog.addChapter("python-intro", {
  "id": "intro-py-strings",
  "title": "字符串与文本处理",
  "summary": "字符串是有顺序的文本，可以取下标和切片，但不能直接改写某个位置。",
  "files": [
    "main.py"
  ],
  "docName": "学习笔记.md",
  "docKicker": "程序设计基础",
  "steps": [
    {
      "section": "前置知识",
      "title": "字符串与文本处理",
      "doc": [
        "字符串是有顺序的文本，可以取下标和切片，但不能直接改写某个位置。",
        "方法是附在值后面的操作，例如 `text.lower()` 得到小写版本。它返回新字符串，不会原地修改 text。",
        "`strip()` 去掉两端的空白，`split()` 按空白分出单词。字符串的 `==` 比较内容；判断相同文字不使用 `is`。",
        "<a href=\"https://docs.python.org/3/tutorial/\" target=\"_blank\" rel=\"noopener\">查阅语言文档 ↗</a>"
      ]
    },
    {
      "section": "题目与思路",
      "title": "题目",
      "doc": [
        "给定文本 \"  Hello Python  \"，去掉两端空白并改成小写，再输出单词数。输出 hello python 和 2。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "思路",
      "doc": [
        "**整理**：去掉两端空白，再转小写。",
        "**拆分**：按空白拆成单词列表。",
        "**统计**：输出整理结果和列表长度。"
      ]
    },
    {
      "section": "写代码",
      "title": "逐步整理文本",
      "say": [
        "保留包含空白的原文本，方便观察变化。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "text = \"  Hello Python  \"",
          "note": "保留包含空白的原文本，方便观察变化。"
        },
        {
          "type": "\nclean = text.strip().lower()",
          "note": "先去掉两端空白，再把返回的新文本变成小写。"
        },
        {
          "type": "\nwords = clean.split()",
          "note": "按空白拆分，得到单词列表。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "查看结果",
      "say": [
        "先查看整理后的完整文本。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "\nprint(clean)",
          "note": "先查看整理后的完整文本。"
        },
        {
          "type": "\nprint(len(words))",
          "note": "列表里每项是一个单词，长度就是单词数。"
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
            "hello python",
            "2"
          ]
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "再试一步",
      "doc": [
        "把 text 换成只有空格的字符串，单词数应为 0。",
        "练习：把单词用连字符连起来，查阅 `str.join` 后再写。"
      ]
    }
  ]
});
})(typeof window !== "undefined" ? window : globalThis);
