# 案例：键值映射

还记得[引言](Tutorial_01_Introduction.html#intro)中的例子吗？

```text
ghci> :m +Data.Map
ghci> let m = fromList [ ("haskell"   , "lazy")
                       , ("javascript", "eager")]

ghci> m ! "haskell"
"lazy"

ghci> m ! "python"
"*** Exception: key is not in the map
```

这种问题很常见，因为键值映射几乎无处不在。在 Haskell 这样的语言里，查询不存在的键导致的异常，可以类比其他语言里的 `NullPointerDereference`。只靠普通 Haskell 类型系统，很难精确描述映射 API 的全部行为，因为这最终要求我们跟踪映射中 **运行时不断变化的键集合**。

本章把[度量函数](Tutorial_08_Measure_Set.html#setmeasure)和[精化数据类型](Tutorial_05_Datatypes.html#refineddatatypes)结合起来，分析如何安全地 **使用** 和 **实现** 键值映射，例如 `Data.Map`、`Data.HashMap`。

> **译者说明：** “查不到键”既可以通过本章的前置条件排除，也可以由 `Maybe`、`Either` 显式返回。选哪一种取决于 API 的职责。本章要展示的是：当调用方已经能够提供“键存在”的证据时，如何让这个证据贯穿实现，而不必重复检查。

## 为映射写规格 {#mapapi}

先定义一个精化 API，跟踪映射里保存的键集合，从而在静态检查阶段保证查询安全。

**类型。** 和往常一样，用 `k` 表示键的类型，用 `v` 表示值的类型：

```haskell
data Map k v    -- Currently left abstract
```

**键集合。** 要在类型里讨论映射的键，先引入一个度量函数：

```haskell
measure keys :: Map k v -> Set k
```

它把每个 `Map` 对应到其已定义键的集合 `Set`。接下来，用这个度量函数和集合运算，精化创建映射、增加绑定、查询绑定等操作的类型。这样，虽然实际的键集合是运行时建立的，我们仍能在类型系统里精确跟踪它。

> 原注：`Empty`、`Union`、`In` 等集合操作已在[集合度量一章](Tutorial_08_Measure_Set.html#listelems)介绍。

**空映射。** 空 `Map` 不含任何键，因此类型可以写成：

```haskell
emp :: {m:Map k v | Empty (keys m)}
```

**增加绑定。** `set` 接收键 `k`、值 `v` 和映射 `m`，返回加入绑定 `k ↦ v` 后的新映射。因此输出键集合就是原键集合与单元素集合 `{k}` 的并集：

```haskell
set :: k:k -> v -> m:Map k v -> {n: Map k v| AddKey k m n}

predicate AddKey K M N = keys N = Set_cup (Set_sng K) (keys M)
```

**查询。** 查询只有在键确实存在时才能成功。先定义一个谓词别名：

```haskell
predicate HasKey K M = In K (keys M)
```

然后用它给两个操作写类型：`mem` 检查键是否存在，`get` 则取出该键对应的值。

```haskell
-- | Check if key is defined
mem :: k:k -> m:Map k v -> {v:Bool | v <=> HasKey k m}

-- | Lookup key's value
get :: k:k -> {m:Map k v | HasKey k m} -> v
```

## 使用映射：保证表达式的变量都有定义

先不急着实现 `Map`，而是写一个使用它的程序：一门小语言的解释器。这里把映射作为 **环境**，保存已绑定变量的值。借助精化 API，我们希望证明变量查询不会失败，作用域正确的表达式能够求值为一个结果。

**表达式。** 这门小语言有整数常量、变量、加法和 `let` 绑定：

```haskell
type Var  = String

data Expr = Const Int
          | Var   Var
          | Plus  Expr Expr
          | Let   Var  Expr Expr
```

> 原注：你也可以继续增加函数、元组等语言特性。

**值。** 我们可以把已经求值的结果描述成 `Expr` 的一个子集，从而复用表达式类型。先用一个度量函数，判断某个表达式是不是值：

```haskell
{-@ measure val @-}
val              :: Expr -> Bool
val (Const _)    = True
val (Var _)      = False
val (Plus _ _)   = False
val (Let _ _ _ ) = False
```

将这个函数提升到精化逻辑后，就可以定义表示值的别名 `Val`：

```haskell
{-@ type Val = {v:Expr | val v} @-}
```

随后定义只接受值的简单运算，例如加法：

```haskell
{-@ plus                 :: Val -> Val -> Val @-}
plus (Const i) (Const j) = Const (i+j)
plus _         _         = die "Bad call to plus"
```

**环境。** 环境保存局部变量，也就是由 `let` 绑定的变量及其值。求值到 `Var x` 时，只需在环境里查询 `x`。因此，可以把环境定义为从 `Var` 到 `Val` 的映射：

```haskell
{-@ type Env = Map Var Val @-}
```

这个定义把解释器希望采用的“先求得值，再存进环境”的策略写进了类型：LiquidHaskell 不允许把任意尚未求值的 `Expr` 当作 `Val` 放进去。

> **译者说明：** 这里约束的是解释器的数据表示与语义，不能据此推断宿主语言 Haskell 会立即把所有字段强制求值。`Val` 说明结果必须具有值的形状，并没有给 Haskell 增加深度严格求值。

**求值。** 对表达式结构进行递归即可：遇到 `Var`，查询环境；遇到 `Let`，先求绑定表达式的值，把绑定加入环境，再求内部表达式。

```haskell
eval _ i@(Const _)   = i
eval g (Var x)       = get x g
eval g (Plus e1 e2)  = plus  (eval g e1) (eval g e2)
eval g (Let x e1 e2) = eval g' e2
  where
    g'               = set x v1 g
    v1               = eval g e1
```

这段 `eval` 看起来还不够安全：凭什么断定 `get x g` 一定成功？例如下面的调用显然会出问题：

```text
ghci> eval emp (Var "x")
```

我们是不是应该先检查变量是否存在，不存在就返回 `Variable Not Bound` 一类错误？当然可以。不过，本章尝试在编译时证明：对于满足输入条件的调用，这种错误不会发生。

**自由变量。** 自由变量指表达式中出现了、却没有被覆盖它的 `Let` 绑定的变量。把这个概念写成函数，并提升为度量函数：

```haskell
{-@ measure free @-}
free               :: Expr -> (Set Var)
free (Const _)     = empty
free (Var x)       = singleton x
free (Plus e1 e2)  = xs1 `union`  xs2
  where
    xs1            = free e1
    xs2            = free e2
free (Let x e1 e2) = xs1 `union` (xs2 `difference` xs)
  where
    xs1            = free e1
    xs2            = free e2
    xs             = singleton x
```

**相对于环境闭合。** 如果表达式的所有自由变量都已出现在环境 `G` 中，就称它相对于 `G` 是闭合的。换句话说，表达式内部没有绑定的变量，都由外部环境提供。

这一段文字可以压缩成很精确的类型定义：表达式的 `free` 集合必须是环境 `keys` 集合的子集。

```haskell
{-@ type ClosedExpr G = {v:Expr | Subset (free v) (keys G)} @-}
```

**对闭合表达式求值。** 只要调用时提供合适的环境，`eval` 就不会因未绑定变量而失败：

```haskell
{-@ eval :: g:Env -> ClosedExpr g -> Val @-}
```

如果表达式没有任何自由变量，就可以在空环境中求值。由此得到顶层求值器：

```haskell
{-@ topEval :: {v:Expr | Empty (free v)} -> Val @-}
topEval     = eval emp
```

### 练习：检查表达式是否合法

补全下面的函数，让它先检查 `Expr` 是否适合当前环境，再决定是否调用 `eval`：

```haskell
{-@ evalAny   :: Env -> Expr -> Maybe Val @-}
evalAny g e
  | ok        = Just $ eval g e
  | otherwise = Nothing
  where
    ok        = undefined
```

有了证明，仍可以写几个简单例子检查自己的理解：

```haskell
tests   = [v1, v2]
  where
    v1  = topEval e1          -- Rejected by LH
    v2  = topEval e2          -- Accepted by LH
    e1  = (Var x) `Plus` c1
    e2  = Let x c10 e1
    x   = "x"
    c1  = Const 1
    c10 = Const 10
```

### 练习：闭包（★★）

给这门语言增加函数。按照下面的形式扩展 `Expr`，并相应修改 `eval` 和 `free`：

```haskell
data Expr = ... | Fun Var Expr | App Expr Expr
```

这里只要求保证变量查询安全。完整的类型安全，例如保证每次应用的对象确实是一个函数，会更复杂，超出了目前的讨论范围。

## 实现映射：二叉搜索树 {#lemmas}

刚才我们看到，即使 `Map` 的键集合是动态形成的，也能借助[精化 API](#mapapi)保证查询安全。下面用[二叉搜索树](Tutorial_05_Datatypes.html#binarysearchtree)实现满足这个 API 的映射库。

**数据类型。** 之前 `Map` 是抽象的，现在给它一个具体表示：对每个 `Node`，左子树的所有键都小于当前 `key`，右子树的所有键都大于它。

```haskell
{-@ data Map k v = Node { key   :: k
                        , value :: v
                        , left  :: Map {v:k | v < key} v
                        , right :: Map {v:k | key < v} v }
                 | Tip
  @-}
```

回忆前面的讨论，这种精化数据定义会增强构造函数的类型，从而在静态检查时确保程序只能构造满足二叉搜索顺序的树。

**已定义的键。** 然后实现 `keys` 度量函数，描述某个映射中到底有哪些键：

```haskell
{-@ measure keys @-}
keys                :: (Ord k) => Map k v -> Set k
keys Tip            = empty
keys (Node k _ l r) = ks `union` kl `union` kr
  where
    kl              = keys l
    kr              = keys r
    ks              = singleton k

```

有了数据类型和度量函数，就可以逐一实现映射操作。

### 练习：空映射

补全空映射 `emp` 的定义，检查自己是否理解了类型要求：

```haskell
{-@ emp :: {m:Map k v | Empty (keys m)} @-}
emp     = undefined
```

### 练习：插入

向映射加入键 `k'` 时，我们递归遍历树，根据与当前键的比较结果，向左或向右继续查找。下面的版本含有一个很常见的错误，因此 LiquidHaskell 会拒绝它。找到并修复错误，让函数通过验证。

```haskell
{-@ set :: (Ord k) => k:k -> v -> m:Map k v
                   -> {n: Map k v | AddKey k m n} @-}
set k' v' (Node k v l r)
  | k' == k   = Node k v' l r
  | k' <  k   = set k' v l
  | otherwise = set k' v r
set k' v' Tip = Node k' v' Tip Tip
```

**查询。** 接下来查询键 `k'` 对应的值：如果它等于根键，返回当前绑定；如果更小或更大，就分别去左子树或右子树查找。我们希望证明查询绝不会失败，所以在空树 `Tip` 分支调用 `die`，要求 LiquidHaskell 证明该分支不可达。

> **译者说明：** 原文这一段称该函数为 `mem`，但后面的实际定义是 `get'`；这里按代码说明它的用途。`mem` 返回布尔值，`get'` 返回键对应的值，两者不要混淆。

```haskell
{-@ get' :: (Ord k) =>  k:k -> m:{Map k v| HasKey k m} -> v @-}
get' k' m@(Node k v l r)
  | k' == k   = v
  | k' <  k   = get' k' l
  | otherwise = get' k' r
get'  _ Tip   = die  "Lookup Never Fails"
```

遗憾的是，LiquidHaskell 会拒绝上面的实现。可是算法本身明明正确，问题出在哪里？看看递归调用 `get' k' l` 对应的错误：

```text
 src/07-case-study-associative-maps.lhs:411:25: Error: Liquid Type Mismatch
   Inferred type
     VV : Map a b | VV == l
   not a subtype of Required type
     VV : Map a b | Set_mem k' (keys VV)
   In Context
     VV : Map a b | VV == l
     k  : a
     l  : Map a b
     k' : a
```

LiquidHaskell 无法推出键 `k'` 一定在左子树 `l` 里。我们自己是怎么判断的？输入前提 `HasKey k' m` 告诉我们：`k'` 一定在整棵树的某处。于是以下情况至少有一个成立：

1. `k' == k`。
2. `HasKey k' l`。
3. `HasKey k' r`。

前一个守卫 `k' == k` 已经失败，因此第一种情况被排除。现在凭什么排除第三种情况，确定第二种成立？靠的是二叉搜索树不变量：`r` 的所有键都大于 `k`，而 `k` 又大于 `k'`。所以 `r` 中每个键都不等于 `k'`，`k'` 不可能出现在 `r` 中。

我们缺少的事实可以写成：

**对任意 `key` 和 `t`，如果 `t` 的键类型是 `{k | k /= key}`，那么 `not (HasKey key t)`。**

**转换引理。** LiquidHaskell 不能自动推出这类事实，因为它连接了两种不同层次的信息：一边是容器 **类型参数** 上的精化条件，这里是“每个键都不等于 `key`”；另一边是 **整个容器** 的性质，这里是“`keys` 集合不含 `key`”。好消息是，我们可以把这个事实写成引理，再用普通函数表达、证明和使用它。

> 原注：为什么不能自动推导？直观地说，检查器不会自动把 `keys` 对整棵树的遍历，与键类型参数里的约束连接起来。原作者也指出，这个细节较难用一句话完整解释。

**定义引理。** 把全称量词看作函数参数，把逻辑蕴含看作函数类型，就能将命题转换成类型。这也是 Curry–Howard 对应的思路。

```haskell
{-@ lemma_notMem :: key:k
                 -> m:Map {k:k | k /= key} v
                 -> {v:Bool | not (HasKey key m)}
  @-}
lemma_notMem _   Tip            = True
lemma_notMem key (Node _ _ l r) = lemma_notMem key l &&
                                  lemma_notMem key r
```

**证明引理。** `lemma_notMem` 的签名恰好表达前面缺少的事实。返回值的基础类型是 `Bool`，附带的精化条件则是我们希望成立的命题。证明方法就是递归遍历树：对子树的证明组合起来，形成对当前树的证明。

**使用引理。** 要使用这个事实，需要把它实例化到当前关心的键和树，也就是调用引理函数，并让结果携带的精化条件进入目标表达式的类型检查环境。下面展示如何用它验证 `get`：

```haskell
{-@ get :: (Ord k) => k:k -> m:{Map k v | HasKey k m} -> v @-}
get k' (Node k v l r)
  | k' == k   = v
  | k' <  k   = assert (lemma_notMem k' r) $
                  get k' l
  | otherwise = assert (lemma_notMem k' l) $
                  get k' r
get _ Tip     = die "Lookup failed? Impossible."
```

调用 `lemma_notMem` 后，我们得到一个用于证明的 `Bool`，其类型携带 `not (HasKey k' r)` 或 `not (HasKey k' l)`。再用 `assert` 包住递归调用，使 `get k' l` 或 `get k' r` 的类型检查可以使用这一事实：

```haskell
assert _ x = x
```

**幽灵值。** 这种通过辅助值把证明事实带进程序的方法，通常叫作使用 *ghost values*，这里译为“幽灵值”。它们服务于验证，不参与业务结果。一般需要小心，避免辅助证明计算影响实际计算。

如果真的执行 `lemma_notMem`，就要遍历整棵子树，这会破坏高效查询的目标。即使树保持[平衡](Tutorial_12_Case_Study_AVL.html#case-study-avltree)，原本只需沿一条短路径查询，现在也可能变成整树遍历。

> 原注：这也是对这类不变量进行动态契约检查可能很昂贵的原因。

**惰性求值** 在这里发挥作用：`assert _ x = x` 根本不需要第一个参数的值，因此证明遍历不会在运行时执行；编译器还可以把这个未使用的调用消除。这样就能在类型检查时使用引理，而不付出实际遍历的成本。严格求值语言通常需要额外机制，把这种计算标为幽灵计算或证明无关内容；在这里，惰性已经提供了所需行为。

> **译者说明：** 此处的 `assert` 是上面自行定义的惰性函数，不是会在运行时检查布尔条件的 `Control.Exception.assert`。也不能把这段文字理解成“所有证明函数在任何上下文里都自动免费”：一旦结果被严格求值，仍可能产生计算成本。上游本章关闭了终止性检查，使用证明函数时也必须注意这一验证边界。

### 练习：成员测试

修改 `mem` 的实现，使其能够被验证为满足给定签名：

```haskell
{-@ mem :: (Ord k) => k:k -> m:Map k v
                   -> {v:_ | v <=> HasKey k m} @-}
mem k' (Node k _ l r)
  | k' == k   = True
  | k' <  k   = mem k' l
  | otherwise = mem k' r
mem _ Tip     = False
```

### 练习：找一个没出现过的整数（★★）

补全下面的函数，让它返回一个与输入列表中所有整数都不同的 `fresh` 值，用这个练习巩固对幽灵值和证明的理解。

```haskell
{-@ fresh :: xs:[Int] -> {v:Int | not (Elem v xs)} @-}
fresh = undefined
```

> **译者说明：** 这个练习采用教程中的数学整数推理方式。实际 Haskell `Int` 有界，简单地“取最大值再加一”可能溢出；若列表覆盖所有可表示值，所要求的结果甚至不存在。生产实现应使用合适的数值类型、输入前提或显式失败结果，不能把精化推导直接当作机器算术边界的保证。

下面是前面[介绍过的](Tutorial_08_Measure_Set.html#listelems) `Elem` 定义，供你回顾：

```haskell
{-@ predicate Elem X Ys  = In X (elems Ys) @-}
{-@ measure elems @-}
elems []     = empty
elems (x:xs) = (singleton x) `union` (elems xs)
```

## 回顾

本章把前面几章的技术组合到同一个案例里：

1. **定义 API：** 用精化条件跟踪映射的键集合，排除调用部分查询函数时的键缺失错误。
2. **使用 API：** 实现一个小解释器，只要输入表达式相对环境闭合，就不会发生未绑定变量错误。
3. **实现 API：** 用二叉搜索树表示映射，并用幽灵引理补充检查器无法自动推导的事实。
