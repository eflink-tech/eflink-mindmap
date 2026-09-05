import type { MindMapDocument } from '../../types/mindmap';
import { saveDocument } from './db';

const DELAY = 500;
let timer: ReturnType<typeof setTimeout> | undefined;

export function scheduleSave(doc: MindMapDocument): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      await saveDocument(doc);
    } catch (error) {
      console.error('自动保存失败:', error);
    }
  }, DELAY);
}

export function flushSave(doc: MindMapDocument): Promise<void> {
  if (timer) clearTimeout(timer);
  return saveDocument(doc);
}
