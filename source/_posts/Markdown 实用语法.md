---
title: Markdown 实用语法
author: Jahee
url: 无

date: 2026-08-17 00:00:00
order: 5
tags:
  - Markdown语法
---
**本文以Typora作演示书写页面，不能完成的操作切换到源代码模式界面进行（打开\关闭源代码界面：`ctrl`+`/`），在这个界面，你可以一窥端倪**

---

## 一、段落和字体格式
| 格式 | 书写界面 |源代码界面|
| ---- | ---- | ----|
| 换行 | 软回车[^1] |双空格回车|
| 换段[^2] | 回车 | 双回车 |
| 分割线 |  | --- |
| *斜体* | 右键 | \*文字* |
| **加粗** | 右键 | \**文字** |
| ***斜体加粗*** |  | \*\*\*文字*** |
| ~~删除线~~ |  | \~\~文字~~ |

**演示（换段）**

* 这是新的一行  
* 这是新的一行

这是新的一段

## 二、标题

| 标题级数           | 格式     |
| ------------------ | -------- |
| 一级标题（主标题） | # 标题   |
| 二级标题           | ## 标题  |
| …[^3]              | #…# 标题 |

## 三、列表和勾选框

### 3.1列表

| 列表符         | 有序列表                                                     | 无序列表                               |
| -------------- | ------------------------------------------------------------ | -------------------------------------- |
| *    +    -    | 1. 列表<br />2. 列表<br />3. 列表 | * 列表<br />+ 列表<br />- 列表         |
| 1.    2.    3. | 2. 列表<br />3. 列表<br />4. 列表                            | * 列表<br />+ 列表<br />- 列表<br/> |

**演示**

2. 这是有序列表
3. 有序列表是一段的不同行，书写界面回车自动添加列表符
4. 有序列表数字可以不从1开始，但必须连续

* 这是无序列表，呈无先后关系的并列内容

+ 用*,+,-表示不同列表，属于不同段落

- 双回车退出列表编辑

---

### 3.2勾选框

| 状态   | 格式          |
| ------ | ------------ |
| 没打钩 | * [ ]空格     |
| 打钩   | * [x]空格[^4] |

**演示**

* [ ] 
* [x] 

**注意：**列表后用勾选框会覆盖列表格式

## 四、引用

**演示**										**格式**

> 引用									\> 
>
> 引用

> 引用									> 引用
>
> > 引用						   		 \>[^5]> 引用
> >
> > > 引用					      		 >>[^6]> 引用

**注意**

* 在嵌套引用时，首行不能空白
* 双回车退出引用编辑

## 五、注释

**格式**

文字[^符号][^zhu jie]

\[\^符号]:注解[^?]  

**注意**

注释的写法不区分大小写

## 六、超链接

