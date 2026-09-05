// src/components/start/StartScreen.tsx
import { FilePlus2, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import logoUrl from '../../assets/mindmap-eflink-logo.png';
import { loadDocument } from '../../core/persistence/db';
import { useDocumentsStore } from '../../store/documentsStore';
import { useMindMapStore } from '../../store/mindMapStore';
import { useUiStore } from '../../store/uiStore';

export function StartScreen() {
  const { docs, refresh, createDoc, removeDoc } = useDocumentsStore();
  const setView = useUiStore((s) => s.setView);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openDoc = async (id: string) => {
    try {
      const doc = await loadDocument(id);
      if (!doc) return;
      useMindMapStore.getState().open(doc);
      localStorage.setItem('efmindmap:lastDoc', id);
      setView('editor');
    } catch (err) {
      console.error('打开文档失败', err);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-10">
      <h1 className="mb-8 flex items-center gap-3 text-2xl font-bold">
        <img src={logoUrl} alt="" width={36} height={36} className="h-9 w-9 rounded-full" />
        易飞思维导图
      </h1>
      <button
        className="mb-6 flex items-center gap-2 rounded bg-blue-500 px-4 py-2 text-white"
        onClick={async () => {
          try {
            const doc = await createDoc();
            await openDoc(doc.id);
          } catch (err) {
            console.error('新建文档失败', err);
          }
        }}
      >
        <FilePlus2 size={18} /> 新建思维导图
      </button>
      <ul className="space-y-2">
        {docs.map((d) => (
          <li key={d.id} className="flex items-center gap-3 rounded border border-slate-200 bg-white px-4 py-3">
            <button
              className="flex flex-1 items-center gap-2 text-left"
              onClick={() => {
                if (editingId === d.id) return;
                void openDoc(d.id);
              }}
            >
              <FolderOpen size={16} className="text-slate-400" />
              {editingId === d.id ? (
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={async () => {
                    try {
                      const { renameDoc } = useDocumentsStore.getState();
                      await renameDoc(d.id, title || d.title);
                    } catch (err) {
                      console.error('重命名失败', err);
                    }
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  className="rounded border border-blue-400 px-1"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span>{d.title}</span>
              )}
            </button>
            <span className="text-xs text-slate-400">{new Date(d.updatedAt).toLocaleString()}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingId(d.id);
                setTitle(d.title);
              }}
              title="重命名"
              aria-label={`重命名 ${d.title}`}
            >
              <Pencil size={14} />
            </button>
            <button onClick={() => removeDoc(d.id).catch((err) => console.error('删除失败', err))} title="删除">
              <Trash2 size={14} className="text-red-400" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
