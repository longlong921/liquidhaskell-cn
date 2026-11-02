# 数值度量函数 {#numericmeasure}

前面的不少程序，例如[向量边界的例子](Tutorial_04_Polymorphism.html#vectorbounds)，都有一点“下标依赖症”。这是 [Richard Bird][bird-pearls] 提出的说法：程序过于关注下标的增减和遍历，容易引入各种差一个位置的错误。

换一种更高层次的写法，可以避开这类问题。[Wholemeal programming][hinze-icfp09] 强调整体处理集合，使用 `map`、`fold`、`reduce` 等组合操作，而不是手工控制每个下标。

不过，**整体式编程也不是万能药**。当操作涉及多个集合时，仍然要保证它们相互兼容。维度不匹配时，程序可能不会崩溃，却算出一个毫无意义的结果。接下来用度量函数描述维度，为列表建立一套了解长度信息的 API，再用它实现维度安全的向量和矩阵操作。

> 原注：作者计划在后续 K-means 聚类案例中使用这套 API。当前这份公开教程的十二章未包含该案例。

> **译者说明**：本章的算术规格采用教程中的逻辑模型。机器 `Int` 有界，数学整数的等式并不自动包含机器溢出保证；实际工程需要另外处理数值范围与溢出。

## 整体式编程

先摆脱下标！作为例子，写一个小型数值库：用列表表示向量，用嵌套向量表示矩阵。

```haskell
data Vector a = V { vDim  :: Int
                  , vElts :: [a]
                  }
              deriving (Eq)

data Matrix a = M { mRow  :: Int
                  , mCol  :: Int
                  , mElts :: Vector (Vector a)
                  }
              deriving (Eq)
```

### 点积

两个向量的点积，可以通过逐项相乘再求和实现：

```haskell
dotProd       :: (Num a) => Vector a -> Vector a -> a
dotProd vx vy = sum (prod xs ys)
  where
    prod      = zipWith (\x y -> x * y)
    xs        = vElts vx
    ys        = vElts vy
```

### 矩阵乘法的第一版

矩阵乘法也能写成高层次的整体操作：不再手动控制下标，而是遍历矩阵中的元素。

```haskell
matProd       :: (Num a) => Matrix a -> Matrix a -> Matrix a
matProd (M rx _ xs) (M _ cy ys)
              = M rx cy elts
  where
    elts      = for xs (\xi ->
                  for ys (\yj ->
                    dotProd xi yj
                  )
                )
```

这里的 `for` 只是对向量元素做 `map`：

```haskell
for            :: Vector a -> (a -> b) -> Vector b
for (V n xs) f = V n (map f xs)
```

这种写法让我们不用再操心下标范围，却没有消除所有问题。现在需要仔细考虑不同集合之间的 **兼容关系**：

- `dotProd` 只对同维度向量有意义。如果其中一个向量比较短，普通的截断式配对可能给出错误结果，而不会直接报错；这样的错误很难调试。
- `matProd` 也只对维度兼容的矩阵有定义：`mx` 的列数必须等于 `my` 的行数。否则仍然可能得到错误输出。

> 原注：上面的 `matProd` 虽然能通过普通 GHC 类型检查，但实现其实有错！本章后面会回过头修正它。

## 描述列表的维度

要推理维度，首先得让精化逻辑能够表达列表的 **长度**。

> 原注：不能直接相信 `vDim` 字段。仅从普通数据定义看，没有任何东西保证这个字段恰好等于底层列表的实际长度。

### 用度量函数描述长度

[上一章](Tutorial_06_Measure_Bool.html#boolmeasures)介绍了如何把 Haskell 函数提升到精化逻辑。列表长度非常适合用度量函数表达：

```haskell
{-@ measure size @-}
{-@ size :: [a] -> Nat @-}
size []     = 0
size (_:rs) = 1 + size rs
```

> 原注：回顾[度量函数的要求](Tutorial_06_Measure_Bool.html#usingmeasures)：定义遵循数据的归纳结构，每个数据构造器对应一个方程。

### 度量函数会强化构造器类型

和[精化的数据定义](Tutorial_05_Datatypes.html#autosmart)一样，度量函数也会转化成构造器类型中的约束。例如，`size` 会带来：

```haskell
data [a] where
  []  :: {v: [a] | size v = 0}
  (:) :: a -> xs:[a] -> {v:[a]|size v = 1 + size xs}
```

### 同一种结构可以有多个度量函数

除了 `size`，也可以继续为列表定义 `notEmpty`：

```haskell
{-@ measure notEmpty @-}
notEmpty       :: [a] -> Bool
notEmpty []    = False
notEmpty (_:_) = True
```

多个度量函数的条件通过 **合取**，也就是逻辑上的“并且”，组合到同一个构造器类型里。上面两个度量函数一起得到：

```haskell
data [a] where
  []  :: {v: [a] | not (notEmpty v) && size v = 0}
  (:) :: a
      -> xs:[a]
      -> {v:[a]| notEmpty v && size v = 1 + size xs}
```

原文认为，这相对于在 [DML][dml] 或 [Agda][agdavec] 风格的索引类型中预先编码性质，有一个实用优势：**性质与数据结构可以分开定义**。我们不必事先决定要把哪些索引放进结构中，而是先保留通用结构，再按需要补上新的度量函数，让同一种结构服务于不同目的。

建立维度 API 之前，再准备几个便于阅读的类型别名。

首先，为普通列表取一个名称，让后面的签名形式更整齐：

```haskell
type List a = [a]
```

`ListN a N` 表示元素类型为 `a`、长度恰好是 `N` 的列表；`ListX a X` 表示长度与另一个列表 `X` 相同的列表。

```haskell
{-@ type ListN a N = {v:List a | size v = N} @-}
{-@ type ListX a X = ListN a {size X}        @-}
```

注意，精化类型别名用大写的 `N`、`X` 表示 **值参数**，用小写的 `a` 表示 **类型参数**。`a` 回答“装的是什么类型”，`N` 回答“装了多少个”。

## 保持长度的列表 API

有了这些类型和别名，就可以给常见列表函数添加维度信息。实现仍然是 [`Data.List`][data-list] 中那一类常见写法，只是规格更精确了。

### 练习：`map` {#Map}

`map` 的输出长度应当与输入相同。修改它的规格，使 `prop_map` 得到验证。

```haskell
{-@ map      :: (a -> b) -> xs:List a -> List b @-}
map _ []     = []
map f (x:xs) = f x : map f xs

{-@ prop_map :: List a -> TRUE @-}
prop_map xs = size ys == size xs
  where
    ys      = map id xs
```

### 练习：反转列表 ★ {#Reverse}

下面通过尾递归函数 `go` 反转列表。请为 `go` 补充签名，使 LiquidHaskell 能证明 `reverse` 的规格。

**提示：**`go` 的结果长度，与两个参数的长度有什么关系？

```haskell
{-@ reverse       :: xs:List a -> ListX a xs @-}
reverse xs        = go [] xs
  where
    go acc []     = acc
    go acc (x:xs) = go (x:acc) xs
```

### 只接受等长列表的 `zipWith`

这一版 `zipWith` 要求两个输入列表 **长度相同**，并返回同样长度的结果。

```haskell
{-@ zipWith :: (a -> b -> c) -> xs:List a
                             -> ListX b xs
                             -> ListX c xs
  @-}
zipWith f (a:as) (b:bs) = f a b : zipWith f as bs
zipWith _ [] []         = []
zipWith _ _  _          = die "no other cases"
```

> 原注：调用 `die` 的分支把被排除的情况明确写了出来：如果一个列表为空、另一个非空，二者长度就不相等，违反输入前提，因此这个分支不应当可达。

### 截断到较短列表的 `zip`

上面的要求比较严格，排除了“只配对到较短输入结束”的行为。下面这一版允许截断，并在输出类型中准确描述：结果长度等于两个输入长度的较小值。

```haskell
{-@ zip :: as:[a] -> bs:[b] -> {v:[(a,b)] | Tinier v as bs} @-}
zip (a:as) (b:bs) = (a, b) : zip as bs
zip [] _          = []
zip _  []         = []
```

输出类型使用谓词 `Tinier Xs Ys Zs`，表示 `Xs` 的长度是 `Ys` 与 `Zs` 长度中的较小者：

```haskell
{-@ predicate Tinier X Y Z = Min (size X) (size Y) (size Z) @-}
{-@ predicate Min X Y Z = (if Y < Z then X = Y else X = Z)  @-}
```

> 原注：在逻辑中，`if p then q else r` 可以写成 `(p => q) && (not p => r)`。

### 练习：为空就返回空，否则必须等长 ★★ {#Zip-Unless-Empty}

作者认为，截断式 `zip` 太宽松，容易悄悄放过错误。作为一种折中，考虑下面的 `zipOrNull`：只要有一个输入为空，结果就为空；否则，它使用要求等长的 `zipWith`。

请为 `zipOrNull` 写规格，让下面的代码通过 LiquidHaskell 验证。

```haskell
zipOrNull       :: [a] -> [b] -> [(a, b)]
zipOrNull [] _  = []
zipOrNull _ []  = []
zipOrNull xs ys = zipWith (,) xs ys

{-@ test1 :: {v: _ | size v = 2} @-}
test1     = zipOrNull [0, 1] [True, False]

{-@ test2 :: {v: _ | size v = 0} @-}
test2     = zipOrNull [] [True, False]

{-@ test3 :: {v: _ | size v = 0} @-}
test3     = zipOrNull ["cat", "dog"] []
```

**提示：** 这个类型会稍显复杂，需要组合析取 `||`、合取 `&&` 和蕴含 `=>`。

## 缩短列表的 API {#listreducing}

接下来研究以不同方式截取或拆分列表的函数。

### 精确取出前 `n` 个元素

`take'` 从列表开头取出指定数量的元素：

```haskell
{-@ take'     :: n:Nat -> ListGE a n -> ListN a n @-}
take' 0 _      = []
take' n (x:xs) = x : take' (n-1) xs
take' _ _      = die "won't  happen"
```

别名 `ListGE a N` 表示长度 **至少为 `N`** 的列表：

```haskell
{-@ type ListGE a N = {v:List a | N <= size v} @-}
```

### 练习：`drop` {#Drop}

`drop` 与 `take` 相互对应：它返回去掉前 `n` 个元素之后的剩余部分。为它编写适当的规格，让下面的代码通过检查。

```haskell
drop 0 xs     = xs
drop n (_:xs) = drop (n-1) xs
drop _ _      = die "won't happen"

{-@ test4 :: ListN String 2 @-}
test4 = drop 1 ["cat", "dog", "mouse"]
```

### 练习：宽松一些的 `take` {#Take-it-easy}

上面的 `take'` 要求输入至少有 `n` 个元素，有时过于严格。更常见的 `take` 会在列表提前耗尽时直接停止。给下面的函数补充规格，让两个例子都得到验证。

```haskell
take 0 _       = []
take _ []      = []
take n (x:xs)  = x : take (n-1) xs

{-@ test5 :: [ListN String 2] @-}
test5 = [ take 2  ["cat", "dog", "mouse"]
        , take 20 ["cow", "goat"]        ]
```

### 按条件划分列表

`partition` 把列表拆成两部分：满足用户给定谓词的元素，以及不满足谓词的元素。

```haskell
partition          :: (a -> Bool) -> [a] -> ([a], [a])
partition _ []     = ([], [])
partition f (x:xs)
  | f x            = (x:ys, zs)
  | otherwise      = (ys, x:zs)
  where
    (ys, zs)       = partition f xs
```

我们希望表达：两个输出列表的 **长度之和** 等于输入列表的长度。先为二元组的两个分量定义度量函数：

```haskell
{-@ measure fst @-}
fst  (x, _) = x

{-@ measure snd @-}
snd (_, y) = y
```

这样就能给 `partition` 写出精化类型：

```haskell
{-@ partition :: _ -> xs:_ -> {v:_ | Sum2 v (size xs)} @-}
```

其中，`Sum2 V N` 表示二元组 `V` 里两个列表的长度相加等于 `N`：

```haskell
{-@ predicate Sum2 X N = size (fst X) + size (snd X) = N @-}
```

### 练习：快速排序 {#QuickSort}

使用 `partition` 实现 `quickSort`，并满足输出长度与输入相同的规格。

```haskell
-- >> quickSort [1,4,3,2]
-- [1,2,3,4]

{-@ quickSort    :: (Ord a) => xs:List a -> ListX a xs @-}
quickSort []     = []
quickSort (x:xs) = undefined

{-@ test10 :: ListN String 2 @-}
test10 = quickSort (drop 1 ["cat", "dog", "mouse"])
```

> **译者说明**：这里给出的规格只要求长度保持。单凭这个签名，还没有证明结果有序，也没有证明每个元素的出现次数保持不变。

## 维度安全的向量 API

现在利用带长度信息的列表，构造安全的向量 API。

### 什么是合法向量

一个合法的 `Vector`，其 `vDim` 字段必须与底层列表长度一致：

```haskell
{-@ data Vector a = V { vDim  :: Nat
                      , vElts :: ListN a vDim }         
  @-}
```

当 `vDim` 用作字段选择函数时，返回的是参数 `x` 的维度字段：

```haskell
{-@ vDim :: x:_ -> {v: Nat | v = vDim x} @-}
```

精化的数据定义因此能拒绝维度声明与实际长度不符的向量：

```haskell
okVec  = V 2 [10, 20]       -- accepted by LH

badVec = V 2 [10, 20, 30]   -- rejected by LH
```

再准备几个常用别名，分别表示非空向量、指定维度的向量，以及与另一个向量同维度的向量：

```haskell
-- | Non Empty Vectors
{-@ type VectorNE a  = {v:Vector a | vDim v > 0} @-}

-- | Vectors of size N
{-@ type VectorN a N = {v:Vector a | vDim v = N} @-}

-- | Vectors of Size Equal to Another Vector X
{-@ type VectorX a X = VectorN a {vDim X}        @-}
```

### 构造向量

可以先创建空向量 `vEmp`，再通过 `vCons` 逐个添加元素：

```haskell
{-@ vEmp :: VectorN a 0 @-}
vEmp = V 0 []

{-@ vCons :: a -> x:Vector a -> VectorN a {vDim x + 1} @-}
vCons x (V n xs) = V (n+1) (x:xs)
```

### 访问向量

如果需要较低层次的访问，可以提供向量版的 `head` 和 `tail`。这两个操作只接受非空向量：

```haskell
{-@ vHd :: VectorNE a -> a @-}
vHd (V _ (x:_))  = x
vHd _            = die "nope"

{-@ vTl          :: x:VectorNE a -> VectorN a {vDim x - 1} @-}
vTl (V n (_:xs)) = V (n-1) xs
vTl _            = die "nope"
```

### 遍历向量

用 `for` 对每个元素执行变换，同时保持维度：

```haskell
{-@ for        :: x:Vector a -> (a -> b) -> VectorX b x @-}
for (V n xs) f = V n (map f xs)
```

### 二元逐项操作

两个向量逐项进行二元运算时，必须相互兼容，也就是维度相同。可以把这个要求写进一个通用组合函数：

```haskell
{-@ vBin :: (a -> b -> c) -> x:Vector a
                          -> VectorX b x
                          -> VectorX c x
  @-}
vBin op (V n xs) (V _ ys) = V n (zipWith op xs ys)
```

### 维度安全的点积

现在，点积既可以采用整体式写法，又能检查两个向量是否同维度：

```haskell
{-@ dotProduct :: (Num a) => x:Vector a -> VectorX a x -> a @-}
dotProduct x y = sum $ vElts $ vBin (*) x y
```

### 练习：从普通列表创建向量 {#Vector-Constructor}

补全 `vecFromList` 的 **规格和实现**，让它从普通列表创建 `Vector`，并使后面的用法通过检查。

```haskell
vecFromList     :: [a] -> Vector a
vecFromList xs  =  undefined

test6  = dotProduct vx vy    -- should be accepted by LH
  where
    vx = vecFromList [1,2,3]
    vy = vecFromList [4,5,6]
```

### 练习：展平嵌套向量 ★ {#Flatten}

编写 `flatten`，把外层长度为 `n`、每个内层向量长度为 `m` 的嵌套向量，展平成长度为 `m * n` 的向量。

```haskell
{-@ flatten :: n:Nat
            -> m:Nat
            -> VectorN (VectorN a m) n
            -> VectorN a {m * n}
  @-}
flatten = undefined
```

### 两两相乘的结果

两个向量的所有元素两两组合相乘，可以先做嵌套遍历，再用 `flatten` 展平：

```haskell
{-@ product   :: xs:Vector _
              -> ys:Vector _
              -> VectorN _ {vDim xs * vDim ys}
  @-}
product xs ys = flatten (vDim ys) (vDim xs) xys
  where
    xys       = for ys $ \y ->
                  for xs $ \x ->
                    x * y
```

> **译者说明**：原文把这里称为 “Cross Product”。按实际代码，它枚举两边元素的所有组合并相乘，结果有 `m * n` 项，可理解为展平的外积；它不是三维几何里那个结果仍为三维向量的叉积。

## 维度安全的矩阵 API

同样的方法可以用于矩阵：构造时检查矩阵形状是否合法，操作时检查两个矩阵是否兼容。

### 什么是合法矩阵

外层向量的维度必须等于行数 `mRow`，每个内层向量的维度必须等于列数 `mCol`：

```haskell
{-@ data Matrix a =
      M { mRow  :: Pos
        , mCol  :: Pos
        , mElts :: VectorN (VectorN a mCol) mRow
        }
  @-}
```

这里要求行数、列数都是正数，从而排除零行或零列的退化矩阵。

```haskell
{-@ type Pos = {v:Int | 0 < v} @-}
```

为指定行数、列数的矩阵定义一个别名：

```haskell
{-@ type MatrixN a R C   = {v:Matrix a | Dims v R C } @-}
{-@ predicate Dims M R C = mRow M = R && mCol M = C   @-}
```

例如，可以明确写出下面矩阵是 `2 × 3`：

```haskell
{-@ ok23 :: MatrixN _ 2 3 @-}
ok23     = M 2 3 (V 2 [ V 3 [1, 2, 3]
                      , V 3 [4, 5, 6] ])
```

### 练习：修正不合法的矩阵 {#Legal-Matrix}

修改 `bad1` 和 `bad2`，让它们成为能通过 LiquidHaskell 检查的合法矩阵。

```haskell
bad1 :: Matrix Int
bad1 = M 2 3 (V 2 [ V 3 [1, 2   ]
                  , V 3 [4, 5, 6]])

bad2 :: Matrix Int
bad2 = M 2 3 (V 2 [ V 2 [1, 2]
                  , V 2 [4, 5] ])
```

### 练习：从嵌套列表构造矩阵 ★ {#Matrix-Constructor}

编写从嵌套列表构造 `Matrix` 的函数。输入形状不合法时，应当返回 `Nothing`。

```haskell
matFromList      :: [[a]] -> Maybe (Matrix a)
matFromList []   = Nothing
matFromList xss@(xs:_)
  | ok           = Just (M r c vs)
  | otherwise    = Nothing
  where
    r            = size xss
    c            = size xs
    ok           = undefined
    vs           = undefined
```

### 练习：进一步精化矩阵构造器 ★★ {#Refined-Matrix-Constructor}

强化 `matFromList` 的规格，使下面的类型声明通过检查：

```haskell
{-@ mat23 :: Maybe (MatrixN Integer 2 2) @-}
mat23     = matFromList [ [1, 2]
                        , [3, 4] ]
```

**提示：** 从 `xss` 描述行数比较容易。列数怎样得到？也许可以定义一个度量函数。

### 正确的矩阵乘法

最后回到矩阵乘法。你可能以为本章开头已经写过了，但那个版本其实有错，可以实际运行检查。

不是任意两个矩阵都能相乘：第一个矩阵的 **列数** 必须等于第二个矩阵的 **行数**。满足这个条件后，结果的每个位置由第一个矩阵的一行与第二个矩阵的一列做点积得到。

```haskell
{-@ matProduct :: (Num a) => x:Matrix a
                          -> y:{Matrix a  | mCol x = mRow y}
                          -> MatrixN a (mRow x) (mCol y)
  @-}
matProduct (M rx _ xs) my@(M _ cy _)
                 = M rx cy elts
  where
    elts         = for xs (\xi ->
                     for ys' (\yj ->
                       dotProduct xi yj
                     )
                   )
    M _ _ ys'    = transpose my
```

要遍历 `my` 的 **列**，可以先做转置，让列变成行：

```haskell
-- >>> ok32 == transpose ok23
-- True
ok32 = M 3 2 (V 3 [ V 2 [1, 4]
                  , V 2 [2, 5]
                  , V 2 [3, 6] ])
```

### 练习：矩阵转置 ★★ {#Matrix-Transpose}

使用前面建立的向量 API，补全 `txgo`。可以参考 [`Data.List.transpose` 的实现][URL-transpose]，不过作者更建议先自己想一想。

```haskell
{-@ transpose :: m:Matrix a -> MatrixN a (mCol m) (mRow m) @-}
transpose (M r c rows) = M c r $ txgo c r rows

{-@ txgo      :: c:Nat -> r:Nat
              -> VectorN (VectorN a c) r
              -> VectorN (VectorN a r) c
  @-}
txgo c r rows = undefined
```

**提示：** 观察 `ok23` 和 `ok32`：每次从所有输入行取出头部元素，就能组成输出的一行；然后对剩下的部分重复这个过程。

## 回顾

这一章使用度量函数描述了列表和嵌套列表的数值性质，并把它们用在 `Vector` 与 `Matrix` 上：

1. 度量函数按结构递归定义，每个数据构造器对应一个方程。
2. 度量函数可以参与精化的数据定义，从而拒绝不合法的值。
3. 带维度信息的 API 能保证操作只用于形状兼容的值，让整体式编程更加安全。

数值度量函数还能描述很多其他结构性质。后面会看到从高层次的 [AVL 树](Tutorial_12_Case_Study_AVL.html#case-study-avltree)，到低层次的安全[指针算术](Tutorial_11_Case_Study_Pointers.html#case-study-pointers)等不同例子。
