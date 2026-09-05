// 文本样式：字体、加粗/斜体/下划线/删除线、对齐
import { Bold, Italic, Strikethrough, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { resolveNodeStyle } from '../../../core/style/apply';
import { getTheme } from '../../../core/style/themes';
import { useMindMapStore } from '../../../store/mindMapStore';
import type { TextAlign } from '../../../types/mindmap';

const FONTS: { value: string; label: string }[] = [
  { value: '', label: '系统默认' },
  { value: 'serif', label: '衬线' },
  { value: 'monospace', label: '等宽' },
  { value: 'PingFang SC', label: 'PingFang SC' },
  { value: 'Microsoft YaHei', label: '微软雅黑' },
];

const ALIGNS: { value: TextAlign; label: string; Icon: typeof AlignLeft }[] = [
  { value: 'left', label: '左对齐', Icon: AlignLeft },
  { value: 'center', label: '居中', Icon: AlignCenter },
  { value: 'right', label: '右对齐', Icon: AlignRight },
];

interface TextSectionProps {
  nodeId: string;
}

export function TextSection({ nodeId }: TextSectionProps) {
  const doc = useMindMapStore((s) => s.doc);
  const setNodeStyle = useMindMapStore((s) => s.setNodeStyle);

  if (!doc || !doc.nodes[nodeId]) return null;

  const node = doc.nodes[nodeId];
  const resolved = resolveNodeStyle(doc, getTheme(doc), nodeId);
  const fontValue = node.style?.fontFamily ?? '';
  const isBold = resolved.fontWeight === 'bold';

  return (
    <section className="mt-4 border-t border-slate-100 pt-4">
      <h3 className="mb-2 text-xs font-medium text-slate-500">文本</h3>

      <label className="mb-1 block text-xs text-slate-500" htmlFor="style-fontfamily">
        字体
      </label>
      <select
        id="style-fontfamily"
        value={fontValue}
        onChange={(e) => {
          const v = e.target.value;
          setNodeStyle({ fontFamily: v === '' ? undefined : v });
        }}
        className="mb-3 w-full rounded border border-slate-300 px-2 py-1 text-sm"
      >
        {FONTS.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <span id="style-textdeco" className="mb-1 block text-xs text-slate-500">
        样式
      </span>
      <div className="mb-3 flex gap-1" role="group" aria-labelledby="style-textdeco">
        <button
          type="button"
          title="加粗"
          aria-label="加粗"
          aria-pressed={isBold}
          onClick={() => setNodeStyle({ fontWeight: isBold ? 'normal' : 'bold' })}
          className={`rounded border p-1.5 ${
            isBold ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200'
          }`}
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          title="斜体"
          aria-label="斜体"
          aria-pressed={resolved.italic}
          onClick={() => setNodeStyle({ italic: !resolved.italic })}
          className={`rounded border p-1.5 ${
            resolved.italic ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200'
          }`}
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          title="下划线"
          aria-label="下划线"
          aria-pressed={resolved.underline}
          onClick={() => setNodeStyle({ underline: !resolved.underline })}
          className={`rounded border p-1.5 ${
            resolved.underline ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200'
          }`}
        >
          <Underline size={16} />
        </button>
        <button
          type="button"
          title="删除线"
          aria-label="删除线"
          aria-pressed={resolved.strikethrough}
          onClick={() => setNodeStyle({ strikethrough: !resolved.strikethrough })}
          className={`rounded border p-1.5 ${
            resolved.strikethrough ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200'
          }`}
        >
          <Strikethrough size={16} />
        </button>
      </div>

      <span id="style-textalign" className="mb-1 block text-xs text-slate-500">
        对齐
      </span>
      <div className="flex gap-1" role="group" aria-labelledby="style-textalign">
        {ALIGNS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={resolved.textAlign === value}
            onClick={() => setNodeStyle({ textAlign: value })}
            className={`flex-1 rounded border p-1.5 ${
              resolved.textAlign === value
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-slate-200'
            }`}
          >
            <Icon size={16} className="mx-auto" />
          </button>
        ))}
      </div>
    </section>
  );
}
