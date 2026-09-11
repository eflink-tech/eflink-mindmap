// 本地草稿兜底：文档变化后延迟写入 localStorage，作为云端保存（手动 ⌘S）失败/未发生时的恢复来源。
// 注意：这里不再直连云端/IndexedDB；云端保存只在显式操作（⌘S / 菜单「保存」/ 分享前强制保存）时发生（见 ./saveNow）。
import type { MindMapDocument } from '../../types/mindmap';

const DELAY = 500;
let timer: ReturnType<typeof setTimeout> | undefined;

/** 本地草稿存储 key（按文档 id 隔离） */
export function draftKey(docId: string): string {
  return `eflink:draft:mindmap:${docId}`;
}

/** 防抖写入本地草稿：不调用云端保存、不清 dirty（dirty 仅随云端保存成功清除） */
export function scheduleSave(doc: MindMapDocument): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = undefined;
    writeDraft(doc);
  }, DELAY);
}

/** 跳过防抖立即写入本地草稿 */
export function flushSave(doc: MindMapDocument): void {
  if (timer) {
    clearTimeout(timer);
    timer = undefined;
  }
  writeDraft(doc);
}

function writeDraft(doc: MindMapDocument): void {
  try {
    localStorage.setItem(draftKey(doc.id), JSON.stringify(doc));
  } catch (error) {
    console.error('写入本地草稿失败:', error);
  }
}

/** 读取本地草稿；不存在或内容损坏时返回 undefined */
export function readDraft(docId: string): MindMapDocument | undefined {
  try {
    const raw = localStorage.getItem(draftKey(docId));
    if (!raw) return undefined;
    return JSON.parse(raw) as MindMapDocument;
  } catch (error) {
    console.error('读取本地草稿失败:', error);
    return undefined;
  }
}

/** 清理本地草稿（云端保存成功后调用），并取消尚未触发的防抖写入，避免草稿"复活" */
export function clearDraft(docId: string): void {
  if (timer) {
    clearTimeout(timer);
    timer = undefined;
  }
  try {
    localStorage.removeItem(draftKey(docId));
  } catch (error) {
    console.error('清理本地草稿失败:', error);
  }
}
