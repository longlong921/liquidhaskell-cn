# 逻辑与 SMT：让机器检查“这句话是否总成立” {#logic-smt}

很快我们就会看到：

> **精化类型 = 类型 + 逻辑谓词。**

先花一点时间说明，本教程所说的“逻辑谓词”究竟是什么。我们会介绍它的 **语法**，也就是可以写成什么样；以及它的 **语义**，也就是这些写法表达什么含义。

> **原注**：如果你已经熟悉这些内容，例如知道 SMT 指 Satisfiability Modulo Theories（可满足性模理论），也知道 QF-UFLIA 指无量词的未解释函数与线性整数算术理论，可以直接进入下一章。

## 语法：谓词可以写成什么样 {#syntax}

可以先把逻辑谓词理解为一种“结果是布尔值的表达式”。它看起来很像 Haskell，但只采用其中一个受限制的子集。下面按常量、变量、表达式和谓词来定义它的语法。

**常量 `c`** 就是数值常量：

```text
    c := 0, 1, 2, ...
```

> **原注**：看到 `:=` 时，可以读成“定义为”。

**变量 `v`** 可以是 `x`、`y`、`z` 等名字，它们指向源程序中绑定的值：

```text
    v := x, y, z, ...
```

**表达式 `e`** 有以下几种形式。它可以由变量和常量做线性算术组合，也可以是未解释函数的应用：

```text
    e := v                      -- variable
       | c                      -- constant
       | (e + e)                -- addition
       | (e - e)                -- subtraction
       | (c * e)                -- multiplication by constant
       | (v e1 e2 ... en)       -- uninterpreted function application
       | (if p then e else e)   -- if-then-else
```

这里依次列出：变量、常量、加法、减法、乘以常量、函数应用，以及条件表达式。例如：

- `x + y - z`；
- `2 * x`；
- `1 + size x`。

**关系 `r`** 是常见的比较运算符，依次表示相等、不等、大于等于、小于等于、大于、小于：

```text
    r := ==               -- equality
       | /=               -- disequality
       | >=               -- greater than or equal
       | <=               -- less than or equal
       | >                -- greater than
       | <                -- less than
```

**谓词 `p`** 可以是比较两个表达式得到的原子命题，也可以是谓词函数的应用，还可以把已有谓词用逻辑运算连接起来：

- `&&`：并且；
- `||`：或者；
- `==>`：蕴含，`p ==> q` 读作“如果 `p` 成立，那么 `q` 成立”；
- `<=>`：当且仅当，即 `p` 推出 `q`，同时 `q` 也推出 `p`；
- `not`：否定。

完整写法如下：

```text
    p := (e r e)                -- binary relation
       | (v e1 e2 ... en)       -- predicate (or alias) application
       | (p && p)               -- and
       | (p || p)               -- or
       | (p => p) | (p ==> p)   -- implies
       | (p <=> p)              -- iff
       | (not p)                -- negation
       | true | True
       | false | False
```

例如：

- `x + y <= 3`；
- `null x`；
- `x < 10 ==> y < 10 ==> x + y < 20`；
- `0 < x + y <=> 0 < y + x`。

## 语义：谓词表达什么意思 {#semantics}

语法说明“什么样的式子可以写”，语义则说明“写下来的式子是什么意思”。直观地说，谓词就像一个返回布尔值的 Haskell 函数：`&&`、`||`、`not` 还是熟悉的逻辑运算，再加上 `==>` 和 `<=>`。

**蕴含 `==>`** 可以用下面的 Haskell 函数表示。暂时不用深究注解，只需知道它声明：输出是一个 `Bool`，而且恰好等于输入 `p`、`q` 在逻辑上的蕴含关系。

```haskell
{-@ (==>) :: p:Bool -> q:Bool -> {v:Bool | v <=> (p ==> q)} @-}
False ==> False = True
False ==> True  = True
True  ==> True  = True
True  ==> False = False
```

> **译者说明**：蕴含只有在“前提为真、结论为假”时才为假。前提不成立时，整条“如果……那么……”并没有被反例推翻，所以结果为真。

**当且仅当 `<=>`** 对应下面的函数：

