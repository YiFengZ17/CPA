(function(root){
 root.Catalog.addChapter("python-intro", {
  "id": "intro-py-sequences",
  "title": "列表、元组与下标",
  "summary": "列表按顺序保存多个值，可以修改。下标是元素的位置编号，从 0 开始。长度为 n 的列表，合法的非负下标是 0 到 n−1。",
  "files": [
    "main.py"
  ],
  "docName": "学习笔记.md",
  "docKicker": "程序设计基础",
  "steps": [
    {
      "section": "前置知识",
      "title": "列表、元组与下标",
      "doc": [
        "列表按顺序保存多个值，可以修改。下标是元素的位置编号，从 0 开始。长度为 n 的列表，合法的非负下标是 0 到 n−1。",
        "`append` 在末尾增加元素；`len` 得到长度。切片 `a[start:stop]` 取出一段，不包含 stop。",
        "元组也保存有顺序的一组值，但不能替换它的元素。`(3, 5)` 可以表达一个不准备修改的坐标。列表适合逐步收集分数。",
        "<a href=\"https://docs.python.org/3/tutorial/\" target=\"_blank\" rel=\"noopener\">查阅语言文档 ↗</a>"
      ]
    },
    {
      "section": "题目与思路",
      "title": "题目",
      "doc": [
        "给定分数列表 [72, 95, 60, 88]，输出最高分与最后两项。输出两行：95 和 [60, 88]。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "思路",
      "doc": [
        "**前提**：列表非空。",
        "**扫描**：用第一项初始化最大值，逐个比较。",
        "**取段**：最后两项使用负下标切片。时间 O(n)，扫描额外空间 O(1)。"
      ]
    },
    {
      "section": "写代码",
      "title": "准备列表与最大值",
      "say": [
        "把同一类数据放进一个列表。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "scores = [72, 95, 60, 88]",
          "note": "把同一类数据放进一个列表。"
        },
        {
          "type": "\nbest = scores[0]",
          "note": "列表非空，先用第一项作为已有最大值。"
        },
        {
          "type": "\nfor score in scores:",
          "note": "逐个取出分数，不必记住每个下标。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "比较并更新记录",
      "say": [
        "只有遇到更大的分数才需要改记录。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "\n    if score > best:",
          "note": "只有遇到更大的分数才需要改记录。"
        },
        {
          "type": "\n        best = score",
          "note": "把更大的分数保存下来。这里两层缩进表示它同时属于循环和分支。"
        },
        {
          "type": "\nprint(best)",
          "note": "扫描结束，留下的就是最大值。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "查看最后两项",
      "say": [
        "负下标从末尾数，-2 表示倒数第二项；省略终点表示一直取到末尾。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "\nprint(scores[-2:])",
          "note": "负下标从末尾数，-2 表示倒数第二项；省略终点表示一直取到末尾。"
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
            "95",
            "[60, 88]"
          ]
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "再试一步",
      "doc": [
        "把列表换成 [60]，最高分仍是 60，切片会得到 [60]。",
        "空列表不能读取第 0 项。练习：先判断列表是否为空，再输出 No scores 或最大值。",
        "再练习：把坐标 (3, 5) 解包成 x、y，输出两者的和。"
      ]
    }
  ]
});
})(typeof window !== "undefined" ? window : globalThis);
