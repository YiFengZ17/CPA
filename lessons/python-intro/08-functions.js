(function(root){
 root.Catalog.addChapter("python-intro", {
  "id": "intro-py-functions",
  "title": "函数、参数与作用域",
  "summary": "函数把一段操作命名，之后通过调用复用。参数接收传入的值，返回值把计算结果交回调用处。",
  "files": [
    "main.py"
  ],
  "docName": "学习笔记.md",
  "docKicker": "程序设计基础",
  "steps": [
    {
      "section": "前置知识",
      "title": "函数、参数与作用域",
      "doc": [
        "函数把一段操作命名，之后通过调用复用。参数接收传入的值，返回值把计算结果交回调用处。",
        "函数定义时不执行函数体，调用时才执行。`return` 会结束当前调用；没有显式返回值时返回 None。",
        "作用域是名字能够被使用的范围。函数内创建的局部变量通常不能在函数外直接使用。参数名是函数内部的名字，不必和外部变量同名。",
        "<a href=\"https://docs.python.org/3/tutorial/\" target=\"_blank\" rel=\"noopener\">查阅语言文档 ↗</a>"
      ]
    },
    {
      "section": "题目与思路",
      "title": "题目",
      "doc": [
        "写一个计算长方形面积的函数。分别计算长宽为 (3, 4) 与 (5, 2) 的面积，输出 12 和 10。尺寸为非负整数。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "怎么想到的",
      "doc": [
        "两次计算只在数据上不同，运算规则相同。把规则写一次，把不同的数据作为参数传入。",
        "让函数返回面积而不是直接打印，调用者就可以决定输出、比较，或者接着计算。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "思路",
      "doc": [
        "**输入**：length 和 width 两个参数。",
        "**返回**：两者的乘积。",
        "**调用**：传入两组尺寸，在外部输出结果。"
      ]
    },
    {
      "section": "写代码",
      "title": "定义面积函数",
      "say": [
        "给计算规则起名 area，并列出它需要的两项数据。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "def area(length, width):",
          "note": "给计算规则起名 area，并列出它需要的两项数据。"
        },
        {
          "type": "\n    result = length * width",
          "note": "在函数内部计算面积，result 是本次调用的局部名字。"
        },
        {
          "type": "\n    return result",
          "note": "把结果交回调用处，函数在这里结束。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "用不同参数调用",
      "say": [
        "先执行函数，返回 12，再由 print 输出。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "\nprint(area(3, 4))",
          "note": "先执行函数，返回 12，再由 print 输出。"
        },
        {
          "type": "\nprint(area(5, 2))",
          "note": "同一段规则处理另一组数据，不必再写一次乘法。"
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
            "12",
            "10"
          ]
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "再试一步",
      "doc": [
        "面积函数接收 0 和 5 时应返回 0。",
        "练习：写周长函数 perimeter，再比较返回值和打印值的区别。",
        "思考：在函数外直接访问 result 会怎样？它不在外部作用域内。"
      ]
    }
  ]
});
})(typeof window !== "undefined" ? window : globalThis);
