// 样式预览：用 div 模拟当前选中节点外观
import { resolveNodeStyle } from '../../../core/style/apply';
import { getTheme } from '../../../core/style/themes';
import { useMindMapStore } from '../../../store/mindMapStore';

interface StylePreviewProps {
  nodeId: string;
}

export function StylePreview({ nodeId }: StylePreviewProps) {
  const doc = useMindMapStore((s) => s.doc);
  if (!doc || !doc.nodes[nodeId]) return null;

  const node = doc.nodes[nodeId];
  const resolved = resolveNodeStyle(doc, getTheme(doc), nodeId);
  const radius =
    resolved.shape === 'ellipse' ? '9999px' : resolved.shape === 'rounded' ? '8px' : '0';
  const border =
    resolved.borderStyle === 'none'
      ? 'none'
      : `${resolved.borderWidth}px ${resolved.borderStyle === 'dashed' ? 'dashed' : 'solid'} ${
          resolved.borderColor === 'transparent' ? 'transparent' : resolved.borderColor
        }`;

  return (
    <section className="mb-4">
      <h3 className="mb-2 text-xs font-medium text-slate-500">预览</h3>
      <div className="flex min-h-[56px] items-center justify-center rounded-lg bg-slate-100 p-3">
        <div
          className="max-w-full truncate px-3 py-1.5 text-center text-sm"
          style={{
            backgroundColor: resolved.fillColor,
            color: resolved.textColor,
            borderRadius: radius,
            border,
            fontFamily: resolved.fontFamily,
            fontSize: resolved.fontSize,
            fontWeight: resolved.fontWeight,
            fontStyle: resolved.italic ? 'italic' : 'normal',
            textDecoration: [
              resolved.underline ? 'underline' : '',
              resolved.strikethrough ? 'line-through' : '',
            ]
              .filter(Boolean)
              .join(' '),
            textAlign: resolved.textAlign,
            width: resolved.fixedWidth ? Math.min(resolved.fixedWidth, 240) : undefined,
          }}
        >
          {node.text || '节点'}
        </div>
      </div>
    </section>
  );
}
