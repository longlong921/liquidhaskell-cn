# 多态：让容器和高阶函数保留约束 {#polymorphism}

精化类型尤其擅长描述 **多态数据类型** 和 **高阶函数** 的性质。我们从一个[经典例子][dmlarray]入手：数组访问是否越界。

**数组边界验证** 要保证：每次取元素时，索引都处在数组的合法范围中，也就是从 `0` 开始，严格小于数组长度。例如，有一个包含两个元素的数组：

```text
twoLangs  = fromList ["haskell", "javascript"]
```

尝试用几个不同的索引访问它：

```haskell
eeks      = [ok, yup, nono]
  where
    ok    = twoLangs ! 0
    yup   = twoLangs ! 1
    nono  = twoLangs ! 3
```

如果实际运行，最后一次访问会抛异常：数组长度只有 `2`，却尝试读取索引 `3`。

```text
Prelude> :l 03-poly.lhs
[1 of 1] Compiling VectorBounds     ( 03-poly.lhs, interpreted )
Ok, modules loaded: VectorBounds.
*VectorBounds> eeks
Loading package ... done.
"*** Exception: ./Data/Vector/Generic.hs:249 ((!)): index out of bounds (3,2)
```

在配置合适的编辑器中，例如原文提到的 Vim、Emacs，或者在原教程的在线演示里，LiquidHaskell 可以在运行之前就指出这个问题。接下来看看它为什么接受 `ok`、`yup`，却拒绝 `nono`。过程中，我们也会认识它如何处理递归、高阶函数、数据类型和多态。

> **译者说明**：本章保留原文的演示和工具调用方式。本中文站提供静态阅读，不提供原站的在线执行按钮； `.spec` 文件、命令行参数和依赖包的使用方式，请结合所安装版本的官方文档确认。

## 写规格：向量边界 {#vectorbounds}

首先，为 `Data.Vector` 的[关键接口][vecspec]细化类型，说明三件事：

1. 如何定义一个 `Vector` 的长度；
2. 如何计算这个长度；
3. 如何把索引限制在指定向量的合法范围内。

### 为外部模块提供规格 {#imported-specifications}

即使手里没有某个导入模块的实现，也可以为它写规格。原教程提供两种组织方式：直接写在使用方的源码里；或者更适合复用地写进 `.spec` 文件，供多个模块使用。

检查文件时，可以指定额外的规格目录。假设 `target.hs` 导入了外部依赖 `Data.Vector`，可以在 `include/Data/Vector.spec` 中写：

```text
-- | Define the size
measure vlen :: Vector a -> Int

-- | Compute the size
assume length :: x:Vector a -> {v:Int | v = vlen x}

-- | Lookup at an index
assume (!) :: x:Vector a -> {v:Nat | v < vlen x} -> a
```

然后告诉 LiquidHaskell 去这个目录寻找规格：

```text
$ liquid -i include/ target.hs
```

原教程说明，当时的 LiquidHaskell 已随附 `Prelude`、`Data.List`、`Data.Vector` 的规格，并会默认加载。

**度量函数（measure）** 用来描述 Haskell 数据值的某个性质，供规格和验证使用。这里可以把 `vlen` 理解为向量的实际长度，不管程序通过什么方式计算这个长度。

**`assume` 表示可信假设。** 当我们无法验证一个函数的实现，例如没有它的代码时，可以用 `assume` 声明它的语义。这里假设 `Data.Vector.length` 确实返回向量的长度，同时规定 `(!)` 的索引必须满足 `0 ≤ 索引 < 向量长度`。

> **译者说明**：写下 `assume` 不是完成了对应实现的证明，而是把这条规格作为信任边界。调用方的证明依赖它真实且完整；如果底层库不遵守这个约定，上层验证就不能提供原先预期的保证。

**依赖式精化条件** 可以连接规格中不同位置的值。`length` 的类型把输入命名为 `x`，随后在返回类型中使用 `vlen x`；`(!)` 也先给向量命名为 `x`，再用它约束第二个参数。这样，类型表达的就不只是单个值的性质，还包括多个值之间的关系。

**类型别名** 可以给常用规格取一个简短的名字。写程序时需要抽象，写规格时也一样。例如，长度为 `N` 的向量可以定义为：

```haskell
{-@ type VectorN a N = {v:Vector a | vlen v == N} @-}
```

接着就能为前面的 `twoLangs` 标出长度为 `2`：

```haskell
{-@ twoLangs :: VectorN String 2 @-}
twoLangs     = fromList ["haskell", "javascript"]
```

同样，可以给位于区间 `Lo` 到 `Hi` 之间的整数起一个别名：

```haskell
{-@ type Btwn Lo Hi = {v:Int | Lo <= v && v < Hi} @-}
```

注意，这是一个 **左闭右开区间**：包括 `Lo`，不包括 `Hi`。有了它，`(!)` 可以写成：

