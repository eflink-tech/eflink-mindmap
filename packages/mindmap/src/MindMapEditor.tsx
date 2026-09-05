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
async function openOrCreateEditor() {
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

/** 开箱即用的思维导图编辑器：自带工具栏、画布、属性面板与状态栏，挂载后自动恢复上次编辑的文档 */
export function MindMapEditor() {
  const [ready, setReady] = useState(false);
  // StrictMode 下 effect 双执行，防止重复建档（自定义存储后端每次建档都会产生远端资源）
  const bootRef = useRef(false);

  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    void openOrCreateEditor()
      .catch((err) => console.error('启动编辑器失败', err))
      .finally(() => setReady(true));
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
