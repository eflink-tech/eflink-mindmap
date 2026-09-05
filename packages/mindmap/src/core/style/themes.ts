import type { MindMapDocument, ThemeConfig } from '../../types/mindmap';

/** 配色方案分组：对齐 XMind「缤纷 / 经典」 */
export type ThemeGroup = 'colorful' | 'classic';

export type ThemeId =
  // 缤纷（对齐 XMind 配色条）
  | 'chenxi'
  | 'rainbow'
  | 'vitality'
  | 'dancing'
  | 'code'
  | 'wafeng'
  | 'island'
  | 'rose'
  | 'mint'
  | 'lvcha'
  | 'yuzhou'
  | 'jingzhi'
  | 'chunzhen'
  | 'makalong'
  | 'lindi'
  | 'naiyou'
  | 'xiaweiyi'
  | 'songguo'
  | 'fanwutuobang'
  | 'shuifen'
  | 'huali'
  | 'yazhi'
  | 'duocai'
  | 'xuancai'
  | 'fugu'
  | 'tiandian'
  | 'xiangcao'
  | 'tangguo'
  | 'nihong'
  | 'yinghua'
  | 'bilu'
  | 'jiari'
  | 'haiyang'
  | 'ziteng'
  // 经典
  | 'classic'
  | 'ink'
  | 'business'
  | 'fresh'
  | 'night'
  | 'sand';

export interface ThemeDefinition extends ThemeConfig {
  group: ThemeGroup;
}

/** 旧主题 id → 新 id（兼容已存文档） */
const LEGACY_THEME_MAP: Record<string, ThemeId> = {
  candy: 'dancing',
  snow: 'chenxi',
  forest: 'island',
  ocean: 'mint',
  sunset: 'rose',
  lavender: 'vitality',
  brick: 'code',
  dark: 'night',
  gold: 'sand',
};

// 节点内边距收紧（对齐 XMind）：文字贴近边框，连线端点离文字更近
const nodeRounded = {
  shape: 'rounded' as const,
  padding: [10, 5] as [number, number],
  fontSize: 14,
  fontWeight: 'normal' as const,
};

const curve2 = { type: 'curve' as const, width: 2 };

/**
 * 预设配色：色值自 XMind「缤纷」面板 DOM 精确采样。
 * background 统一为白；画布实际背景由 canvasOptions / DEFAULT_CANVAS_BACKGROUND 决定，切换主题不改背景。
 */
