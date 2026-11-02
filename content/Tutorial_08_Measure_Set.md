# 集合度量函数 {#setmeasure}

很多正确性要求，关心的是一个数据结构里 **究竟有哪些元素**，或一个函数会怎样改变这些元素。例如，我们希望：

- 排序过程不会凭空增加或丢失输入中的元素。
- 资源管理函数不会意外复制资源，或者遗漏仍需跟踪的资源。
- 操作语法树的函数能保持作用域正确：用到的变量，都已经在相应作用域内定义过。

> **译者说明**：原文将第一项称为“输出是输入的一个排列”。但本章的集合规格只记录元素是否出现，**不记录出现次数**。例如 `[1,1,2]` 与 `[1,2,2]` 的元素集合相同。要严格证明输出是输入的排列，还需跟踪每个元素的重数，或补充足够的其他条件；仅证明集合相等并不够。

SMT 求解器支持表达力较强的逻辑。除了线性算术和未解释函数，它们也能[判定受支持的集合公式][smt-set]。这一章利用这种能力，为数据结构的元素集合规定不变量，并验证相关接口。

## 在规格中谈论集合

首先，我们得有办法在精化逻辑中表示集合。可以自行定义一种 Haskell 类型，但这里直接使用 `Data.Set` 的 `Set a`。

