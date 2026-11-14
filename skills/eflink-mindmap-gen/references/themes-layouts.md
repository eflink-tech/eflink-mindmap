# 布局选型 + 主题色板全表

## 一、从原图判布局（先看结构再下笔）

判断顺序：**根在哪、分支往哪长、连线什么形状**。布局预设共 **8 类 51 个**（与编辑器预设库一一对应）；
形状/连线已固化在预设默认值里，spec 通常不用写 style 形状。

| 原图特征 | layout | 备注 |
| --- | --- | --- |
| 根居中、分支左右双侧展开、曲线连线（ProcessOn 最常见） | `map-balanced-curve` | **默认**，双侧导图首选 |
| 双侧或单侧的纯脑图（根左/左/上/下） | `map-right-curve` / `map-left` / `map-down` / `map-up` | 圆角节点 + 曲线 |
| 放射环状导图 | `map-radial` | 节点围绕中心一圈 |
| 根在左、向右逐级（步骤/逻辑展开） | `logic-right`（折线）/ `logic-balanced`（双侧）/ `logic-outline`（无框大纲） | 逻辑图首选 |
| 向左/向上/向下逻辑 | `logic-left` / `logic-up` / `logic-down` | |
| 组织架构：根在顶向下逐级 | `org-down` / `org-classic`（矩形节点） | 组织架构首选 |
| 组织架构：向上/向右/向左/双侧/环形 | `org-up` / `org-right` / `org-left` / `org-balanced` / `org-radial` | |
| 大括号分组 | `brace-right` / `brace-left` / `brace-down` / `brace-up` / `brace-balanced` / `brace-outline` | 括号图 |
| 树形结构（WBS/目录） | `tree-right` / `tree-left` / `tree-down` / `tree-up` / `tree-balanced` / `tree-radial` / `tree-wbs` | |
| 横向时间轴 | `timeline-h`（上下交替）/ `timeline-h-top`（上方单侧）/ `timeline-h-bottom` | 根→日期→事件 三级树 |
| 纵向时间轴 | `timeline-v`（左右交替）/ `timeline-v-left` / `timeline-v-right` | |
| 鱼骨图（主骨+斜刺） | `fishbone-classic`（原因型）/ `fishbone-reverse`（对策型）/ `fishbone-6m` / `fishbone-effect` / `fishbone-comb` | 鱼刺由布局引擎画，spec 仍是普通树 |
| 纵向鱼骨 | `fishbone-vertical`（头下）/ `fishbone-vertical-up`（头上） | |
| 四象限/宫格 | `matrix-2x2` / `matrix-2x3` / `matrix-3x2` / `matrix-3x3` | 一级分支按顺序填格子 |
| 多栏对比 | `matrix-1x2` / `matrix-1x3` | |

**拿不准就 `map-balanced-curve`**——双侧导图占 ProcessOn 思维导图模板的大多数。
时间轴/鱼骨/矩阵的"主干延伸感"由布局引擎负责，spec 只需把层级写对（如时间轴：根→各年→事件）。
预览 SVG 对时间轴/鱼骨/矩阵/放射只做示意排版（按右向或纵向下落），仅用于核对层级、文字与配色。

### 布局预设全表（51 个）