```text
(!) :: x:Vector a -> Btwn 0 (vlen x) -> a
```

## 做验证：访问向量 {#verification-vector-lookup}

写几个函数，看看这些规格是否发挥作用。先取向量的第一个元素，也就是 `head`：

```haskell
head     :: Vector a -> a
head vec = vec ! 0
```

检查后会得到错误：

```text
     src/03-poly.lhs:127:23: Error: Liquid Type Mismatch
       Inferred type
         VV : Int | VV == ?a && VV == 0

       not a subtype of Required type
         VV : Int | VV >= 0 && VV < vlen vec

       In Context
         VV  : Int | VV == ?a && VV == 0
         vec : Vector a | 0 <= vlen vec
         ?a  : Int | ?a == (0  :  int)
```

LiquidHaskell 的意思是：目前无法证明 `0` 是合法索引，因为无法证明 `0 < vlen vec`。为什么？如果 `vec` 是空向量，就确实不能访问第 `0` 个元素。

要解决这个问题，可以选择两种接口设计：

1. **要求输入非空**；
2. **允许输入为空，但只有非空时才返回元素**。

第一种做法可以给非空向量定义别名 `NEVector`：

```haskell
{-@ type NEVector a = {v:Vector a | 0 < vlen v} @-}

{-@ head' :: NEVector a -> a @-}
head' vec = vec ! 0
```

### 练习：向量的第一个元素 {#vector-head}

把下面的 `undefined` 换成实现：`head''` 接受任意向量，但只有输入非空时才返回一个元素。

```haskell
head''     :: Vector a -> Maybe a
head'' vec = undefined
```

### 练习：带前提的索引访问 {#unsafe-lookup}

`unsafeLookup` 只是把 `(!)` 的两个参数交换了位置。修改它的规格，让现有实现可以通过 LiquidHaskell 检查。

```haskell
{-@ unsafeLookup :: Int -> Vector a -> a @-}
unsafeLookup index vec = vec ! index
```

### 练习：先检查边界再访问 {#safe-lookup}

补全 `safeLookup` 中的 `ok`，让它在访问之前完成边界检查。

```haskell
{-@ safeLookup :: Vector a -> Int -> Maybe a @-}
safeLookup x i
  | ok        = Just (x ! i)
  | otherwise = Nothing
  where
    ok        = undefined
```

## 类型推导：第一个递归函数 {#inference-our-first-recursive-function}

接下来写一个递归函数，把 `Int` 向量里的所有元素加起来：

```haskell
-- >>> vectorSum (fromList [1, -2, 3])
-- 2
vectorSum         :: Vector Int -> Int
vectorSum vec     = go 0 0
  where
    go acc i
      | i < sz    = go (acc + (vec ! i)) (i + 1)
      | otherwise = acc
    sz            = length vec
```

### 练习：循环条件 {#guards}

如果把条件改成 `i <= sz`，会发生什么？

### 练习：绝对值之和 {#absolute-sum}

仿照上面的写法，实现 `absoluteSum`：把向量中每个元素的绝对值相加。

```haskell
-- >>> absoluteSum (fromList [1, -2, 3])
-- 6
{-@ absoluteSum :: Vector Int -> Nat @-}
absoluteSum     = undefined
```

### 验证器推导出了什么 {#inference}

LiquidHaskell 可以验证 `vectorSum`；更准确地说，此处验证的是每次 `vec ! i` 访问的边界安全性。关键在于，它能自动推导出这样的 `go` 类型：

```text
go :: Int -> {v:Int | 0 <= v && v <= sz} -> Int
```

> **原注**：在原教程对应的编辑器支持中，可以点击 `go` 查看推导结果。

这个类型表示，第二个参数 `i` 在 `0` 与 `sz` 之间，两个端点都可以取到。进入循环体时，分支条件又补充了 `i < sz`，于是得到 `0 ≤ i < vlen vec`，访问就安全了。

**原文提示**：检查这段示例时，需要给 `liquid` 加 `--no-termination`，或者在源码中加入 `{-@ LIQUID "--no-termination" @-}`。否则，原教程所用写法中的 `go` 无法直接通过默认终止性检查。原文说明会在后续讨论如何用递减度量验证终止性。

> **译者说明**：关闭终止性检查之后，这里得到的是上述访问性质的验证，并没有同时证明循环终止。对于这个循环，可以直观地观察剩余距离 `sz - i`，但实际采用何种终止性注解，要按所用版本完成检查。

### 练习：为什么允许等于上界？ {#off-by-one}

`go` 的类型为什么是 `v <= sz`，而不是 `v < sz`？想一想循环退出时还会不会调用一次 `go`。

## 高阶函数：把递归封装成 `loop` {#higher-order-functions}

把刚才的底层递归模式抽出来，写成一个通用的高阶函数 `loop`：