> 原注：[这篇文章](https://ucsd-progsys.github.io/liquidhaskell-blog/2013/03/26/talking-about-sets.lhs/)简要介绍了怎样直接使用 LiquidHaskell 内置的集合操作。

### 从 Haskell 集合操作到逻辑集合操作

LiquidHaskell 会把 `Data.Set` 的基础操作提升到精化逻辑。验证环境提供以下 **逻辑函数**，对应同名的 Haskell 函数：

```haskell
measure empty        :: Set a
measure singleton    :: a -> Set a
measure member       :: a -> Set a -> Bool
measure union        :: Set a -> Set a -> Set a
measure intersection :: Set a -> Set a -> Set a
measure difference   :: Set a -> Set a -> Set a
```

### 求解器理解这些操作的含义

这些是 SMT 求解器能够 **解释** 的运算符。就像求解器根据算术理论知道，对于所有 `x`，下面的蕴含成立：

`x = 1 + 1 ⇒ x = 2`

它也知道这个集合公式成立：

`x = {1} ⇒ y = {2} ⇒ x = x ∩ (y ∪ x)`

原因是，这些公式属于可判定的集合理论；它可以归约到 McCarthy 更一般的[数组理论][mccarthy]。

> 原注：[这篇论文][z3cal]介绍了现代 SMT 求解器怎样证明上述一类等式。

## 证明 QuickCheck 风格的性质 {#quickcheck}

先做几个热身：使用 LiquidHaskell 证明集合及集合操作的简单定理。

### 给集合 API 精确的规格

为了方便陈述定理，可以为 `Data.Set` 的操作添加精化类型，让签名准确描述相应的集合行为：

```haskell
empty        :: {v:Set a | v = empty}
member       :: x:a
             -> s:Set a
             -> {v:Bool | v <=> member x s}

singleton    :: x:a -> {v:Set a | v = singleton x}

union        :: x:Set a
             -> y:Set a
             -> {v:Set a | v = union x y}

intersection :: x:Set a
             -> y:Set a
             -> {v:Set a | v = intersection x y}

difference   :: x:Set a
             -> y:Set a
             -> {v:Set a | v = difference x y}
```

### 把定理写成总为真的布尔函数

可以用 [QuickCheck](https://hackage.haskell.org/package/QuickCheck) 风格来陈述性质：函数接收任意输入，返回一个应当始终为 `True` 的 `Bool`。先定义两个类型别名，分别表示恒真的布尔值与恒假的布尔值：

```haskell
{-@ type True  = {v:Bool |     v} @-}
{-@ type False = {v:Bool | not v} @-}
```

利用 `True` 这个精化类型，就能陈述定理。例如，前面的简单算术等式写成：

```haskell
{-@ prop_one_plus_one_eq_two :: _ -> True @-}
prop_one_plus_one_eq_two x   = (x == 1 + 1) `implies` (x == 2)
```

其中，`implies` 是布尔值上的蕴含运算：

```haskell
{-@ implies        :: p:Bool -> q:Bool -> Implies p q  @-}
implies False _    = True
implies _     True = True
implies _    _     = False
```

类型别名 `Implies P Q` 则定义为：

```haskell
{-@ type Implies P Q = {v:_ | v <=> (P => Q)} @-}
```

> **译者说明**：这里借用了 QuickCheck 的“性质函数”写法，证明过程本身由 LiquidHaskell 和 SMT 求解器完成。运行 QuickCheck 是另一件事：它会生成测试输入，寻找反例。

### 练习：有上界的加法 {#Bounded-Addition}

编写并证明下面的 QuickCheck 风格性质：对于所有 `x`、`y`，如果 `x < 100` 且 `y < 100`，那么 `x + y < 200`。

```haskell
{-@ prop_x_y_200 :: _ -> _ -> True @-}
prop_x_y_200 x y = False -- fill in the theorem body
```

> **译者说明**：这是教程算术模型里的陈述。若把变量具体解释为有界机器 `Int`，仅限制上界并不能排除负方向溢出；工程规格还需要相应的范围条件，或使用数学整数语义。

### 交集满足交换律

交集的交换律可以直接写成下面的性质：

```haskell
{-@ prop_intersection_comm :: _ -> _ -> True @-}
prop_intersection_comm x y
  = (x `intersection` y) == (y `intersection` x)
```

### 并集满足结合律

同样可以确认并集的结合律：

```haskell
{-@ prop_union_assoc :: _ -> _ -> _ -> True @-}
prop_union_assoc x y z
  = (x `union` (y `union` z)) == (x `union` y) `union` z
```

### 分配律

对相关运算写出性质，就能检查布尔代数中的分配律。例如，交集对并集满足分配律：

```haskell
{-@ prop_intersection_dist :: _ -> _ -> _ -> True @-}
prop_intersection_dist x y z
  =  x `intersection` (y `union` z)
     ==
     (x `intersection` y) `union` (x `intersection` z)
```

### 错误的“定理”应当被拒绝

当然，我们也希望 LiquidHaskell 拒绝不成立的命题：

```haskell
{-@ prop_cup_dif_bad :: _ -> _ -> True @-}
prop_cup_dif_bad x y
  = pre `implies` (x == ((x `union` y) `difference` y))
  where
    pre = True  -- Fix this with a non-trivial precondition
```

### 练习：集合的差集 {#Set-Difference}

上面的性质为什么不成立？

1. 使用 QuickCheck，或者自己推理，找出 `prop_cup_dif_bad` 的一个 **反例**。
2. 根据反例，为 `pre` 选择一个非平凡条件，使命题可以被证明。不要简单地把它改成 `False`。

因此，精化类型提供了一种使用 SMT 求解器 **证明** 性质的接口，同时也可以借助 QuickCheck 来寻找反例。

> 原注：[SBV][sbv] 和 [Leon][leon] 分别展示了在 Haskell 与 Scala 中通过领域专用语言使用 SMT 求解器的另一种途径。

## 了解元素内容的列表 API {#listelems}

回到主要目标：验证程序性质。首先，为列表 API 添加精化，让类型能跟踪列表中元素的集合。

### 列表包含哪些元素

用一个简单的递归度量函数遍历列表，逐项构造元素集合：

```haskell
{-@ measure elts @-}
elts        :: (Ord a) => [a] -> Set a
elts []     = empty
elts (x:xs) = singleton x `union` elts xs
```

接下来定义几个实用别名，让后面的规格简洁一些。

**元素集合恰好为 `S` 的列表：**

```haskell
{-@ type ListS a S = {v:[a] | elts v = S} @-}
```

**空列表：**

```haskell
{-@ type ListEmp a = ListS a {Set_empty 0} @-}
```

**元素集合与列表 `X` 相同的列表：**

```haskell
{-@ type ListEq a X = ListS a {elts X}    @-}
```

**元素集合包含于列表 `X` 的元素集合中的列表：**

```haskell
{-@ type ListSub a X = {v:[a]| Set_sub (elts v) (elts X)} @-}
```

**元素集合等于列表 `X` 与 `Y` 的元素集合之并的列表：**

```haskell
{-@ type ListUn a X Y = ListS a {Set_cup (elts X) (elts Y)} @-}
```

**元素集合由元素 `X` 加上列表 `Y` 的元素集合组成的列表：**

```haskell
{-@ type ListUn1 a X Y = ListS a {Set_cup (Set_sng X) (elts Y)} @-}
```

度量函数会强化列表构造器的类型。空列表和非空列表构造器会自动获得如下规格：

```haskell
data [a] where
  []  :: ListEmp a
  (:) :: x:a -> xs:[a] -> ListUn1 a x xs
```

现在试着使用这套新词汇。

### 连接列表

`append'` 的输出元素集合，是两个输入列表元素集合的并集：

```haskell
{-@ append'       :: xs:_ -> ys:_ -> ListUn a xs ys @-}
append' []     ys = ys
append' (x:xs) ys = x : append' xs ys
```

### 练习：反转时保留元素集合 {#Reverse-elements}

为 `revHelper` 写一个规格，让 `reverse'` 通过 LiquidHaskell 验证。

```haskell
{-@ reverse' :: xs:[a] -> ListEq a xs @-}
reverse' xs = revHelper [] xs

revHelper acc []     = acc
revHelper acc (x:xs) = revHelper (x:acc) xs
```

### 练习：拆分列表 ★ {#Halve}

为 `halve` 写出规格，让后面的“定理” `prop_halve_append` 得到证明。

```haskell
halve            :: Int -> [a] -> ([a], [a])
halve 0 xs       = ([], xs)
halve n (x:y:zs) = (x:xs, y:ys) where (xs, ys) = halve (n-1) zs
halve _ xs       = ([], xs)

{-@ prop_halve_append  :: _ -> _ -> True @-}
prop_halve_append n xs = elts xs == elts xs'
  where
    xs'      =  append' ys zs
    (ys, zs) =  halve n xs
```

**提示：** 可以回顾[上一章 `partition` 的维度规格](Tutorial_07_Measure_Int.html#listreducing)。那里描述了拆分前后的长度关系，这里要描述元素集合之间的关系。

### 练习：成员判断 {#Membership}

给 `elem` 写一个足够精确的签名，让 `test1` 和 `test2` 都通过验证。

```haskell
{-@ elem      :: (Eq a) => a -> [a] -> Bool @-}
elem _ []     = False
elem x (y:ys) = x == y || elem x ys

{-@ test1 :: True @-}
test1      = elem 2 [1, 2, 3]

{-@ test2 :: False @-}
test2      = elem 2 [1, 3]
```

## 排列与元素保持

接着利用精化的列表 API，检查几个排序函数是否保留输入的元素集合。原文将这个目标称为“返回输入的排列”。

> 原注：这一节主要关注元素内容，暂时不处理[有序性不变量](Tutorial_05_Datatypes.html#orderedlists)，因此继续使用普通列表。[这篇文章](http://goto.ucsd.edu/~rjhala/liquid/haskell/blog/blog/2013/07/29/putting-things-in-order.lhs/)介绍了如何用普通列表表达并验证有序性。

> **译者说明**：本节实际证明的是集合保持。要把结论加强为完整的排列关系，还需要证明重复元素的出现次数也保持不变。

### 插入排序

插入排序是最简单的列表排序方法之一：逐个把输入元素 `insert` 到已有输出列表中的适当位置，逐步建立结果。

```haskell
insert x []     = [x]
insert x (y:ys)
  | x <= y      = x : y : ys
  | otherwise   = y : insert x ys
```

`insert` 的输出包含输入列表 `xs` 中的所有元素，再加上新元素 `x`：

```haskell
{-@ insert :: x:a -> xs:[a] -> ListUn1 a x xs @-}
```

利用这个签名，就能证明整个排序过程保留输入的元素集合：

```haskell
{-@ insertSort :: (Ord a) => xs:[a] -> ListEq a xs @-}
insertSort []     = []
insertSort (x:xs) = insert x (insertSort xs)
```

### 练习：合并列表 {#Merge}

修正 `merge` 的规格，使 `prop_merge_app` 通过验证。

```haskell
{-@ merge :: xs:[a] -> ys:[a] -> [a] @-}
merge [] ys          = ys
merge xs []          = xs
merge (x:xs) (y:ys)
  | x <= y           = x : merge xs (y:ys)
  | otherwise        = y : merge (x:xs) ys

{-@ prop_merge_app   :: _ -> _ -> True   @-}
prop_merge_app xs ys = elts zs == elts zs'
  where
    zs               = append' xs ys
    zs'              = merge   xs ys
```

### 练习：归并排序 ★★ {#Merge-Sort}

写好上面 `merge` 的规格后，你应该能证明下面这个令人意外的 `mergeSort` 签名。

1. 先确认给出的签名确实能通过验证。
2. 我们显然不希望排序函数的规格说结果是空列表。找出并修正错误，使得不能再证明结果为空，而能证明结果属于 `ListEq a xs`。

```haskell
{-@ mergeSort :: (Ord a) => xs:[a] -> ListEmp a @-}
mergeSort []  = []
mergeSort xs  = merge (mergeSort ys) (mergeSort zs)
  where
   (ys, zs)   = halve mid xs
   mid        = length xs `div` 2
```

> **译者说明**：这里还有一个必须分清的细节：原始章节关闭了终止性检查，而代码缺少处理单元素列表的基础分支。对非空输入，它可能一直递归，并不是真的算出 `[]`。此时“结果满足空列表规格”只是关于 **如果计算返回** 的部分正确性陈述，不能代替终止性证明。练习修复的也包括这个递归基础情形。

## 唯一性：不允许重复元素

我们常常希望一个集合式容器里 **没有重复项**。例如，文件句柄或系统资源被重复跟踪，可能导致不正确的管理行为。

[xmonad][xmonad] 窗口管理器使用较复杂的 zipper 结构记录活跃窗口，并小心维护“没有重复窗口”的不变量。下面先为列表表达这个性质，再把它用于一个简化的 zipper。

### 描述没有重复元素

表达唯一性有很多方法，最简单的是定义一个度量函数：

```haskell
{-@ measure unique @-}
unique        :: (Ord a) => [a] -> Bool
unique []     = True
unique (x:xs) = unique xs && not (member x (elts xs))
```

再为没有重复元素的列表定义别名：

```haskell
{-@ type UList a = {v:[a] | unique v }@-}
```

简单检查一下，合法与不合法的例子是否得到预期结果：

```haskell
{-@ isUnique    :: UList Int @-}
isUnique = [1, 2, 3]           -- accepted by LH

{-@ isNotUnique :: UList Int @-}
isNotUnique = [1, 2, 3, 1]     -- rejected by LH
```

### 过滤保持唯一性

`filter` 只保留输入中的部分元素。因此，输入没有重复项时，输出也没有重复项：

```haskell
{-@ filter   :: (a -> Bool)
             -> xs:UList a
             -> {v:ListSub a xs | unique v}
  @-}
filter _ []   = []
filter f (x:xs)
  | f x       = x : xs'
  | otherwise = xs'
  where
    xs'       = filter f xs
```

> **译者说明**：这里还依赖 `filter` 的具体递归实现不会复制元素。单独知道“输出元素集合是输入元素集合的子集”，并不足以保证没有重复项。

### 练习：允许任意输入的过滤函数 {#Filter}

要求 `filter` 只能接收无重复列表，似乎太严格了。请给下面的 `filter'` 写一个更宽松的规格，同时让后面的两个用法都通过验证。

```haskell
filter' _ []   = []
filter' f (x:xs)
  | f x       = x : xs'
  | otherwise = xs'
  where
    xs'       = filter' f xs

{-@ test3 :: UList _ @-}
test3     = filter' (> 2) [1,2,3,4]

{-@ test4 :: [_] @-}
test4     = filter' (> 3) [3,1,2,3]
```

### 练习：反转保持唯一性 ★ {#Reverse-unique}

反转列表不会改变其中的元素，也不会复制元素，所以无重复输入应该得到无重复输出。LiquidHaskell 为什么拒绝下面的实现？修改相关规格，让输出可以被证明是 `UList a`。

完成后，应该能够去掉下面签名中的 `assume`，仍然让代码通过验证。

```haskell
{-@ assume reverse    :: xs:UList a -> UList a    @-}
reverse :: [a] -> [a]
reverse         = go []
  where
    {-@ go     :: acc:[a] -> xs:[a] -> [a] @-}
    go acc []     = acc
    go acc (x:xs) = go (x:acc) xs
```

> **译者说明**：`assume` 表示把规格当作可信假设，不表示实现已经被证明。这个练习的目标正是补齐证明所需信息，最终移除这个假设。

### 去重

`nub` 从任意输入建立一个无重复列表。它遍历输入，跳过已经出现在 `seen` 中的元素：

```haskell
{-@ nub              :: [a] -> UList a @-}
nub xs                = go [] xs
  where
    {-@ go :: UList a -> xs:[a] -> UList a / [len xs] @-}
    go seen []        = seen
    go seen (x:xs)
      | x `isin` seen = go seen     xs
      | otherwise     = go (x:seen) xs
```

关键的成员判断由 `isin` 完成：返回 `True` 当且仅当元素已经在列表中。

> 原注：如果完成了前面的成员判断练习，对这个规格应该已经很熟悉了。

```haskell
-- FIXME
{-@ predicate In X Xs = Set_mem X (elts Xs) @-}

{-@ isin :: x:_ -> ys:_ -> {v:Bool | v <=> In x ys }@-}
isin x (y:ys)
  | x == y    = True
  | otherwise = x `isin` ys
isin _ []     = False
```

### 练习：连接无重复列表 ★ {#Append}

为什么把两个 `UList` 连接起来，结果不一定仍然是 `UList`？修正下面的签名，让输出确实可以被证明没有重复元素。

```haskell
{-@ append       :: UList a -> UList a -> UList a @-}
append []     ys = ys
append (x:xs) ys = x : append xs ys
```

### 练习：整数区间 ★★ {#Range}

`range i j` 返回从 `i` 开始、严格小于 `j` 的整数列表。LiquidHaskell 还不能根据当前信息证明它是 `UList`。修改代码，在保持计算结果不变的前提下，使给出的签名通过验证。

```haskell
{-@ type Btwn I J = {v:_ | I <= v && v < J} @-}

{-@ range     :: i:Int -> j:Int -> UList (Btwn i j) @-}
range i j
  | i < j     = i : range (i + 1) j
  | otherwise = []
```

**提示：** 可以先阅读后面[关于引理的章节](Tutorial_10_Case_Study_Associative_Maps.html#lemmas)，再回头完成这道题。

## 没有重复元素的 zipper

[Zipper][wiki-zipper] 是一种方便在数据结构中移动关注位置、并更新内容的表示方式。列表的 zipper 包含三部分：当前关注的元素 `focus`、它之前的元素列表 `left`，以及它之后的元素列表 `right`。

```haskell
data Zipper a = Zipper {
    focus  :: a
  , left   :: [a]
  , right  :: [a]
  }
```

> **译者说明**：在这里，`left` 按与原列表相反的顺序保存，所以它的头部就是焦点左侧最近的元素。这样向左移动时，不必遍历整个左侧列表。

xmonad 使用这样的 [zipper][xmonad-stackset] 保存受管理的窗口。一个关键要求是：整个 zipper 中不能出现重复值。

### 精化 zipper

为了表达这个要求，需要保证：`left` 和 `right` 各自没有重复项；它们互不相交；两边都不包含 `focus`。

```haskell
{-@ data Zipper a = Zipper {
      focus :: a
    , left  :: {v: UList a | not (In focus v)}
    , right :: {v: UList a | not (In focus v) && Disj v left }
    } @-}

{-@ predicate Disj X Y = Disjoint (elts X) (elts Y)        @-}
```

这个精化的构造器把合法性检查放在了创建入口：每个通过验证的 `Zipper` 都必须没有重复项。例如，可以直接从无重复列表构造一个合法 zipper：

```haskell
{-@ differentiate    :: UList a -> Maybe (Zipper a) @-}
differentiate []     = Nothing
differentiate (x:xs) = Just $ Zipper x [] xs
```

### 练习：把 zipper 还原成列表 ★ {#Deconstructing-Zippers}

反过来，把无重复 zipper 的元素取出来，应该得到无重复列表。强化前面 `reverse` 和 `append` 的类型，让下面 `integrate` 的签名通过验证。

```haskell
{-@ integrate            :: Zipper a -> UList a @-}
integrate (Zipper x l r) = reverse l `append` (x : r)
```

### 移动焦点

焦点可以向左或向右移动，同时保持唯一性。下面是向左移动的实现：

```haskell
focusLeft                      :: Zipper a -> Zipper a
focusLeft (Zipper t (l:ls) rs) = Zipper l ls (t:rs)
focusLeft (Zipper t [] rs)     = Zipper x xs []
  where
    (x:xs)                     = reverse (t:rs)
```

如果需要向右移动，只要先交换左右两边，做一次向左移动，再交换回来：

```haskell
focusRight    :: Zipper a -> Zipper a
focusRight    = reverseZipper . focusLeft . reverseZipper

reverseZipper :: Zipper a -> Zipper a
reverseZipper (Zipper t ls rs) = Zipper t rs ls
```

### 过滤 zipper 中的元素

过滤时要考虑两种特殊情况：焦点本身可能被删除，甚至全部元素都可能被删除。后一种情况下无法形成含有焦点的 `Zipper`，因此结果使用 `Maybe`。

```haskell
filterZipper :: (a -> Bool) -> Zipper a -> Maybe (Zipper a)
filterZipper p (Zipper f ls rs)
  = case filter p (f:rs) of
      f':rs' -> Just $ Zipper f' (filter p ls) rs'
      []     -> case filter p ls of
                  f':ls' -> Just $ Zipper f' ls' []
                  []     -> Nothing
```

结合精化类型与 SMT 求解器对集合的推理能力，就可以检查这些较复杂的 zipper 操作是否始终保持关键的唯一性不变量。

## 回顾

这一章通过集合理论，推理数据结构中的实际 **元素内容**。具体做法包括：

- 为 `Data.Set` 中的基础操作提供精化规格，把集合运算连接到逻辑层。
- 定义 `elts` 等度量函数描述结构中的元素集合，再用 `unique` 描述没有重复项这样的高层性质。
- 为实现编写并验证相应的功能性质，例如排序过程保持元素集合，zipper 的各种操作保持唯一性。

接下来进入几个篇幅更长的案例，把前面学到的方法应用到具体的问题领域。
