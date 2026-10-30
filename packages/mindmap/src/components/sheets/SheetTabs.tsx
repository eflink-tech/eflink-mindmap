// src/components/sheets/SheetTabs.tsx
// 工作簿画布标签（对齐 XMind 工作表）：同一 workbookId 的多个文档即多张画布，
// 切换前先保存当前画布，避免未落库内容丢失；标签顺序按创建时间固定。
import { Plus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useI18n } from '@eflink-tech/office-kit';
import { loadDocument } from '../../core/persistence/db';
import { LAST_DOC_KEY } from '../../core/persistence/keys';
import { saveNow } from '../../core/persistence/saveNow';
import { useDocumentsStore } from '../../store/documentsStore';
import { useMindMapStore } from '../../store/mindMapStore';
import { useUiStore } from '../../store/uiStore';
import { ConfirmDialog } from '../ConfirmDialog';

export function SheetTabs() {
  const { t } = useI18n();
  const doc = useMindMapStore((s) => s.doc);
  const sheets = useDocumentsStore((s) => s.sheets);
  // 行内重命名绑定画布 id：切换画布后编辑态自然失效，无需 effect 清理
  const [editing, setEditing] = useState<{ docId: string; id: string } | null>(null);
  const editingId = editing && doc && editing.docId === doc.id ? editing.id : null;
  const [draft, setDraft] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // 切换画布是异步的：期间忽略重复点击，避免并发 open 打乱状态
  const busyRef = useRef(false);

  if (!doc) return null;

  const flush = async (): Promise<boolean> => {
    if (!useMindMapStore.getState().dirty) return true;
    return saveNow();
  };

  const switchTo = async (id: string) => {
    if (id === doc.id || busyRef.current) return;
    busyRef.current = true;
    try {
      if (!(await flush())) return;
      const next = await loadDocument(id);
      if (!next) return;
      useMindMapStore.getState().open(next);
      localStorage.setItem(LAST_DOC_KEY, id);
    } catch (err) {
      console.error('切换画布失败', err);
    } finally {
      busyRef.current = false;
    }
  };

  const addSheet = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      if (!(await flush())) return;
      const next = await useDocumentsStore.getState().createSheet(doc);
      useMindMapStore.getState().open(next);
      localStorage.setItem(LAST_DOC_KEY, next.id);
    } catch (err) {
      console.error('新建画布失败', err);
    } finally {
      busyRef.current = false;
    }
  };

  const commitRename = async (id: string) => {
    const title = draft.trim();
    setEditing(null);
    if (!title) return;
    if (id === doc.id) {
      await useMindMapStore.getState().renameTitle(title);
      return;
    }
    await useDocumentsStore.getState().renameSheet(id, title);
  };

  const confirmDelete = async () => {
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    if (!id) return;
    await useDocumentsStore.getState().removeSheet(id);
    if (id !== doc.id) return;
    const next = useDocumentsStore.getState().sheets[0];
    if (!next) {
      // 工作簿已无画布：回到起始页
      useUiStore.getState().setView('start');
      return;
    }
    const loaded = await loadDocument(next.id);
    if (!loaded) return;
    useMindMapStore.getState().open(loaded);
    localStorage.setItem(LAST_DOC_KEY, next.id);
  };

  return (
    <div className="flex h-8 shrink-0 items-stretch gap-1 overflow-x-auto border-t border-slate-200 bg-slate-50 px-2">
      {sheets.map((sheet) => {
        const active = sheet.id === doc.id;
        return (
          <div
            key={sheet.id}
            className={`group my-1 flex max-w-44 shrink-0 items-center rounded-md border text-xs transition-colors ${
              active
                ? 'border-blue-300 bg-white text-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 hover:bg-white/70'
            }`}
          >
            {editingId === sheet.id ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => void commitRename(sheet.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') setEditing(null);
                }}
                aria-label={t('mind.p.renameAria', { title: sheet.title })}
                className="h-6 w-28 rounded border border-blue-400 px-1.5 text-xs text-slate-800 outline-none"
              />
            ) : (
              <button
                type="button"
                title={sheet.title}
                onClick={() => void switchTo(sheet.id)}
                onDoubleClick={() => {
                  setEditing({ docId: doc.id, id: sheet.id });
                  setDraft(sheet.title);
                }}
                className="min-w-0 flex-1 truncate px-2.5 py-1 text-left"
              >
                {sheet.title}
              </button>
            )}
            {sheets.length > 1 && (
              <button
                type="button"
                title={t('action.delete')}
                aria-label={t('mind.p.deleteAria', { title: sheet.title })}
                onClick={() => setPendingDeleteId(sheet.id)}
                className={`mr-1 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-red-500 ${
                  active ? '' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        title={t('mind.sheet.new')}
        aria-label={t('mind.sheet.new')}
        onClick={() => void addSheet()}
        className="my-1 shrink-0 rounded-md px-2 text-slate-500 transition-colors hover:bg-white hover:text-slate-900"
      >
        <Plus size={14} />
      </button>
      <ConfirmDialog
        open={pendingDeleteId != null}
        title={t('action.delete')}
        message={t('mind.sheet.deleteConfirm')}
        variant="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
