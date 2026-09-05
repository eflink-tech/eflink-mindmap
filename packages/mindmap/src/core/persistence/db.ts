import Dexie from 'dexie';
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

export async function saveDocument(doc: MindMapDocument): Promise<void> {
  await db.documents.put(doc);
}

export async function loadDocument(id: string): Promise<MindMapDocument | undefined> {
  return db.documents.get(id);
}

export async function listDocuments(): Promise<DocumentMeta[]> {
  const all = await db.documents.orderBy('updatedAt').reverse().toArray();
  return all.map((doc: MindMapDocument) => ({
    id: doc.id,
    title: doc.title,
    updatedAt: doc.updatedAt,
  }));
}

export async function deleteDocument(id: string): Promise<void> {
  await db.documents.delete(id);
}

export async function renameDocument(id: string, title: string): Promise<void> {
  await db.documents.update(id, { title, updatedAt: Date.now() });
}
