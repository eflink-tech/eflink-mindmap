// src/components/toolbar/BrandHeader.tsx
// 顶栏左侧：Logo、产品名、汉堡主菜单。
// 文档名展示/改名入口已统一收口到底部状态栏（StatusBar），此处不再展示标题。
// AppMenu 必须常驻挂载（只用 open 控制显隐），否则导入 file input 卸载后收不到 onChange。
import { useState, type JSX } from 'react';
import { ArrowLeft, Menu } from 'lucide-react';
import logoUrl from '../../assets/mindmap-eflink-logo.png';
import { getEditorBackHref } from '../../core/chrome';
import { AppMenu } from './AppMenu';

export function BrandHeader(): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);

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
        />
      </div>
    </div>
  );
}
