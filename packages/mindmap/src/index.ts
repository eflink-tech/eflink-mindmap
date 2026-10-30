/** @eflink-tech/mindmap 对外导出面：编辑器组件 + store + 持久化辅助 */
// 顶栏/菜单栏样式来自 office-kit：宿主只引入 dist/styles.css，必须在此显式引入才会打进产物
import '@eflink-tech/office-kit/styles.css'
import './styles.css'
import { migrateLegacyLocalStorage } from './core/persistence/legacy'

// 模块加载即执行一次：把 efLink 时期的 lastDoc / 本地草稿搬到 doculuma 命名空间（幂等、静默失败）
migrateLegacyLocalStorage()

export { MindMapEditor } from './MindMapEditor'
export type { MindMapEditorProps } from './MindMapEditor'
// 品牌切换：'doculuma' | 'eflink' 内置品牌（本地存储命名空间始终是 doculuma:*，与品牌无关）
export { builtinEditorBrand, resolveEditorBrandId, EDITOR_BRAND_IDS } from './brand'
export type { EditorBrandId } from './brand'
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
export { parseXmind } from './core/import/xmind'
export type { XmindImportOptions } from './core/import/xmind'
export { MIND_MESSAGES, setMindLocale, getMindLocale, mindT } from './i18n'
export type { OfficeLocale } from '@eflink-tech/office-kit'
export type { MindMapDocument, MindMapNode, DocumentMeta } from './types/mindmap'
