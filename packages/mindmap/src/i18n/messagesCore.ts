// packages/mindmap/src/i18n/messagesCore.ts
// AI 面板 / 保存链路 / 存储与导入导出错误文案字典。数组列顺序固定为 [zh-CN, en, es, pt-BR]，
// 与 office-kit 的 OFFICE_LOCALES 一致；只收录 mind.ai. / mind.save. / mind.store. 前缀，
// 通用动作与状态复用 office-kit shell.* / action.*，导图基础键复用 messages.ts 的 mind.*。
import type { OfficeMessagesByLocale } from '@eflink-tech/office-kit';

type Row = readonly [string, string, string, string];

const ORDER = ['zh-CN', 'en', 'es', 'pt-BR'] as const;

const ROWS = {
  // 手动保存（saveNow）
  'mind.save.noDocument': [
    '当前没有可保存的文档',
    'There is no document to save',
    'No hay ningún documento que se pueda guardar',
    'Não há nenhum documento para salvar',
  ],
  'mind.save.failed': [
    '保存失败，请稍后重试',
    'Save failed; please try again later',
    'No se pudo guardar; inténtalo de nuevo más tarde',
    'Falha ao salvar; tente novamente mais tarde',
  ],

  // store 与导入导出错误
  'mind.store.renameFailed': [
    '重命名失败，请重试',
    'Rename failed; please try again',
    'No se pudo renombrar; inténtalo de nuevo',
    'Falha ao renomear; tente novamente',
  ],
  'mind.store.efm.invalidDoc': [
    '无效的思维导图文档',
    'Invalid mind map document',
    'Documento de mapa mental no válido',
    'Documento de mapa mental inválido',
  ],
  'mind.store.efm.missingField': [
    '文档缺少 {field}',
    'Document is missing {field}',
    'Al documento le falta {field}',
    'O documento não tem {field}',
  ],
  'mind.store.efm.invalidNode': [
    '节点无效: {key}',
    'Invalid node: {key}',
    'Nodo no válido: {key}',
    'Nó inválido: {key}',
  ],
  'mind.store.efm.rootMissing': [
    'rootId 不在 nodes 中',
    'rootId is not in nodes',
    'rootId no está en nodes',
    'rootId no está en nodes',
  ],
  'mind.store.efm.invalidViewport': [
    'viewport 无效',
    'Invalid viewport',
    'Viewport no válido',
    'Viewport inválido',
  ],
  'mind.store.efm.invalidJson': [
    '不是有效的 JSON',
    'Not valid JSON',
    'No es un JSON válido',
    'Não é um JSON válido',
  ],
  'mind.store.efm.unsupportedFormat': [
    '不支持的文件格式: {format}',
    'Unsupported file format: {format}',
    'Formato de archivo no compatible: {format}',
    'Formato de arquivo não compatível: {format}',
  ],

  // AI 服务与解析错误
  'mind.ai.err.notConfigured': [
    '请先在 AI 设置中配置接口地址、API Key 和模型',
    'Configure the API URL, API key and model in the AI settings first',
    'Configura primero la URL de la API, la clave y el modelo en los ajustes de IA',
    'Configure primeiro a URL da API, a chave e o modelo nas configurações de IA',
  ],
  'mind.ai.err.unauthorized': [
    'API Key 无效（401）',
    'Invalid API key (401)',
    'Clave de API no válida (401)',
    'Chave de API inválida (401)',
  ],
  'mind.ai.err.rateLimited': [
    '请求过于频繁或额度不足（429）',
    'Too many requests or quota exceeded (429)',
    'Demasiadas solicitudes o cuota agotada (429)',
    'Muitas solicitações ou cota esgotada (429)',
  ],
  'mind.ai.err.requestFailed': ['请求失败', 'Request failed', 'La solicitud falló', 'A solicitação falhou'],
  'mind.ai.err.unknown': ['未知错误', 'Unknown error', 'Error desconocido', 'Erro desconhecido'],
  'mind.ai.err.invalidResponse': [
    'AI 返回的内容不是有效的 JSON',
    'The AI response is not valid JSON',
    'La respuesta de la IA no es un JSON válido',
    'A resposta da IA não é um JSON válido',
  ],
  'mind.ai.err.badStructure': [
    '导图 JSON 结构不正确',
    'Invalid mind map JSON structure',
    'La estructura JSON del mapa mental no es correcta',
    'A estrutura JSON do mapa mental não é correta',
  ],
  'mind.ai.err.emptyContent': [
    'AI 未生成有效的导图内容',
    'The AI did not generate valid mind map content',
    'La IA no generó contenido válido para el mapa mental',
    'A IA não gerou conteúdo válido para o mapa mental',
  ],

  // AI 执行器（actionExecutor，会话内展示）
  'mind.ai.notReady': [
    '导图尚未就绪',
    'The mind map is not ready yet',
    'El mapa mental aún no está listo',
    'O mapa mental ainda não está pronto',
  ],
  'mind.ai.noNodesWritten': [
    '未能写入任何节点',
    'No topics could be written',
    'No se pudo escribir ningún nodo',
    'Nenhum nó pôde ser escrito',
  ],
  'mind.ai.applyFailed': ['应用失败', 'Failed to apply', 'No se pudo aplicar', 'Falha ao aplicar'],

  // AI 面板：头部 / 历史 / 设置
  'mind.ai.newChat': ['新对话', 'New chat', 'Nuevo chat', 'Nova conversa'],
  'mind.ai.title': ['AI 助手', 'AI Assistant', 'Asistente de IA', 'Assistente de IA'],
  'mind.ai.history': ['会话历史', 'Chat history', 'Historial de chats', 'Histórico de conversas'],
  'mind.ai.settings': ['AI 设置', 'AI settings', 'Ajustes de IA', 'Configurações de IA'],
  'mind.ai.collapse': ['收起', 'Collapse', 'Colapsar', 'Recolher'],
  'mind.ai.backToChat': ['返回对话', 'Back to chat', 'Volver al chat', 'Voltar à conversa'],
  'mind.ai.noHistory': [
    '暂无历史会话',
    'No saved conversations',
    'No hay conversaciones guardadas',
    'Nenhuma conversa guardada',
  ],
  'mind.ai.settingsIntro': [
    '配置任意 OpenAI 兼容接口（如通义千问、DeepSeek、Kimi）。密钥仅保存在本地浏览器（IndexedDB），不会上传。',
    'Use any OpenAI-compatible API (e.g. Qwen, DeepSeek, Kimi). Keys are stored only in your local browser (IndexedDB) and never uploaded.',
    'Configura cualquier API compatible con OpenAI (p. ej. Qwen, DeepSeek, Kimi). Las claves se guardan solo en tu navegador (IndexedDB) y no se suben.',
    'Configure qualquer API compatível com OpenAI (por exemplo, Qwen, DeepSeek, Kimi). As chaves ficam salvas apenas no seu navegador (IndexedDB) e nunca são enviadas.',
  ],
  'mind.ai.baseUrl': ['接口地址', 'API URL', 'URL de la API', 'URL da API'],
  'mind.ai.model': ['模型', 'Model', 'Modelo', 'Modelo'],
  'mind.ai.saveSettings': ['保存设置', 'Save settings', 'Guardar ajustes', 'Salvar configurações'],

  // AI 面板：生成导图流程
  'mind.ai.generateMap': [
    'AI 生成导图',
    'AI mind map generator',
    'Generador de mapas mentales con IA',
    'Gerador de mapa mental com IA',
  ],
  'mind.ai.generate': ['生成导图', 'Generate mind map', 'Generar mapa mental', 'Gerar mapa mental'],
  'mind.ai.topicPlaceholder': [
    '输入主题，如：产品发布计划',
    'Enter a topic, e.g. product launch plan',
    'Introduce un tema, p. ej. plan de lanzamiento',
    'Insira um tema, por exemplo, plano de lançamento',
  ],
  'mind.ai.requirementsPlaceholder': [
    '补充要求（可选）：角度、层级、数量…',
    'Extra requirements (optional): angle, depth, count…',
    'Requisitos adicionales (opcional): enfoque, niveles, cantidad…',
    'Requisitos adicionais (opcional): ângulo, níveis, quantidade…',
  ],
  'mind.ai.generatingBtn': ['生成中…', 'Generating…', 'Generando…', 'Gerando…'],
  'mind.ai.generateBtn': ['生成', 'Generate', 'Generar', 'Gerar'],
  'mind.ai.applyToMap': ['应用到导图', 'Apply to mind map', 'Aplicar al mapa mental', 'Aplicar ao mapa mental'],

  // AI 面板：会话区
  'mind.ai.notConfiguredHint': [
    '尚未配置 AI 接口，点击右上角 ⚙️ 进行设置。',
    'AI is not configured yet; click ⚙️ in the top-right corner to set it up.',
    'La IA aún no está configurada; haz clic en ⚙️ arriba a la derecha para configurarla.',
    'A IA ainda não está configurada; clique em ⚙️ no canto superior direito para configurá-la.',
  ],
  'mind.ai.welcomeHint': [
    '你可以让我生成整张导图，或选中节点后用下方快捷操作展开分支。',
    'Ask me to generate a whole mind map, or select a topic and use the quick actions below to expand its branches.',
    'Puedes pedirme que genere todo el mapa mental, o seleccionar un nodo y usar las acciones rápidas de abajo para expandir sus ramas.',
    'Você pode pedir que eu gere o mapa mental inteiro, ou selecionar um tópico e usar as ações rápidas abaixo para expandir seus ramos.',
  ],
  'mind.ai.inputPlaceholder': [
    '输入消息，Enter 发送',
    'Type a message; press Enter to send',
    'Escribe un mensaje; Enter para enviar',
    'Digite uma mensagem; Enter para enviar',
  ],
  'mind.ai.stop': ['停止', 'Stop', 'Detener', 'Parar'],
  'mind.ai.send': ['发送', 'Send', 'Enviar', 'Enviar'],

  // AI 面板：动态消息（插值变量，不做句子拼接）
  'mind.ai.genTitle': [
    '生成导图：{topic}',
    'Generate mind map: {topic}',
    'Generar mapa mental: {topic}',
    'Gerar mapa mental: {topic}',
  ],
  'mind.ai.expandTitle': [
    '{template}：{node}',
    '{template}: {node}',
    '{template}: {node}',
    '{template}: {node}',
  ],
  'mind.ai.generatingChars': [
    '正在生成…（{count} 字）',
    'Generating… ({count} characters)',
    'Generando… ({count} caracteres)',
    'Gerando… ({count} caracteres)',
  ],
  'mind.ai.subBranches': [
    '（{count} 子分支）',
    ' ({count} sub-branches)',
    ' ({count} subramas)',
    ' ({count} sub-ramos)',
  ],
  'mind.ai.generatedSummary': [
    '已生成「{root}」：{nodes} 个节点，{branches} 条主分支。',
    'Generated "{root}": {nodes} topics, {branches} main branches.',
    'Se generó «{root}»: {nodes} nodos, {branches} ramas principales.',
    'Gerado "{root}": {nodes} tópicos, {branches} ramos principais.',
  ],
  'mind.ai.appliedCount': [
    '已应用 {count} 个节点',
    'Applied {count} topics',
    'Se aplicaron {count} nodos',
    '{count} tópicos aplicados',
  ],
  'mind.ai.appliedToMap': [
    '已应用到导图（新增 {count} 个节点）。可撤销（Ctrl+Z）回退。',
    'Applied to the mind map ({count} new topics). Undo (Ctrl+Z) to revert.',
    'Aplicado al mapa mental ({count} nodos nuevos). Puedes deshacer (Ctrl+Z).',
    'Aplicado ao mapa mental ({count} novos tópicos). Você pode desfazer (Ctrl+Z).',
  ],
  'mind.ai.addedCount': [
    '已新增 {count} 个节点',
    'Added {count} topics',
    'Se añadieron {count} nodos',
    '{count} tópicos adicionados',
  ],
  'mind.ai.expandedUnder': [
    '已在「{node}」下新增 {count} 个节点。可撤销（Ctrl+Z）回退。',
    'Added {count} topics under "{node}". Undo (Ctrl+Z) to revert.',
    'Se añadieron {count} nodos bajo «{node}». Puedes deshacer (Ctrl+Z).',
    'Foram adicionados {count} tópicos sob "{node}". Você pode desfazer (Ctrl+Z).',
  ],
  'mind.ai.selectNodeFirst': [
    '请先选中要展开的节点',
    'Select the topic to expand first',
    'Selecciona primero el nodo que quieres expandir',
    'Selecione primeiro o tópico que deseja expandir',
  ],

  // AI 面板：内置快捷模板名（chip 展示；content 是提示词，保持中文不译）
  'mind.ai.tpl.expand': ['展开分支', 'Expand branch', 'Expandir rama', 'Expandir ramo'],
  'mind.ai.tpl.inspire': ['头脑风暴', 'Brainstorm', 'Lluvia de ideas', 'Tempestade de ideias'],
  'mind.ai.tpl.prosCons': ['利弊分析', 'Pros & cons', 'Análisis de pros y contras', 'Análise de prós e contras'],
} as const satisfies Record<string, Row>;

function build(): OfficeMessagesByLocale {
  const out: OfficeMessagesByLocale = { 'zh-CN': {}, en: {}, es: {}, 'pt-BR': {} };
  for (const [key, values] of Object.entries(ROWS)) {
    ORDER.forEach((locale, index) => {
      out[locale]![key] = values[index];
    });
  }
  return out;
}

export const CORE_MESSAGES: OfficeMessagesByLocale = build();