| id | 名称 | structure |
| --- | --- | --- |
| **思维导图** | | |
| map-balanced-curve | 双向平衡 | map-balanced |
| map-right-curve | 右侧单向 | map-right |
| map-left | 左侧单向 | map-left |
| map-down | 向下发散 | map-down |
| map-up | 向上发散 | map-up |
| map-radial | 放射环状 | map-radial |
| **逻辑图** | | |
| logic-right | 向右逻辑 | logic-right |
| logic-left | 向左逻辑 | logic-left |
| logic-down | 向下逻辑 | logic-down |
| logic-up | 向上逻辑 | logic-up |
| logic-balanced | 双向逻辑 | logic-balanced |
| logic-outline | 大纲逻辑 | logic-outline |
| **括号图** | | |
| brace-right | 向右括号 | brace-right |
| brace-left | 向左括号 | brace-left |
| brace-balanced | 双向括号 | brace-balanced |
| brace-down | 向下括号 | brace-down |
| brace-up | 向上括号 | brace-up |
| brace-outline | 缩进括号 | brace-outline |
| **组织结构图** | | |
| org-down | 向下组织 | org-down |
| org-up | 向上组织 | org-up |
| org-right | 向右组织 | org-right |
| org-left | 向左组织 | org-left |
| org-balanced | 双向组织 | org-balanced |
| org-radial | 环形组织 | org-radial |
| org-classic | 圆角组织架构 | org-classic |
| **树形图** | | |
| tree-right | 向右树形 | tree-right |
| tree-left | 向左树形 | tree-left |
| tree-down | 向下树形 | tree-down |
| tree-up | 向上树形 | tree-up |
| tree-balanced | 双向树形 | tree-balanced |
| tree-radial | 环形树形 | tree-radial |
| tree-wbs | WBS 分解 | tree-wbs |
| **时间轴** | | |
| timeline-h | 横向·上下交替 | timeline-h |
| timeline-h-top | 横向·上方单侧 | timeline-h-top |
| timeline-h-bottom | 横向·下方单侧 | timeline-h-bottom |
| timeline-v | 纵向·左右交替 | timeline-v |
| timeline-v-left | 纵向·左侧单侧 | timeline-v-left |
| timeline-v-right | 纵向·右侧单侧 | timeline-v-right |
| **鱼骨图** | | |
| fishbone-classic | 经典原因型 | fishbone-rl |
| fishbone-reverse | 反向对策型 | fishbone-lr |
| fishbone-vertical | 纵向·头下 | fishbone-bt |
| fishbone-vertical-up | 纵向·头上 | fishbone-tb |
| fishbone-6m | 6M 对称型 | fishbone-6m |
| fishbone-effect | 6M 因果分析 | fishbone-6m-effect |
| fishbone-comb | 梳状整理型 | fishbone-comb |
| **矩阵图** | | |
| matrix-2x2 | 2×2 四象限 | matrix-2x2 |
| matrix-2x3 | 2×3 六宫格 | matrix-2x3 |
| matrix-3x2 | 3×2 六宫格 | matrix-3x2 |
| matrix-3x3 | 3×3 九宫格 | matrix-3x3 |
| matrix-1x2 | 两栏对比 | matrix-1x2 |
| matrix-1x3 | 三栏对比 | matrix-1x3 |

预设默认值（节点形状、连线类型、无边框等）由转换器按 layout 自动写入 `layoutDefaults`，spec 勿手写。
预设数据快照在 `assets/presets-data.json`；mindmap 包改动后用 `node scripts/extract-mindmap-data.mjs` 重新生成。

## 二、主题色板全表（40 个，按原图主色调对号入座）

色板为一级分支依次取用的颜色（`rainbowBranches` 开启时自动逐分支上色）。
**选主题看原图一级分支的颜色序列**，不必逐色精确。

### 缤纷组（colorful，35 个）

