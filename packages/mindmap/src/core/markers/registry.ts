// 标记注册表：标记分组的唯一数据源，面板（SVG）与画布（Konva）渲染共用。
// 图标路径统一在 24×24 坐标系内描述，渲染端按目标尺寸等比缩放。
import type { Marker, MarkerColor } from '../../types/mindmap';

/** 七色通用色板（标签/优先级/旗帜/星星/人像共用，对齐 XMind） */
export const MARKER_COLORS: MarkerColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'];

export const MARKER_COLOR_HEX: Record<MarkerColor, string> = {
  red: '#EF5350',
  orange: '#FFA726',
  yellow: '#FFCA28',
  green: '#66BB6A',
  blue: '#42A5F5',
  purple: '#AB47BC',
  gray: '#BDBDBD',
};

/** 任务组固定绿色（对齐 XMind 任务进度标记） */
export const TASK_COLOR = MARKER_COLOR_HEX.green;

const COLOR_NAME_CN: Record<MarkerColor, string> = {
  red: '红',
  orange: '橙',
  yellow: '黄',
  green: '绿',
  blue: '蓝',
  purple: '紫',
  gray: '灰',
};

export function colorLabel(color: MarkerColor): string {
  return COLOR_NAME_CN[color];
}

/** 优先级 1-7 依次取色板色 */
export function priorityColor(level: 1 | 2 | 3 | 4 | 5 | 6 | 7): string {
  return MARKER_COLOR_HEX[MARKER_COLORS[level - 1]];
}

export type MarkerGroupId =
  | 'label'
  | 'priority'
  | 'task'
  | 'flag'
  | 'star'
  | 'people'
  | 'symbol'
  | 'sticker';

/** 标记所属分组：同组互斥（setMarker 按组替换）；旧版 progress 并入任务组 */
export function groupOf(marker: Marker): MarkerGroupId {
  switch (marker.type) {
    case 'task':
    case 'progress':
      return 'task';
    case 'emoji':
      return 'symbol';
    default:
      return marker.type;
  }
}

/** 标记完全相等（同一图标） */
export function markerEq(a: Marker, b: Marker): boolean {
  return markerId(a) === markerId(b);
}

/** 稳定字符串 id：React key、测量缓存 key、状态对比共用 */
export function markerId(marker: Marker): string {
  switch (marker.type) {
    case 'label':
    case 'flag':
    case 'star':
    case 'people':
      return `${marker.type}-${marker.color}`;
    case 'priority':
      return `priority-${marker.level}`;
    case 'task':
      return `task-${marker.state}`;
    case 'progress':
      return `progress-${marker.percent}`;
    case 'emoji':
      return `emoji-${marker.value}`;
    case 'sticker':
      return `sticker-${marker.value}${marker.large ? '-lg' : ''}`;
  }
}

// ---------- 图标路径（24×24 坐标系） ----------

/** 实心圆（标签）/ 描边圆（任务外圈）共用 */
export const CIRCLE_PATH = 'M12 2a10 10 0 1 1 0 20a10 10 0 1 1 0-20z';

/** 任务饼形进度（圆心 12,12 半径 8，自 12 点方向顺时针） */
export const TASK_PIE: Record<'p25' | 'p50' | 'p75' | 'p100', string> = {
  p25: 'M12 12 L12 4 A8 8 0 0 1 20 12 Z',
  p50: 'M12 12 L12 4 A8 8 0 0 1 12 20 Z',
  p75: 'M12 12 L12 4 A8 8 0 1 1 4 12 Z',
  p100: CIRCLE_PATH,
};

/** 任务开始：圆内播放三角 */
export const TASK_PLAY_PATH = 'M9.5 7.2 L16.8 12 L9.5 16.8 Z';

/** 任务完成：对勾（描边） */
export const TASK_CHECK_PATH = 'M7 12.6 L10.6 16.2 L17 8.6';

/** 旗帜：飘动旗面（填充）+ 旗杆（描边） */
export const FLAG_BANNER_PATH = 'M6.5 4.5 C10.5 3 14.5 6 18.5 4.5 L18.5 12.5 C14.5 14 10.5 11 6.5 12.5 Z';
export const FLAG_POLE_PATH = 'M6.5 3.5 L6.5 20.5';

/** 五角星 */
export const STAR_PATH =
  'M12 3.2 L14.7 8.7 L20.8 9.6 L16.4 13.9 L17.4 19.9 L12 17.1 L6.6 19.9 L7.6 13.9 L3.2 9.6 L9.3 8.7 Z';

