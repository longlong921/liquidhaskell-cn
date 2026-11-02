# 精化类型：把前提和保证写进类型 {#refinement-types}

**精化类型究竟是什么？** 可以用一个等式概括：

> **精化类型 = 类型 + 谓词。**

也就是说，在普通类型上加一条逻辑条件，限制这个类型允许包含哪些值。你可以先把逻辑谓词看作一个返回布尔值的表达式。这样一来，类型就不只是“整数”“列表”这样的粗分类，还能描述值必须满足的具体不变量。

## 定义精化类型 {#definetype}

先定义两个简单的精化类型：

```haskell
{-@ type Zero    = {v:Int | v == 0} @-}
{-@ type NonZero = {v:Int | v /= 0} @-}
```

`Zero` 可以读成：“一个 `Int` 值 `v`，并且 `v` 等于 `0`。”`NonZero` 则是：“一个 `Int` 值 `v`，并且 `v` 不等于 `0`。”

其中的 **`v` 是值变量**，代表正在被约束的那个值。`Zero` 描述的集合只有一个元素：`0`；`NonZero` 描述的是所有非零的 `Int`，例如 `1`、`-1`、`2`、`-2` 等。

> **原注**：精化类型注解写在带有 `@` 的 Haskell 注释中。因此，它们真的是可以由机器检查的注释。

要使用这些类型，可以这样写：

```haskell
{-@ zero :: Zero @-}
zero  = 0 :: Int

{-@ one, two, three :: NonZero @-}
one   = 1 :: Int
two   = 2 :: Int
three = 3 :: Int
```

## 类型不匹配时会发生什么 {#errors}

如果硬把一个不满足条件的值放进精化类型里，例如：

```haskell
nonsense :: Int
nonsense = one'
  where
  {-@ one' :: Zero @-}
  one' = 1 
```

LiquidHaskell 就会报告错误：

```text
../liquidhaskell-tutorial/src/03-basic.lhs:72:3-6: Error: Liquid Type Mismatch

72 |   one' = 1 :: Int
       ^^^^

  Inferred type
    VV : {VV : Int | VV == (1 : int)}

  not a subtype of Required type
    VV : {VV : Int | VV == 0}
```

这条消息的意思是：表达式 `1 :: Int` 被推导出的类型是：

```text
    {v:Int | v == 1}
```

而要求的类型是：

```text
    {v:Int | v == 0}
```

前者不是后者的子类型，原因很直接：`1` 不等于 `0`。

> **译者说明**：这里的报错路径和格式来自原教程。阅读时主要看 “Inferred type”（推导出的类型）和 “Required type”（要求的类型）之间的差异；工具版本不同，显示形式可能不同。

## 子类型关系：条件越强，可用的地方反而越多 {#subtyping}

“子类型”是什么意思？先给 `Int` 增加几种不同的约束：

```haskell
{-@ type Nat   = {v:Int | 0 <= v}        @-}
{-@ type Even  = {v:Int | v mod 2 == 0 } @-}
{-@ type Lt100 = {v:Int | v < 100}       @-}
```

这三个别名分别表示非负整数、偶数，以及小于 `100` 的整数。

那么，`zero` 是什么类型？它当然是 `Zero`，但它也满足 `Nat`：

```haskell
{-@ zero' :: Nat @-}
zero'     = zero
```

它也满足 `Even`：

```haskell
{-@ zero'' :: Even @-}
zero''     = zero
```

还满足其他适用的条件，比如 `Lt100`：

```haskell
{-@ zero''' :: Lt100  @-}
zero'''     = zero
```

> **原注**：这里分别使用 `zero'`、`zero''` 等名字，是因为原教程所用的 LiquidHaskell 写法中，每个顶层名字最多对应一个精化类型注解。

**子类型关系对应逻辑蕴含。** 对于 `0 :: Int`，`Zero` 比 `Nat`、`Even`、`Lt100` 都更精确：`Zero` 所描述的值集合，是后三者所描述集合的子集。对应的逻辑关系是：

- `v = 0 ⇒ 0 ≤ v`；
- `v = 0 ⇒ v mod 2 = 0`；
- `v = 0 ⇒ v < 100`。

因此，某处只需要一个非负整数，而我们提供了一个已经证明等于零的值，当然没问题。

关于精化类型，可以先记住三件事：

