(function(root){
 root.Catalog.addChapter("python-intro", {
  "id": "intro-py-branches",
  "title": "条件与分支",
  "summary": "分支让程序根据条件选择要执行的语句。条件的值是 True 或 False，也就是成立或不成立。",
  "files": [
    "main.py"
  ],
  "docName": "学习笔记.md",
  "docKicker": "程序设计基础",
  "steps": [
    {
      "section": "前置知识",
      "title": "条件与分支",
      "doc": [
        "分支让程序根据条件选择要执行的语句。条件的值是 `True` 或 `False`，也就是成立或不成立。",
        "`==` 比较是否相等，`!=` 比较是否不同，`< <= > >=` 比较大小。`and` 要求两边都成立，`or` 要求至少一边成立。",
        "`if / elif / else` 从上往下判断，只进入第一个满足条件的分支。冒号后的缩进表示哪些语句属于这个分支。",
        "<a href=\"https://docs.python.org/3/tutorial/\" target=\"_blank\" rel=\"noopener\">查阅语言文档 ↗</a>"
      ]
    },
    {
      "section": "题目与思路",
      "title": "题目",
      "doc": [
        "输入一个 0 到 100 的整数分数。90 分及以上输出 A，60 到 89 输出 Pass，其余输出 Retry。样例输入 89，输出 Pass。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "思路",
      "doc": [
        "**顺序**：先判断高分，再判断及格。",
        "**边界**：90 属于 A，60 属于 Pass，使用大于等于。"
      ]
    },
    {
      "section": "写代码",
      "title": "先检查最高一档",
      "say": [
        "先取得要分类的分数。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "score = int(input())",
          "note": "先取得要分类的分数。"
        },
        {
          "type": "\nif score >= 90:",
          "note": "先检查是否达到最高一档。冒号后换行并缩进，表示这一档要做什么。"
        },
        {
          "type": "\n    print(\"A\")",
          "note": "满足最高一档就输出 A。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "再检查及格线",
      "say": [
        "能来到这里，说明分数小于 90，只需继续检查是否及格。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "\nelif score >= 60:",
          "note": "能来到这里，说明分数小于 90，只需继续检查是否及格。"
        },
        {
          "type": "\n    print(\"Pass\")",
          "note": "达到 60 就输出 Pass。"
        },
        {
          "type": "\nelse:",
          "note": "前两段都没接住的分数交给最后一个分支。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "处理剩余情况",
      "say": [
        "剩下的分数低于 60。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "\n    print(\"Retry\")",
          "note": "剩下的分数低于 60。"
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
            "Pass"
          ]
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "再试一步",
      "doc": [
        "分别测试 0、59、60、89、90、100，检查分界。",
        "练习：加入 80 到 89 的 B 档，它应该放在哪里？"
      ]
    }
  ],
  "preset": {
    "input.txt": "89\n"
  }
});
})(typeof window !== "undefined" ? window : globalThis);