```haskell
loop :: Int -> Int -> a -> (Int -> a -> a) -> a
loop lo hi base f =  go base lo
  where
    go acc i
      | i < hi    = go (f i acc) (i + 1)
      | otherwise = acc
```

现在可以用 `loop` 实现求和：

```haskell
vectorSum'      :: Vector Int -> Int
vectorSum' vec  = loop 0 n 0 body
  where
    body i acc  = acc + (vec ! i)
    n           = length vec
```

类型推导在这里很有用。LiquidHaskell 能得到：

```text
loop :: lo:Nat -> hi:{Nat|lo <= hi} -> a -> (Btwn lo hi -> a -> a) -> a
```

把它读成中文，就是：

- 下界 `lo` 是非负整数；
- 上界 `hi` 也是非负整数，并且不小于 `lo`；
- 循环体 `f` 只会收到满足 `lo ≤ i < hi` 的索引。

每次手写这么长的类型当然很繁琐。如果以后希望把 `loop` 作为公开接口，可以以推导出的类型为基础，写出明确的类型签名。

在调用 `loop 0 n 0 body` 时，`lo`、`hi` 分别取 `0`、`n`。这里的调用上下文，也帮助推导器获得了非负性信息。于是，它知道 `body` 收到的索引都满足 `0 ≤ i < vlen vec`，其中的 `vec ! i` 也就安全。

### 练习：使用高阶循环 {#using-higher-order-loops}

补全下面的 `absoluteSum'`。完成以后，看看工具为 `body` 推导出了什么类型。

```haskell
-- >>> absoluteSum' (fromList [1, -2, 3])
-- 6
{-@ absoluteSum' :: Vector Int -> Nat @-}
absoluteSum' vec = loop 0 n 0 body
  where
    body i acc   = undefined
    n            = length vec
```

### 练习：点积 {#dot-product}

下面用 `loop` 计算两个向量的点积。为什么 LiquidHaskell 会报错？修改代码或者规格，让它通过检查。

```haskell
-- >>> dotProduct (fromList [1,2,3]) (fromList [4,5,6])
-- 32
{-@ dotProduct :: x:Vector Int -> y:Vector Int -> Int @-}
dotProduct x y = loop 0 sz 0 body
  where
    body i acc = acc + (x ! i)  *  (y ! i)
    sz         = length x
```

## 精化与多态：稀疏向量 {#sparsetype}

普通 `Vector` 很适合表示稠密数组。但有时绝大多数元素都是零，使用 **稀疏向量** 会更自然：只保存非默认位置的“索引—值”对。

```haskell
{-@ type SparseN a N = [(Btwn 0 N, a)] @-}
```

列表里没有出现的索引，隐含的值就是 `0`，或者元素类型 `a` 中与之对应的默认值。

`SparseN` 只是右侧类型的 **别名**，并没有创建新的 Haskell 数据类型。如果你熟悉 [DML][dml] 或 [Agda][agdavec] 用类型索引编码长度的方式，需要注意：虽然这里也出现了参数 `N`，但这段定义并不是在 Haskell 类型层面定义一个索引化数据类型。

### 计算稀疏向量的乘积 {#sparse-products}

下面计算普通向量与稀疏表示之间的点积：

```haskell
{-@ sparseProduct  :: x:Vector _ -> SparseN _ (vlen x) -> _ @-}
sparseProduct x y   = go 0 y
  where
    go n []         = n
    go n ((i,v):y') = go (n + (x!i) * v) y'
```

规格保证了列表 `y` 中每个 `(i, v)` 的 `i` 都在向量 `x` 的合法范围内。因此，LiquidHaskell 能验证每一次 `x ! i` 都安全。

### 复用已有的 `fold` {#folds}

你可能已经发现，这段递归可以更直接地写成 [fold][foldl]。`foldl'` 的普通类型是：

```text
foldl' :: (a -> b -> a) -> a -> [b] -> a
```

我们只需遍历稀疏向量，不断累加：

```haskell
{-@ sparseProduct'  :: x:Vector _ -> SparseN _ (vlen x) -> _ @-}
sparseProduct' x y  = foldl' body 0 y
  where
    body sum (i, v) = sum + (x ! i) * v
```

LiquidHaskell 仍然可以验证它。关键是多态类型在这次调用中如何实例化：

1. GHC 推导出，`foldl'` 类型中的 `b` 在此处实例化为普通 Haskell 类型 `(Int, a)`。
2. LiquidHaskell 进一步推导出，`b` 可以实例化为精化后的 `(Btwn 0 (vlen x), a)`。

这样，每个传入 `body` 的元素仍携带索引范围约束。既省去了许多重复注解，也可以自然地复用现有的多态容器函数。

## 本章回顾 {#recap}

本章展示了如何用精化类型验证长度、索引等性质，以及如何在递归函数、高阶函数和多态代码之间传递这些约束。

接下来，我们会把约束进一步写进数据类型的定义，从源头限制非法值的构造。
