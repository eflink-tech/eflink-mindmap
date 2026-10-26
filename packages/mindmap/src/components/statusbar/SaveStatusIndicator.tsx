// 保存状态指示：dirty 时红点「● 未保存」，否则灰色「✓ 已保存」。
// 供底部状态栏与节点旁编辑浮层（NodeInsertOverlay）复用。
import { useI18n } from '@eflink-tech/office-kit';
import { useMindMapStore } from '../../store/mindMapStore';

export function SaveStatusIndicator({ prefix = '' }: { prefix?: string }) {
  const { t } = useI18n();
  const dirty = useMindMapStore((s) => s.dirty);
  return (
    <>
      {prefix}
      {dirty ? (
        <span style={{ color: '#e02e2e' }}>● {t('shell.unsaved')}</span>
      ) : (
        <span>✓ {t('shell.saved')}</span>
      )}
    </>
  );
}
