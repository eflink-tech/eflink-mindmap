/** @eflink-tech/mindmap 对外导出面：编辑器组件 + store + 持久化辅助 */
// 顶栏/菜单栏样式来自 office-kit：库构建会外部化该依赖，必须在此显式引入才会打进 dist/styles.css
import '@eflink-tech/office-kit/styles.css'
import './styles.css'
import { migrateLegacyLocalStorage } from './core/persistence/legacy'

// 模块加载即执行一次：把 efLink 时期的 lastDoc / 本地草稿搬到 doculuma 命名空间（幂等、静默失败）
migrateLegacyLocalStorage()

export { MindMapEditor } from './MindMapEditor'
export { useMindMapStore } from './store/mindMapStore'
export { useUiStore } from './store/uiStore'
export { useDocumentsStore } from './store/documentsStore'
export { setMindMapStorageBackend } from './core/persistence/db'
export { setEditorBackHref } from './core/chrome'
export type { MindMapStorageBackend } from './core/persistence/db'
export { setMindMapShareHandler } from './core/share/shareBridge'
export type { MindMapShareHandler, MindMapShareResult } from './core/share/shareBridge'
export {
  db,
  saveDocument,
  loadDocument,
  listDocuments,
  deleteDocument,
  renameDocument,
} from './core/persistence/db'
export { createDocument } from './core/editor/nodeOps'
export { MIND_MESSAGES, setMindLocale, getMindLocale, mindT } from './i18n'
export type { OfficeLocale } from '@eflink-tech/office-kit'
export type { MindMapDocument, MindMapNode, DocumentMeta } from './types/mindmap'
