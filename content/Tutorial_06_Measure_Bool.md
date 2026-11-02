# 布尔度量函数 {#boolmeasures}

前两章用精化描述了基本 `Int` 值的性质，例如向量下标的范围，也描述了列表元素应满足的条件。接下来，我们要描述的是 **整个数据结构** 的性质，比如“这个列表是否为空”，再用这些性质改进操作列表或树的 API。

## 部分函数

先回到除法安全这个例子。此前我们写过：

```haskell
{-@ divide :: Int -> NonZero -> Int @-}
divide _ 0 = die "divide-by-zero"
divide x n = x `div` n
```

输入类型 `NonZero` 给出的 **前置条件**，让 LiquidHaskell 能证明运行时不会执行 `die`。相应地，每个调用 `divide` 的地方，都必须证明第二个参数非零。

当除数是编写代码时就能确定的常量，这不难：

```haskell
avg2 x y   = divide (x + y)     2

avg3 x y z = divide (x + y + z) 3
```

但如果除数是在运行时计算出来的，就需要多做一些工作。例如，先编写一个计算列表元素个数的函数：

```haskell
size        :: [a] -> Int
size []     =  0
size (_:xs) =  1 + size xs
```

再用它计算平均值：

```haskell
avgMany xs = divide total elems
  where
    total  = sum  xs
    elems  = size xs
```

这一次，LiquidHaskell 会报告错误：

```text
     src/04-measure.lhs:77:27-31: Error: Liquid Type Mismatch
       Inferred type
         VV : Int | VV == elems

       not a subtype of Required type
         VV : Int | 0 /= VV

       In Context
         VV    : Int | VV == elems
         elems : Int
```

它 **无法证明** 除数属于 `NonZero`，因为列表为空时，元素个数确实可以是 `0`。因此，我们需要一种方式，说明 `avgMany` 的输入列表必须非空。

## 把函数提升为度量函数 {#usingmeasures}

