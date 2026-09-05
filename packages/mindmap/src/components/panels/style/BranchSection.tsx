// 分支线样式（节点级 connector*）；渲染见 ConnectorRenderer + resolveConnectorStyle
import { resolveNodeStyle } from '../../../core/style/apply';
import { resolveConnectorStyle } from '../../../core/style/connectorStyle';
import { getTheme } from '../../../core/style/themes';
import { useMindMapStore } from '../../../store/mindMapStore';
import type { ConnectorEnd, ConnectorLineType } from '../../../types/mindmap';

const LINE_TYPES: { value: ConnectorLineType; label: string }[] = [
  { value: 'curve', label: '曲线' },
  { value: 'straight', label: '直线' },
  { value: 'elbow', label: '折线' },
];

const ENDS: { value: ConnectorEnd; label: string }[] = [
  { value: 'none', label: '无' },
  { value: 'arrow', label: '箭头' },
  { value: 'dot', label: '圆点' },
];

const WIDTHS = [1, 1.5, 2, 2.5, 3];

interface BranchSectionProps {
  nodeId: string;
}

export function BranchSection({ nodeId }: BranchSectionProps) {
  const doc = useMindMapStore((s) => s.doc);
  const setNodeStyle = useMindMapStore((s) => s.setNodeStyle);

  if (!doc || !doc.nodes[nodeId]) return null;

  const theme = getTheme(doc);
  const resolved = resolveNodeStyle(doc, theme, nodeId);
  const connector = resolveConnectorStyle(doc, nodeId, theme);
  const connectorType = connector.type;
  const connectorWidth = connector.width;
  const connectorColor = connector.color ?? resolved.fillColor;
  const connectorEnd = connector.end;

  return (
    <section className="mt-4 border-t border-slate-100 pt-4">
      <h3 className="mb-2 text-xs font-medium text-slate-500">分支线</h3>

      <label className="mb-1 block text-xs text-slate-500" htmlFor="style-connector-type">
        线型
      </label>
      <select
        id="style-connector-type"
        value={connectorType}
        onChange={(e) => setNodeStyle({ connectorType: e.target.value as ConnectorLineType })}
        className="mb-3 w-full rounded border border-slate-300 px-2 py-1 text-sm"
      >
        {LINE_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <label className="mb-1 block text-xs text-slate-500" htmlFor="style-connector-width">
        线宽
      </label>
      <select
        id="style-connector-width"
        value={connectorWidth}
        onChange={(e) => setNodeStyle({ connectorWidth: Number(e.target.value) })}
        className="mb-3 w-full rounded border border-slate-300 px-2 py-1 text-sm"
      >
        {WIDTHS.map((w) => (
          <option key={w} value={w}>
            {w}px
          </option>
        ))}
      </select>

      <label className="mb-1 block text-xs text-slate-500" htmlFor="style-connector-color">
        颜色
      </label>
      <input
        id="style-connector-color"
        type="color"
        value={connectorColor.startsWith('#') ? connectorColor : '#64748B'}
        onChange={(e) => setNodeStyle({ connectorColor: e.target.value })}
        className="mb-3 h-8 w-full cursor-pointer rounded border border-slate-200"
      />

      <span id="style-connector-end" className="mb-1 block text-xs text-slate-500">
        终点
      </span>
      <div className="flex gap-2" role="group" aria-labelledby="style-connector-end">
        {ENDS.map((e) => (
          <button
            key={e.value}
            type="button"
            onClick={() => setNodeStyle({ connectorEnd: e.value })}
            aria-pressed={connectorEnd === e.value}
            className={`flex-1 rounded border px-2 py-1 text-sm ${
              connectorEnd === e.value
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-slate-200'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>
    </section>
  );
}
