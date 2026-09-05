// src/components/outline/OutlineView.tsx
// 大纲视图：以缩进列表展示整棵导图，与画布共享选中/折叠/编辑状态，
// 全局快捷键（Tab 加子级、Enter 加同级、Delete 删除、F2 编辑）在列表下同样生效。
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { toggleCollapse, updateText } from '../../core/editor/nodeOps';
import { useMindMapStore } from '../../store/mindMapStore';
import type { MindMapNode } from '../../types/mindmap';

function OutlineItem({ id, depth }: { id: string; depth: number }) {
  const node: MindMapNode | undefined = useMindMapStore((s) => s.doc?.nodes[id]);
  const selected = useMindMapStore((s) => s.selectedId === id);
  const editing = useMindMapStore((s) => s.editingId === id);
  const ref = useRef<HTMLSpanElement>(null);
  const savedRef = useRef('');

  const commit = useCallback(() => {
    const store = useMindMapStore.getState();
    if (!store.editingId) return;
    const text = ref.current?.textContent ?? '';
    if (text !== savedRef.current) {
      store.act((d) => updateText(d, store.editingId!, text));
    }
    savedRef.current = text;
    store.setEditing(null);
  }, []);

  // 进入编辑：写入原文本并全选，便于直接输入覆盖
  useEffect(() => {
    if (!editing) return;
    savedRef.current = useMindMapStore.getState().doc?.nodes[id]?.text ?? '';
    const el = ref.current;
    if (!el) return;
    el.textContent = savedRef.current;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editing, id]);

  if (!node) return null;
  const hasChildren = node.children.length > 0;
  const collapsed = !!node.metadata?.collapsed;

  return (
    <div>
      <div
        className={`flex min-h-7 items-center gap-1 rounded py-0.5 pr-2 transition-colors ${
          selected ? 'bg-blue-50' : 'hover:bg-slate-50'
        }`}
        style={{ paddingLeft: depth * 28 }}
        onClick={() => useMindMapStore.getState().select(id)}
        onDoubleClick={() => useMindMapStore.getState().setEditing(id)}
      >
        {/* 折叠箭头：无子节点时用等宽占位保持文本对齐 */}
        {hasChildren ? (
          <button
            type="button"
            title={collapsed ? '展开' : '折叠'}
            aria-expanded={!collapsed}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
            onClick={(e) => {
              e.stopPropagation();
              useMindMapStore.getState().act((d) => toggleCollapse(d, id));
            }}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}
        {editing ? (
          <span
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            className="min-w-10 rounded border border-blue-500 px-1 py-0.5 text-sm leading-5 outline-none"
            onBlur={commit}
            onKeyDown={(e) => {
              // 阻止冒泡，避免触发全局快捷键（Tab/Enter/Delete）
              e.stopPropagation();
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commit();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                if (ref.current) ref.current.textContent = savedRef.current;
                useMindMapStore.getState().setEditing(null);
              }
            }}
          />
        ) : (
          <span
            className={`py-0.5 leading-5 ${
              depth === 0 ? 'text-base font-semibold text-slate-900' : 'text-sm text-slate-700'
            }`}
          >
            {node.text}
          </span>
        )}
      </div>
      {hasChildren && !collapsed && (
        <div>
          {node.children.map((c) => (
            <OutlineItem key={c} id={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function OutlineView() {
  const rootId = useMindMapStore((s) => s.doc?.rootId);
  return (
    <div className="h-full w-full overflow-auto bg-white">
      <div className="mx-auto max-w-3xl px-8 py-6">
        {rootId && <OutlineItem id={rootId} depth={0} />}
      </div>
    </div>
  );
}
