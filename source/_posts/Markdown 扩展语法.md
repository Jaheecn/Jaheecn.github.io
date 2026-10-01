---
title: Markdown 扩展语法
author: Markdown Guide
url: https://www.markdown.xyz/extended-syntax/

date: 2026-08-17 00:00:00
order: 3
tags:
  - Markdown语法
---
构建在 Markdown 基本语法上的扩展功能。

## 概述

即便 John Gruber 的原始设计文档中所列出的 [Markdown 基本语法](https://www.markdown.xyz/basic-syntax) 已经囊括了许多满足日常所需的元素，但对于某些人来说仍然不够。这就是 Markdown 扩展语法出现的缘由。

一些个人和组织通过添加表格（tables）、代码块（code blocks）、语法高亮、将 URL 自动转换为链接和脚注（footnotes）等额外的元素来扩展 Markdown 的基本语法。这些额外添加的元素可以通过使用构建于 Markdown 之上的轻量级标记语言或通过向兼容的 Markdown 解析器添加扩展来启用这些新元素。

## 可用性

并非所有的 Markdown 应用程序都支持扩展语法。你需要确认你所使用的应用程序是否支持你所需要使用的扩展语法。如果不支持，则有可能是需要开启相应的扩展模块。

### 轻量级标记语言

目前有几种轻量级标记语言是 Markdown 的 *超集* 。它们支持 Gruber 的基本语法，并在其基础上添加了一些额外的元素，例如表格（tables）、代码块（code blocks）、语法高亮、将 URL 自动转换为链接和脚注（footnotes）。许多流行的 Markdown 应用程序能够支持以下列出的某个轻量级标记语言：

- [CommonMark](https://commonmark.org/)
- [GitHub Flavored Markdown (GFM)](https://github.github.com/gfm/)
- [Markdown Extra](https://michelf.ca/projects/php-markdown/extra/)
- [MultiMarkdown](https://fletcherpenney.net/multimarkdown/)
- [R Markdown](https://rmarkdown.rstudio.com/)

### Markdown 解析器

目前可用的 [Markdown 解析器有数十个](https://github.com/markdown/markdown.github.com/wiki/Implementations) 。其中许多都可以通过添加扩展模块的方式来支持 Markdown 扩展语法。请查看你所使用的 Markdown 解析器的文档以了解更多信息。

## 表格（Tables）

如需添加表格，请使用三个或更多个连字符（`---`）来为每个列创建表头，并使用管道符（`|`）来分隔每个列。为兼容考虑，你还应该在行的两侧添加管道符。

```
| Syntax      | Description |
| ----------- | ----------- |
| Header      | Title       |
| Paragraph   | Text        |
```

渲染效果如下所示：

| Syntax    | Description |
| --------- | ----------- |
| Header    | Title       |
| Paragraph | Text        |

单元格（cell）宽度是可变的，如下所示。渲染效果相同。

```
| Syntax | Description |
| --- | ----------- |
| Header | Title |
| Paragraph | Text |
```

**提示：** 使用连字符（hyphens）和管道符（pipes）创建表格会很乏味。若要加快进度，请试一试 [Markdown 表格生成器](https://www.tablesgenerator.com/markdown_tables)。使用图形界面生成表格，然后将生成的 Markdown 格式的文本复制粘贴到文件中即可。

### 对齐

通过在标题行中的连字符（hyphens）的左侧或右侧或两侧添加冒号（`:`），可以将对应列中的文本向左或向右或居中对齐。

```
| Syntax      | Description | Test Text     |
| :---        |    :----:   |          ---: |
| Header      | Title       | Here's this   |
| Paragraph   | Text        | And more      |
```

渲染效果如下所示：

| Syntax    | Description |   Test Text |
| :-------- | :---------: | ----------: |
| Header    |    Title    | Here’s this |
| Paragraph |    Text     |    And more |

### 格式化表格中的文本

你可以为表格中的文本设置格式。例如，可以添加 [链接（links）](https://www.markdown.xyz/basic-syntax/#links)、[代码（code）](https://www.markdown.xyz/basic-syntax/#code-1) （注意，只能为单词或短语添加反引号 (```) ，不能添加 [代码块（code blocks）](https://www.markdown.xyz/basic-syntax/#code-blocks)）以及 [强调（emphasis）](https://www.markdown.xyz/basic-syntax/#emphasis)。

不支持的格式包括标题（headings）、块引用（blockquotes）、列表（lists）、水平分割线（horizontal rules）、图片（images）或 HTML 标记。

### 转义表格中出现的管道符（Pipe Characters）

如需在表格中显示管道符 (`|`)，你可以使用管道符的 HTML 字符编码（`|`）来实现。

## 围栏代码块（Fenced Code Blocks）

Markdown 的基本语法允许你通过缩进四个空格或一个制表符来创建 [代码块](https://www.markdown.xyz/basic-syntax#code-blocks) 。如果你觉得不方便，可以试试围栏代码块（fenced code blocks）。根据 Markdown 解析器或编辑器的不同，代码块的前后可以使用三个反引号（`````）或三个波浪号（`~~~`）来标记围栏代码块。这有什么优势吗？你不必费力缩进任何行了！

````
```
{
  "firstName": "John",
  "lastName": "Smith",
  "age": 25
}
```
````

渲染效果如下所示：

```
{
  "firstName": "John",
  "lastName": "Smith",
  "age": 25
}
```

**提示：** 需要在代码块中显示反引号（backticks）吗？请参见 [这一章节](https://www.markdown.xyz/basic-syntax/#escaping-backticks) 以了解如何对其进行转义。

### 语法高亮

许多 Markdown 解析器都支持围栏代码块的语法高亮功能。此功能允许你为编写代码所用的编程语言添加带颜色的语法高亮显示。如需添加语法高亮，请在围栏代码块前的反引号旁指定所用的编程语言。

````
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "age": 25
}
```
````

渲染效果如下所示：

```
{
  "firstName": "John",
  "lastName": "Smith",
  "age": 25
}
```

## 脚注（Footnotes）

脚注（Footnotes）允许你添加注释（notes）和引用（references），而不会使文档正文混乱。当你创建脚注时，带有链接的上标数字会出现在你引用脚注的位置。 读者可以单击链接以跳转至页面底部的脚注内容处。

要创建一个脚注的引用，请在方括号中添加一个插入符（caret）以及一个标识符，标识符可以是数字或单词，但不能包含空格或制表符。标识符的作用仅是将脚注的引用和脚注本身进行关联，在输出中，脚注按顺序编号。

另一种创建脚注的方式是在方括号内添加一个插入符（caret）以及一个数字，后面跟着冒号和文本，即（`[^1]: My footnote.`）。这种方式让你不必在文档末尾添加脚注。你可以将脚注放到除列表（lists）、块引用（block quotes）和表格（tables）之外的任何位置上。

```
Here's a simple footnote,[^1] and here's a longer one.[^bignote]

[^1]: This is the first footnote.

[^bignote]: Here's one with multiple paragraphs and code.

    Indent paragraphs to include them in the footnote.

    `{ my code }`

    Add as many paragraphs as you like.
```

渲染效果如下所示：

Here’s a simple footnote,[1](https://www.markdown.xyz/extended-syntax/#fn:1) and here’s a longer one.[2](https://www.markdown.xyz/extended-syntax/#fn:bignote)

1. This is the first footnote. [↩](https://www.markdown.xyz/extended-syntax/#fnref:1)

2. Here’s one with multiple paragraphs and code.

   Indent paragraphs to include them in the footnote.

   `{ my code }`

   Add as many paragraphs as you like. [↩](https://www.markdown.xyz/extended-syntax/#fnref:bignote)

## 自定义标题的 ID

许多 Markdown 解析器都支持为 [标题（headings）](https://www.markdown.xyz/basic-syntax/#headings) 自定义 ID，某些 Markdown 解析器会自动为标题添加 ID。通过添加自定义 ID， 能够让你直接链接到这个标题，并且还能使用 CSS 修改其样式。如需为标题添加自定义 ID，请将自定义 ID 用花括号括起来并与标题一起放在同一行。

```
### My Great Heading {#custom-id}
```

输出的 HTML 如下所示：

```
<h3 id="custom-id">My Great Heading</h3>
```

\###链接到标题的 ID

你可以在文档中创建一个 [标准链接](https://www.markdown.xyz/basic-syntax/#links) ，其后是井号（`#`）和自定义的标题 ID ，从而链接到这个标题。

| Markdown                      | HTML                                     | Rendered Output                                              |
| ----------------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| `[Heading IDs](#heading-ids)` | `<a href="#heading-ids">Heading IDs</a>` | [Heading IDs](https://www.markdown.xyz/extended-syntax/#heading-ids) |

其它网站也可以通过将自定义的标题 ID 添加到网页的完整的 URL 后面来链接到对应的标题（例如，`[Heading IDs](https://www.markdown.xyz/extended-syntax#heading-ids)`）。

## 定义列表（Definition Lists）

某些 Markdown 解析器允许你创建术语（terms）及其相应的定义（definitions）的列表，即 *定义列表（definition lists）*。要创建定义列表，请在第一行键入术语，然后在下一行中键入冒号，冒号后跟着空格和此术语的具体定义。

```
First Term
: This is the definition of the first term.

Second Term
: This is one definition of the second term.
: This is another definition of the second term.
```

输出的 HTML 如下所示：

```
<dl>
  <dt>First Term</dt>
  <dd>This is the definition of the first term.</dd>
  <dt>Second Term</dt>
  <dd>This is one definition of the second term. </dd>
  <dd>This is another definition of the second term.</dd>
</dl>
```

渲染效果如下所示：

- First Term

  This is the definition of the first term.

- Second Term

  This is one definition of the second term.

  This is another definition of the second term.

## 删除线（Strikethrough）

你可以贯穿单词的中心放一条横线从而删除这些单词。其效果看起来是这样的： ~~like this~~。此功能允许你标记某些单词是错误的，不应该出现在文档中。在单词前面和后面分别放置两个波浪号（`~~`） 来表示删除这些单词。

```
~~The world is flat.~~ We now know that the world is round.
```

渲染效果如下所示：

~~The world is flat.~~ We now know that the world is round.

## 任务列表（Task Lists）

任务列表（task lists 或者 checklists）允许你创建带有复选框的项目列表。在支持任务列表的 Markdown 应用程序中，复选框将显示在内容旁边。要创建任务列表，请在任务列表项前面添加破折号（`-`）和中间带空格的方括号（`[ ]`）。要选中复选框，请在方括号中间添加一个 `x` ，即（`[x]`）。

```
- [x] Write the press release
- [ ] Update the website
- [ ] Contact the media
```

渲染效果如下所示：

![Markdown task list](https://www.markdown.xyz/assets/images/tasklist.png)

## 表情符号（Emoji）

有两种方式可以将表情符号添加到 Markdown 文档中：将表情符号复制并粘贴到 Markdown 格式的文本中，或者键入 *表情符号的简码（emoji shortcodes）*。

### 复制并粘贴表情符号

在大多数情况下，你可以简单地从 [Emojipedia](https://emojipedia.org/) 等来源复制表情符号，然后将其粘贴到文档中。许多 Markdown 应用程序就会自动以 Markdown 格式的文本来显示表情符号。从 Markdown 应用程序导出的 HTML 和 PDF 文件也是可以显示表情符号的。

**提示：** 如果你使用的是静态站点生成器，请确保 [HTML 页面的字符编码为 UTF-8](https://www.w3.org/International/tutorials/tutorial-char-enc/)。

### 使用表情符号的简码（Shortcodes）

某些 Markdown 应用程序允许你通过键入表情符号的简码（shortcodes）来插入表情符号。简码以冒号开头和结尾，两个冒号中间是表情符号的名称。

```
Gone camping! :tent: Be back soon.

That is so funny! :joy:
```

渲染效果如下所示：

Gone camping! ⛺ Be back soon.

That is so funny! 😂

**注意：** 你可以使用这个 [表情符号简码列表](https://gist.github.com/rxaviers/7360908)，但请记住，表情符号的简码随着 Markdown 应用程序的不同而不同。有关详细信息，请参阅你所使用的 Markdown 应用程序的文档。

## Highlight

This isn’t common, but some Markdown processors allow you to highlight text. The result looks like this. To highlight words, use two equal signs (`==`) before and after the words.

```
I need to highlight these ==very important words==.
```

The HTML looks like this:

```
I need to highlight these <mark>very important words</mark>.
```

The rendered output looks like this:

I need to highlight these very important words.

## Subscript

This isn’t common, but some Markdown processors allow you to use *subscript* to position one or more characters slightly below the normal line of type. To create a subscript, use one tilde symbol (`~`) before and after the characters.

```
H~2~O
```

The HTML looks like this:

```
H<sub>2</sub>O
```

The rendered output looks like this:

H2O

**Tip:** Be sure to test this feature in your Markdown application before using it. Some Markdown applications use one tilde symbol before and after words not for subscript, but for [strikethrough](https://www.markdown.xyz/extended-syntax/#strikethrough).

## Superscript

This isn’t common, but some Markdown processors allow you to use *superscript* to position one or more characters slightly above the normal line of type. To create a superscript, use one caret symbol (`^`) before and after the characters.

```
X^2^
```

The HTML looks like this:

```
X<sup>2</sup>
```

The rendered output looks like this:

X2

## 自动将 URL 转换为链接

许多 Markdown 解析器会自动将 URL 转换为链接。这意味着，即使你没有 [使用中括号](https://www.markdown.xyz/basic-syntax/#links)，如果你输入 http://www.example.com，你的 Markdown 解析器也会自动将其转换为链接。

```
http://www.example.com
```

渲染效果如下所示：

[http://www.example.com](http://www.example.com/)

## 禁止自动将 URL 转换为链接

如果你不希望自动将 URL 转换为链接，则可以通过反引号 [将 URL 表示为代码](https://www.markdown.xyz/basic-syntax/#code) 。

```
`http://www.example.com`
```

渲染效果如下所示：

```
http://www.example.com
```