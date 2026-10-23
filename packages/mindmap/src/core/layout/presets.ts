import type {
  LayoutDefaults,
  LayoutPresetId,
  LayoutStructureId,
} from '../../types/mindmap';

export type LayoutCategory =
  | 'mindmap'
  | 'logic'
  | 'brace'
  | 'org'
  | 'tree'
  | 'timeline'
  | 'fishbone'
  | 'matrix';

export interface LayoutPreset {
  id: LayoutPresetId;
  category: LayoutCategory;
  categoryLabel: string;
  label: string;
  structure: LayoutStructureId;
  defaults: LayoutDefaults;
  ready: boolean;
}

export const DEFAULT_LAYOUT_PRESET_ID = 'map-balanced-curve' as const;

const CATEGORY_LABELS: Record<LayoutCategory, string> = {
  mindmap: '思维导图',
  logic: '逻辑图',
  brace: '括号图',
  org: '组织结构图',
  tree: '树形图',
  timeline: '时间轴',
  fishbone: '鱼骨图',
  matrix: '矩阵图',
};

const LEGACY_LAYOUT_MAP: Record<string, LayoutPresetId> = {
  mindmap: 'map-balanced-curve',
  logic: 'logic-right',
  tree: 'org-down',
  // 旧逻辑图/组织图/树形图/时间轴/矩阵预设：同一结构的换肤项合并到主结构
  'logic-right-curve': 'logic-right',
  'logic-right-elbow': 'logic-right',
  'logic-right-line': 'logic-right',
  'logic-right-bubble': 'logic-right',
  'logic-heart-root': 'logic-right',
  'logic-quote': 'logic-right',
  'logic-hand-1': 'logic-right',
  'logic-hand-2': 'logic-right',
  'logic-hand-3': 'logic-right',
  'org-down-rounded': 'org-down',
  'org-down-compact': 'org-down',
  'org-down-hex': 'org-down',
  'org-down-elbow': 'org-down',
  'org-down-fill': 'org-down',
  'org-down-curve': 'org-down',
  'tree-right-1': 'tree-right',
  'tree-right-2': 'tree-right',
  'tree-right-3': 'tree-right',
  'tree-right-4': 'tree-right',
  'tree-right-5': 'tree-right',
  'tree-right-6': 'tree-right',
  'timeline-h-rect': 'timeline-h',
  'timeline-h-circle': 'timeline-h',
  'timeline-h-root': 'timeline-h',
  'timeline-h-arrow': 'timeline-h',
  'timeline-v-alt': 'timeline-v',
  'timeline-v-capsule': 'timeline-v',
  'matrix-2x2-1': 'matrix-2x2',
  'matrix-2x2-2': 'matrix-2x2',
  'matrix-2x2-3': 'matrix-2x2',
  'fishbone-1': 'fishbone-classic',
  'fishbone-2': 'fishbone-6m',
  'fishbone-3': 'fishbone-comb',
  'fishbone-right': 'fishbone-classic',
};

