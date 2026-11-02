# 中英术语表

第一次遇到术语时，先抓住它回答的问题，再记住英文名称。下表的解释是中文译本新增的学习辅助；精确定义仍以相应章节中的逻辑和规格为准。

## 类型与规格 {#types}

| 英文 | 中文 | 通俗解释 |
| --- | --- | --- |
| refinement type | 精化类型 | 在普通类型上再加一个条件，只允许满足条件的值 |
| predicate | 谓词 | 对一个值提出的真假判断，例如「大于零」 |
| value variable | 值变量 | 精化类型中代表当前值的变量，常写作 `v` |
| specification / spec | 规格 | 用明确的语言写下程序必须满足什么 |
| contract | 契约 | 调用者和被调用函数之间关于输入、输出的约定 |
| precondition | 前置条件 | 调用函数之前必须成立的条件 |
| postcondition | 后置条件 | 函数返回时承诺成立的条件 |
| invariant | 不变量 | 在约定的范围内始终成立、操作需要维护的性质 |
| subtype / subtyping | 子类型 / 子类型关系 | 一个类型允许的值更少，因此能放到要求更宽松类型的位置 |
| type alias | 类型别名 | 给一个类型起可复用的名字 |
| dependent function type | 依赖函数类型 | 输出类型中的条件可以提到具体输入值 |
| polymorphism | 多态 | 同一份代码可以用于不同类型，并保留相应的类型信息 |
| abstract refinement | 抽象精化 | 把某个谓词本身抽象为参数，供不同使用场景实例化 |
| smart constructor | 智能构造函数 | 通过受控入口构造值，检查或保证结构必须满足的条件 |

相关章节：[精化类型](Tutorial_03_Basic.html)、[多态](Tutorial_04_Polymorphism.html)、[精化数据类型](Tutorial_05_Datatypes.html)。

## 逻辑与证明 {#logic}

| 英文 | 中文 | 通俗解释 |
| --- | --- | --- |
| proposition | 命题 | 一个可以讨论真假的陈述 |
| conjunction | 合取 | 「并且」；两边都要成立 |
| disjunction | 析取 | 「或者」；至少一边成立 |
| negation | 否定 | 「不是」；把真假取反 |
| implication | 蕴含 | 「如果 P，那么 Q」；只有 P 真且 Q 假时不成立 |
| equivalence | 等价 | 两个命题具有相同的真假值 |
| universal quantification | 全称量化 | 条件针对所有允许的取值成立 |
| satisfiable | 可满足 | 至少存在一种变量赋值，使整个公式为真 |
| valid | 有效 | 对所有允许的变量赋值，公式都为真 |
| counterexample | 反例 | 一种使声称成立的性质失败的具体情况 |
| SMT solver | SMT 求解器 | 针对选定逻辑理论，判断公式是否可满足的工具 |
| verification condition / VC | 验证条件 | 为了证明程序满足规格，工具需要检查的逻辑公式 |
| uninterpreted function | 未解释函数 | 不展开实现，只利用「相同输入产生相同输出」等逻辑规则的函数符号 |
| lemma | 引理 | 为更大的证明提供帮助的小结论 |
| assumption | 假设 | 推理时作为前提使用的陈述；并不一定在当前证明中验证 |
| trusted computing base / TCB | 可信计算基础 | 整个结论需要信任、却未由当前验证过程本身证明的部分 |
| termination | 终止性 | 程序会不会最终结束，而不是永远递归或循环 |
| partial correctness | 部分正确性 | 如果程序返回，那么结果满足约定；本身不承诺一定返回 |

相关章节：[逻辑与 SMT](Tutorial_02_Logic.html)、[指针与字节](Tutorial_11_Case_Study_Pointers.html)。

## 度量与数据结构 {#data}

| 英文 | 中文 | 通俗解释 |
| --- | --- | --- |
| measure | 度量函数 | 把数据结构的某个可描述属性暴露给逻辑，例如是否为空、长度或元素集合 |
| Boolean measure | 布尔度量函数 | 结果是布尔值的度量，例如「这个列表为空吗？」 |
| numeric measure | 数值度量函数 | 结果是数值的度量，例如列表长度 |
| set / elemental measure | 集合 / 元素度量函数 | 用集合描述数据结构中出现了哪些元素 |
| partial function | 部分函数 | 只对部分输入有定义或能正常工作，例如空列表上的 `head` |
| total function | 全函数 | 在其声明的输入范围内都给出定义；还须注意所讨论的终止性模型 |
| sparse vector | 稀疏向量 | 仅记录少量非零位置及其值的向量表示 |
| dimension | 维度 | 向量长度或矩阵行列数等形状信息 |
| nondecreasing | 非递减 | 后面的值不小于前面的值，允许相等 |
| set | 集合 | 只关心元素是否出现，忽略顺序和重复次数 |
| multiset / bag | 多重集合 | 除了元素是否出现，还记录每个元素出现了多少次 |
| permutation | 排列 | 元素可以换顺序，但每个元素的出现次数保持不变 |
| zipper | 拉链结构 | 把数据拆成当前位置及周围上下文，便于局部移动和修改 |
| amortized complexity | 摊还复杂度 | 把一系列操作的总成本分摊到各次操作上；不等于每一步成本都相同 |
| binary search tree / BST | 二叉搜索树 | 用左右子树与根之间的大小关系组织数据的树 |
| AVL tree | AVL 树 | 在搜索树之上维持高度平衡条件的数据结构 |
| functional correctness | 功能正确性 | 结果符合规定的功能含义，例如插入后恰好增加指定元素 |

相关章节：[布尔度量](Tutorial_06_Measure_Bool.html)、[数值度量](Tutorial_07_Measure_Int.html)、[集合度量](Tutorial_08_Measure_Set.html)、[AVL 树](Tutorial_12_Case_Study_AVL.html)。

## 如何读一条精化类型 {#reading-a-type}

```haskell
{-@ type NonZero = {v:Int | v /= 0} @-}
```

依次读作：「给这个类型起名叫 `NonZero`；里面的值 `v` 是一个 `Int`；而且 `v` 不等于 `0`。」

`{-@ ... @-}` 对普通 Haskell 编译器来说是注释；LiquidHaskell 会读取其中的规格。普通编译没有报错，并不能说明这条规格已经经过检查。
