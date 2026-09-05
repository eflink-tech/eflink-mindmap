import { beforeEach, describe, expect, it } from 'vitest';
import { createDocument } from '../editor/nodeOps';
import { db } from './db';
import {
  deleteDocument, listDocuments, loadDocument, saveDocument,
} from './db';

beforeEach(async () => {
  await db.documents.clear();
});

describe('persistence', () => {
  it('保存后可读取，列表按 updatedAt 倒序', async () => {
    const d1 = createDocument('一');
    const d2 = { ...createDocument('二'), updatedAt: d1.updatedAt + 1000 };
    await saveDocument(d1);
    await saveDocument(d2);
    const list = await listDocuments();
    expect(list.map((m) => m.title)).toEqual(['二', '一']);
    const loaded = await loadDocument(d1.id);
    expect(loaded?.title).toBe('一');
  });

  it('删除后不可读取', async () => {
    const d = createDocument();
    await saveDocument(d);
    await deleteDocument(d.id);
    expect(await loadDocument(d.id)).toBeUndefined();
  });

  it('不存在的 id 返回 undefined/null 而非抛错', async () => {
    expect(await loadDocument('missing')).toBeUndefined();
  });
});