function preset(
  id: LayoutPresetId,
  category: LayoutCategory,
  label: string,
  structure: LayoutStructureId,
  defaults: LayoutDefaults,
  ready = true,
): LayoutPreset {
  return {
    id,
    category,
    categoryLabel: CATEGORY_LABELS[category],
    label,
    structure,
    defaults,
    ready,
  };
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  // mindmap
  preset('map-balanced-curve', 'mindmap', '平衡曲线', 'map-balanced', {
    shape: 'rounded',
    connectorType: 'curve',
  }),
  preset('map-balanced-elbow', 'mindmap', '平衡折线', 'map-balanced', {
    shape: 'rounded',
    connectorType: 'elbow',
  }),
  preset('map-balanced-bubble', 'mindmap', '平衡气泡', 'map-balanced', {
    shape: 'ellipse',
    connectorType: 'curve',
  }),
  preset('map-right-curve', 'mindmap', '右侧曲线', 'map-right', {
    shape: 'rounded',
    connectorType: 'curve',
  }),
  preset('map-right-elbow', 'mindmap', '右侧折线', 'map-right', {
    shape: 'rounded',
    connectorType: 'elbow',
  }),
  preset('map-right-bubble', 'mindmap', '右侧气泡', 'map-right', {
    shape: 'ellipse',
    connectorType: 'curve',
  }),
  preset('map-org-style', 'mindmap', '组织风格', 'org-down', {
    shape: 'rounded',
    connectorType: 'elbow',
  }),
  preset(
    'map-brace-entry',
    'mindmap',
    '括号入口',
    'brace-right',
    { shape: 'rounded', connectorType: 'brace' },
  ),
  preset('map-radial-placeholder', 'mindmap', '径向占位', 'map-balanced', {
    shape: 'ellipse',
    connectorType: 'curve',
  }),
  // logic
  preset('logic-right', 'logic', '向右逻辑', 'logic-right', {
    shape: 'rounded',
    connectorType: 'elbow',
  }),
  preset('logic-left', 'logic', '向左逻辑', 'logic-left', {
    shape: 'rounded',
    connectorType: 'elbow',
  }),
  preset('logic-down', 'logic', '向下逻辑', 'logic-down', {
    shape: 'rounded',
    connectorType: 'elbow',
  }),
  preset('logic-up', 'logic', '向上逻辑', 'logic-up', {
    shape: 'rounded',
    connectorType: 'elbow',
  }),
  preset('logic-balanced', 'logic', '双向逻辑', 'logic-balanced', {
    shape: 'rounded',
    connectorType: 'elbow',
  }),
  preset('logic-outline', 'logic', '大纲逻辑', 'logic-outline', {
    shape: 'rounded',
    borderStyle: 'none',
    connectorType: 'straight',
  }),
  // brace
  preset(
    'brace-solid',
    'brace',
    '实线括号',
    'brace-right',
    { shape: 'rounded', connectorType: 'brace' },
  ),
  preset(
    'brace-line',
    'brace',
    '线条括号',
    'brace-right',
    { borderStyle: 'none', connectorType: 'brace' },
  ),
  preset(
    'brace-dashed',
    'brace',
    '虚线括号',
    'brace-right',
    { borderStyle: 'dashed', connectorType: 'brace' },
  ),
  preset(
    'brace-pill',
    'brace',
    '胶囊括号',
    'brace-right',
    { shape: 'pill', connectorType: 'brace' },
  ),
  preset(
    'brace-hex',
    'brace',
    '六边形括号',
    'brace-right',
    { shape: 'hexagon', connectorType: 'brace' },
  ),
  preset(
    'brace-bubble',
    'brace',
    '气泡括号',
    'brace-right',
    { shape: 'ellipse', connectorType: 'brace' },
  ),
  // org
  preset('org-down', 'org', '向下组织', 'org-down', {
    shape: 'rounded',
    connectorType: 'elbow',
  }),
  preset('org-up', 'org', '向上组织', 'org-up', {
    shape: 'rounded',
    connectorType: 'elbow',
  }),
  preset('org-right', 'org', '向右组织', 'org-right', {
    shape: 'rounded',
    connectorType: 'elbow',
  }),
  preset('org-left', 'org', '向左组织', 'org-left', {
    shape: 'rounded',
    connectorType: 'elbow',
  }),
  preset('org-balanced', 'org', '双向组织', 'org-balanced', {
    shape: 'rounded',
    connectorType: 'elbow',
  }),
  preset('org-radial', 'org', '环形组织', 'org-radial', {
    shape: 'rounded',
    connectorType: 'straight',
  }),
  // tree
  preset('tree-right', 'tree', '向右树形', 'tree-right', {
    shape: 'rounded',
    connectorType: 'curve',
  }),
  preset('tree-left', 'tree', '向左树形', 'tree-left', {
    shape: 'rounded',
    connectorType: 'curve',
  }),
  preset('tree-down', 'tree', '向下树形', 'tree-down', {
    shape: 'rounded',
    connectorType: 'curve',
  }),
  preset('tree-up', 'tree', '向上树形', 'tree-up', {
    shape: 'rounded',
    connectorType: 'curve',
  }),
  preset('tree-balanced', 'tree', '双向树形', 'tree-balanced', {
    shape: 'rounded',
    connectorType: 'curve',
  }),
  preset('tree-radial', 'tree', '环形树形', 'tree-radial', {
    shape: 'rounded',
    connectorType: 'curve',
  }),
  // timeline
  preset('timeline-h', 'timeline', '横向·上下交替', 'timeline-h', {
    shape: 'rounded',
  }),
  preset('timeline-h-top', 'timeline', '横向·上方单侧', 'timeline-h-top', {
    shape: 'rounded',
  }),
  preset('timeline-h-bottom', 'timeline', '横向·下方单侧', 'timeline-h-bottom', {
    shape: 'rounded',
  }),
  preset('timeline-v', 'timeline', '纵向·左右交替', 'timeline-v', {
    shape: 'rounded',
  }),
  preset('timeline-v-left', 'timeline', '纵向·左侧单侧', 'timeline-v-left', {
    shape: 'rounded',
  }),
  preset('timeline-v-right', 'timeline', '纵向·右侧单侧', 'timeline-v-right', {
    shape: 'rounded',
  }),
  // fishbone
  preset('fishbone-classic', 'fishbone', '经典原因型', 'fishbone-rl', { shape: 'rectangle' }),
  preset('fishbone-reverse', 'fishbone', '反向对策型', 'fishbone-lr', { shape: 'rectangle' }),
  preset('fishbone-vertical', 'fishbone', '纵向·头下', 'fishbone-bt', { shape: 'rectangle' }),
  preset('fishbone-vertical-up', 'fishbone', '纵向·头上', 'fishbone-tb', { shape: 'rectangle' }),
  preset('fishbone-6m', 'fishbone', '6M 对称型', 'fishbone-6m', { shape: 'rectangle' }),
  preset('fishbone-comb', 'fishbone', '梳状整理型', 'fishbone-comb', { shape: 'rectangle' }),
  // matrix
  preset('matrix-2x2', 'matrix', '2×2 四象限', 'matrix-2x2', {
    shape: 'rounded',
    connectorType: 'elbow',
  }),
  preset('matrix-2x3', 'matrix', '2×3 六宫格', 'matrix-2x3', {
    shape: 'rectangle',
    connectorType: 'elbow',
  }),
  preset('matrix-3x2', 'matrix', '3×2 六宫格', 'matrix-3x2', {
    shape: 'rectangle',
    connectorType: 'elbow',
  }),
  preset('matrix-3x3', 'matrix', '3×3 九宫格', 'matrix-3x3', {
    shape: 'rectangle',
    connectorType: 'elbow',
  }),
  preset('matrix-1x2', 'matrix', '两栏对比', 'matrix-1x2', {
    shape: 'rounded',
    connectorType: 'elbow',
  }),
  preset('matrix-1x3', 'matrix', '三栏对比', 'matrix-1x3', {
    shape: 'rounded',
    connectorType: 'elbow',
  }),
];

