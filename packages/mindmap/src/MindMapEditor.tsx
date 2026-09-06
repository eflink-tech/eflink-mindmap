// packages/mindmap/src/MindMapEditor.tsx
// 组件库入口组件：挂载即用，自动打开上次文档或新建（沿用原 App 启动流程）
import { useEffect, useRef, useState } from 'react';
import { Editor } from './components/Editor';
import { loadDocument } from './core/persistence/db';
import { useDocumentsStore } from './store/documentsStore';
import { useMindMapStore } from './store/mindMapStore';
import { useUiStore } from './store/uiStore';

const LAST_DOC_KEY = 'efmindmap:lastDoc';

/** 打开已有文档或新建，并进入编辑器 */
async function openOrCreateEditor(bootDocId?: string) {
  // 指定启动文档（如分享查看页的只读快照）：加载失败不回退访客本地 lastDoc，避免串文档
  if (bootDocId) {
    try {
      const doc = await loadDocument(bootDocId);
      if (doc) {
        useMindMapStore.getState().open(doc);
        useUiStore.getState().setView('editor');
        return;
      }
    } catch (err) {
      console.error('加载指定启动文档失败', err);
    }
    const created = await useDocumentsStore.getState().createDoc();
    useMindMapStore.getState().open(created);
    useUiStore.getState().setView('editor');
    return;
  }

  const last = localStorage.getItem(LAST_DOC_KEY);
  if (last) {
    try {
      const doc = await loadDocument(last);
      if (doc) {
        useMindMapStore.getState().open(doc);
        useUiStore.getState().setView('editor');
        return;
      }
    } catch (err) {
      console.error('加载上次文档失败', err);
    }
  }

  // 无上次文档（或加载失败）→ 直接新建并进入编辑
  const doc = await useDocumentsStore.getState().createDoc();
  useMindMapStore.getState().open(doc);
  localStorage.setItem(LAST_DOC_KEY, doc.id);
  useUiStore.getState().setView('editor');
}

/**
 * 开箱即用的思维导图编辑器：自带工具栏、画布、属性面板与状态栏，挂载后自动恢复上次编辑的文档
 * @param bootDocId 指定启动文档 id（如分享查看页注入的只读快照），优先于本地"上次文档"
 */
export function MindMapEditor({ bootDocId }: { bootDocId?: string } = {}) {
  const [ready, setReady] = useState(false);
  // StrictMode 下 effect 双执行，防止重复建档（自定义存储后端每次建档都会产生远端资源）
  const bootRef = useRef(false);

  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    void openOrCreateEditor(bootDocId)
      .catch((err) => console.error('启动编辑器失败', err))
      .finally(() => setReady(true));
    // bootRef 保证仅首次挂载启动一次，后续 bootDocId 变化不重新建档
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready || !useMindMapStore.getState().doc) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        加载中…
      </div>
    );
  }

  return <Editor />;
}
