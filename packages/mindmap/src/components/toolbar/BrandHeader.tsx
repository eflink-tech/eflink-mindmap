// src/components/toolbar/BrandHeader.tsx
// 顶栏左侧：Logo、产品名、汉堡主菜单、可编辑文档标题。
// AppMenu 必须常驻挂载（只用 open 控制显隐），否则导入 file input 卸载后收不到 onChange。
import { useEffect, useRef, useState, type JSX } from 'react';
import { ArrowLeft, Menu } from 'lucide-react';
import logoUrl from '../../assets/mindmap-eflink-logo.png';
import { getEditorBackHref } from '../../core/chrome';
import { useMindMapStore } from '../../store/mindMapStore';
import { AppMenu } from './AppMenu';

export function BrandHeader(): JSX.Element {
  const title = useMindMapStore((s) => s.doc?.title ?? '');
  const hasDoc = useMindMapStore((s) => s.doc != null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const skipCommitRef = useRef(false);

  useEffect(() => {
    if (!editing) return;
    const el = titleInputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [editing]);

  const beginEdit = () => {
    const doc = useMindMapStore.getState().doc;
    if (!doc) return;
    skipCommitRef.current = false;
    setDraft(doc.title);
    setEditing(true);
  };

  const commitEdit = () => {
    if (skipCommitRef.current) {
      skipCommitRef.current = false;
      setEditing(false);
      return;
    }
    setEditing(false);
    void useMindMapStore.getState().renameTitle(draft);
  };

  return (
    <div className="flex min-w-0 items-center gap-2">
      {getEditorBackHref() && (
        <a
          href={getEditorBackHref()!}
          title="返回"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <ArrowLeft size={18} />
        </a>
      )}
      <img src={logoUrl} alt="" className="h-7 w-7 shrink-0 rounded-full" />
      <span className="shrink-0 text-sm font-semibold text-slate-800">易飞思维导图</span>
      {/* 菜单锚在汉堡按钮下方，避免相对整块 BrandHeader 偏到 Logo 左侧 */}
      <div className="relative shrink-0">
        <button
          type="button"
          aria-label="菜单"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <Menu size={18} />
        </button>
        <AppMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onRequestRename={beginEdit}
        />
      </div>
      {editing ? (
        <input
          ref={titleInputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              skipCommitRef.current = true;
              setDraft(title);
              setEditing(false);
            }
          }}
          className="w-[12rem] max-w-[12rem] rounded border border-slate-200 px-1.5 py-0.5 text-sm text-slate-800 outline-none focus:border-blue-400"
        />
      ) : (
        <button
          type="button"
          disabled={!hasDoc}
          title={title}
          onClick={beginEdit}
          className="max-w-[12rem] truncate text-left text-sm text-slate-600 hover:text-slate-900 disabled:cursor-default disabled:hover:text-slate-600"
        >
          {title}
        </button>
      )}
    </div>
  );
}
