(function(root){
 root.Catalog.addChapter("python-intro", {
  "id": "intro-py-loops",
  "title": "循环与累计",
  "summary": "循环把一组操作重复执行。for 依次取出序列中的元素，while 在条件成立时重复。",
  "files": [
    "main.py"
  ],
  "docName": "学习笔记.md",
  "docKicker": "程序设计基础",
  "steps": [
    {
      "section": "前置知识",
      "title": "循环与累计",
      "doc": [
        "循环把一组操作重复执行。`for` 依次取出序列中的元素，`while` 在条件成立时重复。",
        "`range(start, stop)` 包含 start，不包含 stop。`range(1, 6)` 依次产生 1 到 5。",
        "累计量记录已经处理的结果。求和从 0 开始，因为还没加任何数。`break` 结束整个循环，`continue` 跳过本轮剩余语句。",
        "<a href=\"https://docs.python.org/3/tutorial/\" target=\"_blank\" rel=\"noopener\">查阅语言文档 ↗</a>"
      ]
    },
    {
      "section": "题目与思路",
      "title": "题目",
      "doc": [
        "输入 n，1 ≤ n ≤ 1000，输出从 1 到 n 的整数和。样例输入 5，输出 15。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "怎么想到的",
      "doc": [
        "可以把加法写很多遍，但 n 由输入决定，代码长度不能跟着变。",
        "只需要重复同一件事：拿到下一个数，加进已经得到的和。每轮结束时，累计量就是前面那些数的和。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "思路",
      "doc": [
        "**初始**：`total = 0`。",
        "**重复**：依次处理 1 到 n，把当前数字加到 total。",
        "**停止**：n 处理完后输出。时间 O(n)，额外空间 O(1)。"
      ]
    },
    {
      "section": "写代码",
      "title": "准备累计量与循环",
      "say": [
        "先取得最后一个要相加的数。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "n = int(input())",
          "note": "先取得最后一个要相加的数。"
        },
        {
          "type": "\ntotal = 0",
          "note": "还没有处理数字，和从 0 开始。"
        },
        {
          "type": "\nfor value in range(1, n + 1):",
          "note": "range 不含右端点，所以用 n + 1 才能处理到 n。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "累加后输出",
      "say": [
        "把这一个数加进已有的和。`+=` 是加完再赋值的简写。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "\n    total += value",
          "note": "把这一个数加进已有的和。`+=` 是加完再赋值的简写。"
        },
        {
          "type": "\nprint(total)",
          "note": "循环结束后再输出，所以这一行回到最左边。"
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
            "15"
          ]
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "再试一步",
      "doc": [
        "n 为 1 时只循环一次，输出 1。",
        "练习：改成只累加偶数，再试用 while 完成相同任务。while 每轮必须推进当前数字，否则可能一直停不下来。"
      ]
    }
  ],
  "preset": {
    "input.txt": "5\n"
  }
});
})(typeof window !== "undefined" ? window : globalThis);
