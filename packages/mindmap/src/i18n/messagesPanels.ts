// packages/mindmap/src/i18n/messagesPanels.ts
// 属性面板 / 画布浮层 / 状态栏等界面的补充文案。数组列顺序固定为
// [zh-CN, en, es, pt-BR]，与 office-kit 的 OFFICE_LOCALES 一致。
// 仅收录 mind.p.* 前缀的键；公共动作复用 COMMON_MESSAGES，导图主文案复用 messages.ts。
import type { OfficeMessagesByLocale } from '@eflink-tech/office-kit';
import { buildMessages, type Row } from './buildMessages';

const ROWS = {
  // 属性面板：页签与空状态
  'mind.p.style': ['样式', 'Style', 'Estilo', 'Estilo'],
  'mind.p.canvas': ['画布', 'Canvas', 'Lienzo', 'Tela'],
  'mind.p.selectNode': ['请选中一个节点', 'Select a topic', 'Selecciona un tema', 'Selecione um tópico'],

  // 画布选项
  'mind.p.background': ['背景颜色', 'Background color', 'Color de fondo', 'Cor de fundo'],
  'mind.p.globalFont': ['全局字体', 'Global font', 'Fuente global', 'Fonte global'],
  'mind.p.branchLineWidth': ['分支线条宽度', 'Branch width', 'Grosor de ramas', 'Espessura dos ramos'],
  'mind.p.rainbow': ['彩虹分支', 'Rainbow branches', 'Ramas arcoíris', 'Ramos arco-íris'],
  'mind.p.defaultOption': ['默认 ({width})', 'Default ({width})', 'Predeterminado ({width})', 'Padrão ({width})'],

  // 字体下拉选项
  'mind.p.fontDefault': ['默认', 'Default', 'Predeterm.', 'Padrão'],
  'mind.p.fontSystem': ['系统默认', 'System default', 'Del sistema', 'Padrão do sistema'],
  'mind.p.fontSerif': ['衬线', 'Serif', 'Serif', 'Serifa'],
  'mind.p.fontMono': ['等宽', 'Monospace', 'Monoespaciada', 'Monoespaçada'],
  'mind.p.fontYaHei': ['微软雅黑', 'Microsoft YaHei', 'Microsoft YaHei', 'Microsoft YaHei'],

  // 布局开关
  'mind.p.layoutOptions': ['布局选项', 'Layout options', 'Opciones de diseño', 'Opções de layout'],
  'mind.p.mindmapOnly': [
    '仅思维导图结构可用',
    'Mind map layouts only',
    'Solo en mapas mentales',
    'Somente em mapas mentais',
  ],
  'mind.p.balanced': ['平衡布局', 'Balanced layout', 'Diseño equilibrado', 'Layout equilibrado'],
  'mind.p.compact': ['紧凑布局', 'Compact layout', 'Diseño compacto', 'Layout compacto'],
  'mind.p.equalWidthSiblings': ['同级等宽', 'Equal sibling width', 'Igualar temas hermanos', 'Igualar tópicos irmãos'],

  // 外观（ShapeSection）
  'mind.p.appearance': ['外观', 'Appearance', 'Apariencia', 'Aparência'],
  'mind.p.fill': ['填充色', 'Fill', 'Relleno', 'Preenchimento'],
  'mind.p.textColor': ['文字色', 'Text color', 'Color del texto', 'Cor do texto'],
  'mind.p.borderColor': ['边框色', 'Border color', 'Color del borde', 'Cor da borda'],
  'mind.p.borderStyle': ['边框线型', 'Border style', 'Estilo de borde', 'Estilo da borda'],
  'mind.p.borderWidth': ['边框宽度', 'Border width', 'Grosor del borde', 'Espessura da borda'],
  'mind.p.fontSize': ['字号', 'Font size', 'Tamaño de fuente', 'Tamanho da fonte'],
  'mind.p.fontWeightLabel': ['字重', 'Weight', 'Grosor', 'Peso'],
  'mind.p.shape': ['形状', 'Shape', 'Forma', 'Forma'],
  'mind.p.nodeWidth': ['节点宽度', 'Topic width', 'Ancho del tema', 'Largura do tópico'],
  'mind.p.auto': ['自动', 'Auto', 'Autom.', 'Autom.'],
  'mind.p.fitWidthTip': ['按内容适合宽度', 'Fit width to content', 'Ajustar al contenido', 'Ajustar ao conteúdo'],
  'mind.p.fit': ['适合', 'Fit', 'Ajustar', 'Ajustar'],
  'mind.p.restoreThemeTip': ['恢复主题默认样式', 'Restore theme defaults', 'Restaurar estilo del tema', 'Restaurar estilo do tema'],
  'mind.p.clearCustomStyle': ['清除自定义样式', 'Clear custom style', 'Borrar estilo personalizado', 'Limpar estilo personalizado'],
  'mind.p.noBorder': ['无边框', 'No border', 'Sin borde', 'Sem borda'],
  'mind.p.shapeRounded': ['圆角矩形', 'Rounded', 'Redondeado', 'Arredondado'],
  'mind.p.shapeEllipse': ['椭圆', 'Ellipse', 'Elipse', 'Elipse'],
  'mind.p.shapeRect': ['矩形', 'Rectangle', 'Rectángulo', 'Retângulo'],
  'mind.p.regular': ['常规', 'Regular', 'Normal', 'Normal'],
  'mind.p.solid': ['实线', 'Solid', 'Sólida', 'Sólida'],
  'mind.p.dashed': ['虚线', 'Dashed', 'Discontinua', 'Tracejada'],
  'mind.p.none': ['无', 'None', 'Ninguna', 'Nenhuma'],

  // 文本（TextSection）
  'mind.p.text': ['文本', 'Text', 'Texto', 'Texto'],
  'mind.p.font': ['字体', 'Font', 'Fuente', 'Fonte'],
  'mind.p.bold': ['加粗', 'Bold', 'Negrita', 'Negrito'],
  'mind.p.italic': ['斜体', 'Italic', 'Cursiva', 'Itálico'],
  'mind.p.underline': ['下划线', 'Underline', 'Subrayado', 'Sublinhado'],
  'mind.p.strikethrough': ['删除线', 'Strikethrough', 'Tachado', 'Riscado'],
  'mind.p.align': ['对齐', 'Align', 'Alinear', 'Alinhar'],
  'mind.p.alignLeft': ['左对齐', 'Align left', 'Alinear a la izquierda', 'Alinhar à esquerda'],
  'mind.p.alignCenter': ['居中', 'Center', 'Centrar', 'Centralizar'],
  'mind.p.alignRight': ['右对齐', 'Align right', 'Alinear a la derecha', 'Alinhar à direita'],

  // 分支线（BranchSection）
  'mind.p.branchLine': ['分支线', 'Branch line', 'Línea de rama', 'Linha de ramo'],
  'mind.p.lineType': ['线型', 'Line style', 'Estilo de línea', 'Estilo de linha'],
  'mind.p.lineWidth': ['线宽', 'Line width', 'Grosor', 'Espessura'],
  'mind.p.color': ['颜色', 'Color', 'Color', 'Cor'],
  'mind.p.endPoint': ['终点', 'End', 'Extremo', 'Extremo'],
  'mind.p.curve': ['曲线', 'Curve', 'Curva', 'Curva'],
  'mind.p.straight': ['直线', 'Straight', 'Recta', 'Reta'],
  'mind.p.elbow': ['折线', 'Elbow', 'Angular', 'Quebrada'],
  'mind.p.arrow': ['箭头', 'Arrow', 'Flecha', 'Seta'],
  'mind.p.dot': ['圆点', 'Dot', 'Punto', 'Ponto'],

  // 样式预览
  'mind.p.preview': ['预览', 'Preview', 'Vista previa', 'Prévia'],
  'mind.p.nodePlaceholder': ['节点', 'Topic', 'Tema', 'Tópico'],

  // 节点旁插入浮层
  'mind.p.image': ['图片', 'Image', 'Imagen', 'Imagem'],
  'mind.p.enterReplace': ['Enter 替换', 'Enter to replace', 'Enter para sustituir', 'Enter para substituir'],
  'mind.p.enterAdd': ['Enter 添加', 'Enter to add', 'Enter para añadir', 'Enter para adicionar'],
  'mind.p.enterConfirm': ['Enter 确认', 'Enter to confirm', 'Enter para confirmar', 'Enter para confirmar'],
  'mind.p.notePlaceholder': [
    '输入笔记内容…（清空即删除笔记）',
    'Type a note… (clearing it deletes the note)',
    'Escribe una nota… (vaciarla la elimina)',
    'Digite uma nota… (se limpar o campo, a nota é excluída)',
  ],
  'mind.p.editLabel': ['修改标签', 'Edit label', 'Editar etiqueta', 'Editar etiqueta'],
  'mind.p.labelPlaceholder': [
    '输入标签，逗号分隔可多个',
    'Add labels, separated by commas',
    'Añade etiquetas separadas por comas',
    'Adicione etiquetas separadas por vírgulas',
  ],
  'mind.p.labelsAdded': [
    '已添加 {count} 个 · 空输入按退格删除末尾标签',
    '{count} added · press Backspace in an empty field to remove the last label',
    '{count} añadidas · pulsa Retroceso con el campo vacío para borrar la última',
    '{count} adicionadas · pressione Backspace com o campo vazio para excluir a última',
  ],
  'mind.p.nodeImage': ['节点图片', 'Topic image', 'Imagen del tema', 'Imagem do tópico'],
  'mind.p.nodeImageZoom': ['节点图片放大', 'Enlarged topic image', 'Imagen del tema ampliada', 'Imagem do tópico ampliada'],

  // 画布编辑浮层（可访问性名称）
  'mind.p.editNodeText': ['编辑节点文字', 'Edit topic text', 'Editar texto del tema', 'Editar texto do tópico'],
  'mind.p.editSummary': ['编辑概要', 'Edit summary', 'Editar resumen', 'Editar resumo'],
  'mind.p.editBoundary': ['编辑外框', 'Edit boundary', 'Editar marco', 'Editar moldura'],

  // 大纲视图
  'mind.p.expand': ['展开', 'Expand', 'Expandir', 'Expandir'],
  'mind.p.collapse': ['折叠', 'Collapse', 'Contraer', 'Recolher'],

  // 状态栏
  'mind.p.zoomPercent': [
    '缩放比例 {percent}%',
    'Zoom {percent}%',
    'Nivel de zoom: {percent}%',
    'Nível de zoom: {percent}%',
  ],
  'mind.p.fitShortcut': [
    '适应屏幕 (Cmd/Ctrl+0)',
    'Fit to screen (Cmd/Ctrl+0)',
    'Ajustar a la pantalla (Cmd/Ctrl+0)',
    'Ajustar à tela (Cmd/Ctrl+0)',
  ],

  // 起始页
  'mind.p.renameAria': ['重命名 {title}', 'Rename {title}', 'Renombrar {title}', 'Renomear {title}'],
} as const satisfies Record<string, Row>;

export const PANEL_MESSAGES: OfficeMessagesByLocale = buildMessages(ROWS);