| 格式                            | 演示                                                      |
| ------------------------------- | --------------------------------------------------------- |
| \[名称](网址)                   | [mikutap](https://aidn.jp/mikutap)                        |
| \[名称][符号]<br />[符号]：网址 | [炫光][XuanGuang] <br />[XuanGuang]: http://weavesilk.com |

**注意**

* 第二种格式的注释链接在表格中无效，补到文末注释

* **超链接`ctrl`+`单击`打开**

## 七、图片

**格式**

\!\[](本地/网络路径)

## 八、表格

**格式**

\|表头|表头|

\|------|------|

| 左对齐 | 居中 | 右对齐 |
| :---- | :------: | ------: |
| \|----:\| | \|:----:\| | \|---:\| |

**插入**

* 表格行：`ctrl`+**`回车`**
* 单元格行：`shift`+**`回车`**

## 九、代码块

| 格式                            |
| ------------------------------- |
| 源代码模式`全选`+`tab`          |
| \```（代码语言）<br>代码<br>``` |

演示

```c++
#include <iostream>
#include <cstdlib>
#include <ctime>
using namespace std;
int main() {
    cout << "来玩猜数游戏！我保证你绝对猜不对~" << endl;
    int guess, fakeNum;
    srand(time(0));
    while (true) {
        cout << "猜个1-10的数：";
        cin >> guess;
        do {
            fakeNum = rand() % 10 + 1;
        } while (fakeNum == guess);
        if (guess > fakeNum) {
            cout << "猜大了，小笨蛋!" << endl;
        } else {
            cout << "猜小了，大笨蛋!" << endl;
        }
        cout << "正确数其实是：" << fakeNum << "，再来一次~\n\n";
    }
    return 0;
}
```
**注意**

* 代码块内只能输入纯文本
* `ctrl`+`回车`退出代码块

## 十、设置扩展

文件>>偏好设置

<img src="/images/posts/暗香胜雪.webp" alt="image-20250630170438267" style="width: 600px;" />

**演示**
H~2~O
X^2^
==key==

## 十一、HTML扩展语法

### 11.1图片排版
| **使用img标签插入图片** | \<img src="本地/网络路径">                    |
| ----------------------- | --------------------------------------------- |
| 宽高                    | \<img style="width:xpx; height:ypx"  src="~" > |
| 比例                    | \<img style="width:wp"  src="~" >             |

<center>
    <img src="/images/posts/夏末游鳞.webp" style="width: 960px">
    <br>
    <img src="/images/posts/xuehu.webp" style="width: 240px">
    <!-- ////////////////// -->
    <img src="/images/posts/xuehu.webp" style="width: 240px">
</center>



---

### 11.2字体样式

| 使用span标签输入文字                                  | \<span>文字\</span>                                |
| ----------------------------------------------------- | -------------------------------------------------- |
| <span style="color:#CC00CC">颜色</span>               | \<span style="color: 颜色[^7]">文字\</span>        |
| <span style="font-size:25px">大小</span>              | \<span style="font-size: xpx">文字\</span>         |
| <span style="background-color: #F3E5FF">背景色</span> | \<span style="background-color: 颜色">文字\</span> |

### 11.3段落格式

| 格式   | 代码  |
| ------ | ----- |
| 换行   | \<br> |
| 分割线 | \<hr> |

### 11.4标题样式

| 格式               | 代码                                                 |      |
| ------------------ | ---------------------------------------------------- | ---- |
| 级别               | <hx>x级标题</hx>                                     |      |
| 加粗               | <hx style="font-weight: bold;">标题</hx>             |      |
| x字符缩进          | <hx style="text-indent: xem;">标题</hx>              |      |
| 居中/左对齐/右对齐 | <hx style="text-align: center/left/right;">标题</hx> |      |
| 颜色               | <hx style="color: #xxxxxx;">标题</hx>                |      |

### 11.5插入软件界面

**格式**

\<iframe src="//player.bilibili.com/player.html?bvid=视频BV号" scrolling="no" border="no" frameborder="no" framespacing="no" allowfullscreen="true" width="100%" height="xpx">\</iframe>

**注意**

* 嵌入视频建议使用平台官方播放器接口（如B站：`//player.bilibili.com/player.html?bvid=BV号`），直接嵌入网页地址无法完整显示

**演示**

<iframe src="https://player.bilibili.com/player.html?bvid=BV1nt421N7Xt&autoplay=0&high_quality=1" scrolling="no" border="no" frameborder="no" framespacing="no" allowfullscreen="true" width="100%" height="600px"></iframe>

### 11.6公式块

**格式**

\$$
公式 
\$\$

\$公式$

**演示**
$$
\int_{0}^{1} \mathrm{d}x \int_{x^{2}}^{\sqrt{x}} \frac{1}{1 + \sqrt{y}} \mathrm{d}y
$$

---

## 附录

### 颜色
| 颜色                                            | 十六进制码 | 颜色                                                         | 十六进制码 |
| :---------------------------------------------- | :--------- | ------------------------------------------------------------ | ---------- |
| **<span style="color:#FFC0CB">粉色</span>**     | #FFC0CB    | **<span style="color:#87CEFA">天蓝色</span>**                | #87CEFA    |
| **<span style="color:#FFB6C1">粉玫瑰色</span>** | #FFB6C1    | **<span style="color:#1E90FF">蔚蓝色</span>**                | #1E90FF    |
| **<span style="color:#FF69B4">亮粉色</span>**   | #FF69B4    | **<span style="color:#0000FF">蓝色</span>**                  | #0000FF    |
| **<span style="color:#FF1493">深粉色</span>**   | #FF1493    | **<span style="color:#E0B0FF">兰花紫</span>**                | #E0B0FF    |
| **<span style="color:#FF0000">红色</span>**     | #FF0000    | **<span style="color:#9370DB">薰衣草色</span>**              | #9370DB    |
| **<span style="color:#FFC999">亮浅橙</span>**   | #FFC999    | **<span style="color:#9932CC">紫罗兰色</span>**              | #9932CC    |
| **<span style="color:#FFA07A">珊瑚色</span>**   | #FFA07A    | **<span style="color:#800080">紫色</span>**                  | #800080    |
| **<span style="color:#FFC107">琥珀色</span>**   | #FFC107    | **<span style="background-color: #FDF2F8; color: #4A4A4A;">樱花粉</span>** | #FDF2F8    |
| **<span style="color:#FFA500">橙色</span>**     | #FFA500    | **<span style="background-color: #FFECEC; color: #4A4A4A;">雾粉色</span>** | #FFECEC    |
| **<span style="color:#FF6347">深橙色</span>**   | #FF6347    | **<span style="background-color: #FFE4E1; color: #4A4A4A;">浅珊瑚色</span>** | #FFE4E1    |
| **<span style="color:#FFF68F">月光黄</span>**   | #FFF68F    | **<span style="background-color: #FFEFD5; color: #4A4A4A;">小麦色</span>** | #FFEFD5    |
| **<span style="color:#FFE477">淡黄</span>**     | #FFE477    | **<span style="background-color: #FFEFD5; color: #4A4A4A;">小麦色</span>** | #FFEFD5    |
| **<span style="color:#FFFF00">黄色</span>**     | #FFFF00    | **<span style="background-color: #FFF8DC; color: #4A4A4A;">浅金黄色</span>** | #FFF8DC    |
| **<span style="color:#FFD700">金黄色</span>**   | #FFD700    | **<span style="background-color: #F5FFFA; color: #4A4A4A;">浅薄荷绿</span>** | #F5FFFA    |
| **<span style="color:#CF854D">棕黄色</span>**   | #CF854D    | **<span style="background-color: #F0FFF0; color: #4A4A4A;">浅青柠色</span>** | #F0FFF0    |
| **<span style="color:#A0522D">土褐色</span>**   | #A0522D    | **<span style="background-color: #F0F8FB; color: #4A4A4A;">晴空蓝</span>** | #F0F8FB    |
| **<span style="color:#B5DFB2">浅苔藓绿</span>** | #B5DFB2    | **<span style="background-color: #E0FFFF; color: #4A4A4A;">浅蓝色</span>** | #E0FFFF    |
| **<span style="color:#A7F7A7">薄荷色</span>**   | #A7F7A7    | **<span style="background-color: #E6F3FF; color: #4A4A4A;">冰川蓝</span>** | #E6F3FF    |
| **<span style="color:#90EE90">浅绿色</span>**   | #90EE90    | **<span style="background-color: #F3E5FF; color: #4A4A4A;">浅紫色</span>** | #F3E5FF    |
| **<span style="color:#32CD32">草绿色</span>**   | #32CD32    | **<span style="background-color: #E6E6FA; color: #4A4A4A;">浅薰衣草色</span>** | #E6E6FA    |
| **<span style="color:#00FF00">绿色</span>**     | #00FF00    | **<span style="color:#FFFFFF; background-color: #E0E0E0;">纯白色</span>** | #FFFFFF    |
| **<span style="color:#7FFFD4">淡青绿色</span>** | #7FFFD4    | **<span style="color:#F5F5F5; background-color: #E0E0E0;">米白色</span>** | #F5F5F5    |
| **<span style="color:#40E0D0">绿松石色</span>** | #40E0D0    | **<span style="color:#FFFFF0; background-color: #E0E0E0;">象牙白</span>** | #FFFFF0    |
| **<span style="color:#00FFFF">青色</span>**     | #00FFFF    | **<span style="color:#F5F5F5; background-color: #808080;">浅灰色</span>** | #F5F5F5    |
| **<span style="color:#00CED1">深青色</span>**   | #00CED1    | **<span style="color:#D3D3D3; background-color: #4A4A4A;">银灰色</span>** | #D3D3D3    |
| **<span style="color:#ADD8E6">浅蓝色</span>**   | #ADD8E6    | **<span style="color:#808080; background-color: #4A4A4A;">中灰色</span>** | #808080    |

### 数学符号

| 数学符号                    | 代码                    | 数学符号               | 代码            |
| --------------------------- | ----------------------- | ----------------------- | ------------------------------- |
| $\not=$                   | \not=                   | $\emptyset$ | \emptyset          |
| $\approx$                 | \approx                 | $\in$ | \in              |
| $\leq$                    | \leq                    | $\notin$ | \notin              |
| $\geq$                    | \geq                    | $\log$ | \log            |
| $\times$                  | \times                  | $\alpha$     | \alpha            |
| $\div$                    | \div                    | $\beta$      | \beta               |
| $\pm$                     | \pm                     | $\gamma$           | \gamma               |
| $\frac{x}{y}$             | \frac{x}{y}             | $\delta$   | \delta       |
| $x^a$                     | x^a                     | $\eta$    | \eta          |
| $x_n^{a}$                 | x_n^{a}                 | $\pi$ | \pi     |
| $\sqrt{x}$                | \sqrt{x}                | $\omega$ | \omega   |
| $\sqrt[y]{x}$             | \sqrt[y]{x}             | $\theta$ | \theta |
| $\sqrt[y]{\{d[c(a+b)]\}}$ | \sqrt[y]{\{d[c(a+b)]\}} | $\sigma$ | \sigma |
| $\sum_{i=m}^{n}{i}$ | \sum_{i=m}^{n}{i} | $\mu$ | \mu |
| $\prod_{i=m}^{n}{i}$ | \prod_{i=m}^{n}{i} | $\epsilon$ | \epsilon |
| $\coprod_{i=m}^{n}{i}$  | \coprod_{i=m}^{n}{i}    | $\supset$ | \supset   |
|  $\overline{x}$        | \overline{x}         | $\supseteq$ | \supseteq |
| $90^\circ$ | 90^\circ | $\bigcap$ | \bigcap |
| $\sin$ | \sin | $\bigcup$ | \bigcup |
| $\infty$ | \infty | $\emptyset$ | \emptyset |
| $\int$ | \int | $\land$ | \land    \wedge |
| $\iint$ | \iint | $\lor $ | \lor       \vee |
| $\iiint$ | \iiint | $\neg$    $\overline{A}$ | \neg      \overline{A} |
| $y\prime$ | y\prime | $\cdots$[^8] | \cdots |
| $\lim$ | \lim | $\ldots$[^9] | \ldots |
| $\prod_{\substack{1\leq i\leq n\\i\text{为奇数}}}$ | \prod_{\substack{1\leq i\leq n\\i\text{为奇数}}} | $\cdot$ | \cdot |
| $\int_{0}^{1} x^2 dx$ | \int_{0}^{1} x^2 dx |                          |                        |
| $\lim_{n\rightarrow+\infty}{\frac{1}{n}}$ | \lim_{n\rightarrow+\infty}{\frac{1}{n}}               |                          |                        |
| $f(x)=\frac{1}{x_1}+\frac{1}{x_2}+\cdots+\frac{1}{x_3}$ | f(x)=\frac{1}{x_1}+\frac{1}{x_2}+\cdots+\frac{1}{x_3} |  |                        |

### 注释

[^1]:`ctrl`+`enter`
[^2]:换段后行间距更大，缩进取消
[^3]:最多六级
[^4]:不区分大小写
[^5]:前面的尖括号在书写界面可写可不写，源代码界面写
[^6]:同5
[^ZHU jie]:符号包括数字、字母和特殊符号
[^?]:注解行位置可以是文本合法的任意处

[^7]:替换词可以是颜色的英语或十六进制码，十六进制码见文末附录

[^8]:中线省略号

[^9]:基线省略号

[XuanGuang]: http://weavesilk.com

---

> 本文参考于b站<span style="color:#87CEEB">**青空の霞光**</span>
>
> [Markdown 文档基础语法（基于 IDEA/Typora 讲解最新版）4K蓝光画质 程序员必备技能 强烈推荐](https://www.bilibili.com/video/BV1eJ4m157kC/?spm_id_from=333.337.search-card.all.click&vd_source=a9b6bd53ea6b7e45dcde88c27d8dfd68)

