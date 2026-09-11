import { beforeEach, describe, expect, it } from 'vitest';
import { createDocument } from '../editor/nodeOps';
import { draftKey } from './autosave';
import { db, setMindMapStorageBackend } from './db';
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

  it('云端加载失败回退本地草稿；云端成功不读草稿', async () => {
    const d = createDocument('草稿版本');
    try {
      localStorage.setItem(draftKey(d.id), JSON.stringify(d));
      setMindMapStorageBackend({
        put: async () => {},
        get: async () => {
          throw new Error('网络异常');
        },
        remove: async () => {},
        list: async () => [],
        rename: async () => {},
      });
      // 云端抛错 → 回退草稿
      const viaDraft = await loadDocument(d.id);
      expect(viaDraft?.title).toBe('草稿版本');

      // 云端正常 → 返回云端内容，不读草稿
      setMindMapStorageBackend(null);
      await saveDocument({ ...d, title: '云端版本' });
      localStorage.setItem(draftKey(d.id), JSON.stringify({ ...d, title: '过期草稿' }));
      const viaCloud = await loadDocument(d.id);
      expect(viaCloud?.title).toBe('云端版本');
    } finally {
      setMindMapStorageBackend(null);
      localStorage.removeItem(draftKey(d.id));
    }
  });
});
