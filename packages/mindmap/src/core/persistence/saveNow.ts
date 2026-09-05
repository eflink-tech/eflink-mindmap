// 手动保存（Ctrl/Cmd+S）：与 autosave 解耦，避免 uiStore ↔ mindMapStore ↔ autosave 循环依赖
import { useMindMapStore } from '../../store/mindMapStore';
import { useUiStore } from '../../store/uiStore';
import { flushSave } from './autosave';

/** 立即写入 IndexedDB 并顶部提示 */
export async function saveNowWithToast(): Promise<void> {
  const doc = useMindMapStore.getState().doc;
  const showToast = useUiStore.getState().showToast;
  if (!doc) {
    showToast('当前没有可保存的文档');
    return;
  }
  try {
    await flushSave(doc);
    showToast('您的工作已自动保存。');
  } catch (error) {
    console.error('手动保存失败:', error);
    showToast('保存失败，请稍后重试');
  }
}
