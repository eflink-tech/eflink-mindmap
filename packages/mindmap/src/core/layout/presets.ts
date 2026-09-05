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
  logic: 'logic-right-curve',
  tree: 'org-down-rounded',
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
  preset('logic-right-curve', 'logic', '逻辑曲线', 'logic-right', {
    shape: 'rounded',
    connectorType: 'curve',
  }),
  preset('logic-right-elbow', 'logic', '逻辑折线', 'logic-right', {
    shape: 'rounded',
    connectorType: 'elbow',
  }),
  preset('logic-right-line', 'logic', '逻辑线条', 'logic-right', {
    borderStyle: 'none',
    connectorType: 'curve',
  }),
  preset('logic-right-bubble', 'logic', '逻辑气泡', 'logic-right', {
    shape: 'ellipse',
    connectorType: 'curve',
  }),
  preset('logic-heart-root', 'logic', '心形根节点', 'logic-right', {
    rootDecoration: 'heart',
  }),
  preset('logic-quote', 'logic', '引语根节点', 'logic-right', {
    rootDecoration: 'quote',
  }),
  preset('logic-hand-1', 'logic', '手绘 1', 'logic-right', { handDrawn: true }),
  preset('logic-hand-2', 'logic', '手绘 2', 'logic-right', { handDrawn: true }),
  preset('logic-hand-3', 'logic', '手绘 3', 'logic-right', { handDrawn: true }),
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
  preset('org-down-rounded', 'org', '圆角组织', 'org-down', {
    shape: 'rounded',
    connectorType: 'elbow',
  }),
  preset('org-down-compact', 'org', '紧凑组织', 'org-down', {
    shape: 'rounded',
    connectorType: 'elbow',
  }),
  preset('org-down-hex', 'org', '六边形组织', 'org-down', {
    shape: 'hexagon',
    connectorType: 'elbow',
  }),
  preset('org-down-elbow', 'org', '折线组织', 'org-down', {
    shape: 'rounded',
    connectorType: 'elbow',
  }),
  preset('org-down-fill', 'org', '填充组织', 'org-down', {
    shape: 'rectangle',
    connectorType: 'elbow',
  }),
  preset('org-down-curve', 'org', '曲线组织', 'org-down', {
    shape: 'rounded',
    connectorType: 'curve',
  }),
  // tree
  preset('tree-right-1', 'tree', '树形 1', 'tree-right', { connectorType: 'curve' }),
  preset('tree-right-2', 'tree', '树形 2', 'tree-right', { connectorType: 'elbow' }),
  preset('tree-right-3', 'tree', '树形 3', 'tree-right', { shape: 'ellipse', connectorType: 'curve' }),
  preset('tree-right-4', 'tree', '树形 4', 'tree-right', { connectorType: 'straight' }),
  preset('tree-right-5', 'tree', '树形 5', 'tree-right', { connectorType: 'elbow' }),
  preset('tree-right-6', 'tree', '树形 6', 'tree-right', { shape: 'pill', connectorType: 'curve' }),
  // timeline
  preset('timeline-h-rect', 'timeline', '横向矩形', 'timeline-h', { shape: 'rectangle' }),
  preset('timeline-h-circle', 'timeline', '横向圆形', 'timeline-h', { shape: 'ellipse' }),
  preset('timeline-h-root', 'timeline', '横向根节点', 'timeline-h', { shape: 'rounded' }),
  preset('timeline-v-alt', 'timeline', '纵向交替', 'timeline-v', { shape: 'rounded' }),
  preset('timeline-h-arrow', 'timeline', '横向箭头', 'timeline-h', { connectorEnd: 'arrow' }),
  preset('timeline-v-capsule', 'timeline', '纵向胶囊', 'timeline-v', { shape: 'pill' }),
  // fishbone
  preset('fishbone-1', 'fishbone', '鱼骨 1', 'fishbone-right', { shape: 'rectangle' }),
  preset('fishbone-2', 'fishbone', '鱼骨 2', 'fishbone-right', { shape: 'rectangle' }),
  preset('fishbone-3', 'fishbone', '鱼骨 3', 'fishbone-right', { shape: 'hexagon' }),
  // matrix
  preset('matrix-2x2-1', 'matrix', '矩阵 1', 'matrix-2x2', { shape: 'rounded' }),
  preset('matrix-2x2-2', 'matrix', '矩阵 2', 'matrix-2x2', { shape: 'rectangle' }),
  preset('matrix-2x2-3', 'matrix', '矩阵 3', 'matrix-2x2', { shape: 'ellipse' }),
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
    case 'logic-right':
    case 'tree-right':
    case 'brace-right':
    case 'timeline-h':
    case 'timeline-v':
    case 'fishbone-right':
    case 'matrix-2x2':
      return 'logic';
    case 'org-down':
      return 'org-down';
    default:
      return 'map-balanced';
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
