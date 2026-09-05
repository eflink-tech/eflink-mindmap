// 快捷键目录：菜单右侧提示与「快捷键」弹窗共用同一数据源
export type ShortcutToken = 'Mod' | 'Shift' | 'Alt' | string;

export interface ShortcutEntry {
  id: string;
  label: string;
  /** 按键序列，Mod 在 Mac 显示为 ⌘，其它平台为 Ctrl */
  keys: ShortcutToken[];
  /** 同一动作的备选快捷键（仅弹窗展示） */
  altKeys?: ShortcutToken[][];
}

export interface ShortcutGroup {
  title: string;
  items: ShortcutEntry[];
}

export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}

export function formatShortcut(keys: ShortcutToken[], mac = isMacPlatform()): string {
  return keys
    .map((k) => {
      if (k === 'Mod') return mac ? '⌘' : 'Ctrl';
      if (k === 'Shift') return mac ? '⇧' : 'Shift';
      if (k === 'Alt') return mac ? '⌥' : 'Alt';
      if (k === 'Enter') return mac ? '↩' : 'Enter';
      if (k === 'Tab') return 'Tab';
      if (k === 'Esc') return 'Esc';
      if (k === 'Delete') return mac ? '⌫' : 'Del';
      if (k === 'Space') return 'Space';
      if (k === 'Up') return '↑';
      if (k === 'Down') return '↓';
      if (k === 'Left') return '←';
      if (k === 'Right') return '→';
      return k;
    })
    .join(mac ? '' : '+');
}

/** 菜单项 id → 主快捷键（无则不在菜单显示） */
export const MENU_SHORTCUT_IDS = {
  save: 'save',
  undo: 'undo',
  redo: 'redo',
  copy: 'copy',
  cut: 'cut',
  paste: 'paste',
  remove: 'remove',
  fitToScreen: 'fitToScreen',
  zoomIn: 'zoomIn',
  zoomOut: 'zoomOut',
} as const;

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: '文件',
    items: [{ id: 'save', label: '保存到本地数据库', keys: ['Mod', 'S'] }],
  },
  {
    title: '编辑',
    items: [
      { id: 'undo', label: '撤销', keys: ['Mod', 'Z'] },
      { id: 'redo', label: '重做', keys: ['Mod', 'Shift', 'Z'], altKeys: [['Mod', 'Y']] },
      { id: 'copy', label: '复制', keys: ['Mod', 'C'] },
      { id: 'cut', label: '剪切', keys: ['Mod', 'X'] },
      { id: 'paste', label: '粘贴', keys: ['Mod', 'V'] },
      { id: 'remove', label: '删除', keys: ['Delete'] },
      { id: 'edit', label: '编辑主题', keys: ['F2'], altKeys: [['Space']] },
    ],
  },
  {
    title: '主题',
    items: [
      { id: 'addChild', label: '插入子主题', keys: ['Tab'] },
      { id: 'addSibling', label: '插入同级主题', keys: ['Enter'] },
      { id: 'addSiblingBefore', label: '在前方插入同级', keys: ['Shift', 'Enter'] },
      { id: 'collapse', label: '折叠', keys: ['Mod', '['] },
      { id: 'expand', label: '展开', keys: ['Mod', ']'] },
      { id: 'toggleCollapse', label: '切换折叠', keys: ['Mod', '/'] },
    ],
  },
  {
    title: '查看',
    items: [
      { id: 'fitToScreen', label: '适应屏幕', keys: ['Mod', '0'] },
      { id: 'zoomIn', label: '放大', keys: ['Mod', '+'] },
      { id: 'zoomOut', label: '缩小', keys: ['Mod', '-'] },
      { id: 'navigate', label: '节点导航', keys: ['Up'], altKeys: [['Down'], ['Left'], ['Right']] },
      { id: 'escape', label: '取消选中 / 退出连线', keys: ['Esc'] },
    ],
  },
];

const byId = new Map(SHORTCUT_GROUPS.flatMap((g) => g.items.map((i) => [i.id, i])));

/** 菜单右侧显示的主快捷键文案；无则返回 undefined */
export function menuShortcutLabel(id: string, mac = isMacPlatform()): string | undefined {
  const entry = byId.get(id);
  if (!entry) return undefined;
  return formatShortcut(entry.keys, mac);
}
