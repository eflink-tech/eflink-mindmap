import type { MindMapDocument } from '../../types/mindmap';
import { getPreset, normalizeLayoutId } from './presets';

export function applyLayoutPreset(doc: MindMapDocument, rawId: string): MindMapDocument {
  const id = normalizeLayoutId(rawId);
  if (doc.layout === id) return doc;
  const preset = getPreset(id)!;
  return {
    ...doc,
    layout: id,
    layoutDefaults: { ...preset.defaults },
    updatedAt: Date.now(),
  };
}
