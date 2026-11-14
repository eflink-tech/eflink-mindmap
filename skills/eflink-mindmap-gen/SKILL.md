---
name: eflink-mindmap-gen
description: "生成易飞思维导图（eflink-mindmap）可编辑文件。从图片（如 ProcessOn 思维导图模板截图）或文字描述产出 .efm.json（编辑器『导入文件』可直接打开）+ SVG 预览，支持 8 类 51 种布局预设：双侧/单侧导图、逻辑图、括号图、组织架构、树形图、时间轴、鱼骨图、矩阵图，40 套配色主题、分支方向、关联线/外框/概要、节点标记（优先级/任务/旗帜/星星/emoji）。Use when: (1) 用户给思维导图截图要求转成脑图/模板, (2) 要求生成思维导图/组织架构图/时间轴/鱼骨图等脑图文件, (3) 提到 .efm.json / eflink-mindmap / 易飞思维导图模板, (4) 批量采集转换 ProcessOn 思维导图模板入库。"
---

# eflink-mindmap 思维导图生成

把导图（图片识别或文字描述）转成易飞思维导图编辑器原生可编辑文件。核心是产出 **MindmapSpec JSON**
（一棵树，无坐标无 id），再用打包的转换器生成 `.efm.json`（编辑器导入格式）+ `.document.json`
（MindMapDocument，模板入库 content 直接用）+ `.svg` 结构预览。布局坐标由编辑器布局引擎自动排版，
你只需要写对**层级、顺序、左右归属、文字、主题**。

## 工作流

1. **读约束**：先读 [references/constraints.md](references/constraints.md)（短，必读——核心三条：
   忠实原图层级不发明结构、双侧导图必须标 side、配色选主题不逐节点涂色）。
2. **选布局与主题**：按原图结构查 [references/themes-layouts.md](references/themes-layouts.md)
   的布局选型表（8 类 51 个预设，先判根的位置和分支方向）+ 主题色板表（按原图一级分支颜色对号）。
   需要分支改向、关联线、外框、概要时用 spec 的 `branchDirection` / `relations` / `boundaries` / `summaries`。
3. **写 spec**：按 [references/spec-format.md](references/spec-format.md) 的格式写 MindmapSpec JSON。
   图片识别时逐支对照原图数节点（顺序=数组顺序）；从文字描述生成时自行组织层级（一层一个语义，
   节点短语化）。格式细节拿不准时参考 assets/examples/ 里四个实战验证过的示例
   （business-map 双侧导图 / org-chart 组织架构 / product-timeline 时间轴 / processon-real 真实模板识别）。
4. **转换**：
   ```bash
   node <skill目录>/scripts/mindmap_convert.mjs my-spec.json -o ./out
   # 产出 my-spec.efm.json + my-spec.document.json + my-spec.svg；stderr 的 ⚠ 警告必须逐条核对
   ```
5. **自检**：SVG 预览转 PNG 检查树形/文字/配色/左右归属（可 Read 图片）：
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
     --screenshot=preview.png --window-size=1600,1200 --hide-scrollbars file://$(pwd)/out/my-spec.svg
   ```
   核对：层级数与原图一致、分支不缺不多、双侧图的左右归属与原图一致、主题观感接近原图、文字完整。
   有问题改 spec 重新生成。
6. **交付**：给用户 .efm.json 路径（编辑器顶栏"导入文件"打开；/office/mindmap 页面）+ 预览图。

## 图片识别要点（转 ProcessOn 类截图）

- 先判布局：根居中双侧=map-balanced-\*（最常见）；根在顶向下=org-down-\*；根在左向右=logic-right-\*；
  大括号=brace-\*；横/纵时间轴=timeline-\*；鱼骨=fishbone-\*；四象限=matrix-2x2-\*
- **数节点要逐支数**：从 12 点方向顺时针（右侧从上到下、左侧从下到上）依次对应 children 顺序
- 每个一级分支标 `side`（左/右）；原图左右分布就是 spec 的左右
- 选主题：看原图一级分支的**颜色序列**（不是背景色）；拿不准用 chenxi（红橙青蓝紫的多彩系）
- 原图的优先级/旗帜/星星/任务图标 → markers；水印忽略；贴纸插画不采
- 节点文字短语化，超长说明挪 note

## 可选：入库为模板草稿

拿 `.document.json`（裸 MindMapDocument）作为 office_template_content.content 写入本地库
（localhost:3306/eflink-tech），office_template 行 type=**15**（mindmap）、status=0 草稿、
author_name 标来源；模板卡片预览（MindmapThumb）直接吃 nodes/rootId，无需额外截图。
批量入库参考 eflink-draw 的 `scripts/processon-crawl/convert/import-band.mjs` 幂等模式
（description 带 tid 锚点、按 tid 跳过已入库）。涉及数据库写入，先和用户确认。

## 维护提示

转换器使用的布局预设（51 个）与主题色板（40 套）是从 mindmap 包源码提取的快照，
mindmap 包改动时重新生成即可，不必手改转换器：

```bash
node scripts/extract-mindmap-data.mjs
# → assets/presets-data.json（51 预设 + default + legacy 映射）
# → assets/themes-data.json（40 主题）
```

- 主题源：`eflink-mindmap/packages/mindmap/src/core/style/themes.ts`
- 布局预设源：`eflink-mindmap/packages/mindmap/src/core/layout/presets.ts`
- 文档 schema：`eflink-mindmap/packages/mindmap/src/types/mindmap.ts`
- 导入校验：`eflink-mindmap/packages/mindmap/src/core/export/efmJson.ts`（parseMindMapDocument）
- spec 样例基准：`eflink-frontend/src/data/templates/helpers.ts` 的 buildMindmap

布局/主题全表见 [references/themes-layouts.md](references/themes-layouts.md)，
spec 字段与关联线/外框/概要格式见 [references/spec-format.md](references/spec-format.md)。
