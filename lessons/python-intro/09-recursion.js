(function(root){
 root.Catalog.addChapter("python-intro", {
  "id": "intro-py-recursion",
  "title": "递归与停止条件",
  "summary": "递归是函数在执行时调用自身。它适用于能缩小成同类问题的任务。",
  "files": [
    "main.py"
  ],
  "docName": "学习笔记.md",
  "docKicker": "程序设计基础",
  "steps": [
    {
      "section": "前置知识",
      "title": "递归与停止条件",
      "doc": [
        "递归是函数在执行时调用自身。它适用于能缩小成同类问题的任务。",
        "递归需要停止条件，也需要每次向停止条件靠近。每一次调用都有自己的局部变量。",
        "递归会占用调用栈空间。本例只处理 0 到 10，不用它处理很深的输入。",
        "<a href=\"https://docs.python.org/3/tutorial/\" target=\"_blank\" rel=\"noopener\">查阅语言文档 ↗</a>"
      ]
    },
    {
      "section": "题目与思路",
      "title": "题目",
      "doc": [
        "计算 n 的阶乘，0 ≤ n ≤ 10。0 的阶乘规定为 1；正整数的阶乘是从 1 到它自己的连乘。例：5 的阶乘为 120。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "思路",
      "doc": [
        "**停止**：n 为 0 时返回 1。",
        "**缩小**：返回 n 乘以 n−1 的阶乘。",
        "**代价**：时间 O(n)，调用栈空间 O(n)。"
      ]
    },
    {
      "section": "写代码",
      "title": "写出停止条件",
      "say": [
        "函数接收一个非负整数。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "def factorial(n):",
          "note": "函数接收一个非负整数。"
        },
        {
          "type": "\n    if n == 0:",
          "note": "先检查最小情况，否则递归会继续减到负数。"
        },
        {
          "type": "\n        return 1",
          "note": "按阶乘定义返回 1，结束这一层。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "缩小问题并调用",
      "say": [
        "把更小的阶乘算出来，再乘上当前的 n。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "\n    return n * factorial(n - 1)",
          "note": "把更小的阶乘算出来，再乘上当前的 n。"
        },
        {
          "type": "\nprint(factorial(5))",
          "note": "观察普通输入逐层返回后的结果。"
        },
        {
          "type": "\nprint(factorial(0))",
          "note": "再检查停止条件本身。"
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
            "120",
            "1"
          ]
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "再试一步",
      "doc": [
        "手写 n=3 的调用顺序，再反向写返回值。",
        "练习：用循环计算同一结果。比较两种写法各自保存了哪些状态。"
      ]
    }
  ]
});
})(typeof window !== "undefined" ? window : globalThis);