| id | 名称 | primary | 分支色板 |
| --- | --- | --- | --- |
| chenxi | 晨曦 | #FF6B6B 红 | 红/橙/青绿/青/天蓝/紫 |
| rainbow | 彩虹 | #2E0F6B 深紫 | 白/亮紫/品紫/深紫/藏青/浅紫 |
| vitality | 活力 | #0D0D0D 黑 | 白/浅灰/正红/明黄/宝蓝/黑 |
| dancing | 舞动 | #363026 棕黑 | 蓝紫/红/白/米黄/深红/棕黑 |
| code | 代码 | #2C2D30 | 米黄/浅绿/白/粉紫/浅蓝/深灰 |
| wafeng | 和风 | #191959 藏青 | 白/粉/橙/浅蓝/钴蓝/藏青 |
| island | 岛屿 | #6B705C 灰绿 | 米/驼/浅棕/灰绿/橄榄/灰绿 |
| rose | 玫瑰 | #A4133C 深红 | 浅粉/粉/粉红/玫红/深红/深红 |
| mint | 薄荷 | #046562 深青 | 白/浅薄荷/薄荷/青/青绿/深青 |
| lvcha | 绿茶 | #1F2B1D | 米绿/驼/草绿/橄榄/深绿/墨绿 |
| yuzhou | 宇宙 | #0D2F42 深海蓝 | 浅灰/天蓝/中蓝/钢蓝/藏蓝/深海蓝 |
| jingzhi | 精致 | #1E1D1A | 赭金/米白/沙金/金棕/朱红/墨色 |
| chunzhen | 纯真 | #3C4244 | 粉/桃红/浅蓝/靛蓝/米白/炭灰 |
| makalong | 马卡龙 | #3C4244 | 卡其/橘粉/豆绿/白/鹅黄/炭灰 |
| lindi | 林地 | #1F2513 | 金黄/松绿/橄榄/草绿/米白/墨绿 |
| naiyou | 奶油 | #7D6E83 | 淡绿/浅灰紫/白/雾蓝/豆沙/灰紫 |
| xiaweiyi | 夏威夷 | #254B85 | 浅蓝/海蓝/钴蓝/青绿/金黄/米色 |
| songguo | 松果 | #1D414B | 灰/棕灰/深青/浅灰/灰紫/驼灰 |
| fanwutuobang | 反乌托邦 | #2A2C2C | 正红/白/浅灰/中灰/深灰/炭黑 |
| shuifen | 水粉 | #3C74A6 | 白/粉/柠檬黄/草绿/紫/钢蓝 |
| huali | 华丽 | #0A052E | 浅蓝/黄绿/橙/粉紫/天蓝/深紫黑 |
| yazhi | 雅致 | #153E5D | 米黄/米灰/青/灰蓝/紫灰/藏蓝 |
| duocai | 多彩 | #070D59 | 白/亮青/金黄/橘红/宝蓝/藏青 |
| xuancai | 炫彩 | #092933 | 白/浅粉/粉/亮紫/蓝紫/墨绿黑 |
| fugu | 复古 | #264653 | 芥黄/橙黄/橘红/赭红/青绿/深青 |
| tiandian | 甜点 | #006D77 | 米白/奶油/橘粉/驼/青灰/青绿 |
| xiangcao | 香草 | #0D4040 | 白/薄荷/翠青/青/炭灰/墨绿 |
| tangguo | 糖果 | #54A6D6 | 白/橘/柠黄/橙/浅蓝/天蓝 |
| nihong | 霓虹 | #7400B8 | 白/荧光绿/天青/亮蓝/蓝紫/亮紫 |
| yinghua | 樱花 | #FFA9C6 | 浅粉/杏粉/粉/樱粉/灰棕/灰蓝 |
| bilu | 壁炉 | #6D3B37 | 杏黄/橙/亮橙/红/砖红/深棕 |
| jiari | 假日 | #101F23 | 薄荷白/橙/大红/深红/墨绿/炭黑 |
| haiyang | 海洋 | #000D2D | 亮青/浅青/青蓝/宝蓝/藏蓝/深海蓝 |
| ziteng | 紫藤 | #72369D | 米白/鹅黄/浅紫/紫/亮紫/深紫 |

### 经典组（classic，5 个）

| id | 名称 | primary | 分支色板 |
| --- | --- | --- | --- |
| classic | 经典 | #3B82F6 蓝 | 红/橙/绿/紫/粉/青（软件默认） |
| ink | 墨黑 | #111827 | 灰阶为主，极简黑白灰 |
| business | 商务 | #1E3A5F | 宝蓝/青绿/赭金/紫/深红/灰蓝 |
| fresh | 清新 | #0284C7 | 天蓝/青绿/草绿/靛蓝/青/蓝 |
| night | 暗夜 | #1F2937 | 亮蓝/翠绿/粉/亮紫/黄/橙（适深底） |
| sand | 沙丘 | #B45309 | 金棕/土黄/橄榄/深棕/棕/金黄 |

### 选色速查

- 原图多彩明亮 → chenxi / duocai / tangguo / huali
- 商务稳重蓝灰 → business / yuzhou / haiyang / fresh
- 柔和低饱和 → naiyou / makalong / tiandian / island
- 绿色系 → mint / lvcha / lindi / xiangcao
- 暖色系 → bilu / fugu / sand / jingzhi
- 粉色系 → rose / yinghua / chunzhen
- 紫色系 → ziteng / nihong / xuancai
- 黑白极简 → ink / vitality / fanwutuobang