1. 精化类型就是附带逻辑谓词的类型。
2. 同一个值可以满足多种精化条件，分别体现不同性质。
3. 去掉谓词，就回到了普通 Haskell 类型。

> **原注**：反过来说，普通 Haskell 类型可以看成附带了一个永远成立的条件。例如，`Int` 相当于 `{v:Int | true}`。

## 用类型写规格 {#writing-specifications}

接下来写一些更有意思的规格。

**先给“不应该执行到的代码”一个类型。** 把普通的 `error` 包在 `die` 中：

```haskell
{-@ die :: {v:String | false} -> a  @-}
die msg = error msg
```

关键在于参数上的 `false`：调用者必须提供一个满足 `false` 的字符串。但没有任何实际字符串能满足这个条件！

因此，只有当 LiquidHaskell 能证明某个调用位置根本不可达时，这里的 `die` 调用才能通过检查。例如，它会接受：

```haskell
cannotDie = if 1 + 1 == 3
              then die "horrible death"
              else ()
```

因为条件 `1 + 1 == 3` 永远为假，`die` 所在分支不会执行。

但它会拒绝：

```haskell
canDie = if 1 + 1 == 2
           then die "horrible death"
           else ()
```

因为这个分支不但可能执行，而且条件确实为真，`die` 就会被调用。

> **译者说明**：`die` 不是一种新的运行时防护。如果它真的被执行，底层仍是 `error`。这个类型的作用，是要求验证器证明相关路径不可达。

## 精化函数类型：前置条件 {#refining-function-types-pre-conditions}

我们用 `die` 写一个除法函数，希望它只接受非零除数：

```haskell
divide'     :: Int -> Int -> Int
divide' n 0 = die "divide by zero"
divide' n d = n `div` d
```

从实现看，`div` 本身只会在除数不为零时调用。但 LiquidHaskell 仍会在 `die` 处报错：如果调用 `divide'` 时，第二个参数就是 `0`，怎么办？

可以用 **前置条件** 明确规定：第二个参数必须非零。

```haskell
{-@ divide :: Int -> NonZero -> Int @-}
divide _ 0 = die "divide by zero"
divide n d = n `div` d
```

**它为什么能通过验证？** LiquidHaskell 分析到第一条方程时，会同时知道两件互相矛盾的事：参数类型说除数非零；模式匹配又说它等于零。

```text
    0 :: {v: Int | v == 0}
```

既然这些条件不可能同时成立，这个分支就是死代码。于是，在这个不可能的上下文里，`"divide by zero"` 可以被赋予 `{v:String | false}`；`die` 的调用也就满足了要求。

**前置条件由调用方负责建立。** 写上 `NonZero` 以后，每次使用 `divide`，都必须传入一个可以证明非零的值。下面两种用法就没有问题：

```haskell
avg2 x y   = divide (x + y) 2
avg3 x y z = divide (x + y + z) 3
```

### 练习：列表平均值 {#list-average}

看看下面的 `avg`：

1. 为什么 LiquidHaskell 会在 `n` 处报错？
2. 可以怎样修改代码，让它通过检查？

```haskell
avg       :: [Int] -> Int
avg xs    = divide total n
  where
    total = sum xs
    n     = length xs
```