const PRESET_BY_ID = new Map(LAYOUT_PRESETS.map((p) => [p.id, p]));

export function normalizeLayoutId(raw: string): LayoutPresetId {
  if (LEGACY_LAYOUT_MAP[raw]) return LEGACY_LAYOUT_MAP[raw];
  if (PRESET_BY_ID.has(raw)) return raw;
  return DEFAULT_LAYOUT_PRESET_ID;
}

export function getPreset(id: string): LayoutPreset | undefined {
  return PRESET_BY_ID.get(normalizeLayoutId(id));
}

/** 引擎/旧 UI 用的粗粒度模式（向右树/括号/时间轴/鱼骨/矩阵均归 logic） */
export type ResolvedLayoutMode = 'map-balanced' | 'map-right' | 'logic' | 'org-down';

export function resolveLayoutMode(layout: string): ResolvedLayoutMode {
  const structure = getPreset(layout)?.structure ?? 'map-balanced';
  switch (structure) {
    case 'map-balanced':
      return 'map-balanced';
    case 'map-right':
      return 'map-right';
    case 'org-down':
    case 'org-up':
    case 'org-right':
    case 'org-left':
    case 'org-balanced':
    case 'org-radial':
      return 'org-down';
    default:
      return 'logic';
  }
}

export function isMindmapLayout(layout: string): boolean {
  const mode = resolveLayoutMode(layout);
  return mode === 'map-balanced' || mode === 'map-right';
}

/** 旧三布局下拉框值（Task 3 前 UI 仍用 legacy 选项） */
export type LegacyLayoutValue = 'mindmap' | 'logic' | 'tree';

export function toLegacyLayoutValue(layout: string): LegacyLayoutValue {
  switch (resolveLayoutMode(layout)) {
    case 'org-down':
      return 'tree';
    case 'logic':
      return 'logic';
    default:
      return 'mindmap';
  }
}

export function legacyLayoutLabel(layout: string): string {
  return getPreset(layout)?.categoryLabel ?? toLegacyLayoutValue(layout);
}
