import Dexie from 'dexie';
import { isLegacyImportDone, markLegacyImportDone, readLegacyIndexedDb } from '@eflink-tech/office-kit';
import { LEGACY_MINDMAP_DB_NAME, LEGACY_MINDMAP_STORES } from './legacy';
import { LEGACY_DOCUMENTS_IMPORT_DONE_KEY } from './keys';
import { readDraft } from './autosave';
import type { DocumentMeta, MindMapDocument } from '../../types/mindmap';

/** Dexie package `exports` omit types; cast keeps IndexedDB API typed under bundler resolution. */
type DocumentsTable = {
  put(doc: MindMapDocument): Promise<string>;
  get(id: string): Promise<MindMapDocument | undefined>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
  count(): Promise<number>;
  bulkPut(docs: MindMapDocument[]): Promise<void>;
  update(id: string, changes: Partial<MindMapDocument>): Promise<number>;
  orderBy(index: keyof MindMapDocument | string): {
    reverse(): { toArray(): Promise<MindMapDocument[]> };
  };
};

type MindMapDBInstance = {
  version(v: number): { stores(schema: Record<string, string | null>): unknown };
  documents: DocumentsTable;
};

const DexieBase = Dexie as unknown as new (name: string) => MindMapDBInstance;

class MindMapDB extends DexieBase {
  declare documents: DocumentsTable;

  constructor() {
    super('doculuma-mindmap');
    this.version(1).stores({ documents: 'id, title, updatedAt' });
  }
}

export const db = new MindMapDB();

/**
 * 旧库（品牌迁移前的文档库，库名/仓库名见 ./legacy.ts）数据一次性导入，仅在新库 documents 表为空时执行。
 * 只读旧库、不删除，失败只打日志：任何情况都不阻塞编辑器。
 * 成功或"跳过"都落一次性标记（isLegacyImportDone）：否则用户删光文档后空表判据再次命中，
 * 旧数据会在下次启动"复活"且永远删不干净；bulkPut 失败不落标记，下个会话自然重试。
 */
let legacyImport: Promise<void> | null = null;

export function ensureLegacyImport(): Promise<void> {
  if (!legacyImport) {
    legacyImport = (async () => {
      try {
        await importLegacyRows();
      } catch (error) {
        console.error('导入旧版导图数据失败:', error);
      }
    })();
  }
  return legacyImport;
}

async function importLegacyRows(): Promise<void> {
  if (isLegacyImportDone(LEGACY_DOCUMENTS_IMPORT_DONE_KEY)) return;
  if ((await db.documents.count()) > 0) {
    // 新库已有数据：以新库为准，同样落标记防止之后删光时复活
    markLegacyImportDone(LEGACY_DOCUMENTS_IMPORT_DONE_KEY);
    return;
  }
  const legacy = await readLegacyIndexedDb(LEGACY_MINDMAP_DB_NAME, LEGACY_MINDMAP_STORES);
  if (!legacy) return; // 旧库不存在：保持现状，不落标记
  const rows = legacy.documents as MindMapDocument[] | undefined;
  if (!rows?.length) {
    markLegacyImportDone(LEGACY_DOCUMENTS_IMPORT_DONE_KEY); // 旧表为空：跳过并落标记
    return;
  }
  await db.documents.bulkPut(rows);
  markLegacyImportDone(LEGACY_DOCUMENTS_IMPORT_DONE_KEY);
}

/**
 * 可切换存储后端：默认 Dexie(IndexedDB)；宿主注入后所有落库走宿主实现（如后端 API）。
 */
export interface MindMapStorageBackend {
  /** 不存在则创建，存在则整体覆盖 */
  put(doc: MindMapDocument): Promise<void>;
  get(id: string): Promise<MindMapDocument | undefined>;
  remove(id: string): Promise<void>;
  /** 按更新时间倒序的元信息列表 */
  list(): Promise<DocumentMeta[]>;
  /** 仅改标题 */
  rename(id: string, title: string): Promise<void>;
}

let backendOverride: MindMapStorageBackend | null = null;

/** 注册自定义存储后端（宿主在挂载编辑器前调用） */
export function setMindMapStorageBackend(backend: MindMapStorageBackend | null): void {
  backendOverride = backend;
}

export async function saveDocument(doc: MindMapDocument): Promise<void> {
  if (backendOverride) return backendOverride.put(doc);
  await ensureLegacyImport();
  await db.documents.put(doc);
}

export async function loadDocument(id: string): Promise<MindMapDocument | undefined> {
  if (backendOverride) {
    try {
      // 云端加载成功：直接返回云端内容，不读本地草稿
      return await backendOverride.get(id);
    } catch (error) {
      // 云端加载失败（网络异常/后端错误）：回退本地草稿兜底；草稿也没有则继续抛错
      const draft = readDraft(id);
      if (draft) return draft;
      throw error;
    }
  }
  await ensureLegacyImport();
  return db.documents.get(id);
}

export async function listDocuments(): Promise<DocumentMeta[]> {
  if (backendOverride) return backendOverride.list();
  await ensureLegacyImport();
  const all = await db.documents.orderBy('updatedAt').reverse().toArray();
  return all.map((doc: MindMapDocument) => ({
    id: doc.id,
    title: doc.title,
    updatedAt: doc.updatedAt,
  }));
}

export async function deleteDocument(id: string): Promise<void> {
  if (backendOverride) return backendOverride.remove(id);
  await db.documents.delete(id);
}

export async function renameDocument(id: string, title: string): Promise<void> {
  if (backendOverride) return backendOverride.rename(id, title);
  await db.documents.update(id, { title, updatedAt: Date.now() });
}
