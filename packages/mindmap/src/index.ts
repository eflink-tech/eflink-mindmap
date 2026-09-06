/** @eflink-tech/mindmap 对外导出面：编辑器组件 + store + 持久化辅助 */
import './styles.css'

export { MindMapEditor } from './MindMapEditor'
export { useMindMapStore } from './store/mindMapStore'
export { useUiStore } from './store/uiStore'
export { useDocumentsStore } from './store/documentsStore'
export { setMindMapStorageBackend } from './core/persistence/db'
export { setEditorBackHref } from './core/chrome'
export type { MindMapStorageBackend } from './core/persistence/db'
export { setMindMapShareHandler } from './core/share/shareBridge'
export type { MindMapShareHandler } from './core/share/shareBridge'
export {
  db,
  saveDocument,
  loadDocument,
  listDocuments,
  deleteDocument,
  renameDocument,
} from './core/persistence/db'
export { createDocument } from './core/editor/nodeOps'
export type { MindMapDocument, MindMapNode, DocumentMeta } from './types/mindmap'