怎样告诉 LiquidHaskell“这个列表非空”？回想[之前描述向量长度时](Tutorial_04_Polymorphism.html#vectorbounds)用到的 `measure`。沿着这个思路，先写一个判断列表是否非空的普通函数：

```haskell
notEmpty       :: [a] -> Bool
notEmpty []    = False
notEmpty (_:_) = True
```

这里的 **度量函数** 是一类满足以下条件的完全 Haskell 函数：

1. 对每个数据构造器，有且只有一个定义方程。
2. 能保证终止，通常通过对数据结构做结构递归实现。

对于满足这些条件的函数，可以用下面的声明告诉 LiquidHaskell：把它 **提升** 到精化逻辑中，允许我们在类型的条件里引用它。

```haskell
{-@ measure notEmpty @-}
```

> **译者说明**：“提升”并不是把函数搬到运行时的另一个环境里，而是让验证器知道它的逻辑含义。在本例中，`notEmpty []` 为假，`notEmpty (x:xs)` 为真。

### 描述非空列表

现在，非空列表就是普通 `[a]` 中满足 `notEmpty` 的那部分值：

```haskell
{-@ type NEList a = {v:[a] | notEmpty v} @-}
```

接着，可以强化相关函数的签名，建立平均值计算所需的安全性。

### 列表长度的条件保证

**如果** 输入列表非空，`size` 的结果就应该严格大于零。用输出精化中的[逻辑蕴含](Tutorial_02_Logic.html#semantics)表达这一点：

```haskell
{-@ size :: xs:[a] -> {v:Nat | notEmpty xs => v > 0} @-}
```

这里同时要求结果属于 `Nat`。即使输入为空，也仍然知道长度非负。

### 只接收非空列表的平均值函数

平均值对非空列表才有定义，因此可以直接使用 `NEList` 表达输入要求：

```haskell
{-@ average :: NEList Int -> Int @-}
average xs = divide total elems
  where
    total  = sum xs
    elems  = size xs
```

### 练习：也可以返回 `Maybe` {#Average-Maybe}

修改下面的 `average'`：输入为空时返回 `Nothing`，非空时返回计算结果。

```haskell
average'      :: [Int] -> Maybe Int
average' xs
  | ok        = Just $ divide (sum xs) elems
  | otherwise = Nothing
  where
    elems     = size xs
    ok        = True   -- What expression goes here?
```

### 练习：规格也需要调试 {#Debugging-Specifications}

LiquidHaskell 这样的形式化验证器，不仅能帮助我们检查 **实现**，也能帮助检查我们写下的 **规格**。请解释：下面两个 `size` 变体为什么都无法通过验证？

```haskell
{-@ size1    :: xs:NEList a -> Pos @-}
size1 []     =  0
size1 (_:xs) =  1 + size1 xs

{-@ size2    :: xs:[a] -> {v:Int | notEmpty xs => v > 0} @-}
size2 []     =  0
size2 (_:xs) =  1 + size2 xs
```

## 安全的列表 API

能够描述非空列表之后，就可以检查那些只对非空列表有定义的操作，防止它们在意外收到空列表时崩溃。

### `head` 和 `tail`

这两个函数是典型的例子：输入非空时有意义，输入为空时会失败。可以这样给它们规定类型：

```haskell
{-@ head    :: NEList a -> a @-}
head (x:_)  = x
head []     = die "Fear not! 'twill ne'er come to pass"

{-@ tail    :: NEList a -> [a] @-}
tail (_:xs) = xs
tail []     = die "Relaxeth! this too shall ne'er be"
```

LiquidHaskell 根据前置条件，推导出两个定义中的第二个分支都是 **不可达代码**。当然，代价是每个调用者都必须证明自己传入的是非空列表。

### 练习：安全地取第一个元素 {#Safe-Head}

给 `null` 写一个规格，使 `safeHead` 通过验证。**不要** 把 `null` 的输入限制成非空列表，那样就失去了检查空列表的意义。正确的规格应该说明：它接受 **任意** 列表，而且返回 `False` **当且仅当** 输入列表非空。

**提示：** 可以回顾[逻辑一章](Tutorial_02_Logic.html#semantics)中的蕴含 `==>` 和逻辑等价 `<=>`。

```haskell
safeHead      :: [a] -> Maybe a
safeHead xs
  | null xs   = Nothing
  | otherwise = Just $ head xs

{-@ null      :: [a] -> Bool @-}
null []       =  True
null (_:_)    =  False
```

### 把相邻的相同元素分组

利用这些约束，编写一个函数，把连续相等的元素组成非空小组：

```haskell
{-@ groupEq    :: (Eq a) => [a] -> [NEList a] @-}
groupEq []     = []
groupEq (x:xs) = (x:ys) : groupEq zs
  where
    (ys, zs)   = span (x ==) xs
```

返回结果中的 **每个元素** 都以 `x:ys` 的形式构造，因此必然非空。LiquidHaskell 由此能推断，整个结果的类型是 `[NEList a]`，也就是“由非空列表组成的列表”。

### 去掉连续重复的字符

可以先用 `groupEq` 把字符串拆成若干组连续重复的字符，再从每组取出第一个字符：

```haskell
-- >>> eliminateStutter "ssstringssss liiiiiike thisss"
-- "strings like this"
eliminateStutter xs = map head $ groupEq xs
```

LiquidHaskell 会为这里 `map` 的类型参数自动补上 `notEmpty v` 这一精化条件，从而证明每次调用 `head` 时，接收到的列表都非空。

### `foldl1`

作者很喜欢这个折叠函数：它把序列的第一个元素当作初始累积值。当然，这也意味着它只能处理非空序列。

```haskell
{-@ foldl1         :: (a -> a -> a) -> NEList a -> a @-}
foldl1 f (x:xs)    = foldl f x xs
foldl1 _ []        = die "foldl1"

foldl              :: (a -> b -> a) -> a -> [b] -> a
foldl _ acc []     = acc
foldl f acc (x:xs) = foldl f (f acc x) xs
```

### 对非空列表求和

对非空数字列表求和，只需要把 `foldl1` 与 `(+)` 组合起来。前置条件让 LiquidHaskell 能证明 `die` 所在分支不可达：

```haskell
{-@ sum :: (Num a) => NEList a -> a  @-}
sum []  = die "cannot add up empty list"
sum xs  = foldl1 (+) xs
```

因此，这里定义的 `sum` 只能用于非空列表：

```haskell
sumOk  = sum [1,2,3,4,5]    -- is accepted by LH, but

sumBad = sum []             -- is rejected by LH
```

> **译者说明**：这是本章为了演示前置条件而定义的 `sum`，不是 Prelude 中“空列表求和返回零”的那个 `sum`。不要把本例的限制套用到所有同名函数上。

### 练习：加权平均值 {#Weighted-Average}

下面的函数计算加权平均值，但 LiquidHaskell 不接受它。请找出原因，适当地修改代码或规格。

```haskell
{-@ wtAverage :: NEList (Pos, Pos) -> Int @-}
wtAverage wxs = divide totElems totWeight
  where
    elems     = map (\(w, x) -> w * x) wxs
    weights   = map (\(w, _) -> w    ) wxs
    totElems  = sum elems
    totWeight = sum weights
    sum       = foldl1 (+)

map           :: (a -> b) -> [a] -> [b]
map _ []      =  []
map f (x:xs)  =  f x : map f xs
```

**提示：** 报错指出了哪些变量？这些变量的值由什么函数计算得到？能否给这些函数写出更准确的规格？

### 练习：Mitchell 的 `risers` {#Mitchells-Risers}

非空列表会在很多地方出现。如果类型系统能跟踪非空性，而我们又不必专门创建一种新数据类型，代码会方便很多。

看一下 [Neil Mitchell 推广的 `risers` 函数][mitchell-riser]。`safeSplit` 要求输入非空，但是 LiquidHaskell 认为 `risers` 内部的调用还没有满足这个要求。请修改 `risers` 的规格，使它通过验证。

```haskell
{-@ risers       :: (Ord a) => [a] -> [[a]] @-}
risers           :: (Ord a) => [a] -> [[a]]
risers []        = []
risers [x]       = [[x]]
risers (x:y:etc)
  | x <= y       = (x:s) : ss
  | otherwise    = [x] : (s : ss)
    where
      (s, ss)    = safeSplit $ risers (y:etc)

{-@ safeSplit    :: NEList a -> (a, [a]) @-}
safeSplit (x:xs) = (x, xs)
safeSplit _      = die "don't worry, be happy"
```

## 回顾

这一章介绍了如何：

1. 用度量函数 **定义数据结构的性质**。
2. 在这些性质上添加精化，表达关键不变量，并在编译时检查操作是否可能遇到未预期的输入。
3. 继续使用 **普通 Haskell 类型**，例如列表，而不必[另造数据类型][apple-riser]。后者往往会带来大量新构造器和转换操作，让实现和规格变得杂乱。

度量函数能表达的东西远不止“是否为空”。下一章继续用它描述长度、大小和维度。