> **译者说明**：本节中的“安全除法”具体指排除除数为零这一错误。它并没有顺带证明所有机器整数运算都不会溢出；算术模型的限制见[上一章](Tutorial_02_Logic.html#examples-arithmetic)。

## 精化函数类型：后置条件 {#refining-function-types-post-conditions}

精化类型也可以描述函数 **返回的值**。例如，下面是一个简单的绝对值函数：

```haskell
abs           :: Int -> Int
abs n
  | 0 < n     = n
  | otherwise = 0 - n
```

为返回值加上 `Nat`，就表达了“结果非负”：

```haskell
{-@ abs :: Int -> Nat @-}
```

LiquidHaskell 会根据分支来推理：如果 `0 < n`，直接返回 `n`，结果显然非负；否则 `n ≤ 0`，所以 `0 - n` 非负。这样就验证了后置条件。

> **原注**：这些算术推导由 SMT 求解器自动完成。求解器内置了相应算术理论的判定过程，可以直接对逻辑约束进行推理。
>
> **译者说明**：这里仍沿用原教程的整数模型示例。机器 `Int` 的最小值取绝对值时涉及溢出边界，不能只凭这段数学推导就宣称实际实现对所有机器整数都满足该性质。

## 检查外部值：布尔值与命题 {#propositions}

上一节通过 **计算** 得到了一个满足 `Nat` 条件的结果。有时，我们拿到的是外部提供的值，需要先 **检查** 它是否满足某种条件，例如是否 `NonZero`。

以一个命令行计算器为例：

```haskell
calc = do putStrLn "Enter numerator"
          n <- readLn
          putStrLn "Enter denominator"
          d <- readLn
          putStrLn (result n d)
          calc
```

它读取两个数，然后相除。`result` 会先检查 `d` 是否严格大于零——大于零自然也就不等于零——满足条件才执行除法，否则提示用户：

```haskell
result n d
  | isPositive d = "Result = " ++ show (n `divide` d)
  | otherwise    = "Humph, please enter positive denominator!"
```

`isPositive` 本身也很简单：输入大于零就返回 `True`，否则返回 `False`。

```haskell
isPositive :: Int -> Bool
isPositive x = x > 0
```

为了验证 `result` 里的 `divide` 调用，需要把一个联系告诉 LiquidHaskell：**`isPositive d` 返回真，说明 `d` 大于零。** 这个联系是 `isPositive` 的后置条件：

```haskell
{-@ isPositive :: x:Int -> {v:Bool | v <=> x > 0} @-}
```

这个类型说：`isPositive x` 返回 `True`，当且仅当 `x > 0`。

因此，即使只是一个普通的 `Bool` 检查函数，也可以通过精化后的返回类型，说明检查结果与输入值之间的关系。在为真的分支里，用户提供的值就获得了所需性质：这里是严格为正，从而也满足 `NonZero`，接下来的除法才能安全进行。

> **译者说明**：这展示了一个非常实用的边界模式：先在运行时检查未知输入，再利用检查结果，在后续内部代码中进行静态推理。示例中的 `readLn` 仍可能因格式错误而抛异常；本节没有验证输入解析本身。

### 练习：布尔检查的规格 {#propositions-exercise}

如果删掉 `isPositive` 的精化类型，会怎样？能否换一种不同的类型注解，同时保留所需的安全性？

### 练习：断言 {#assertions}

下面有一个类似 [assert][hoogle-assert] 的函数，以及两个调用位置。请为 `lAssert` 写一个合适的精化类型，让 `lAssert` 本身和 `yes` 都能通过检查，而 `no` 被拒绝。

```haskell
{-@ lAssert  :: Bool -> a -> a @-}
lAssert True  x = x
lAssert False _ = die "yikes, assertion fails!"

yes = lAssert (1 + 1 == 2) ()
no  = lAssert (1 + 1 == 3) ()
```

**提示**：需要在前置条件中规定，`lAssert` 的第一个参数只能是 `True`。

## 把这些能力组合起来 {#putting-it-all-together}

最后，用一个简单的 `truncate` 函数，把前置条件、后置条件和分支推理连起来：

```haskell
truncate :: Int -> Int -> Int
truncate i max
  | i' <= max' = i
  | otherwise  = max' * (i `divide` i')
    where
      i'       = abs i
      max'     = abs max
```

当 `i` 的绝对值不超过给定上限的绝对值时，函数返回 `i`；超出时，则把它的幅度截到这个上限，并保留正负方向。

> **译者说明**：这里的 `truncate` 是教程自定义的整数限幅函数，不是 Prelude 中把实数截断成整数的那个同名函数。原文在说明中混用了参数名 `max`、`n`；这里按实际代码解释，比较的是 `abs i` 和 `abs max`。

LiquidHaskell 为什么知道 `divide` 的除数不会为零？因为在 `otherwise` 分支里，它能得到：

1. 从分支条件知道 `max' < i'`；
2. 从 `abs` 的后置条件知道 `0 <= i'`；
3. 从 `abs` 的后置条件知道 `0 <= max'`。

这些条件合起来，推出 `i' > 0`，当然也就有 `i' /= 0`。因此，调用位置的 `i'` 满足 `NonZero`，符合 `divide` 的前置条件，除零风险就被排除了。

## 本章回顾 {#recap}

到这里，我们已经见过精化类型与 LiquidHaskell 的基本用法：

1. 用逻辑谓词细化类型，**描述** 值的具体性质。
2. 用合适的函数类型，**表达** 断言、前置条件和后置条件。
3. 让 SMT 求解器追踪程序值之间的关系，**验证** 代码是否满足这些性质。