export const THEMES: Record<ThemeId, ThemeDefinition> = {
  chenxi: {
    name: '晨曦',
    group: 'colorful',
    colors: {
      primary: '#FF6B6B',
      branches: ['#FF6B6B', '#FF9F69', '#97D3B6', '#88E2D7', '#6FD0F9', '#E18BEE'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  rainbow: {
    name: '彩虹',
    group: 'colorful',
    colors: {
      primary: '#2E0F6B',
      branches: ['#FFFFFF', '#9257FF', '#9D02EA', '#5C14C8', '#2E0F6B', '#C5AEF9'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  vitality: {
    name: '活力',
    group: 'colorful',
    colors: {
      primary: '#0D0D0D',
      branches: ['#FFFFFF', '#F2F2F2', '#F22816', '#F2B807', '#233ED9', '#0D0D0D'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  dancing: {
    name: '舞动',
    group: 'colorful',
    colors: {
      primary: '#363026',
      branches: ['#4E60EF', '#EB4758', '#FFFFFF', '#FFF8E0', '#AA0E1D', '#363026'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  code: {
    name: '代码',
    group: 'colorful',
    colors: {
      primary: '#2C2D30',
      branches: ['#FFF0B8', '#CBFFB8', '#FFFFFF', '#DB8FFF', '#8ABEFF', '#2C2D30'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  wafeng: {
    name: '和风',
    group: 'colorful',
    colors: {
      primary: '#191959',
      branches: ['#FFFFFF', '#FFABAA', '#FF7B31', '#8CB5FF', '#4A51D9', '#191959'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  island: {
    name: '岛屿',
    group: 'colorful',
    colors: {
      primary: '#6B705C',
      branches: ['#FFE8D6', '#DDBEA9', '#CB997E', '#B7B7A4', '#A5A58D', '#6B705C'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  rose: {
    name: '玫瑰',
    group: 'colorful',
    colors: {
      primary: '#A4133C',
      branches: ['#FFF0F3', '#FFCCD5', '#FFB3C1', '#FF758F', '#C9184A', '#A4133C'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  mint: {
    name: '薄荷',
    group: 'colorful',
    colors: {
      primary: '#046562',
      branches: ['#FFFFFF', '#C4FFF9', '#9CEAEF', '#68D8D6', '#06AFA9', '#046562'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  lvcha: {
    name: '绿茶',
    group: 'colorful',
    colors: {
      primary: '#1F2B1D',
      branches: ['#D6D9C3', '#B6AD90', '#579360', '#656D4A', '#265834', '#1F2B1D'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  yuzhou: {
    name: '宇宙',
    group: 'colorful',
    colors: {
      primary: '#0D2F42',
      branches: ['#D9DCD6', '#81C3D7', '#3A7CA5', '#2F6690', '#16425B', '#0D2F42'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  jingzhi: {
    name: '精致',
    group: 'colorful',
    colors: {
      primary: '#1E1D1A',
      branches: ['#7D5A2C', '#FDFBF7', '#DFCAA4', '#C49C64', '#D3381D', '#1E1D1A'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  chunzhen: {
    name: '纯真',
    group: 'colorful',
    colors: {
      primary: '#3C4244',
      branches: ['#FDC9D1', '#EA618A', '#A4D0F9', '#4F73BA', '#FDF8E7', '#3C4244'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  makalong: {
    name: '马卡龙',
    group: 'colorful',
    colors: {
      primary: '#3C4244',
      branches: ['#CAB08F', '#FEB58C', '#AFD4C4', '#ECF6F6', '#F9E088', '#3C4244'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  lindi: {
    name: '林地',
    group: 'colorful',
    colors: {
      primary: '#1F2513',
      branches: ['#E1C356', '#5B805C', '#86964F', '#B3C785', '#F9FFEB', '#1F2513'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  naiyou: {
    name: '奶油',
    group: 'colorful',
    colors: {
      primary: '#7D6E83',
      branches: ['#D8EAD2', '#D4D0DE', '#FFFFFF', '#C9DBEC', '#DCC4C0', '#7D6E83'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  xiaweiyi: {
    name: '夏威夷',
    group: 'colorful',
    colors: {
      primary: '#254B85',
      branches: ['#B7D6E8', '#4A94C3', '#254B85', '#4B9383', '#D29F55', '#F3E6CF'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  songguo: {
    name: '松果',
    group: 'colorful',
    colors: {
      primary: '#1D414B',
      branches: ['#64625C', '#978477', '#1D414B', '#C8C6CB', '#AA9FA3', '#D1BFAF'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  fanwutuobang: {
    name: '反乌托邦',
    group: 'colorful',
    colors: {
      primary: '#2A2C2C',
      branches: ['#BD2828', '#F4F5F6', '#DFE4E7', '#A5ACB1', '#606466', '#2A2C2C'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  shuifen: {
    name: '水粉',
    group: 'colorful',
    colors: {
      primary: '#3C74A6',
      branches: ['#F0F0F0', '#F2BDC7', '#F2DC6B', '#5BA683', '#B796D9', '#3C74A6'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  huali: {
    name: '华丽',
    group: 'colorful',
    colors: {
      primary: '#0A052E',
      branches: ['#EDF3FF', '#C1E554', '#FFAA39', '#D389D5', '#1692D2', '#0A052E'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  yazhi: {
    name: '雅致',
    group: 'colorful',
    colors: {
      primary: '#153E5D',
      branches: ['#F9F5DE', '#DFDDCE', '#4B9D9D', '#7884A4', '#AA79AA', '#153E5D'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  duocai: {
    name: '多彩',
    group: 'colorful',
    colors: {
      primary: '#070D59',
      branches: ['#F6F5F5', '#9BFFED', '#FFC947', '#E46D57', '#1F3C88', '#070D59'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  xuancai: {
    name: '炫彩',
    group: 'colorful',
    colors: {
      primary: '#092933',
      branches: ['#FFFFFF', '#EFD7E6', '#FF7DC1', '#A239EA', '#5C37E5', '#092933'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  fugu: {
    name: '复古',
    group: 'colorful',
    colors: {
      primary: '#264653',
      branches: ['#E9C46A', '#F4A261', '#DC856F', '#A4705E', '#2A9D8F', '#264653'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  tiandian: {
    name: '甜点',
    group: 'colorful',
    colors: {
      primary: '#006D77',
      branches: ['#F9F8ED', '#FFEDD2', '#FFBC9F', '#D8AC8F', '#83C5BE', '#006D77'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  xiangcao: {
    name: '香草',
    group: 'colorful',
    colors: {
      primary: '#0D4040',
      branches: ['#FFFFFF', '#E4F9F5', '#30E3CA', '#11999E', '#40514E', '#0D4040'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  tangguo: {
    name: '糖果',
    group: 'colorful',
    colors: {
      primary: '#54A6D6',
      branches: ['#FFFFFF', '#FF9C72', '#F5CD6C', '#F09E3A', '#9CC3E4', '#54A6D6'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  nihong: {
    name: '霓虹',
    group: 'colorful',
    colors: {
      primary: '#7400B8',
      branches: ['#FFFFFF', '#72EFDD', '#56CFE1', '#4EA8DE', '#5E60CE', '#7400B8'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  yinghua: {
    name: '樱花',
    group: 'colorful',
    colors: {
      primary: '#FFA9C6',
      branches: ['#FFE3E8', '#FFDCC8', '#FFB4B6', '#FFA9C6', '#D1C3BD', '#C1CFDE'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  bilu: {
    name: '壁炉',
    group: 'colorful',
    colors: {
      primary: '#6D3B37',
      branches: ['#FDD29A', '#F9A655', '#FC901A', '#E04B51', '#A4564C', '#6D3B37'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  jiari: {
    name: '假日',
    group: 'colorful',
    colors: {
      primary: '#101F23',
      branches: ['#D5F2E3', '#F0A346', '#E12A37', '#BC191E', '#2D6C65', '#101F23'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  haiyang: {
    name: '海洋',
    group: 'colorful',
    colors: {
      primary: '#000D2D',
      branches: ['#B4F2FD', '#6EE2FD', '#3BB6E3', '#135CAE', '#01206A', '#000D2D'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  ziteng: {
    name: '紫藤',
    group: 'colorful',
    colors: {
      primary: '#72369D',
      branches: ['#FFFBEF', '#FBD58A', '#DCBEF4', '#B67BE6', '#9D4EDD', '#72369D'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  classic: {
    name: '经典',
    group: 'classic',
    colors: {
      primary: '#3B82F6',
      branches: ['#EF4444', '#F97316', '#10B981', '#8B5CF6', '#EC4899', '#14B8A6'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  ink: {
    name: '墨黑',
    group: 'classic',
    colors: {
      primary: '#111827',
      branches: ['#374151', '#4B5563', '#6B7280', '#1F2937', '#374151', '#4B5563'],
      background: '#FFFFFF',
    },
    node: { shape: 'rectangle', padding: [10, 5], fontSize: 14, fontWeight: 'normal' },
    connector: { type: 'straight', width: 1.5 },
  },
  business: {
    name: '商务',
    group: 'classic',
    colors: {
      primary: '#1E3A5F',
      branches: ['#2563EB', '#0F766E', '#B45309', '#7C3AED', '#BE123C', '#334155'],
      background: '#FFFFFF',
    },
    node: { shape: 'rectangle', padding: [10, 5], fontSize: 14, fontWeight: 'normal' },
    connector: { type: 'straight', width: 1.5 },
  },
  fresh: {
    name: '清新',
    group: 'classic',
    colors: {
      primary: '#0284C7',
      branches: ['#0EA5E9', '#14B8A6', '#22C55E', '#6366F1', '#06B6D4', '#3B82F6'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  night: {
    name: '暗夜',
    group: 'classic',
    colors: {
      primary: '#1F2937',
      branches: ['#38BDF8', '#34D399', '#F472B6', '#A78BFA', '#FBBF24', '#FB923C'],
      background: '#FFFFFF',
    },
    node: { ...nodeRounded },
    connector: { ...curve2 },
  },
  sand: {
    name: '沙丘',
    group: 'classic',
    colors: {
      primary: '#B45309',
      branches: ['#D97706', '#CA8A04', '#A16207', '#92400E', '#B45309', '#EAB308'],
      background: '#FFFFFF',
    },
    node: { shape: 'rectangle', padding: [10, 5], fontSize: 14, fontWeight: 'normal' },
    connector: { ...curve2 },
  },
};

export const THEME_GROUPS: { id: ThemeGroup; label: string }[] = [
  { id: 'colorful', label: '缤纷' },
  { id: 'classic', label: '经典' },
];

export function themesInGroup(group: ThemeGroup): [ThemeId, ThemeDefinition][] {
  return (Object.entries(THEMES) as [ThemeId, ThemeDefinition][]).filter(([, t]) => t.group === group);
}

export function resolveThemeId(id: string): ThemeId | null {
  if (Object.prototype.hasOwnProperty.call(THEMES, id)) return id as ThemeId;
  const mapped = LEGACY_THEME_MAP[id];
  return mapped ?? null;
}

export function isThemeId(id: string): id is ThemeId {
  return resolveThemeId(id) !== null;
}

export function getTheme(doc: MindMapDocument): ThemeConfig {
  const resolved = resolveThemeId(doc.themeId);
  const base = resolved ? THEMES[resolved] : THEMES.classic;
  const { group: _group, ...config } = base;
  return doc.styleOverrides ? { ...config, ...doc.styleOverrides } : config;
}
