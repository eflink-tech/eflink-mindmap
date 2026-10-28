// packages/mindmap/src/i18n/messages.ts
// 思维导图界面文案字典。数组列顺序固定为 [zh-CN, en, es, pt-BR]，
// 与 office-kit 的 OFFICE_LOCALES 一致；新增语言需同步改 buildMessages.ts 的 ORDER 与 Row。
import { registerOfficeMessages, type OfficeMessagesByLocale } from '@eflink-tech/office-kit';
import { buildMessages, ORDER, type Row } from './buildMessages';
import { CATALOG_MESSAGES } from './messagesCatalog';
import { CORE_MESSAGES } from './messagesCore';
import { PANEL_MESSAGES } from './messagesPanels';

const ROWS = {
  'mind.brand': ['DocuLuma MindMap', 'DocuLuma MindMap', 'DocuLuma MindMap', 'DocuLuma MindMap'],
  'mind.untitled': ['未命名导图', 'Untitled mind map', 'Mapa mental sin título', 'Mapa mental sem título'],
  'mind.doc.defaultTitle': ['思维导图', 'Mind map', 'Mapa mental', 'Mapa mental'],

  // 顶栏菜单：文件
  'mind.file.newMap': ['新建导图', 'New mind map', 'Nuevo mapa mental', 'Novo mapa mental'],
  'mind.file.exportEfm': ['导出 EFM', 'Export EFM', 'Exportar EFM', 'Exportar EFM'],
  'mind.file.newConfirm': [
    '确定新建导图？当前画布将被清空并替换为空白导图。',
    'Create a new mind map? The current canvas will be cleared and replaced with a blank map.',
    '¿Crear un mapa mental nuevo? El lienzo actual se borrará y se reemplazará por uno en blanco.',
    'Criar um novo mapa mental? A tela atual será limpa e substituída por uma em branco.',
  ],

  // 顶栏菜单：视图
  'mind.view.fitToScreen': ['适应屏幕', 'Fit to screen', 'Ajustar a la pantalla', 'Ajustar à tela'],
  'mind.view.outline': ['大纲视图', 'Outline view', 'Vista de esquema', 'Exibição de tópicos'],
  'mind.view.mindmap': ['思维导图视图', 'Mind map view', 'Vista de mapa mental', 'Exibição de mapa mental'],

  // 顶栏菜单：插入
  'mind.insert.note': ['笔记', 'Note', 'Nota', 'Nota'],
  'mind.insert.label': ['标签', 'Label', 'Etiqueta', 'Etiqueta'],
  'mind.insert.link': ['链接', 'Link', 'Enlace', 'Link'],
  'mind.insert.marker': ['标记', 'Marker', 'Marcador', 'Marcador'],
  'mind.insert.image': ['本地图片', 'Local image', 'Imagen local', 'Imagem local'],
  'mind.insert.sticker': ['贴纸', 'Sticker', 'Sticker', 'Adesivo'],

  // 工具栏
  'mind.tool.child': ['子主题', 'Subtopic', 'Subtema', 'Subtópico'],
  'mind.tool.sibling': ['同级主题', 'Sibling topic', 'Tema del mismo nivel', 'Tópico do mesmo nível'],
  'mind.tool.relation': ['联系', 'Relation', 'Relación', 'Relação'],
  'mind.tool.summary': ['概要', 'Summary', 'Resumen', 'Resumo'],
  'mind.tool.boundary': ['外框', 'Boundary', 'Marco', 'Moldura'],
  'mind.tool.flow': ['流动', 'Flow', 'Flujo', 'Fluxo'],
  'mind.tool.ai': ['AI', 'AI', 'IA', 'IA'],
  'mind.panel.markers': ['标记', 'Markers', 'Marcadores', 'Marcadores'],
  'mind.panel.format': ['格式', 'Format', 'Formato', 'Formato'],
  'mind.tool.summaryTip': [
    '概要（选中同级节点后创建；可 Shift+拖拽框选或 Shift+点击多选）',
    'Summary (create after selecting sibling topics; Shift-drag to marquee or Shift-click to multi-select)',
    'Resumen (créalo tras seleccionar temas del mismo nivel; Shift+arrastre para selección por rectángulo o Shift+clic para varios)',
    'Resumo (crie após selecionar tópicos do mesmo nível; Shift+arraste para seleção por área ou Shift+clique para vários)',
  ],
  'mind.tool.boundaryTip': [
    '外框（选中同级节点后创建；可 Shift+拖拽框选或 Shift+点击多选）',
    'Boundary (create after selecting sibling topics; Shift-drag to marquee or Shift-click to multi-select)',
    'Marco (créalo tras seleccionar temas del mismo nivel; Shift+arrastre para selección por rectángulo o Shift+clic para varios)',
    'Moldura (crie após selecionar tópicos do mesmo nível; Shift+arraste para seleção por área ou Shift+clique para vários)',
  ],
  'mind.tool.flowTip': ['选中节点流动动画', 'Flow animation for the selected topic', 'Animación de flujo del tema seleccionado', 'Animação de fluxo do tópico selecionado'],
  'mind.tool.aiTip': ['AI 助手（生成导图 / 展开分支）', 'AI assistant (generate map / expand branch)', 'Asistente de IA (generar mapa / expandir rama)', 'Assistente de IA (gerar mapa / expandir ramo)'],
  'mind.tool.shareTip': ['生成分享链接', 'Create a share link', 'Generar un enlace para compartir', 'Gerar um link de compartilhamento'],
  'mind.tool.fitTip': ['适应屏幕 ({shortcut})', 'Fit to screen ({shortcut})', 'Ajustar a la pantalla ({shortcut})', 'Ajustar à tela ({shortcut})'],

  // 状态栏
  'mind.status.rename': ['点击重命名文档', 'Click to rename the document', 'Haz clic para renombrar el documento', 'Clique para renomear o documento'],
  'mind.status.docName': ['文档名', 'Document name', 'Nombre del documento', 'Nome do documento'],
  'mind.status.saveTip': ['⌘S/Ctrl+S 保存到云端', 'Cmd/Ctrl+S saves to the cloud', 'Cmd/Ctrl+S guarda en la nube', 'Cmd/Ctrl+S salva na nuvem'],
  'mind.status.selected': ['已选 {count} 个节点', '{count} topics selected', '{count} temas seleccionados', '{count} tópicos selecionados'],
  'mind.status.zoom': ['缩放比例', 'Zoom', 'Nivel de zoom', 'Nível de zoom'],
  'mind.status.outline': ['大纲', 'Outline', 'Esquema', 'Esquema'],
  'mind.status.mindmap': ['思维导图', 'Mind map', 'Mapa mental', 'Mapa mental'],
  'mind.status.outlineTip': ['切换到大纲视图', 'Switch to outline view', 'Cambiar a la vista de esquema', 'Mudar para a exibição de tópicos'],
  'mind.status.mindmapTip': ['切换到思维导图视图', 'Switch to mind map view', 'Cambiar a la vista de mapa mental', 'Mudar para a exibição de mapa mental'],

  // 分享弹窗
  'mind.share.title': ['分享导图', 'Share this mind map', 'Compartir mapa mental', 'Compartilhar mapa mental'],
  'mind.share.loading': [
    '正在生成分享链接…',
    'Creating the share link…',
    'Generando el enlace para compartir…',
    'Gerando o link de compartilhamento…',
  ],
  'mind.share.unsupported': [
    '当前环境不支持分享',
    'Sharing is not available in this environment',
    'Compartir no está disponible en este entorno',
    'O compartilhamento não está disponível neste ambiente',
  ],
  'mind.share.failed': [
    '分享失败，请稍后重试',
    'Sharing failed; please try again later',
    'Error al compartir; inténtalo de nuevo más tarde',
    'Falha ao compartilhar; tente novamente mais tarde',
  ],
  'mind.share.retry': ['重试', 'Retry', 'Reintentar', 'Tentar novamente'],
  'mind.share.link': ['分享链接', 'Share link', 'Enlace para compartir', 'Link de compartilhamento'],
  'mind.share.done': ['完成', 'Done', 'Listo', 'Concluído'],

  // 载入与错误
  'mind.err.imageTooLarge': [
    '图片过大（上限 2MB），请选择更小的图片',
    'Image too large (2 MB limit); pick a smaller image',
    'Imagen demasiado grande (límite de 2 MB); elige una imagen más pequeña',
    'Imagem grande demais (limite de 2 MB); escolha uma imagem menor',
  ],
  'mind.err.imageReadFailed': ['图片读取失败，请重新选择文件', 'Could not read the image; choose the file again', 'No se pudo leer la imagen; vuelve a elegir el archivo', 'Não foi possível ler a imagem; escolha o arquivo novamente'],
  'mind.err.importFailed': [
    '导入失败，请确认选择的是有效的 *.efm.json 文件',
    'Import failed; make sure the file is a valid *.efm.json',
    'Error al importar; confirma que el archivo es un *.efm.json válido',
    'Falha na importação; confirme se o arquivo é um *.efm.json válido',
  ],
  'mind.newDocFailed': ['新建文档失败', 'Failed to create the document', 'No se pudo crear el documento', 'Falha ao criar o documento'],
} as const satisfies Record<string, Row>;

const CHROME_MESSAGES = buildMessages(ROWS);

/** 面板、目录素材与 AI/存储链路各自单独文件维护，此处合并为编辑器唯一字典入口 */
function merge(): OfficeMessagesByLocale {
  const out: OfficeMessagesByLocale = { 'zh-CN': {}, en: {}, es: {}, 'pt-BR': {} };
  for (const locale of ORDER) {
    out[locale] = {
      ...CHROME_MESSAGES[locale],
      ...PANEL_MESSAGES[locale],
      ...CATALOG_MESSAGES[locale],
      ...CORE_MESSAGES[locale],
    };
  }
  return out;
}

export const MIND_MESSAGES: OfficeMessagesByLocale = merge();

registerOfficeMessages(MIND_MESSAGES);