/** 人像：头 + 肩 */
export const PERSON_HEAD_PATH = 'M12 4.4a3.4 3.4 0 1 1 0 6.8a3.4 3.4 0 1 1 0-6.8Z';
export const PERSON_BODY_PATH =
  'M5 19.2 C5 15.6 8.1 13.4 12 13.4 C15.9 13.4 19 15.6 19 19.2 L19 19.8 L5 19.8 Z';

/** 与渲染端无关的图标描述：path 序列 + 可选文字（优先级数字 / emoji） */
export interface GlyphShape {
  d: string;
  /** 具体填充色；缺省不填充 */
  fill?: string;
  /** 描边色；缺省不描边 */
  stroke?: string;
  strokeWidth?: number;
  strokeLinecap?: 'round' | 'butt' | 'square';
}

export interface MarkerGlyph {
  shapes: GlyphShape[];
  /** 叠加在图标中心的文字（优先级数字 / emoji 符号 / 贴纸） */
  text?: string;
  textColor?: string;
  /** 24 坐标系下的字号，渲染端按 size/24 缩放 */
  textFontSize?: number;
}

/** 旧版 progress → 任务状态（渲染复用任务图标） */
function progressState(percent: 0 | 25 | 50 | 75 | 100): 'start' | 'p25' | 'p50' | 'p75' | 'p100' | 'done' {
  switch (percent) {
    case 0:
      return 'start';
    case 25:
      return 'p25';
    case 50:
      return 'p50';
    case 75:
      return 'p75';
    case 100:
      return 'done';
  }
}

export function markerGlyph(marker: Marker): MarkerGlyph {
  switch (marker.type) {
    case 'label':
      return { shapes: [{ d: CIRCLE_PATH, fill: MARKER_COLOR_HEX[marker.color] }] };
    case 'priority':
      return {
        shapes: [{ d: CIRCLE_PATH, fill: priorityColor(marker.level) }],
        text: String(marker.level),
        textColor: '#FFFFFF',
        textFontSize: 13.5,
      };
    case 'task':
    case 'progress': {
      const state = marker.type === 'task' ? marker.state : progressState(marker.percent);
      const ring: GlyphShape = { d: CIRCLE_PATH, stroke: TASK_COLOR, strokeWidth: 2 };
      if (state === 'start') return { shapes: [ring, { d: TASK_PLAY_PATH, fill: TASK_COLOR }] };
      if (state === 'done') {
        return { shapes: [ring, { d: TASK_CHECK_PATH, stroke: TASK_COLOR, strokeWidth: 2.6, strokeLinecap: 'round' }] };
      }
      return { shapes: [ring, { d: TASK_PIE[state], fill: TASK_COLOR }] };
    }
    case 'flag':
      return {
        shapes: [
          { d: FLAG_BANNER_PATH, fill: MARKER_COLOR_HEX[marker.color] },
          { d: FLAG_POLE_PATH, stroke: MARKER_COLOR_HEX[marker.color], strokeWidth: 2, strokeLinecap: 'round' },
        ],
      };
    case 'star':
      return { shapes: [{ d: STAR_PATH, fill: MARKER_COLOR_HEX[marker.color] }] };
    case 'people':
      return {
        shapes: [
          { d: PERSON_HEAD_PATH, fill: MARKER_COLOR_HEX[marker.color] },
          { d: PERSON_BODY_PATH, fill: MARKER_COLOR_HEX[marker.color] },
        ],
      };
    case 'emoji':
      return { shapes: [], text: marker.value, textFontSize: 18 };
    case 'sticker':
      return { shapes: [], text: marker.value, textFontSize: marker.large ? 24 : 20 };
  }
}

// ---------- 画布标记行的尺寸与排布 ----------

export const MARKER_GAP = 4;

/** 单个标记在画布上的边长（大号贴纸更大；插画入口已移除，仅为兼容历史文档保留） */
export function iconSizeOf(marker: Marker): number {
  if (marker.type === 'sticker') return marker.large ? 30 : 24;
  return 16;
}

/** 标记行总宽（含末尾与文字的间距）；无标记时为 0 */
export function markersRowWidth(markers?: Marker[]): number {
  if (!markers?.length) return 0;
  return markers.reduce((sum, m) => sum + iconSizeOf(m) + MARKER_GAP, 0);
}

/** 标记行高度（取最大图标）；无标记时为 0 */
export function markersRowHeight(markers?: Marker[]): number {
  if (!markers?.length) return 0;
  return Math.max(...markers.map(iconSizeOf));
}

// ---------- 标记面板分组 ----------

export interface MarkerGroupDef {
  id: MarkerGroupId;
  title: string;
  items: Marker[];
}

