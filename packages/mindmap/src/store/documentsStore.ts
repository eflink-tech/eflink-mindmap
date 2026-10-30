import { create } from 'zustand';
import { saveDocument, deleteDocument as dbDelete, listDocuments, renameDocument } from '../core/persistence/db';
import { createDocument } from '../core/editor/nodeOps';
import { buildTemplateDocument, type TemplateSpec } from '../core/templates/catalog';
import { mindT } from '../i18n/runtime';
import type { DocumentMeta, MindMapDocument } from '../types/mindmap';

interface DocumentsStore {
  docs: DocumentMeta[];
  /** 当前打开文档所属工作簿的全部画布（按更新时间升序，标签顺序稳定） */
  sheets: DocumentMeta[];
  workbookId: string | null;
  refresh: () => Promise<void>;
  createDoc: () => Promise<MindMapDocument>;
  /** 按内置模板新建文档（含主题、布局与初始节点） */
  createFromTemplate: (spec: TemplateSpec) => Promise<MindMapDocument>;
  removeDoc: (id: string) => Promise<void>;
  renameDoc: (id: string, title: string) => Promise<void>;
  /** 载入文档所属工作簿的画布列表（打开文档后调用） */
  loadSheets: (doc: MindMapDocument) => Promise<void>;
  /** 在当前工作簿中新建画布，返回新文档（调用方负责打开） */
  createSheet: (doc: MindMapDocument) => Promise<MindMapDocument>;
  removeSheet: (id: string) => Promise<void>;
  renameSheet: (id: string, title: string) => Promise<void>;
  /** 删除多个文档（起始页按工作簿整体删除） */
  removeMany: (ids: string[]) => Promise<void>;
}

/** 旧文档没有 workbookId：视为独立工作簿 */
export function workbookOf(doc: Pick<MindMapDocument, 'id' | 'workbookId'>): string {
  return doc.workbookId ?? doc.id;
}

/** 同一工作簿的文档按创建时间升序，保证标签顺序不随保存时间跳动 */
function sortSheets(metas: DocumentMeta[]): DocumentMeta[] {
  return [...metas].sort(
    (a, b) =>
      (a.createdAt ?? a.updatedAt) - (b.createdAt ?? b.updatedAt) ||
      // 同一毫秒创建（连续新建画布）时按更新时间、再按 id 保证顺序稳定
      a.updatedAt - b.updatedAt ||
      a.id.localeCompare(b.id),
  );
}

export const useDocumentsStore = create<DocumentsStore>((set, get) => {
  /** 重新读取文档列表，并按当前工作簿同步画布标签 */
  const sync = async (): Promise<void> => {
    const metas = await listDocuments();
    const { workbookId } = get();
    set({
      docs: metas,
      sheets: workbookId
        ? sortSheets(metas.filter((meta) => (meta.workbookId ?? meta.id) === workbookId))
        : get().sheets,
    });
  };

  return {
    docs: [],
    sheets: [],
    workbookId: null,
    refresh: sync,
    createDoc: async () => {
      const doc = createDocument();
      await saveDocument(doc);
      await sync();
      return doc;
    },
    createFromTemplate: async (spec) => {
      const doc = buildTemplateDocument(spec);
      await saveDocument(doc);
      await sync();
      return doc;
    },
    removeDoc: async (id) => {
      await dbDelete(id);
      await sync();
    },
    renameDoc: async (id, title) => {
      await renameDocument(id, title);
      await sync();
    },
    loadSheets: async (doc) => {
      set({ workbookId: workbookOf(doc) });
      await sync();
    },
    createSheet: async (doc) => {
      const workbookId = workbookOf(doc);
      const existing = get().sheets.length;
      const sheet = createDocument(mindT('mind.sheet.defaultTitle', { n: existing + 1 }));
      const next: MindMapDocument = { ...sheet, workbookId };
      await saveDocument(next);
      await sync();
      return next;
    },
    removeSheet: async (id) => {
      await dbDelete(id);
      await sync();
    },
    renameSheet: async (id, title) => {
      await renameDocument(id, title);
      await sync();
    },
    removeMany: async (ids) => {
      await Promise.all(ids.map((id) => dbDelete(id)));
      await sync();
    },
  };
});
