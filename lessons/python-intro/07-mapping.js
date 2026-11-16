(function(root){
 root.Catalog.addChapter("python-intro", {
  "id": "intro-py-mapping",
  "title": "集合与字典",
  "summary": "集合保存不重复的元素，适合判断某个值出现过没有；不要依赖集合的遍历顺序。",
  "files": [
    "main.py"
  ],
  "docName": "学习笔记.md",
  "docKicker": "程序设计基础",
  "steps": [
    {
      "section": "前置知识",
      "title": "集合与字典",
      "doc": [
        "集合保存不重复的元素，适合判断某个值出现过没有；不要依赖集合的遍历顺序。",
        "字典把键与值对应起来，例如把单词对应到次数。键用于查找，值保存查找结果。",
        "`counts.get(word, 0)` 在键不存在时返回 0，不会先插入键。字典的键必须可哈希，字符串可以，列表不可以。",
        "<a href=\"https://docs.python.org/3/tutorial/\" target=\"_blank\" rel=\"noopener\">查阅语言文档 ↗</a>"
      ]
    },
    {
      "section": "题目与思路",
      "title": "题目",
      "doc": [
        "给定单词列表 [\"red\", \"blue\", \"red\"]，输出不同单词数和 red 的次数。输出两行：2、2。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "怎么想到的",
      "doc": [
        "判断有几种单词，只关心某个词是否出现；统计频率还要记住出现多少次。",
        "这两个需求分别对应集合与字典。每读一个词，把已有次数增加一；第一次出现时，已有次数就是零。"
      ]
    },
    {
      "section": "题目与思路",
      "title": "思路",
      "doc": [
        "**去重**：从列表构造集合，取长度。",
        "**计数**：遍历列表，用字典保存次数。",
        "**查询**：用 get 取得指定单词的计数。"
      ]
    },
    {
      "section": "写代码",
      "title": "准备去重集合与次数表",
      "say": [
        "准备一组含重复项的文本。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "words = [\"red\", \"blue\", \"red\"]",
          "note": "准备一组含重复项的文本。"
        },
        {
          "type": "\nunique = set(words)",
          "note": "集合会合并重复元素，保留不同单词。"
        },
        {
          "type": "\ncounts = {}",
          "note": "还没有处理任何单词，次数表先为空。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "计数并查看种类",
      "say": [
        "每次只处理一个单词。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "\nfor word in words:",
          "note": "每次只处理一个单词。"
        },
        {
          "type": "\n    counts[word] = counts.get(word, 0) + 1",
          "note": "第一次遇到时从 0 加一，后来遇到就在已有次数上加一。"
        },
        {
          "type": "\nprint(len(unique))",
          "note": "输出不同单词的数量。"
        }
      ]
    },
    {
      "section": "写代码",
      "title": "查询单词次数",
      "say": [
        "查询 red；如果没有出现，就输出 0。"
      ],
      "file": "main.py",
      "ops": [
        {
          "type": "\nprint(counts.get(\"red\", 0))",
          "note": "查询 red；如果没有出现，就输出 0。"
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
            "2",
            "2"
          ]
        }
      ]
    },
    {
      "section": "运行与练习",
      "title": "再试一步",
      "doc": [
        "换成空列表，两项结果都应为 0。",
        "练习：按单词字母顺序输出全部频率，先用 `sorted(counts)` 得到键的顺序。"
      ]
    }
  ]
});
})(typeof window !== "undefined" ? window : globalThis);
