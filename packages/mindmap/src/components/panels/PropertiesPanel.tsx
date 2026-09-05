// 属性面板：样式（节点外观）| 画布（布局 + 主题）
import { useMindMapStore } from '../../store/mindMapStore';
import { useUiStore } from '../../store/uiStore';
import { CanvasOptionsSection } from './canvas/CanvasOptionsSection';
import { LayoutSelect } from './canvas/LayoutSelect';
import { LayoutToggles } from './canvas/LayoutToggles';
import { ThemeGallery } from './canvas/ThemeGallery';
import { BranchSection } from './style/BranchSection';
import { ShapeSection } from './style/ShapeSection';
import { StructureSection } from './style/StructureSection';
import { StylePreview } from './style/StylePreview';
import { TextSection } from './style/TextSection';

function StyleTabBody() {
  const selectedId = useMindMapStore((s) => s.selectedId);
  const hasNode = useMindMapStore((s) => !!(s.doc && s.selectedId && s.doc.nodes[s.selectedId]));

  if (!hasNode || !selectedId) {
    return <p className="text-sm text-slate-400">请选中一个节点</p>;
  }

  return (
    <>
      <StylePreview nodeId={selectedId} />
      <ShapeSection nodeId={selectedId} />
      <TextSection nodeId={selectedId} />
      <BranchSection nodeId={selectedId} />
      <StructureSection />
    </>
  );
}

function CanvasTabBody() {
  return (
    <>
      <LayoutSelect />
      <ThemeGallery />
      <CanvasOptionsSection />
      <LayoutToggles />
    </>
  );
}

export function PropertiesPanel() {
  const tab = useUiStore((s) => s.propertiesTab);
  const setTab = useUiStore((s) => s.setPropertiesTab);

  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          aria-pressed={tab === 'style'}
          onClick={() => setTab('style')}
          className={`flex-1 px-3 py-2 text-sm ${
            tab === 'style' ? 'border-b-2 border-blue-500 font-medium text-blue-600' : 'text-slate-600'
          }`}
        >
          样式
        </button>
        <button
          type="button"
          aria-pressed={tab === 'canvas'}
          onClick={() => setTab('canvas')}
          className={`flex-1 px-3 py-2 text-sm ${
            tab === 'canvas' ? 'border-b-2 border-blue-500 font-medium text-blue-600' : 'text-slate-600'
          }`}
        >
          画布
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'style' ? <StyleTabBody /> : <CanvasTabBody />}
      </div>
    </div>
  );
}
