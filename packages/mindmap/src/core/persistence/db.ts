import Dexie from 'dexie';
import { readDraft } from './autosave';
import type { DocumentMeta, MindMapDocument } from '../../types/mindmap';

/** Dexie package `exports` omit types; cast keeps IndexedDB API typed under bundler resolution. */
type DocumentsTable = {
  put(doc: MindMapDocument): Promise<string>;
  get(id: string): Promise<MindMapDocument | undefined>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
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
    super('efmindmap');
    this.version(1).stores({ documents: 'id, title, updatedAt' });
  }
}

export const db = new MindMapDB();

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
  return db.documents.get(id);
}

export async function listDocuments(): Promise<DocumentMeta[]> {
  if (backendOverride) return backendOverride.list();
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
