// packages/mindmap/src/i18n/messagesCatalog.ts
// 目录型文件的界面外壳文案（配色方案/布局/结构/标记面板/快捷键弹窗等），
// 只收录 mind.c.* 前缀键；由入口与 MIND_MESSAGES 一并合并注册，本模块不自注册。
// 数组列顺序固定为 [zh-CN, en, es, pt-BR]，与 office-kit 的 OFFICE_LOCALES 一致。
import type { OfficeMessagesByLocale } from '@eflink-tech/office-kit';
import { buildMessages, type Row } from './buildMessages';

const ROWS = {
  // 配色方案（ThemeGallery）
  'mind.c.theme.label': ['配色方案', 'Color theme', 'Esquema de colores', 'Esquema de cores'],
  'mind.c.theme.listAria': [
    '配色方案列表',
    'Color theme list',
    'Lista de esquemas de color',
    'Lista de esquemas de cores',
  ],
  'mind.c.theme.apply': [
    '应用配色 {name}',
    'Apply {name} theme',
    'Aplicar el tema {name}',
    'Aplicar o tema {name}',
  ],

  // 布局（LayoutSelect / LayoutGallery）
  'mind.c.layout.label': ['布局', 'Layout', 'Diseño', 'Layout'],
  'mind.c.layout.presets': [
    '布局预设',
    'Layout presets',
    'Predefiniciones de diseño',
    'Predefinições de layout',
  ],

  // 结构提示（StructureSection）
  'mind.c.structure.label': ['结构', 'Structure', 'Estructura', 'Estrutura'],
  'mind.c.structure.current': ['当前：{name}', 'Current: {name}', 'Actual: {name}', 'Atual: {name}'],
  'mind.c.structure.byCanvas': [
    '结构由「画布」Tab 中的布局决定',
    'The structure follows the layout chosen in the Canvas tab',
    'La estructura depende del diseño de la pestaña Lienzo',
    'A estrutura depende do layout da aba Tela',
  ],

  // 标记面板（MarkerPanel）
  'mind.c.tab.stickers': ['贴纸', 'Stickers', 'Pegatinas', 'Adesivos'],
  'mind.c.marker.selectNode': [
    '请先选中一个节点',
    'Select a topic first',
    'Selecciona primero un tema',
    'Selecione primeiro um tópico',
  ],
  'mind.c.marker.footer': [
    '点击图标应用到选中节点；同组标记互斥，再次点击已应用的图标可移除。',
    'Click an icon to apply it to the selected topic; icons in the same group are mutually exclusive, and clicking an applied icon again removes it.',
    'Haz clic en un icono para aplicarlo al tema seleccionado; los iconos del mismo grupo son excluyentes y volver a hacer clic en uno aplicado lo elimina.',
    'Clique um ícone para aplicá-lo ao tópico selecionado; os ícones do mesmo grupo são exclusivos e clicar novamente no ícone aplicado o remove.',
  ],

  // 快捷键弹窗（ShortcutsDialog）
  'mind.c.shortcuts.macNote': [
    'Mac 以 ⌘ 表示 Command',
    'On Mac, ⌘ is the Command key',
    'En Mac, ⌘ representa la tecla Command',
    'No Mac, ⌘ representa a tecla Command',
  ],
  'mind.c.shortcuts.winNote': [
    'Windows / Linux 以 Ctrl 表示控制键',
    'On Windows / Linux, Ctrl is the modifier key',
    'En Windows / Linux, Ctrl representa la tecla de control',
    'No Windows / Linux, Ctrl representa a tecla de controle',
  ],
} as const satisfies Record<string, Row>;

export const CATALOG_MESSAGES: OfficeMessagesByLocale = buildMessages(ROWS);
