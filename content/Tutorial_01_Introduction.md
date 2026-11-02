# 导读：给 Haskell 类型加上更具体的约束 {#intro}

Haskell 的一大优点，是它有一套聪明的类型系统：许多不变量可以在编译时检查，从而把大量[运行时错误](#getting-started)提前挡住。

不过，普通类型检查通过，并不意味着程序就不会出错。我们先看几个例子，再认识精化类型能补上的那一块。

> **译者说明**：本章保留原教程的历史示例和输出，用它们解释“类型正确”和“满足业务条件”之间的差距。`unsafeIndex`、旧版 `text` 的 `takeWord16` 等示例，不代表当前版本仍有相同 API、相同输出或已知漏洞。请勿在处理真实数据的进程中运行故意越界的示例。

## 类型没错，程序仍然会出错 {#gowrong}

### 除以零

下面这个看起来很普通的函数，会计算一个整数列表的平均值：

```haskell
average    :: [Int] -> Int
average xs = sum xs `div` length xs
```

传入非空列表时，结果正是我们想要的：

```text
ghci> average [10, 20, 30, 40]
25
```

但传入空列表，就会因为除以零而崩溃：

```text
ghci> average []
*** Exception: divide by zero
```

> **原注**：可以把 `average` 写得更有防御性，让它返回 `Maybe` 或 `Either`。原作者提醒：如果后续代码最终仍要求得到一个 `Int`，而输入本来就无效，那么届时仍然需要面对“没有有效结果”这件事。
>
> **译者说明**：这不是说 `Maybe`、`Either` 没有用。对于外部输入，它们是正常且重要的错误处理方式：调用方可以拒绝输入、提示用户或选择替代行为。精化类型补充的是另一种能力：在条件已经建立以后，静态证明内部代码满足这些条件。

### 查找不存在的键

键值映射几乎已经像列表一样常见。Go、Python、JavaScript、Lua 等现代语言都内置了类似结构，Haskell 也经常使用它：

```text
ghci> :m +Data.Map 
ghci> let m = fromList [ ("haskell", "lazy")
                       , ("ocaml"  , "eager")]

ghci> m ! "haskell"
"lazy"
```

然而，查找不存在的键，又会带来一类令人头疼的错误：

```text
ghci> m ! "javascript"
"*** Exception: key is not in the map
```

> **原注**：这里也可以用 `Maybe` 返回查找结果；原作者想强调的是，调用方依然需要处理“键不存在”的情况。

### 段错误

你可能会问：Haskell 不是一门安全的语言吗，怎么还会段错误？原因在于，安全的上层抽象最终仍依赖机器代码，或者 C 等底层实现。以常用的 `vector` 库为例：

```text
ghci> :m +Data.Vector
ghci> let v = fromList ["haskell", "ocaml"]
ghci> unsafeIndex v 0
"haskell"
```

如果上层传入的非法值一路流入底层，不安全操作就可能出问题。原教程展示了下面的越界访问及其输出：

```text
ghci> unsafeIndex v 3
'ghci' terminated by signal SIGSEGV ...
```

> **原注**：为什么要使用名称里带 `unsafe` 的函数？原作者的理由是速度；即使改用会检查边界的版本，错误输入也可能变成运行时异常。作者也特别感谢库开发者明确标出了 `unsafe`：在多层抽象之下，调用者未必容易判断哪些操作有前提条件。
>
> **译者说明**：这里并没有断言不安全版本一定能带来可观的性能提升。是否使用它，应由实际测量和完整的边界保证决定；越界结果也不保证每次都是相同的段错误。

### 比崩溃更糟：越界读取秘密

对于某些程序，悄悄读出不该读的数据，比直接崩溃更严重。`text` 是 Haskell 的高性能文本处理库，也用于构建 Web 服务。原教程使用的是旧版、基于 UTF-16 的接口：

```text
ghci> :m +Data.Text Data.Text.Unsafe
ghci> let t = pack "Voltage"
ghci> takeWord16 5 t
"Volta"
```

攻击者如果精心构造一个超出文本长度的参数，就可能让底层操作读取文本以外的内存。原文演示如下：

```text
ghci> takeWord16 20 t
"Voltage\1912\3148\SOH\NUL\15928\2486\SOH\NUL"
```

这次调用返回了紧跟在字符串 `Voltage` 后面的内存内容。那些内容可能只是无意义的字节，也可能是别的数据，甚至是口令等敏感信息。

> **译者说明**：本节是在说明缺少边界约束可能产生的后果，不是在报告当前 `text` 的漏洞。后续阅读时，重点应放在“长度必须在合法范围内”这一前提条件上。

## 精化类型能做什么 {#refinement-types}

**精化类型（refinement types）** 允许我们用 **谓词** 丰富 Haskell 类型，准确描述函数的合法输入、合法输出、容器中允许保存的值等。这里的谓词来自特定的逻辑体系，SMT 求解器可以对这些逻辑中的问题进行自动判定。

把类型和谓词放在一起，就可以写出 **契约**：调用函数之前必须满足什么条件，函数返回之后又保证什么条件。精化类型检查会在编译阶段检查实现是否遵守契约。因此，只要相关前提、规格和底层模型成立，就可以在运行之前排除已经写入规格的那些错误，例如除零和越界。

**LiquidHaskell** 就是 Haskell 的精化类型检查器。本教程将介绍如何用它改善程序，并让编程变得更有意思。

> **原注**：如果你熟悉 Coq 等证明助手里的依赖类型，可以把精化类型理解为一类受限制的依赖类型：限制所使用的逻辑，牺牲一部分表达能力，换取更高程度的自动化。
>
> **译者说明**：通过检查，表示实现满足已经表达出来的规格，并且依赖所声明的可信假设；它不等于“程序的所有方面都没有 bug”。外部输入校验、未建模的溢出、FFI 及其他信任边界，都需要单独考虑。

## 这份教程适合谁 {#audience}

如果你符合下面的一些描述，就可以跟着学：

- 懂一点基础算术和逻辑；
- 知道 `nand`（与非）和 `xor`（异或）的区别；
- 用过某种带类型的语言，例如 ML、Haskell、Scala、F# 或 Typed Racket；
- 知道 `forall a. a -> a` 大致是什么意思；
- 希望编辑器能尽早提醒你某段代码可能无限循环；
- 希望自己的程序少一些 bug。

## 开始动手 {#getting-started}

> **译者说明：版本背景**：下面是原教程在 **2020 年 7 月** 给出的工作方式与命令，保留它们是为了忠实呈现原文。LiquidHaskell 与 GHC 的版本存在匹配要求。准备实际环境时，请先查看[官方安装说明](https://ucsd-progsys.github.io/liquidhaskell/install/)，不要把这些历史命令当成适用于任意当前版本的安装保证。本中文站展示和保存示例，不在浏览器内执行 LiquidHaskell 检查。

从 2020 年 7 月起，LiquidHaskell 0.8.10 及以后的版本开始以 [GHC 插件](https://downloads.haskell.org/~ghc/8.10.1/docs/html/users_guide/extending_ghc.html)的形式提供。大体流程是：

1. 将 LiquidHaskell 加入项目依赖，并按相应版本的要求启用它。
2. 编译代码时，GHC 同时报告 LiquidHaskell 的类型错误。
3. 编辑器已有的 Haskell 工具也就可以显示这些错误。

除了 Cabal 依赖，LiquidHaskell 还需要一个兼容 `SMTLIB2` 的求解器可执行程序。原文列出了：

- [Z3][z3]，原作者推荐；
- [CVC4][cvc4]；
- [MathSat][mathsat]。

本教程使用 literate Haskell，即把说明文字和 Haskell 代码放在同一份文档中的写法。[原始代码仓库][liquid-tutorial]可以下载。原作者强烈建议你一边阅读，一边修改代码，尤其要亲自做练习。

**第 1 步：克隆原始教程仓库。**

```bash
git clone --recursive https://github.com/ucsd-progsys/liquidhaskell-tutorial.git
```

**第 2 步：尝试构建代码。**

> **译者说明**：先运行 `cd liquidhaskell-tutorial` 进入刚克隆的仓库目录，再执行下面的构建命令。

```bash
cabal v2-build
```

或者：

```bash
stack build --fast --file-watch
```

在原教程对应的环境里，如果工具设置正确，编译会停在一个 LiquidHaskell 类型错误上：

```text
src/Tutorial_01_Introduction.lhs:30:27: error:
    Liquid Type Mismatch
    .
    The inferred type
      VV : {v : GHC.Types.Int | v >= 0
                                && v == len xs}
    .
    is not a subtype of the required type
      VV : {VV : GHC.Types.Int | VV /= 0}
    .
    in the context
      xs : {v : [GHC.Types.Int] | len v >= 0}
   |
30 | average xs = sum xs `div` length xs
   |                           ^^^^^^^^^
```

这里的错误正是我们希望工具找到的：列表长度只保证非负，不能保证非零，所以不能直接拿它做除数。

**第 3 步：反复修改并编译 `src/` 里的代码，直到不再出现 LiquidHaskell 类型错误。**

这个工作流程可以接入你习惯使用的 GHC/Haskell 编辑器工具，让编辑器自动显示 LH 错误。

如果选择把片段复制到原教程的在线演示中，而不是克隆仓库，可能需要给 `liquid` 传入 `--no-termination`，或者在文件开头加入 `{-@ LIQUID "--no-termination" @-}`。默认情况下，LiquidHaskell 会尝试检查被分析代码的终止性；本教程中的一些写法，并不能让它直接看出为什么一定会终止。

> **译者说明**：`--no-termination` 的含义是关闭终止性检查，不是证明程序会终止，也不应作为生产代码中消除报错的通用办法。阅读这些示例时，要把“其他性质的验证”和“终止性证明”区分开。

原作者说明，这份教程仍在完善，欢迎反馈和建议，最好通过 GitHub 的 pull request 提交。

现在开始吧！
