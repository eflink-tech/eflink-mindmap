// packages/mindmap/src/core/persistence/keys.ts
// 本编辑器所有 localStorage key 的唯一定义处（迁移前的旧 key 见 ./legacy.ts）。

/** 最近打开文档 id */
export const LAST_DOC_KEY = 'doculuma:mindmap:last-doc';

/** 本地草稿 key 前缀，完整 key 由 draftKey(docId) 拼出（见 ./autosave.ts） */
export const DRAFT_KEY_PREFIX = 'doculuma:draft:mindmap:';
