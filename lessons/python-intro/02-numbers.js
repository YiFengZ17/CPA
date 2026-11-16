(function(root){
 root.Catalog.addChapter("python-intro", {
  "id": "intro-py-numbers",
  "title": "数字、转换与表达式",
  "summary": "数值用于计算，字符串用于保存文本。输入的 \"12\" 是文本，转换成整数后才能按数量计算。",
  "files": [
    "main.py"
  ],
  "docName": "学习笔记.md",
  "docKicker": "程序设计基础",
  "steps": [
    {
      "section": "前置知识",
      "title": "数字、转换与表达式",
      "doc": [
        "数值用于计算，字符串用于保存文本。输入的 `\"12\"` 是文本，转换成整数后才能按数量计算。",
        "`int` 表示整数，`float` 表示浮点数。`+ - * /` 分别做加减乘除；`/` 得到浮点结果，`//` 做向下取整的除法，`%` 求余数。",
        "表达式由值和运算符组成，算完得到一个值。括号能明确运算顺序。f 字符串把表达式的结果放进文字里，`:.2f` 表示保留两位小数显示。",
        "<a href=\"https://docs.python.org/3/tutorial/\" target=\"_blank\" rel=\"noopener\">查阅语言文档 ↗</a>"
      ]
    },
    {
      "section": "题目与思路",
      "title": "题目",
      "doc": [
        "输入两行：购买数量 n 和单价 price。1 ≤ n ≤ 100，0 ≤ price ≤ 100。输出总价，保留两位小数。样例：3、2.5，输出 7.50。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "怎么想到的",
      "doc": [
        "总价由数量和单价决定。数量应当是整数，单价可以有小数。",
        "先转换输入，再计算乘积；最后才决定显示几位小数，避免把格式和计算混在一起。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "思路",
      "doc": [
        "**读取**：用 `int` 和 `float` 分别转换两行输入。",
        "**计算**：数量乘单价。",
        "**显示**：用两位小数输出。浮点数是近似表示，严谨的货币计算可用整数分，本例只学习数值与显示。"
      ]
    },
    {
      "section": "写代码",
      "title": "读取数值，计算总价",
      "say": [
        "数量要参与运算，把读到的文本转换为整数。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "count = int(input())",
          "note": "数量要参与运算，把读到的文本转换为整数。"
        },
        {
          "type": "\nprice = float(input())",
          "note": "单价可能有小数，用浮点数接收。"
        },
        {
          "type": "\ntotal = count * price",
          "note": "一件商品花 price 元，count 件就是相乘。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "控制输出格式",
      "say": [
        "计算已经结束，现在用 `.2f` 规定输出格式。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "\nprint(f\"{total:.2f}\")",
          "note": "计算已经结束，现在用 `.2f` 规定输出格式。"
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
            "7.50"
          ]
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "再试一步",
      "doc": [
        "输入 1 和 0，结果应为 0.00。",
        "练习：输入总分钟数，分别输出小时和剩余分钟。先想清楚整除与余数分别保留了什么。"
      ]
    }
  ],
  "preset": {
    "input.txt": "3\n2.5\n"
  }
});
})(typeof window !== "undefined" ? window : globalThis);
