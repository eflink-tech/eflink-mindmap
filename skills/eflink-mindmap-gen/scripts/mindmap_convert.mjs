#!/usr/bin/env node
/**
 * eflink-mindmap-gen 转换器：MindmapSpec JSON → MindMapDocument
 * 产出三件套：
 *   <name>.efm.json        — 编辑器包装格式 {format:'eflink-mindmap',version:1,document}，编辑器「导入文件」可直接打开
 *   <name>.document.json   — 裸 MindMapDocument，模板入库（office_template_content.content）直接用
 *   <name>.svg             — 结构预览（简化布局，供自检树形/文字/配色，非编辑器精确几何）
 *
 * 用法：node mindmap_convert.mjs <spec.json> [-o 输出目录]
 * 退出码：0 成功；1 用法/JSON 错误；2 spec 结构错误。
 * 警告（未知枚举回退、超长文本等）打印在 stderr，不阻断。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── 布局/主题数据（node scripts/extract-mindmap-data.mjs 从 mindmap 源码再生）──
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const PRESET_DATA = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'presets-data.json'), 'utf8'));
const THEME_DATA = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'themes-data.json'), 'utf8'));

// id → [category, structure, defaults]
const LAYOUTS = Object.fromEntries(PRESET_DATA.presets.map((p) => [p.id, [p.category, p.structure, p.defaults ?? {}]]));
// id → [中文名, 分组, primary, branches]（保留旧渲染器索引结构）
const THEMES = Object.fromEntries(Object.entries(THEME_DATA.themes).map(([id, t]) => [
  id, [t.name, t.group, t.colors.primary, (t.colors.branches ?? []).join(',')],
]));
const LEGACY_LAYOUT_MAP = { ...PRESET_DATA.legacyMap };
const DEFAULT_LAYOUT = PRESET_DATA.default;

// ── 枚举 ──
const SHAPES = new Set(['rounded', 'ellipse', 'rectangle', 'hexagon', 'pill']);
const BORDER_STYLES = new Set(['solid', 'dashed', 'none']);
const CONNECTOR_TYPES = new Set(['curve', 'straight', 'elbow', 'brace']);
const CONNECTOR_ENDS = new Set(['none', 'arrow', 'dot']);
const FONT_WEIGHTS = new Set(['normal', 'bold']);
const MARKER_COLORS = new Set(['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray']);
const TASK_STATES = new Set(['start', 'p25', 'p50', 'p75', 'p100', 'done']);
const PROGRESS = new Set([0, 25, 50, 75, 100]);
const CANVAS_OPTION_KEYS = ['balanced', 'compact', 'unifySiblingWidth', 'rainbowBranches', 'background', 'fontFamily', 'branchLineWidth'];
const PRIORITY_BADGE_COLORS = ['gray', 'red', 'orange', 'yellow', 'blue', 'green', 'purple'];
const MARKER_HEX = { red: '#E5484D', orange: '#F76B15', yellow: '#FFC53D', green: '#30A46C', blue: '#0090FF', purple: '#8E4EC6', gray: '#8B8D98' };

// ── 工具 ──
const warnings = [];
const warn = (msg) => warnings.push(msg);
const isHexColor = (s) => /^#[0-9a-fA-F]{3,8}$/.test(String(s));
function tint(hex, f) {
  const n = hex.replace('#', '');
  const rgb = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  return '#' + rgb.map((c) => Math.round(c + (255 - c) * f).toString(16).padStart(2, '0')).join('');
}
function luminance(hex) {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const textWidth = (s, fontSize) =>
  [...s].reduce((w, ch) => w + (ch.codePointAt(0) > 0xff ? fontSize : fontSize * 0.56), 0);

// ── style/markers 清洗 ──
function cleanStyle(raw, where) {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    warn(`${where}.style 应为对象，已忽略`);
    return undefined;
  }
  const out = {};
  const allowed = ['fillColor', 'textColor', 'borderColor', 'fontSize', 'fontWeight', 'shape', 'borderWidth', 'borderStyle', 'fontFamily', 'italic', 'underline', 'strikethrough', 'textAlign', 'fixedWidth', 'connectorType', 'connectorWidth', 'connectorColor', 'connectorEnd'];
  for (const [k, v] of Object.entries(raw)) {
    if (!allowed.includes(k)) { warn(`${where}.style.${k} 不是合法样式字段，已忽略`); continue; }
    if ((k === 'fillColor' || k === 'textColor' || k === 'borderColor' || k === 'connectorColor') && !isHexColor(v)) {
      warn(`${where}.style.${k}="${v}" 不是 #RRGGBB 十六进制色，已忽略`); continue;
    }
    if (k === 'shape' && !SHAPES.has(v)) { warn(`${where}.style.shape="${v}" 非法（可选 ${[...SHAPES].join('/')}），已忽略`); continue; }
    if (k === 'borderStyle' && !BORDER_STYLES.has(v)) { warn(`${where}.style.borderStyle="${v}" 非法，已忽略`); continue; }
    if (k === 'connectorType' && !CONNECTOR_TYPES.has(v)) { warn(`${where}.style.connectorType="${v}" 非法，已忽略`); continue; }
    if (k === 'connectorEnd' && !CONNECTOR_ENDS.has(v)) { warn(`${where}.style.connectorEnd="${v}" 非法，已忽略`); continue; }
    if (k === 'fontWeight' && !FONT_WEIGHTS.has(v)) { warn(`${where}.style.fontWeight="${v}" 非法，已忽略`); continue; }
    if (k === 'fontSize' && (!Number.isFinite(v) || v < 8 || v > 48)) { warn(`${where}.style.fontSize=${v} 超出 8~48，已忽略`); continue; }
    if (k === 'fixedWidth' && (!Number.isFinite(v) || v < 40 || v > 600)) { warn(`${where}.style.fixedWidth=${v} 超出 40~600，已忽略`); continue; }
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function cleanMarkers(raw, where) {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) { warn(`${where}.markers 应为数组，已忽略`); return undefined; }
  const out = [];
  for (const m of raw) {
    if (typeof m !== 'object' || m === null) continue;
    const t = m.type;
    if (t === 'priority') {
      if (Number.isInteger(m.level) && m.level >= 1 && m.level <= 7) out.push({ type: 'priority', level: m.level });
      else warn(`${where}.markers priority.level=${m.level} 应为 1~7 整数，已忽略`);
    } else if (t === 'task') {
      if (TASK_STATES.has(m.state)) out.push({ type: 'task', state: m.state });
      else warn(`${where}.markers task.state="${m.state}" 非法，已忽略`);
    } else if (t === 'progress') {
      if (PROGRESS.has(m.percent)) out.push({ type: 'progress', percent: m.percent });
      else warn(`${where}.markers progress.percent=${m.percent} 非法，已忽略`);
    } else if (t === 'emoji' || t === 'sticker') {
      if (typeof m.value === 'string' && m.value) out.push(t === 'emoji' ? { type: 'emoji', value: m.value } : { type: 'sticker', value: m.value });
      else warn(`${where}.markers ${t}.value 需为非空字符串，已忽略`);
    } else if (['label', 'flag', 'star', 'people'].includes(t)) {
      if (MARKER_COLORS.has(m.color)) out.push({ type: t, color: m.color });
      else warn(`${where}.markers ${t}.color="${m.color}" 非法（可选 ${[...MARKER_COLORS].join('/')}），已忽略`);
    } else {
      warn(`${where}.markers type="${t}" 非法，已忽略`);
    }
  }
  return out.length ? out : undefined;
}

// ── 树 → 扁平节点表 ──
const usesSide = (structure) => structure === 'map-balanced' || structure.endsWith('-balanced');
// 与 core/layout/strategies/shared.ts supportsBranchDirection 同步
const supportsBranchDirection = (structure) => {
  if (structure === 'map-radial') return false;
  if (structure.startsWith('map-')) return true;
  return /^(logic-(right|left|down|up|balanced)|org-(down|up|right|left|balanced)|tree-(right|left|down|up|balanced))$/.test(structure);
};

function buildFlat(specRoot, layoutId) {
  const nodes = {};
  const keyMap = {};
  let seq = 0;
  const newNodeId = () => `tpl-node-${(seq += 1)}`;

  const layout = LAYOUTS[layoutId];
  const structure = layout[1];
  const sideLayout = usesSide(structure);
  const dirLayout = supportsBranchDirection(structure);
  if (!sideLayout) {
    const sides = [];
    const walk = (n) => (n.children ?? []).forEach((c) => { if (c.side !== undefined) sides.push(c.side); walk(c); });
    walk(specRoot);
    if (sides.length) warn(`布局 ${layoutId} 不吃 side（仅 *-balanced 双侧布局有意义），side 已忽略`);
  }
  if (!dirLayout) {
    const dirs = [];
    const walk = (n) => (n.children ?? []).forEach((c) => { if (c.branchDirection !== undefined) dirs.push(c.branchDirection); walk(c); });
    walk(specRoot);
    if (dirs.length) warn(`布局 ${layoutId} 不支持 branchDirection（放射/大纲/矩阵/时间轴/鱼骨/括号图忽略分支方向），已忽略`);
  }

  const count = (n) => 1 + (n.children ?? []).reduce((s, c) => s + count(c), 0);
  const total = count(specRoot);
  if (total > 300) warn(`节点总数 ${total} 超过 300，请确认是否忠实原图`);

  function addNode(raw, parentId, depth) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('树中出现非对象节点');
    if (typeof raw.text !== 'string' || !raw.text.trim()) throw new Error(`节点缺少非空 text（parent=${parentId ?? 'root'}）`);
    const where = `node"${raw.text.slice(0, 10)}"`;
    if (depth >= 2 && raw.text.length > 30) warn(`${where} 文本过长(${raw.text.length} 字)——长句建议挪 note 或精简`);
    const id = newNodeId();
    if (raw.key !== undefined) {
      if (typeof raw.key !== 'string' || !raw.key.trim()) warn(`${where}.key 必须是非空字符串，已忽略`);
      else if (keyMap[raw.key]) warn(`${where}.key="${raw.key}" 重复，已忽略（关联/外框/概要引用前一个同名节点）`);
      else keyMap[raw.key] = id;
    }
    const style = cleanStyle(raw.style, where);
    const metadata = {};
    if (raw.side !== undefined) {
      if (raw.side === 'left' || raw.side === 'right') {
        if (!sideLayout) warn(`${where}.side 只对 *-balanced 布局生效，已忽略`);
        else if (depth === 1) metadata.side = raw.side;
        else warn(`${where}.side 只对根的直接子节点（一级分支）生效，已忽略`);
      } else warn(`${where}.side="${raw.side}" 非法（仅 left/right），已忽略`);
    }
    if (raw.branchDirection !== undefined) {
      const ok = ['left', 'right', 'up', 'down'];
      if (!ok.includes(raw.branchDirection)) warn(`${where}.branchDirection="${raw.branchDirection}" 非法（可选 ${ok.join('/')}），已忽略`);
      else if (!dirLayout) warn(`${where}.branchDirection 仅对 map/logic/org/tree 的生长方向布局生效，已忽略`);
      else if (depth === 0) warn(`${where}.branchDirection 对根节点无意义，已忽略`);
      else metadata.branchDirection = raw.branchDirection;
    }
    if (raw.link !== undefined) {
      if (typeof raw.link === 'string' && /^https?:\/\//.test(raw.link)) metadata.link = raw.link;
      else warn(`${where}.link 非合法 http(s) URL，已忽略`);
    }
    if (typeof raw.note === 'string' && raw.note) metadata.note = raw.note;
    if (Array.isArray(raw.labels) && raw.labels.length) {
      const labels = raw.labels.filter((x) => typeof x === 'string' && x);
      if (labels.length) metadata.labels = labels;
    }
    const markers = cleanMarkers(raw.markers, where);
    if (markers) metadata.markers = markers;
    nodes[id] = {
      id,
      parentId,
      children: [],
      text: raw.text,
      ...(style ? { style } : {}),
      ...(Object.keys(metadata).length ? { metadata } : {}),
    };
    if (parentId) nodes[parentId].children.push(id);
    for (const child of raw.children ?? []) addNode(child, id, depth + 1);
    return id;
  }

  const rootId = addNode(specRoot, null, 0);

  // 根的直接子节点 side 烘焙（仅双侧布局）：缺省按「少的一侧、平局靠右」补齐，与布局引擎 splitRootSides 同规则
  if (sideLayout) {
    let left = 0, right = 0;
    for (const childId of nodes[rootId].children) {
      const node = nodes[childId];
      const side = node.metadata?.side;
      if (side === 'left') { left += 1; continue; }
      if (side === 'right') { right += 1; continue; }
      const assign = right <= left ? 'right' : 'left';
      node.metadata = { ...(node.metadata ?? {}), side: assign };
      if (assign === 'right') right += 1; else left += 1;
    }
  }
  return { rootId, total, nodes, keyMap };
}

// ── 关联线 / 外框 / 概要（引用节点 key）──
function cleanRelations(raw, keyMap) {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) { warn('relations 必须是数组，已忽略'); return []; }
  const out = [];
  raw.forEach((r, i) => {
    const where = `relations[${i}]`;
    if (typeof r !== 'object' || r === null) return warn(`${where} 不是对象，已忽略`);
    const from = keyMap[r.from], to = keyMap[r.to];
    if (!from || !to) return warn(`${where} from/to 必须是已声明的节点 key，已忽略`);
    out.push({
      id: `tpl-rel-${i + 1}`,
      from, to,
      ...(typeof r.label === 'string' && r.label ? { label: r.label } : {}),
      ...(typeof r.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(r.color) && typeof r.width === 'number'
        ? { style: { color: r.color, width: r.width } } : {}),
    });
  });
  return out;
}

function cleanBoundaries(raw, keyMap) {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) { warn('boundaries 必须是数组，已忽略'); return []; }
  const out = [];
  raw.forEach((b, i) => {
    const where = `boundaries[${i}]`;
    if (typeof b !== 'object' || b === null) return warn(`${where} 不是对象，已忽略`);
    const ids = Array.isArray(b.nodes) ? b.nodes.map((k) => keyMap[k]).filter(Boolean) : [];
    if (!ids.length) return warn(`${where}.nodes 未命中任何节点 key，已忽略`);
    out.push({
      id: `tpl-boundary-${i + 1}`,
      nodeIds: ids,
      ...(typeof b.title === 'string' && b.title ? { title: b.title } : {}),
      ...(typeof b.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(b.color) && typeof b.fill === 'string' && /^#[0-9a-fA-F]{6}$/.test(b.fill)
        ? { style: { color: b.color, fill: b.fill } } : {}),
    });
  });
  return out;
}

function cleanStyleOverrides(raw) {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) { warn('styleOverrides 必须是对象，已忽略'); return undefined; }
  const out = {};
  if (typeof raw.name === 'string' && raw.name) out.name = raw.name;
  for (const key of ['colors', 'node', 'connector']) {
    if (raw[key] && typeof raw[key] === 'object' && !Array.isArray(raw[key])) out[key] = raw[key];
  }
  return Object.keys(out).length ? out : undefined;
}

function cleanSummaries(raw, keyMap) {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) { warn('summaries 必须是数组，已忽略'); return []; }
  const out = [];
  raw.forEach((s, i) => {
    const where = `summaries[${i}]`;
    if (typeof s !== 'object' || s === null) return warn(`${where} 不是对象，已忽略`);
    const parent = keyMap[s.parent];
    if (!parent) return warn(`${where}.parent 必须是已声明的节点 key，已忽略`);
    if (!Array.isArray(s.range) || s.range.length !== 2 || !s.range.every((n) => Number.isInteger(n) && n >= 0)) {
      return warn(`${where}.range 必须是 [start,end] 两个非负整数，已忽略`);
    }
    if (typeof s.text !== 'string' || !s.text) return warn(`${where}.text 不能为空，已忽略`);
    out.push({
      id: `tpl-summary-${i + 1}`,
      parentId: parent,
      range: s.range,
      text: s.text,
      ...(s.style && typeof s.style === 'object' ? { style: s.style } : {}),
    });
  });
  return out;
}

// ── SVG 预览（简化三模式 two-sided/right/down；几何为近似值，仅供自检树形/文字/配色）──
const nodeDepth = (doc, id) => {
  let d = 0, cur = id;
  while (doc.nodes[cur]?.parentId) { cur = doc.nodes[cur].parentId; d += 1; }
  return d;
};
// 节点所属一级分支在根 children 中的序号（编辑器 rainbowBranches 按此取色）
const firstBranchIdx = (doc, rootId, id) => {
  if (id === rootId) return 0;
  let cur = id;
  while (doc.nodes[cur]?.parentId && doc.nodes[cur].parentId !== rootId) cur = doc.nodes[cur].parentId;
  return doc.nodes[cur]?.parentId === rootId ? doc.nodes[rootId].children.indexOf(cur) : 0;
};
function renderSvg(doc, theme) {
  const FS = 13, LH = 19, PADX = 10, PADY = 6, GAPX = 46, GAPY = 10;
  const palette = theme[3].split(',');
  const branchColor = (idx) => palette[((idx % palette.length) + palette.length) % palette.length];
  const nodeFill = (node, depth, idx) => {
    if (node.style?.fillColor) return node.style.fillColor;
    if (depth === 0) return luminance(theme[2]) < 0.15 ? '#FFFFFF' : theme[2];
    if (depth === 1) return branchColor(idx);
    if (depth === 2) return tint(branchColor(idx), 0.85);
    return '#FFFFFF';
  };
  const nodeTextColor = (node, depth, idx) => {
    if (node.style?.textColor) return node.style.textColor;
    if (depth <= 1) return luminance(nodeFill(node, depth, idx)) > 0.6 ? '#1F2329' : '#FFFFFF';
    return '#1F2329';
  };

  const structure = LAYOUTS[doc.layout]?.[1] ?? 'map-balanced';
  // 结构 → 预览形态（几何为近似，仅用于自检层级/文字/配色；编辑器内为精确布局）
  const previewMode = (() => {
    if (structure.endsWith('-balanced') || structure === 'map-radial' || structure === 'org-radial' || structure === 'tree-radial' || structure.startsWith('matrix-')) return 'balanced';
    if (structure.endsWith('-left')) return 'left';
    if (structure.endsWith('-up')) return 'up';
    if (structure.endsWith('-down') || structure === 'org-classic' || structure === 'tree-wbs' || structure.startsWith('timeline-v') || structure === 'fishbone-bt' || structure === 'fishbone-tb') return 'down';
    return 'right';
  })();
  const mode = previewMode;
  const baseVertical = mode === 'down' || mode === 'up';

  const sizes = {};
  for (const [id, n] of Object.entries(doc.nodes)) {
    const lines = n.text.split('\n');
    const w = Math.max(...lines.map((l) => textWidth(l, n.style?.fontSize ?? FS))) + PADX * 2 + 8;
    sizes[id] = { w, h: lines.length * LH + PADY * 2 };
  }
  const markerW = (n) => (n.metadata?.markers?.length ? n.metadata.markers.length * 14 + 4 : 0);

  function layoutSubtree(id, depth, branchIdx) {
    const node = doc.nodes[id];
    const kids = node.children.filter((c) => doc.nodes[c]);
    const box = { w: sizes[id].w + markerW(node), h: sizes[id].h, leafRows: 1 };
    if (!kids.length) return box;
    const childBoxes = kids.map((c, i) => layoutSubtree(c, depth + 1, depth === 0 ? i : branchIdx));
    const vGap = baseVertical ? GAPX : GAPY;
    box.leafRows = childBoxes.reduce((s, b) => s + b.leafRows, 0);
    box.h = Math.max(box.h, childBoxes.reduce((s, b) => s + b.h, 0) + vGap * (childBoxes.length - 1));
    box.w += GAPX + Math.max(...childBoxes.map((b) => b.w));
    box.children = { kids, childBoxes };
    return box;
  }
  function place(id, depth, branchIdx, x, yTop, box, dir) {
    const node = doc.nodes[id];
    const selfH = sizes[id].h;
    const ownY = yTop + (box.h - selfH) / 2;
    const ownX = dir === 'left' ? x + (box.w - sizes[id].w - markerW(node)) : x;
    pos[id] = { x: ownX, y: ownY, w: sizes[id].w, h: selfH, depth, branchIdx, dir };
    if (!box.children) return;
    let cy = yTop;
    const vGap = baseVertical ? GAPX : GAPY;
    box.children.kids.forEach((cid, i) => {
      const cb = box.children.childBoxes[i];
      const cx = dir === 'left' ? ownX - GAPX - cb.w : ownX + sizes[id].w + markerW(node) + GAPX;
      place(cid, depth + 1, depth === 0 ? i : branchIdx, cx, cy, cb, baseVertical ? 'down' : dir);
      cy += cb.h + vGap;
    });
  }

  const pos = {};
  const rootId = doc.rootId;
  const margin = 24;
  let canvas = { w: 0, h: 0 };

  if (baseVertical) {
    // 自顶向下：叶子均分列，父节点横跨子列居中，y 按深度分行
    const colCursor = { n: 0 };
    const colRange = {};
    const COLW = 150, VGAP = 44;
    const assignCols = (id) => {
      const kids = doc.nodes[id].children.filter((c) => doc.nodes[c]);
      if (!kids.length) { colRange[id] = { a: colCursor.n, b: colCursor.n }; colCursor.n += 1; return; }
      kids.forEach(assignCols);
      colRange[id] = { a: colRange[kids[0]].a, b: colRange[kids[kids.length - 1]].b };
    };
    assignCols(rootId);
    const rowH = {};
    for (const [id, n] of Object.entries(doc.nodes)) {
      const d = nodeDepth(doc, id);
      rowH[d] = Math.max(rowH[d] ?? 0, sizes[id].h);
    }
    const rowY = {}; let acc = margin;
    const maxDepth = Math.max(...Object.keys(rowH).map(Number));
    for (let d = 0; d <= maxDepth; d++) { rowY[d] = acc; acc += rowH[d] + VGAP; }
    const totalCols = colCursor.n;
    canvas = { w: totalCols * COLW + margin * 2, h: acc - VGAP + margin };
    const colX = (id) => {
      const r = colRange[id];
      return margin + ((r.a + r.b) / 2 + 0.5) * COLW;
    };
    for (const id of Object.keys(doc.nodes)) {
      pos[id] = {
        x: colX(id) - sizes[id].w / 2,
        y: rowY[nodeDepth(doc, id)],
        w: sizes[id].w,
        h: sizes[id].h,
        depth: nodeDepth(doc, id),
        branchIdx: firstBranchIdx(doc, rootId, id),
        dir: 'down',
      };
    }
  } else if (mode === 'balanced') {
    const kids = doc.nodes[rootId].children.filter((c) => doc.nodes[c]);
    const leftKids = kids.filter((c) => doc.nodes[c].metadata?.side === 'left');
    const rightKids = kids.filter((c) => doc.nodes[c].metadata?.side !== 'left');
    // 分支颜色按根 children 的原始序号取（与编辑器 rainbowBranches 一致），非左右各自计数
    const leftBoxes = leftKids.map((c) => layoutSubtree(c, 1, kids.indexOf(c)));
    const rightBoxes = rightKids.map((c) => layoutSubtree(c, 1, kids.indexOf(c)));
    const leftW = Math.max(0, ...leftBoxes.map((b) => b.w));
    const rightW = Math.max(0, ...rightBoxes.map((b) => b.w));
    const rootBox = layoutSubtree(rootId, 0, 0);
    canvas.w = leftW + GAPX + rootBox.w + GAPX + rightW + margin * 2;
    const lTotal = leftBoxes.reduce((s, b) => s + b.h + GAPY, -GAPY);
    const rTotal = rightBoxes.reduce((s, b) => s + b.h + GAPY, -GAPY);
    canvas.h = Math.max(rootBox.h, lTotal, rTotal) + margin * 2;
    const midY = margin + (canvas.h - margin * 2) / 2;
    pos[rootId] = { x: margin + leftW + GAPX, y: midY - sizes[rootId].h / 2, w: sizes[rootId].w, h: sizes[rootId].h, depth: 0, branchIdx: 0, dir: 'right' };
    let y = margin + Math.max(0, (canvas.h - margin * 2 - lTotal) / 2);
    leftKids.forEach((cid) => {
      place(cid, 1, kids.indexOf(cid), margin, y, leftBoxes[leftKids.indexOf(cid)], 'left');
      y += leftBoxes[leftKids.indexOf(cid)].h + GAPY;
    });
    y = margin + Math.max(0, (canvas.h - margin * 2 - rTotal) / 2);
    rightKids.forEach((cid) => {
      place(cid, 1, kids.indexOf(cid), margin + leftW + GAPX + rootBox.w + GAPX, y, rightBoxes[rightKids.indexOf(cid)], 'right');
      y += rightBoxes[rightKids.indexOf(cid)].h + GAPY;
    });
  } else {
    const rootBox = layoutSubtree(rootId, 0, 0);
    canvas.w = rootBox.w + margin * 2;
    canvas.h = rootBox.h + margin * 2;
    place(rootId, 0, 0, margin, margin, rootBox, baseVertical ? 'down' : 'right');
  }

  // 镜像：左上布局先按右下排版再整体翻转，保证与编辑器方向一致
  if (mode === 'left') {
    for (const p of Object.values(pos)) p.x = canvas.w - p.x - p.w;
    for (const [id, p] of Object.entries(pos)) if (doc.nodes[id].parentId) p.dir = 'left';
  } else if (mode === 'up') {
    for (const p of Object.values(pos)) p.y = canvas.h - p.y - p.h;
  }

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(canvas.w)}" height="${Math.ceil(canvas.h)}" viewBox="0 0 ${Math.ceil(canvas.w)} ${Math.ceil(canvas.h)}">`, `<rect width="${Math.ceil(canvas.w)}" height="${Math.ceil(canvas.h)}" fill="#FFFFFF"/>`];

  // 连线层（节点下方）
  for (const [id, p] of Object.entries(pos)) {
    const node = doc.nodes[id];
    if (!node.parentId || !pos[node.parentId]) continue;
    const pp = pos[node.parentId];
    let d;
    if (mode === 'up') {
      const x1 = pp.x + pp.w / 2, y1 = pp.y, x2 = p.x + p.w / 2, y2 = p.y + p.h;
      const my = (y1 + y2) / 2;
      d = `M${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
    } else if (baseVertical) {
      const x1 = pp.x + pp.w / 2, y1 = pp.y + pp.h, x2 = p.x + p.w / 2, y2 = p.y;
      const my = (y1 + y2) / 2;
      d = `M${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
    } else {
      const x1 = p.dir === 'left' ? pp.x : pp.x + pp.w;
      const y1 = pp.y + pp.h / 2;
      const x2 = p.dir === 'left' ? p.x + p.w : p.x;
      const y2 = p.y + p.h / 2;
      const mx = (x1 + x2) / 2;
      d = `M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
    }
    const color = nodeFill(node, p.depth, p.branchIdx);
    parts.push(`<path d="${d}" fill="none" stroke="${color === '#FFFFFF' ? '#9CA3AF' : color}" stroke-width="2"/>`);
  }

  // 节点层
  for (const [id, p] of Object.entries(pos)) {
    const node = doc.nodes[id];
    const fill = nodeFill(node, p.depth, p.branchIdx);
    const tcol = nodeTextColor(node, p.depth, p.branchIdx);
    const borderNone = (node.style?.borderStyle ?? (p.depth >= 3 ? 'none' : 'solid')) === 'none';
    const shape = node.style?.shape;
    if (shape === 'hexagon') {
      const k = 8;
      parts.push(`<polygon points="${p.x + k},${p.y} ${p.x + p.w - k},${p.y} ${p.x + p.w},${p.y + p.h / 2} ${p.x + p.w - k},${p.y + p.h} ${p.x + k},${p.y + p.h} ${p.x},${p.y + p.h / 2}" fill="${fill}" stroke="${borderNone ? 'none' : fill === '#FFFFFF' ? '#D1D5DB' : fill}"/>`);
    } else if (fill !== 'transparent') {
      const rx = shape === 'ellipse' || shape === 'pill' ? p.h / 2 : p.depth === 0 ? Math.min(16, p.h / 2) : 10;
      parts.push(`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${rx}" fill="${fill}" stroke="${borderNone ? 'none' : fill === '#FFFFFF' ? '#D1D5DB' : fill}" stroke-width="1"/>`);
    } else {
      parts.push(`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="6" fill="none" stroke="${borderNone ? 'none' : '#D1D5DB'}" stroke-width="1"/>`);
    }
    const lines = node.text.split('\n');
    const fs = node.style?.fontSize ?? FS;
    lines.forEach((line, i) => {
      const ty = p.y + p.h / 2 + (i - (lines.length - 1) / 2) * LH + fs * 0.36;
      parts.push(`<text x="${p.x + PADX}" y="${ty}" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="${fs}"${node.style?.fontWeight === 'bold' || p.depth === 0 ? ' font-weight="bold"' : ''} fill="${tcol}">${esc(line)}</text>`);
    });
    (node.metadata?.markers ?? []).forEach((m, i) => {
      const mx = p.x + p.w + 8 + i * 14;
      const my = p.y + p.h / 2;
      if (m.type === 'emoji') {
        parts.push(`<text x="${mx}" y="${my + 5}" font-size="13">${esc(m.value)}</text>`);
      } else {
        const c = m.color ?? (m.type === 'priority' ? PRIORITY_BADGE_COLORS[m.level - 1] ?? 'red' : 'blue');
        parts.push(`<circle cx="${mx + 5}" cy="${my}" r="4.5" fill="${MARKER_HEX[c] ?? '#0090FF'}"/>`);
      }
    });
  }
  parts.push('</svg>');
  return parts.join('\n');
}

// ── 主流程 ──
function main() {
  const args = process.argv.slice(2);
  const specFile = args[0];
  if (!specFile || !fs.existsSync(specFile)) {
    console.error('用法: node mindmap_convert.mjs <spec.json> [-o 输出目录]');
    process.exit(1);
  }
  const outIx = args.indexOf('-o');
  const outDir = outIx >= 0 ? args[outIx + 1] : path.dirname(path.resolve(specFile));

  let spec;
  try {
    spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  } catch (e) {
    console.error(`spec 不是合法 JSON: ${e.message}`);
    process.exit(1);
  }
  if (typeof spec !== 'object' || spec === null || Array.isArray(spec) || typeof spec.root !== 'object' || spec.root === null) {
    console.error('spec 缺少 root 树，最外层应为 {title?, layout?, themeId?, canvasOptions?, root:{text, children?}}');
    process.exit(1);
  }

  let themeId = spec.themeId ?? 'classic';
  if (!THEMES[themeId]) {
    warn(`themeId="${themeId}" 未知，回退 classic（合法 id 见 references/themes-layouts.md）`);
    themeId = 'classic';
  }
  let layoutId = spec.layout ?? DEFAULT_LAYOUT;
  if (LEGACY_LAYOUT_MAP[layoutId]) layoutId = LEGACY_LAYOUT_MAP[layoutId];
  if (!LAYOUTS[layoutId]) {
    warn(`layout="${spec.layout}" 未知，回退 ${DEFAULT_LAYOUT}（合法 id 见 references/themes-layouts.md）`);
    layoutId = DEFAULT_LAYOUT;
  }

  let built;
  try {
    built = buildFlat(spec.root, layoutId);
  } catch (e) {
    console.error(`spec 结构错误: ${e.message}`);
    process.exit(2);
  }

  const now = Date.now();
  const presetDefaults = LAYOUTS[layoutId][2];
  const summaries = cleanSummaries(spec.summaries, built.keyMap).filter((s) => {
    const n = built.nodes[s.parentId]?.children.length ?? 0;
    if (s.range[1] >= n) {
      warn(`summaries "${s.text}" range=${JSON.stringify(s.range)} 超出父节点子项数 ${n}，已忽略`);
      return false;
    }
    return true;
  });
  const styleOverrides = cleanStyleOverrides(spec.styleOverrides);
  const document = {
    id: `mindmap-template-${built.rootId}`,
    title: typeof spec.title === 'string' && spec.title.trim() ? spec.title.trim() : spec.root.text,
    rootId: built.rootId,
    nodes: built.nodes,
    themeId,
    ...(styleOverrides ? { styleOverrides } : {}),
    ...(presetDefaults && Object.keys(presetDefaults).length ? { layoutDefaults: { ...presetDefaults } } : {}),
    ...(spec.canvasOptions && typeof spec.canvasOptions === 'object' && !Array.isArray(spec.canvasOptions)
      ? { canvasOptions: Object.fromEntries(Object.entries(spec.canvasOptions).filter(([k, v]) => CANVAS_OPTION_KEYS.includes(k) && v !== undefined)) }
      : {}),
    layout: layoutId,
    viewport: { x: 0, y: 0, scale: 1 },
    relations: cleanRelations(spec.relations, built.keyMap),
    boundaries: cleanBoundaries(spec.boundaries, built.keyMap),
    summaries,
    createdAt: now,
    updatedAt: now,
  };

  // 终检：rootId 必须在 nodes 中、children/parentId 双向一致（对齐 parseMindMapDocument 的硬校验）
  if (!document.nodes[document.rootId]) {
    console.error('内部错误: rootId 不在 nodes 中');
    process.exit(2);
  }
  for (const [id, n] of Object.entries(document.nodes)) {
    for (const c of n.children) {
      if (!document.nodes[c] || document.nodes[c].parentId !== id) {
        console.error(`内部错误: 节点 ${id} 的 child ${c} 不一致`);
        process.exit(2);
      }
    }
  }

  fs.mkdirSync(outDir, { recursive: true });
  const base = path.basename(specFile).replace(/\.json$/i, '');
  const efmPath = path.join(outDir, `${base}.efm.json`);
  const docPath = path.join(outDir, `${base}.document.json`);
  const svgPath = path.join(outDir, `${base}.svg`);
  fs.writeFileSync(efmPath, JSON.stringify({ format: 'eflink-mindmap', version: 1, document }, null, 2) + '\n');
  fs.writeFileSync(docPath, JSON.stringify(document, null, 2) + '\n');
  fs.writeFileSync(svgPath, renderSvg(document, THEMES[themeId]));

  console.log(`OK ${base}: 节点 ${built.total}，layout=${layoutId}，theme=${themeId}(${THEMES[themeId][0]})`);
  console.log(`  ${efmPath}`);
  console.log(`  ${docPath}`);
  console.log(`  ${svgPath}`);
  if (warnings.length) {
    console.error(`⚠ ${warnings.length} 条警告:`);
    for (const w of warnings) console.error(`  - ${w}`);
  }
}

main();