```haskell
{-@ (<=>) :: p:Bool -> q:Bool -> {v:Bool | v <=> (p <=> q)} @-}
False <=> False = True
False <=> True  = False
True  <=> True  = True
True  <=> False = False
```

> **原注**：当两边都是 `Bool` 时，`<=>` 与 `==` 的结果相同。

**环境（environment）** 记录变量各自的 Haskell 类型。比如，把下面这个环境叫作 `G`：

```text
    x :: Int
    y :: Int
    z :: Int
```

它说明 `x`、`y`、`z` 都具有 `Int` 类型。

**赋值（assignment）** 则是在环境规定的类型内，为每个变量指定具体值。例如：

```text
    x := 1
    y := 2
    z := 3
```

这就是 `G` 中的一次赋值：`x`、`y`、`z` 分别取整数 `1`、`2`、`3`。

给定一次赋值，**谓词就可以求值为 `True` 或 `False`**。例如：

```text
    x + y > 10
```

在上面那次赋值下，它的结果是 `False`；换成下面这次赋值，结果就是 `True`：

```text
    x := 10
    y := 10
    z := 20
```

如果在一个环境里，**至少存在一次赋值** 使某个谓词为真，就称这个谓词是 **可满足的（satisfiable）**。例如，在 `G` 中：

```text
    x + y == z
```

是可满足的，因为上面那组 `10`、`10`、`20` 就能让它成立。

如果在一个环境里，**每一次合法赋值** 都使谓词为真，就称它是 **有效的（valid）**，也可以直观地理解为“总成立”。例如：

```text
    x < 10 || x == 10 || x > 10
```

无论 `x` 是多少，它必然小于、等于或大于 `10`，因此这个谓词在 `G` 中有效。

> **译者说明**：“可满足”只要求找到一种成立的情况；“有效”则要求不存在任何不成立的情况。验证程序时，我们通常需要后者：只要前提满足，结论就必须成立。

## 验证条件：从程序变成逻辑问题 {#verification-conditions}

LiquidHaskell 不需要实际执行程序来检查这些性质。它大致分两步判断程序是否满足规格：

1. 把代码和类型一起转换为一组 **验证条件（verification conditions，简称 VC）**。这些条件都是逻辑谓词；证明它们有效，就能建立相应的程序性质。具体转换过程可参见[原始论文][liquidpldi08]。
2. 把验证条件交给 [SMT 求解器][smt-wiki]，询问它们是否有效。验证成功，程序就被判定满足相应规格；不能完成验证，则不会得到通过。

**SMT 求解器不会枚举所有赋值。** 如果变量涉及整数、列表等，可能的情况通常是无限的，根本枚举不完。求解器使用的是符号算法：根据公式之间的关系，推导它是否成立。这些方法来自数十年的数学逻辑与判定过程研究；想进一步了解，可以阅读 [Greg Nelson 的博士论文][nelson-thesis]。

**限制逻辑的范围，是为了让问题落在可判定的片段中。** 本教程介绍的方法因此可以高度自动化：你用类型写出所需性质，用 Haskell 写出实现，通常不需要手工操作证明过程。

这种自动化也有代价：精化条件必须使用所支持的逻辑来表达。不过，稍微转换一下表达方式，仍然能描述相当丰富的性质。

> **原注**：尤其是未解释函数，可以帮助我们构建许多更复杂的抽象。
>
> **译者说明**：这里描述的是本教程聚焦的逻辑与工作方式，不表示所有版本、所有扩展、所有输入问题都能迅速求解。求解失败或超时，也不能直接当成已经找到了真实程序错误。

## 命题逻辑例子 {#examples-propositions}

接下来通过一些具体谓词，培养对逻辑和“总成立”的直觉。下面的式子属于我们的精化逻辑，但会写成普通的 Haskell 表达式，这样既容易阅读，也可以让 LiquidHaskell 检查它们。

先定义两个精化类型：`TRUE` 表示结果一定为 `True` 的布尔值，`FALSE` 表示结果一定为 `False` 的布尔值。

```haskell
{-@ type TRUE  = {v:Bool | v    } @-}
{-@ type FALSE = {v:Bool | not v} @-}
```

