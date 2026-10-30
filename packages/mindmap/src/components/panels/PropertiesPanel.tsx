// 属性面板：样式（节点外观）| 画布（布局 + 主题）
import { useI18n } from '@eflink-tech/office-kit';
import { useMindMapStore } from '../../store/mindMapStore';
import { useUiStore } from '../../store/uiStore';
import { CanvasOptionsSection } from './canvas/CanvasOptionsSection';
import { LayoutSelect } from './canvas/LayoutSelect';
import { LayoutToggles } from './canvas/LayoutToggles';
import { ThemeGallery } from './canvas/ThemeGallery';
import { ThemeEditor } from './canvas/ThemeEditor';
import { BranchDirectionSection } from './style/BranchDirectionSection';
import { BranchSection } from './style/BranchSection';
import { BoundarySection, RelationSection, SummarySection } from './style/OverlaySection';
import { ShapeSection } from './style/ShapeSection';
import { StructureSection } from './style/StructureSection';
import { StylePreview } from './style/StylePreview';
import { TextSection } from './style/TextSection';

function StyleTabBody() {
  const { t } = useI18n();
  const selectedId = useMindMapStore((s) => s.selectedId);
  const hasNode = useMindMapStore((s) => !!(s.doc && s.selectedId && s.doc.nodes[s.selectedId]));
  const selectedRelationId = useMindMapStore((s) => s.selectedRelationId);
  const selectedBoundaryId = useMindMapStore((s) => s.selectedBoundaryId);
  const selectedSummaryId = useMindMapStore((s) => s.selectedSummaryId);

  // 选中联系线/外框/概要时，样式面板切换到对应对象（与选择互斥）
  if (selectedRelationId) return <RelationSection id={selectedRelationId} />;
  if (selectedBoundaryId) return <BoundarySection id={selectedBoundaryId} />;
  if (selectedSummaryId) return <SummarySection id={selectedSummaryId} />;

  if (!hasNode || !selectedId) {
    return <p className="text-sm text-slate-400">{t('mind.p.selectNode')}</p>;
  }

  return (
    <>
      <StylePreview nodeId={selectedId} />
      <ShapeSection nodeId={selectedId} />
      <TextSection nodeId={selectedId} />
      <BranchSection nodeId={selectedId} />
      <BranchDirectionSection nodeId={selectedId} />
      <StructureSection />
    </>
  );
}

function CanvasTabBody() {
  return (
    <>
      <LayoutSelect />
      <ThemeGallery />
      <ThemeEditor />
      <CanvasOptionsSection />
      <LayoutToggles />
    </>
  );
}

export function PropertiesPanel() {
  const { t } = useI18n();
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
          {t('mind.p.style')}
        </button>
        <button
          type="button"
          aria-pressed={tab === 'canvas'}
          onClick={() => setTab('canvas')}
          className={`flex-1 px-3 py-2 text-sm ${
            tab === 'canvas' ? 'border-b-2 border-blue-500 font-medium text-blue-600' : 'text-slate-600'
          }`}
        >
          {t('mind.p.canvas')}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'style' ? <StyleTabBody /> : <CanvasTabBody />}
      </div>
    </div>
  );
}