export const SYMBOL_PRESETS = ['❤️', '👍', '📢', '📌', '💡', '⚡', '⏰', '📞', '✏️', '🎮', '💯', '✈️', '🔥', '🌟'];

export const MARKER_GROUPS: MarkerGroupDef[] = [
  { id: 'label', title: '标签', items: MARKER_COLORS.map((color) => ({ type: 'label', color }) as Marker) },
  {
    id: 'priority',
    title: '优先级',
    items: ([1, 2, 3, 4, 5, 6, 7] as const).map((level) => ({ type: 'priority', level }) as Marker),
  },
  {
    id: 'task',
    title: '任务',
    items: (
      ['start', 'p25', 'p50', 'p75', 'p100', 'done'] as const
    ).map((state) => ({ type: 'task', state }) as Marker),
  },
  { id: 'flag', title: '旗帜', items: MARKER_COLORS.map((color) => ({ type: 'flag', color }) as Marker) },
  { id: 'star', title: '星星', items: MARKER_COLORS.map((color) => ({ type: 'star', color }) as Marker) },
  { id: 'people', title: '人像', items: MARKER_COLORS.map((color) => ({ type: 'people', color }) as Marker) },
  { id: 'symbol', title: '符号', items: SYMBOL_PRESETS.map((value) => ({ type: 'emoji', value }) as Marker) },
];

/** 标记的中文提示文案（tooltip 用） */
export function markerLabel(marker: Marker): string {
  switch (marker.type) {
    case 'label':
      return `标签·${colorLabel(marker.color)}`;
    case 'priority':
      return `优先级 ${marker.level}`;
    case 'task': {
      const names = { start: '开始', p25: '25%', p50: '50%', p75: '75%', p100: '100%', done: '完成' } as const;
      return `任务·${names[marker.state]}`;
    }
    case 'flag':
      return `旗帜·${colorLabel(marker.color)}`;
    case 'star':
      return `星星·${colorLabel(marker.color)}`;
    case 'people':
      return `人像·${colorLabel(marker.color)}`;
    case 'emoji':
      return `符号 ${marker.value}`;
    case 'sticker':
      return marker.value;
    case 'progress':
      return `进度 ${marker.percent}%`;
  }
}

// ---------- 贴纸 / 插画（emoji 目录） ----------

export interface StickerGroupDef {
  id: string;
  title: string;
  items: string[];
}

export const STICKER_GROUPS: StickerGroupDef[] = [
  {
    id: 'business',
    title: '商务',
    items: ['💰', '💼', '🧮', '💬', '☕', '📕', '⏰', '✉️', '📄', '📁', '📊', '📮', '📰', '📔', '🔒', '📇', '📈', '📉', '🎯', '💵', '🎤', '🪪', '✅', '🖥️'],
  },
  {
    id: 'education',
    title: '教育',
    items: ['⚛️', '⚖️', '🎓', '🧬', '📚', '✏️', '🏅', '⏳', '⛵', '📖', '🎒', '🔭', '📐', '🧪', '🔬', '✂️', '📏', '🖍️', '🖌️', '✒️', '🖊️', '📝', '🎨', '🖌️'],
  },
  {
    id: 'food',
    title: '食物',
    items: ['🍎', '🍒', '🍇', '🍋', '🍉', '🍊', '🍌', '🍅', '🍍', '🍐', '🥭', '🥑', '🥝', '🍓', '🫐', '🍄', '🫑', '🌶️', '🍆', '🥦', '🥕', '🍜', '🍭', '🍩'],
  },
  {
    id: 'gesture',
    title: '手势',
    items: ['👆', '☝️', '✌️', '🤞', '👉', '👈', '👇', '🤙', '👌', '🤘', '👍', '👎', '✋', '🖐️', '👋', '🤝', '🙏', '💪', '👏', '🙌'],
  },
  {
    id: 'travel',
    title: '旅行',
    items: ['🏝️', '🏔️', '🚀', '🗺️', '🚢', '✈️', '🚕', '🚌', '🎈', '🚁', '⛺', '🌋', '🗼', '🎡', '🎢', '🧭'],
  },
  {
    id: 'nature',
    title: '自然',
    items: ['🌻', '🌳', '🌲', '🌴', '🌵', '🌷', '🌹', '🌺', '🌼', '🍀', '🍁', '🍂', '🌊', '⛰️', '🌙', '⭐', '☀️', '🌈', '❄️', '⚡', '🔥', '💧'],
  },
];

/** 由 emoji 构造贴纸标记 */
export function stickerMarker(value: string): Marker {
  return { type: 'sticker', value };
}