> **原注**：这种写法会在[布尔值与命题](Tutorial_03_Basic.html#propositions)一节中进一步解释。

有效谓词可以具有 `TRUE` 类型。最简单的例子就是 `True` 本身：

```haskell
{-@ ex0 :: TRUE @-}
ex0 = True
```

当然，`False` 不满足 `TRUE` 的要求，下面这个例子应当被拒绝：

```haskell
{-@ ex0' :: TRUE @-}
ex0' = False
```

加入变量以后，就能表达更有意思的命题。下面说的是：一个布尔值要么成立，要么不成立。

```haskell
{-@ ex1 :: Bool -> TRUE @-}
ex1 b = b || not b
```

同一个布尔值不可能既为真又为假，所以 `b && not b` 的结果恒为 `False`。下面的 `FALSE` 规格因此成立：

```haskell
{-@ ex2 :: Bool -> FALSE @-}
ex2 b = b && not b
```

接下来看看蕴含。`p ==> q` 表示：如果 `p` 为真，`q` 也必须为真。假如 `a` 和 `b` 都为真，那么 `a` 为真，`b` 也为真，因此以下命题成立：

```haskell
{-@ ex3 :: Bool -> Bool -> TRUE @-}
ex3 a b = (a && b) ==> a

{-@ ex4 :: Bool -> Bool -> TRUE @-}
ex4 a b = (a && b) ==> b
```

### 练习：蕴含与“或” {#implications-and-or}

如果把 `&&` 换成 `||`，下面的公式就不再总成立了。你能只调整变量的位置，**不改变运算符**，让它成为有效公式吗？

```haskell
{-@ ex3' :: Bool -> Bool -> TRUE @-}
ex3' a b = (a || b) ==> a
```

下面两条公式表达的是[肯定前件规则（modus ponens）](http://en.wikipedia.org/wiki/Modus_ponens)：如果已经知道“`a` 推出 `b`”，又知道 `a` 成立，那么 `b` 必须成立。

```haskell
{-@ ex6 :: Bool -> Bool -> TRUE @-}
ex6 a b = (a && (a ==> b)) ==> b

{-@ ex7 :: Bool -> Bool -> TRUE @-}
ex7 a b = a ==> (a ==> b) ==> b
```

还记得 `p <=> q` 吗？只有当 `p`、`q` 的布尔值相同，结果才为 `True`。因此，它可以表达两个命题的逻辑等价。比如，[德摩根律](http://en.wikipedia.org/wiki/De_Morgan%27s_laws)的一种形式是：

```haskell
{-@ exDeMorgan1 :: Bool -> Bool -> TRUE @-}
exDeMorgan1 a b = not (a || b) <=> (not a && not b)
```

### 练习：另一条德摩根律 {#de-morgans-law}

下面这条德摩根律写错了。请修改它，让公式总成立。

```haskell
{-@ exDeMorgan2 :: Bool -> Bool -> TRUE @-}
exDeMorgan2 a b = not (a && b) <=> (not a && not b)
```

## 算术例子 {#examples-arithmetic}

再来看看包含算术运算的谓词。最简单的式子不带变量：

```haskell
{-@ ax0 :: TRUE @-}
ax0 = 1 + 1 == 2
```

而求值结果为 `False` 的式子，自然不能具有 `TRUE` 类型：

```haskell
{-@ ax0' :: TRUE @-}
ax0' = 1 + 1 == 3
```

**SMT 求解器通过推理判断有效性，而不是穷举。** 例如：

```haskell
{-@ ax1 :: Int -> TRUE @-}
ax1 x = x < x + 1
```

按通常的整数算术规律，这个式子等价于 `0 < 1`，所以不依赖 `x` 的具体值，总是成立。求解器无需把无限多个 `x` 都试一遍，就能得到这个结论。这种有效性检查正是 LiquidHaskell 的核心。

> **译者说明：算术模型**：这里是在数学整数模型下解释推理。Haskell 的 `Int` 是有界机器整数；例如在上界处，`x + 1` 的机器行为不能直接按无界整数理解。生产代码必须核对工具采用的模型，并明确处理溢出或证明取值范围；需要无界整数语义时可考虑 `Integer`。本译文保留原始示例，没有把它们改写成已经完成机器整数溢出证明的代码。

算术运算还可以与命题逻辑组合：

```haskell
{-@ ax2 :: Int -> TRUE @-}
ax2 x = (x < 0) ==> (0 <= 0 - x)

{-@ ax3 :: Int -> Int -> TRUE @-}
ax3 x y = (0 <= x) ==> (0 <= y) ==> (0 <= x + y)

{-@ ax4 :: Int -> Int -> TRUE @-}
ax4 x y = (x == y - 1) ==> (x + 2 == y + 1)

{-@ ax5 :: Int -> Int -> Int -> TRUE @-}
ax5 x y z =   (x <= 0 && x >= 0)
          ==> (y == x + z)
          ==> (y == z)
```

### 练习：加法与大小关系 {#addition-and-order}

下面的公式不是总成立的。你知道原因吗？请修改 `==>` 左边的 **假设**，让它成为有效公式。

```haskell
{-@ ax6 :: Int -> Int -> TRUE @-}
ax6 x y = True ==> (x <= x + y)
```

## 未解释函数：不知道函数内部，也能推理 {#examples-uninterpreted-function}

在精化逻辑里，我们把某些函数符号称为 **未解释函数（uninterpreted functions）**，意思是 SMT 求解器不知道它们的实现。求解器只需要知道一个基本规则：**相同的输入，得到相同的输出**。这个规则称为同余公理（axiom of congruence）。

用下面的例子，可以检查这一规则：

```haskell
{-@ congruence :: (Int -> Int) -> Int -> Int -> TRUE @-}
congruence f x y = (x == y) ==> (f x == f y)
```

请记住，这里不是在执行代码；我们甚至没有 `f` 的定义，因此也不能靠计算具体结果来验证它。但无论 `f` 的解释是什么，这条公式都满足同余公理，因此有效。

再看一个有趣的例子。你能想出为什么下面的谓词总成立吗？SMT 求解器可以判断出来：

```haskell
{-@ fx1 :: (Int -> Int) -> Int -> TRUE @-}
fx1 f x =   (x == f (f (f x)))
        ==> (x == f (f (f (f (f x)))))
        ==> (x == f x)
```

为了体会未解释函数有什么用，我们先写一个计算列表长度的 `size`：

```haskell
{-@ measure size @-}
{-@ size :: [a] -> Nat @-}
size        :: [a] -> Int
size []     = 0
size (x:xs) = 1 + size xs
```

现在可以验证下面这个谓词：

```haskell
{-@ fx0 :: [a] -> [a] -> TRUE @-}
fx0 xs ys = (xs == ys) ==> (size xs == size ys)
```

要证明它，求解器不需要知道 `size` 究竟怎么算，只需要知道它是一个函数：相等的列表经过同一个函数，结果也相等。

需要利用 `size` 的定义时，我们再把有关信息加入谓词。例如，想证明下面的性质：

```haskell
{-@ fx2 :: a -> [a] -> TRUE @-}
fx2 x xs = 0 < size ys
  where
    ys   = x : xs
```

LiquidHaskell 实际交给 SMT 求解器的验证条件会表达两件事：列表长度非负；因为 `ys` 是 `x : xs`，所以 `ys` 比 `xs` 恰好多一个元素。

> **原注**：不用担心，我们会在[精化数据类型](Tutorial_05_Datatypes.html#autosmart)一章继续解释这个过程。

这个验证条件可以写成：

```haskell
{-@ fx2VC :: _ -> _ -> _ -> TRUE @-}
fx2VC x xs ys =   (0 <= size xs)
              ==> (size ys == 1 + size xs)
              ==> (0 < size ys)
```

## 本章回顾 {#recap}

本章明确了这份教程中“逻辑谓词”的含义：

1. 它有一套受限制的语法，对应一部分返回 `Bool` 的 Haskell 表达式。
2. 正是这种限制，让我们可以使用 SMT 求解器判断谓词是否 **有效**，即是否对所有合法赋值都成立。
3. 求解器靠符号推理完成检查，不需要逐个枚举并计算所有情况。

下一章将用这些谓词，为真实程序 **写规格**，并 **验证规格**。
