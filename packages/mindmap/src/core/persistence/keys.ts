// packages/mindmap/src/core/persistence/keys.ts
// 本编辑器所有 localStorage key 的唯一定义处（迁移前的旧 key 见 ./legacy.ts）。

/** 最近打开文档 id */
export const LAST_DOC_KEY = 'doculuma:mindmap:last-doc';

/** 本地草稿 key 前缀，完整 key 由 draftKey(docId) 拼出（见 ./autosave.ts） */
export const DRAFT_KEY_PREFIX = 'doculuma:draft:mindmap:';

/** 旧文档库（efmindmap）一次性导入完成标记（防用户删光文档后旧数据"复活"，见 ./db.ts） */
export const LEGACY_DOCUMENTS_IMPORT_DONE_KEY = 'doculuma:mindmap:legacy-imported:documents';

/** 旧 AI 库各表一次性导入完成标记（防删光会话后旧数据"复活"，见 ../../ai/db.ts） */
export const LEGACY_AI_IMPORT_DONE_KEYS = {
  conversations: 'doculuma:mindmap:legacy-ai-imported:conversations',
  settings: 'doculuma:mindmap:legacy-ai-imported:settings',
  templates: 'doculuma:mindmap:legacy-ai-imported:templates',
} as const;
