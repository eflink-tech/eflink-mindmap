// src/components/start/StartScreen.tsx
import { ChevronDown, FilePlus2, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@eflink-tech/office-kit';
import { getActiveEditorBrand } from '../../brand';
import { loadDocument } from '../../core/persistence/db';
import { LAST_DOC_KEY } from '../../core/persistence/keys';
import { useDocumentsStore } from '../../store/documentsStore';
import { useMindMapStore } from '../../store/mindMapStore';
import { useUiStore } from '../../store/uiStore';
import { ConfirmDialog } from '../ConfirmDialog';
import { TemplateGallery } from './TemplateGallery';
import type { TemplateSpec } from '../../core/templates/catalog';
import type { DocumentMeta } from '../../types/mindmap';

interface WorkbookGroup {
  key: string;
  /** 按创建时间升序的画布列表（第一个标签为新建工作簿时的首页） */
  sheets: DocumentMeta[];
  /** 最近更新的画布：新建工作簿时即第一个画布，用于展示标题与时间 */
  primary: DocumentMeta;
}

function groupByWorkbook(docs: DocumentMeta[]): WorkbookGroup[] {
  const map = new Map<string, DocumentMeta[]>();
  for (const d of docs) {
    const key = d.workbookId ?? d.id;
    const list = map.get(key);
    if (list) list.push(d);
    else map.set(key, [d]);
  }
  // docs 已按 updatedAt 倒序：首元素即最近编辑的画布
  return [...map.entries()].map(([key, metas]) => ({
    key,
    primary: metas[0],
    sheets: [...metas].sort((a, b) => (a.createdAt ?? a.updatedAt) - (b.createdAt ?? b.updatedAt)),
  }));
}

export function StartScreen() {
  const { t } = useI18n();
  const { docs, refresh, createDoc, removeDoc, removeSheet, removeMany } = useDocumentsStore();
  const setView = useUiStore((s) => s.setView);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [pendingWorkbook, setPendingWorkbook] = useState<WorkbookGroup | null>(null);
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const groups = useMemo(() => groupByWorkbook(docs), [docs]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openDoc = async (id: string) => {
    try {
      const doc = await loadDocument(id);
      if (!doc) return;
      useMindMapStore.getState().open(doc);
      localStorage.setItem(LAST_DOC_KEY, id);
      setView('editor');
    } catch (err) {
      console.error('打开文档失败', err);
    }
  };

  const commitRename = async (id: string, fallback: string) => {
    try {
      const { renameDoc } = useDocumentsStore.getState();
      await renameDoc(id, title.trim() || fallback);
    } catch (err) {
      console.error('重命名失败', err);
    }
    setEditingId(null);
  };

  const createFromTemplate = async (spec: TemplateSpec) => {
    if (creatingTemplateId) return;
    setCreatingTemplateId(spec.id);
    try {
      const doc = await useDocumentsStore.getState().createFromTemplate(spec);
      await openDoc(doc.id);
    } catch (err) {
      console.error('从模板新建失败', err);
    } finally {
      setCreatingTemplateId(null);
    }
  };

  const renderRenameInput = (d: DocumentMeta) => (
    <input
      autoFocus
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={() => void commitRename(d.id, d.title)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setEditingId(null);
      }}
      className="min-w-0 flex-1 rounded border border-blue-400 px-1"
      onClick={(e) => e.stopPropagation()}
    />
  );

  return (
    <div className="mx-auto max-w-3xl p-10">
      <h1 className="mb-8 flex items-center gap-3 text-2xl font-bold">
        <img src={getActiveEditorBrand().logo} alt="" width={36} height={36} className="h-9 w-9 rounded-full" />
        {getActiveEditorBrand().name}
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
        <FilePlus2 size={18} /> {t('mind.file.newMap')}
      </button>
      <TemplateGallery creatingId={creatingTemplateId} onCreate={(spec) => void createFromTemplate(spec)} />
      <ul className="space-y-2">
        {groups.map((group) => {
          const multi = group.sheets.length > 1;
          const open = Boolean(expanded[group.key]);
          return (
            <li key={group.key} className="rounded border border-slate-200 bg-white">
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  className="flex flex-1 items-center gap-2 text-left"
                  onClick={() => {
                    if (editingId === group.primary.id) return;
                    if (multi) setExpanded((s) => ({ ...s, [group.key]: !open }));
                    else void openDoc(group.primary.id);
                  }}
                >
                  <FolderOpen size={16} className="text-slate-400" />
                  {editingId === group.primary.id ? (
                    renderRenameInput(group.primary)
                  ) : (
                    <span className="flex items-center gap-2">
                      {group.primary.title}
                      {multi && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                          {t('mind.sheet.count', { count: group.sheets.length })}
                        </span>
                      )}
                    </span>
                  )}
                  {multi && (
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  )}
                </button>
                <span className="text-xs text-slate-400">
                  {new Date(group.primary.updatedAt).toLocaleString()}
                </span>
                {!multi && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(group.primary.id);
                      setTitle(group.primary.title);
                    }}
                    title={t('action.rename')}
                    aria-label={t('mind.p.renameAria', { title: group.primary.title })}
                  >
                    <Pencil size={14} />
                  </button>
                )}
                <button
                  onClick={() => {
                    if (multi) setPendingWorkbook(group);
                    else removeDoc(group.primary.id).catch((err) => console.error('删除失败', err));
                  }}
                  title={t('action.delete')}
                  aria-label={t('mind.p.deleteAria', { title: group.primary.title })}
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
              {multi && open && (
                <ul className="border-t border-slate-100 py-1">
                  {group.sheets.map((sheet) => (
                    <li
                      key={sheet.id}
                      className="flex items-center gap-3 px-4 py-2 pl-10 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      <button
                        className="flex flex-1 items-center gap-2 text-left"
                        onClick={() => {
                          if (editingId === sheet.id) return;
                          void openDoc(sheet.id);
                        }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                        {editingId === sheet.id ? renderRenameInput(sheet) : <span>{sheet.title}</span>}
                      </button>
                      <span className="text-xs text-slate-400">
                        {new Date(sheet.updatedAt).toLocaleString()}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(sheet.id);
                          setTitle(sheet.title);
                        }}
                        title={t('action.rename')}
                        aria-label={t('mind.p.renameAria', { title: sheet.title })}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => removeSheet(sheet.id).catch((err) => console.error('删除失败', err))}
                        title={t('action.delete')}
                        aria-label={t('mind.p.deleteAria', { title: sheet.title })}
                      >
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={pendingWorkbook != null}
        title={t('action.delete')}
        message={t('mind.sheet.deleteWorkbookConfirm')}
        variant="danger"
        onConfirm={() => {
          const ids = pendingWorkbook?.sheets.map((s) => s.id) ?? [];
          setPendingWorkbook(null);
          removeMany(ids).catch((err) => console.error('删除失败', err));
        }}
        onCancel={() => setPendingWorkbook(null)}
      />
    </div>
  );
}
