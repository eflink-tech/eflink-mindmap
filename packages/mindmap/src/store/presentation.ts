// packages/mindmap/src/store/presentation.ts
// 演示模式入口：从当前选中分支（选中根节点或未选中时为整图）生成翻页序列。
import { presentationSequence } from '../core/presentation/sequence';
import { useMindMapStore } from './mindMapStore';
import { useUiStore } from './uiStore';

export function startPresentationMode(): void {
  const { doc, selectedId } = useMindMapStore.getState();
  if (!doc) return;
  const startId = selectedId && selectedId !== doc.rootId ? selectedId : doc.rootId;
  useUiStore.getState().startPresentation(presentationSequence(doc, startId));
}
