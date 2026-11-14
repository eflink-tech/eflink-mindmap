# MindmapSpec 格式

spec 是一棵树，转换器 `mindmap_convert.mjs` 负责编号、扁平化、分侧和校验——**你不写坐标、不写 id**，
布局引擎自动排版。所有枚举字段写错不会报错而是**忽略并打警告**（转换器 stderr 有 ⚠ 清单，转换后必须核对）。

## 顶层结构

```json
{
  "title": "文档标题（可选，缺省取根节点 text）",
  "layout": "map-balanced-curve",
  "themeId": "chenxi",
  "canvasOptions": { "rainbowBranches": true },
  "root": { "text": "根节点文字", "children": [] }
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| title | 否 | 文档标题；缺省用 root.text |
| layout | 否 | 布局预设 id，默认 `map-balanced-curve`；全表见 themes-layouts.md |
| themeId | 否 | 配色方案 id，默认 `classic`；40 个全表（含色板）见 themes-layouts.md |
| canvasOptions | 否 | 画布选项：`balanced`(左右均衡,默认true) / `compact`(紧凑间距) / `unifySiblingWidth`(同级等宽) / `rainbowBranches`(一级分支多色,默认true) / `background`(画布底色#hex) / `fontFamily` / `branchLineWidth`(线宽px) |
| root | **是** | 根节点（树形递归） |

## 节点字段（树形递归）

```json
{
  "text": "节点文字（必填，非空；\\n 显式换行）",
  "key": "业务唯一键（可选，供关联线/外框/概要引用）",
  "children": [ /* 子节点，省略即叶子 */ ],
  "side": "right",
  "branchDirection": "right",
  "style": { "shape": "rounded", "fillColor": "#FF6B6B", "textColor": "#FFFFFF" },
  "markers": [ { "type": "priority", "level": 1 } ],
  "link": "https://…",
  "note": "备注长文",
  "labels": ["标签1", "标签2"]
}
```

### text（必填）

纯文本，`\n` 显式换行；支持 emoji。**不要写 HTML**。一级/二级节点 ≤15 字为宜，
三级及更深 ≤20 字；长句放 `note`。转换器对深层 >30 字的节点打警告。

### side（仅根的直接子节点有意义）

`"left"` / `"right"`——双侧布局（`map-balanced` / `logic-balanced` / `brace-balanced` / `org-balanced` /
`tree-balanced`）下一级分支的左右归属。原图是左右双侧导图时**必须按原图标注**（否则自动分侧会与原图
左右相反）；单侧布局写 side 会被忽略并警告。

### branchDirection（分支生长方向）

`"left"` / `"right"` / `"up"` / `"down"`——覆盖某棵子树相对父节点的生长方向，用于
`map-*` / `logic-*` / `org-*` / `tree-*` 的生长方向布局（如双侧导图里把某个分支改成向上）。
放射、括号、时间轴、鱼骨、矩阵、大纲布局忽略该字段并警告；根节点上无意义。

### style（NodeStyle 全字段）

| 字段 | 取值 | 说明 |
| --- | --- | --- |
| shape | `rounded` / `ellipse` / `rectangle` / `hexagon` / `pill` | 节点形状 |
| fillColor | `#RRGGBB` | 填充色 |
| textColor | `#RRGGBB` | 文字色 |
| borderColor | `#RRGGBB` | 描边色 |
| fontSize | 8~48 | 字号（编辑器默认按深度 18/16/14 递减） |
| fontWeight | `normal` / `bold` | 加粗 |
| borderStyle | `solid` / `dashed` / `none` | 描边样式；none=无边框 |
| borderWidth | 数字 px | 描边宽 |
| fontFamily | 字体名 | 覆盖全局字体 |
| italic / underline / strikethrough | true | 斜体/下划线/删除线 |
| textAlign | `left` / `center` / `right` | 文字对齐 |
| fixedWidth | 40~600 | 固定宽度 px（缺省自适应） |
| connectorType | `curve` / `straight` / `elbow` / `brace` | 该节点到父节点的连线形状 |
| connectorWidth | 数字 px | 连线宽 |
| connectorColor | `#RRGGBB` | 连线颜色 |
| connectorEnd | `none` / `arrow` / `dot` | 连线端头 |

