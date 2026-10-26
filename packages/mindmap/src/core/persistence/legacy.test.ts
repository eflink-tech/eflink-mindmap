// efLink → DocuLuma 命名空间迁移的回归测试：localStorage 一次性改名 + 旧 IndexedDB 只读导入。
import { beforeEach, describe, expect, it } from 'vitest';
import { createDocument } from '../editor/nodeOps';
import { DRAFT_KEY_PREFIX, LAST_DOC_KEY } from './keys';
import { draftKey } from './autosave';
import { ensureLegacyImport, loadDocument } from './db';
import { migrateLegacyLocalStorage } from './legacy';

/** 用裸 IndexedDB API 造一个旧库（模拟 efLink 时代用户浏览器里的数据） */
function seedLegacyDb(name: string, store: string, rows: unknown[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(store, { keyPath: 'id' });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const legacy = request.result;
      const tx = legacy.transaction(store, 'readwrite');
      for (const row of rows) tx.objectStore(store).put(row);
      tx.oncomplete = () => {
        legacy.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
  });
}

describe('migrateLegacyLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lastDoc 改名：值搬到新 key，旧 key 消失', () => {
    localStorage.setItem('efmindmap:lastDoc', 'doc-1');
    migrateLegacyLocalStorage();
    expect(localStorage.getItem(LAST_DOC_KEY)).toBe('doc-1');
    expect(localStorage.getItem('efmindmap:lastDoc')).toBeNull();
  });

  it('草稿按前缀整体改名', () => {
    localStorage.setItem('eflink:draft:mindmap:a', '{"id":"a"}');
    localStorage.setItem('eflink:draft:mindmap:b', '{"id":"b"}');
    migrateLegacyLocalStorage();
    expect(localStorage.getItem(draftKey('a'))).toBe('{"id":"a"}');
    expect(localStorage.getItem(draftKey('b'))).toBe('{"id":"b"}');
    expect(localStorage.getItem('eflink:draft:mindmap:a')).toBeNull();
    const remaining = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) ?? '');
    expect(remaining.some((k) => k.startsWith('eflink:'))).toBe(false);
  });

  it('新 key 已有值时不覆盖，仅清理旧 key（幂等）', () => {
    localStorage.setItem('efmindmap:lastDoc', 'old');
    localStorage.setItem(LAST_DOC_KEY, 'new');
    migrateLegacyLocalStorage();
    migrateLegacyLocalStorage();
    expect(localStorage.getItem(LAST_DOC_KEY)).toBe('new');
    expect(localStorage.getItem('efmindmap:lastDoc')).toBeNull();
  });

  it('没有旧数据时不动新 key', () => {
    localStorage.setItem(LAST_DOC_KEY, 'keep');
    migrateLegacyLocalStorage();
    expect(localStorage.getItem(LAST_DOC_KEY)).toBe('keep');
    expect(localStorage.getItem(DRAFT_KEY_PREFIX)).toBeNull();
  });
});

describe('旧 IndexedDB 导入', () => {
  it('新库为空时读一次旧 efmindmap 库，且保留旧库', async () => {
    const doc = createDocument('旧版文档');
    await seedLegacyDb('efmindmap', 'documents', [doc]);
    await ensureLegacyImport();
    expect((await loadDocument(doc.id))?.title).toBe('旧版文档');
    const names = (await indexedDB.databases()).map((item) => item.name);
    expect(names).toContain('efmindmap');
  });
});
