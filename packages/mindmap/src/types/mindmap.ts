// 思维导图领域类型定义

export type NodeShape = 'rounded' | 'ellipse' | 'rectangle' | 'hexagon' | 'pill';
export type FontWeight = 'normal' | 'bold';

export type LayoutStructureId =
  | 'map-balanced'
  | 'map-right'
  | 'logic-right'
  | 'brace-right'
  | 'org-down'
  | 'tree-right'
  | 'timeline-h'
  | 'timeline-v'
  | 'fishbone-right'
  | 'matrix-2x2';

/** 文档 layout 字段：预设 id（兼容历史 mindmap/logic/tree 需经 normalizeLayoutId） */
export type LayoutPresetId = string;
/** @deprecated 同 LayoutPresetId */
export type LayoutType = LayoutPresetId;

export interface LayoutDefaults {
  shape?: NodeShape;
  borderStyle?: BorderStyle;
  borderWidth?: number;
  connectorType?: ConnectorLineType;
  connectorWidth?: number;
  connectorEnd?: ConnectorEnd;
  handDrawn?: boolean;
  rootDecoration?: 'none' | 'heart' | 'quote';
}

export type BorderStyle = 'solid' | 'dashed' | 'none';
export type TextAlign = 'left' | 'center' | 'right';
export type ConnectorLineType = 'curve' | 'straight' | 'elbow' | 'brace';
export type ConnectorEnd = 'none' | 'arrow' | 'dot';

export interface NodeStyle {
  fillColor?: string;
  textColor?: string;
  borderColor?: string;
  fontSize?: number;
  fontWeight?: FontWeight;
  shape?: NodeShape;
  borderWidth?: number;
  borderStyle?: BorderStyle;
  fontFamily?: string;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textAlign?: TextAlign;
  /** 固定宽度（px）；undefined 表示自动（适合） */
  fixedWidth?: number;
  connectorType?: ConnectorLineType;
  connectorWidth?: number;
  connectorColor?: string;
  connectorEnd?: ConnectorEnd;
}

/** 标记通用色板（标签/旗帜/星星/人像共用，对齐 XMind 七色） */
export type MarkerColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray';

/**
 * 节点标记：同一分组互斥（setMarker 按组替换），点击已应用的标记再次切换即移除。
 * progress 为旧版字段，仅兼容历史文档渲染，新写入统一用 task。
 */
export type Marker =
  | { type: 'label'; color: MarkerColor }
  | { type: 'priority'; level: 1 | 2 | 3 | 4 | 5 | 6 | 7 }
  | { type: 'task'; state: 'start' | 'p25' | 'p50' | 'p75' | 'p100' | 'done' }
  | { type: 'flag'; color: MarkerColor }
  | { type: 'star'; color: MarkerColor }
  | { type: 'people'; color: MarkerColor }
  | { type: 'emoji'; value: string }
  | { type: 'sticker'; value: string; /** 大号贴纸（插画 Tab 已移除，仅为兼容历史文档保留渲染） */ large?: boolean }
  | { type: 'progress'; percent: 0 | 25 | 50 | 75 | 100 };

export interface NodeMetadata {
  image?: string;
  link?: string;
  note?: string;
  labels?: string[];
  markers?: Marker[];
  collapsed?: boolean;
  /** 一级分支左右归属（仅根的直接子节点有意义）：布局按此稳定分侧，不随节点尺寸重排 */
  side?: 'left' | 'right';
}

// 扁平节点：O(1) 查找，children 为有序子节点 id
export interface MindMapNode {
  id: string;
  parentId: string | null;
  children: string[];
  text: string;
  style?: NodeStyle;
  metadata?: NodeMetadata;
}

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export interface ThemeConfig {
  name: string;
  colors: { primary: string; branches: string[]; background: string };
  node: {
    shape: NodeShape;
    padding: [number, number];
    fontSize: number;
    fontWeight: FontWeight;
  };
  connector: { type: 'curve' | 'straight'; width: number };
}

export interface Relation {
  id: string;
  from: string;
  to: string;
  label?: string;
  style?: { color: string; width: number };
}

export interface Boundary {
  id: string;
  nodeIds: string[];
  title?: string;
  style?: { color: string; fill: string };
}

export interface Summary {
  id: string;
  parentId: string;
  range: [number, number];
  text: string;
}

export interface CanvasOptions {
  /** mindmap 布局时左右子树高度尽量均衡；默认 true */
  balanced: boolean;
  /** 缩小节点间距；默认 false */
  compact: boolean;
  /** 同级节点统一为该层最大宽度；默认 false */
  unifySiblingWidth: boolean;
  /** 一级分支多色；false 时分支使用主题 primary 衍生单色；默认 true */
  rainbowBranches: boolean;
  /** 选中节点流动动画开关；默认 true */
  flowAnimation?: boolean;
  /** 画布背景；undefined 时固定白底（与配色方案解耦，对齐 XMind） */
  background?: string;
  /** 全局默认字体；undefined 用主题/系统默认 */
  fontFamily?: string;
  /** 全局分支线宽；undefined 用 theme.connector.width */
  branchLineWidth?: number;
}

export interface MindMapDocument {
  id: string;
  title: string;
  rootId: string;
  nodes: Record<string, MindMapNode>;
  themeId: string;
  styleOverrides?: Partial<ThemeConfig>;
  canvasOptions?: CanvasOptions;
  layout: LayoutType;
  layoutDefaults?: LayoutDefaults;
  viewport: ViewportState;
  relations: Relation[];
  boundaries: Boundary[];
  summaries: Summary[];
  createdAt: number;
  updatedAt: number;
}

// 布局输出
export interface Box {
  x: number; // 中心点
  y: number;
  width: number;
  height: number;
}

export interface ConnectorPath {
  id: string;
  from: string;
  to: string;
  d: string;
  color: string;
  /** 布局已知的连线方向；straight/elbow 重建路径时优先于几何推断 */
  dir?: 'left' | 'right' | 'down' | 'up';
}

export interface LayoutResult {
  positions: Record<string, Box>;
  connectors: ConnectorPath[];
  // 注意：此处复用 Box 结构，但 x/y 语义是内容包围盒的左上角（非节点的中心点）
  contentBounds: Box;
}

export interface NodeSize {
  width: number;
  height: number;
  lines: string[];
}

export type SizeMap = Record<string, NodeSize>;

export interface DropPreview {
  targetId: string;
  zone: 'child' | 'before' | 'after';
}

export interface DocumentMeta {
  id: string;
  title: string;
  updatedAt: number;
}