### markers（节点标记，数组，可多个不同组）

```json
"markers": [
  { "type": "priority", "level": 1 },
  { "type": "task", "state": "p50" },
  { "type": "flag", "color": "red" },
  { "type": "star", "color": "yellow" },
  { "type": "label", "color": "green" },
  { "type": "people", "color": "blue" },
  { "type": "emoji", "value": "🔥" },
  { "type": "progress", "percent": 50 }
]
```

- `priority.level`：1~7 整数（1 红 2 橙 3 黄 4 蓝 5 绿 6 紫 7 灰）
- `task.state`：`start` / `p25` / `p50` / `p75` / `p100` / `done`
- 颜色组（flag/star/label/people）：`red` / `orange` / `yellow` / `green` / `blue` / `purple` / `gray`
- `emoji.value`：任意 emoji 字符

### link / note / labels

- `link`：必须 `http(s)://` 开头
- `note`：字符串，备注长文（面板查看，画布不显示）
- `labels`：字符串数组，节点下方小标签

## 关联线 / 外框 / 概要 / 主题覆盖（引用节点 key）

这四个顶层字段都是可选的，节点需要被引用时先写 `key`（同一文档内唯一）。引用不上的项会被跳过并警告。

```json
{
  "relations": [
    { "from": "g1", "to": "p2", "label": "技术支撑", "color": "#FF6B6B", "width": 2 }
  ],
  "boundaries": [
    { "nodes": ["p1", "p2"], "title": "产品线", "color": "#4C6EF5", "fill": "#EDF2FF" }
  ],
  "summaries": [
    { "parent": "growth", "range": [0, 1], "text": "下半年重点" }
  ],
  "styleOverrides": { "name": "企业风" }
}
```

| 字段 | 必填引用 | 说明 |
| --- | --- | --- |
| relations[].from / .to | 节点 key | 跨分支关联线；`label` 线上文字；`color`(#RRGGBB)+`width`(数字) 成对才生效 |
| boundaries[].nodes | 节点 key 数组 | 把若干节点框在一起；`title` 外框标题；`color`+`fill` 成对才生效 |
| summaries[].parent + .range | 父节点 key + [start,end] | 父节点 children 下标区间（0 起，含端点）；`text` 概要文字；`style` 原样透传 |
| styleOverrides | — | 文档级主题覆盖：`name` 名称，`colors` / `node` / `connector` 对象原样写入 |

`summaries.range` 超出父节点实际 children 数量时会被过滤掉（stderr 有警告）。

## 配色策略（重要）

1. **优先选 themeId**：编辑器默认 `rainbowBranches` 会自动给一级分支逐个上主题色板色，
   二级浅底、三级纯文字——绝大多数 ProcessOn 导图模板用原图最接近的主题即可还原，**不要逐节点写颜色**。
2. 仅当原图节点有**主题色板无法表达的独立配色**（如特定业务色块、每个分支自定义色）才逐节点写
   `style.fillColor`；此时建议同时 `"canvasOptions": { "rainbowBranches": false }` 并在根侧
   保持与原图一致。
3. 原图根节点描边样式（白底描边/实心大圆角）由主题 primary 明暗自动决定，无需手写。

## 语义规则（编辑器强约束）

- 扁平化由转换器完成：id 自动生成 `tpl-node-N`，文档 id 为 `mindmap-template-<rootId>`。
- `layoutDefaults`（该布局的默认形状/连线）由转换器按 layout 自动写入，勿手写。
- 文档输出包含 `relations` / `boundaries` / `summaries` / `styleOverrides`（未写则为空数组/缺省），
  与编辑器 MindMapDocument 同构；模板入库直接用 `.document.json`。
