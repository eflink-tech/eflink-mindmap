import { create } from 'zustand';
import { saveDocument, deleteDocument as dbDelete, listDocuments, renameDocument } from '../core/persistence/db';
import { createDocument } from '../core/editor/nodeOps';
import type { DocumentMeta, MindMapDocument } from '../types/mindmap';

interface DocumentsStore {
  docs: DocumentMeta[];
  refresh: () => Promise<void>;
  createDoc: () => Promise<MindMapDocument>;
  removeDoc: (id: string) => Promise<void>;
  renameDoc: (id: string, title: string) => Promise<void>;
}

export const useDocumentsStore = create<DocumentsStore>((set, get) => ({
  docs: [],
  refresh: async () => set({ docs: await listDocuments() }),
  createDoc: async () => {
    const doc = createDocument();
    await saveDocument(doc);
    await get().refresh();
    return doc;
  },
  removeDoc: async (id) => {
    await dbDelete(id);
    await get().refresh();
  },
  renameDoc: async (id, title) => {
    await renameDocument(id, title);
    await get().refresh();
  },
}));
