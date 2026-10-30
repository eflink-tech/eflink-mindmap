import { beforeEach, describe, expect, it } from 'vitest';
import { createDocument } from '../core/editor/nodeOps';
import { db, listDocuments, loadDocument, saveDocument } from '../core/persistence/db';
import { useDocumentsStore, workbookOf } from './documentsStore';

beforeEach(async () => {
  await db.documents.clear();
  useDocumentsStore.setState({ docs: [], sheets: [], workbookId: null });
});

describe('documentsStore 多画布', () => {
  it('旧文档没有 workbookId 时视为独立工作簿', () => {
    expect(workbookOf({ id: 'a', workbookId: undefined })).toBe('a');
    expect(workbookOf({ id: 'a', workbookId: 'w1' })).toBe('w1');
  });

  it('createSheet 继承工作簿并出现在 sheets 中，按创建顺序排列', async () => {
    const first = createDocument('首页');
    await saveDocument(first);
    await useDocumentsStore.getState().loadSheets(first);
    expect(useDocumentsStore.getState().sheets.map((s) => s.title)).toEqual(['首页']);

    const second = await useDocumentsStore.getState().createSheet(first);
    expect(second.workbookId).toBe(first.id);
    expect(await loadDocument(second.id)).toBeTruthy();

    const third = await useDocumentsStore.getState().createSheet(first);
    const titles = useDocumentsStore.getState().sheets.map((s) => s.title);
    expect(titles).toEqual(['首页', '画布 2', '画布 3']);
    expect(new Set([second.id, third.id, first.id])).toEqual(
      new Set(useDocumentsStore.getState().sheets.map((s) => s.id)),
    );
  });

  it('loadSheets 只取同一工作簿的文档，不混入其它工作簿', async () => {
    const a = createDocument('A');
    const b = { ...createDocument('B'), workbookId: a.id, createdAt: a.createdAt + 1 };
    const other = createDocument('其它');
    await saveDocument(a);
    await saveDocument(b);
    await saveDocument(other);

    await useDocumentsStore.getState().loadSheets(b);
    expect(useDocumentsStore.getState().workbookId).toBe(a.id);
    expect(useDocumentsStore.getState().sheets.map((s) => s.title)).toEqual(['A', 'B']);
  });

  it('removeSheet 与 removeMany 都会同步 sheets 与 docs', async () => {
    const a = createDocument('A');
    const b = { ...createDocument('B'), workbookId: a.id, createdAt: a.createdAt + 1 };
    await saveDocument(a);
    await saveDocument(b);
    await useDocumentsStore.getState().loadSheets(a);

    await useDocumentsStore.getState().removeSheet(b.id);
    expect(useDocumentsStore.getState().sheets.map((s) => s.title)).toEqual(['A']);
    expect(await loadDocument(b.id)).toBeUndefined();
    expect((await listDocuments()).map((m) => m.title)).toEqual(['A']);

    const c = { ...createDocument('C'), workbookId: a.id, createdAt: a.createdAt + 2 };
    await saveDocument(c);
    await useDocumentsStore.getState().loadSheets(a);
    await useDocumentsStore.getState().removeMany([a.id, c.id]);
    expect(useDocumentsStore.getState().sheets).toEqual([]);
    expect(await listDocuments()).toEqual([]);
  });

  it('renameSheet 持久化标题并刷新列表', async () => {
    const a = createDocument('A');
    const b = { ...createDocument('B'), workbookId: a.id, createdAt: a.createdAt + 1 };
    await saveDocument(a);
    await saveDocument(b);
    await useDocumentsStore.getState().loadSheets(a);

    await useDocumentsStore.getState().renameSheet(b.id, '分支图');
    expect(useDocumentsStore.getState().sheets.map((s) => s.title)).toEqual(['A', '分支图']);
    expect((await loadDocument(b.id))?.title).toBe('分支图');
  });
});
