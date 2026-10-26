// packages/mindmap/src/core/persistence/legacy.ts
// 一次性把 efLink 品牌时期的本地数据搬到 doculuma 命名空间。
// 这里是仓库中唯一允许出现旧 key / 旧库名字面量的地方；新代码只读 ./keys.ts 的新常量，
// 需要旧标识符做迁移的模块（core/persistence/db.ts、ai/db.ts）从这里导入。
import { migrateLocalStorageKey, migrateLocalStoragePrefix } from '@eflink-tech/office-kit';
import { DRAFT_KEY_PREFIX, LAST_DOC_KEY } from './keys';

/** 旧「最近打开文档」key */
export const LEGACY_LAST_DOC_KEY = 'efmindmap:lastDoc';

/** 旧本地草稿 key 前缀 */
export const LEGACY_DRAFT_KEY_PREFIX = 'eflink:draft:mindmap:';

/** 旧文档库库名（Dexie） */
export const LEGACY_MINDMAP_DB_NAME = 'efmindmap';

/** 旧文档库的对象仓库 */
export const LEGACY_MINDMAP_STORES = ['documents'] as const;

/** 旧 AI 数据库库名（Dexie） */
export const LEGACY_AI_DB_NAME = 'eflink-mindmap-ai';

/** 旧 AI 库的对象仓库（与 ai/db.ts 的 version(1).stores 一致） */
export const LEGACY_AI_STORES = ['conversations', 'settings', 'templates'] as const;

/**
 * 执行 localStorage 命名空间迁移（幂等，可在模块加载时直接调用）。
 * 语义为「改名」：新 key 已有值时保留新值、丢弃旧值；localStorage 不可用时静默跳过。
 */
export function migrateLegacyLocalStorage(): void {
  migrateLocalStorageKey(LEGACY_LAST_DOC_KEY, LAST_DOC_KEY);
  migrateLocalStoragePrefix(LEGACY_DRAFT_KEY_PREFIX, DRAFT_KEY_PREFIX);
}
