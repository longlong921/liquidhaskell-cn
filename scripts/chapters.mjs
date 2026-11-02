export const chapters = [
  { number: 1, slug: 'Tutorial_01_Introduction', title: '引言', subtitle: '为什么类型正确的程序仍会出错', part: 1, summary: '从除零、缺失键和越界访问出发，认识精化类型要解决的问题。' },
  { number: 2, slug: 'Tutorial_02_Logic', title: '逻辑与 SMT', subtitle: '自动证明背后的基本规则', part: 1, summary: '理解命题、算术、未解释函数，以及求解器怎样检查验证条件。' },
  { number: 3, slug: 'Tutorial_03_Basic', title: '精化类型', subtitle: '给类型加上可验证的条件', part: 1, summary: '用谓词表达前置条件、后置条件和子类型关系。' },
  { number: 4, slug: 'Tutorial_04_Polymorphism', title: '多态', subtitle: '通用代码也能保留精确信息', part: 1, summary: '通过向量索引、递归和高阶循环，理解精化与多态如何配合。' },
  { number: 5, slug: 'Tutorial_05_Datatypes', title: '精化数据类型', subtitle: '把不变量放进数据结构', part: 1, summary: '让稀疏向量、有序列表和搜索树在构造时就满足约束。' },
  { number: 6, slug: 'Tutorial_06_Measure_Bool', title: '布尔度量', subtitle: '让逻辑读懂数据的形状', part: 2, summary: '用度量函数描述列表是否为空，建立安全的部分函数接口。' },
  { number: 7, slug: 'Tutorial_07_Measure_Int', title: '数值度量', subtitle: '验证长度、大小与维度', part: 2, summary: '跟踪列表长度，把向量和矩阵的维度关系写入类型。' },
  { number: 8, slug: 'Tutorial_08_Measure_Set', title: '集合度量', subtitle: '验证容器里有哪些元素', part: 2, summary: '从元素集合出发，讨论内容保持、排列、唯一性与 zipper。' },
  { number: 9, slug: 'Tutorial_09_Case_Study_Lazy_Queues', title: '惰性队列', subtitle: '案例：Okasaki 的队列', part: 3, summary: '用两个列表实现队列，验证长度约束与旋转操作的前提。' },
  { number: 10, slug: 'Tutorial_10_Case_Study_Associative_Maps', title: '键值映射', subtitle: '案例：作用域与搜索树', part: 3, summary: '把键是否存在写入接口，用引理连接树结构与映射语义。' },
  { number: 11, slug: 'Tutorial_11_Case_Study_Pointers', title: '指针与字节', subtitle: '案例：底层内存安全', part: 3, summary: '沿着指针、ByteString 到应用接口，区分可信假设与已验证保证。' },
  { number: 12, slug: 'Tutorial_12_Case_Study_AVL', title: 'AVL 树', subtitle: '案例：平衡与功能正确性', part: 3, summary: '验证树高、有序性、旋转、插入和删除，组合复杂不变量。' }
];
export const parts = [
  { number: 1, title: '精化类型', description: '从基本逻辑到数据结构，把条件写进类型。' },
  { number: 2, title: '度量函数', description: '让验证器看见数据的形状、大小与内容。' },
  { number: 3, title: '完整案例', description: '在队列、映射、字节与树中组合所学方法。' }
];
export const upstream = {
  repository: 'https://github.com/ucsd-progsys/liquidhaskell-tutorial',
  website: 'https://ucsd-progsys.github.io/liquidhaskell-tutorial/',
  commit: '077437f37e77d13a28ffabbf9be0330f88055ba6',
  date: '2024-09-30',
  translated: '2026-11-02'
};
