// 手动保存（⌘S/Ctrl+S、菜单「保存」、分享前强制保存共用入口）：
// 与本地草稿（autosave）解耦，避免 uiStore ↔ mindMapStore ↔ autosave 循环依赖
import { useMindMapStore } from '../../store/mindMapStore';
import { useUiStore } from '../../store/uiStore';
import { clearDraft } from './autosave';
import { saveDocument } from './db';

/**
 * 立即执行云端保存（自定义后端或本地 IndexedDB）：
 * 成功后置 dirty=false 并删除本地草稿；失败仅提示，不清 dirty、不删草稿。
 * 返回是否保存成功（供分享等链路判断）；成功 toast 由调用方决定。
 */
export async function saveNow(): Promise<boolean> {
  const store = useMindMapStore.getState();
  const doc = store.doc;
  const showToast = useUiStore.getState().showToast;
  if (!doc) {
    showToast('当前没有可保存的文档');
    return false;
  }
  try {
    await saveDocument(doc);
    // 保存期间用户可能继续编辑（doc 引用变化）：此时保持 dirty，等待下一次保存
    store.markSaved(doc);
    clearDraft(doc.id);
    return true;
  } catch (error) {
    console.error('手动保存失败:', error);
    showToast('保存失败，请稍后重试');
    return false;
  }
}

/** ⌘S / 菜单「保存」入口：云端保存 + 顶部提示「已保存」 */
export async function saveNowWithToast(): Promise<void> {
  if (await saveNow()) useUiStore.getState().showToast('已保存');
}
