// 保存状态指示：dirty 时红点「● 未保存」，否则灰色「✓ 已保存」。
// 供底部状态栏与节点旁编辑浮层（NodeInsertOverlay）复用。
import { useMindMapStore } from '../../store/mindMapStore';

export function SaveStatusIndicator({ prefix = '' }: { prefix?: string }) {
  const dirty = useMindMapStore((s) => s.dirty);
  return (
    <>
      {prefix}
      {dirty ? (
        <span style={{ color: '#e02e2e' }}>● 未保存</span>
      ) : (
        <span>✓ 已保存</span>
      )}
    </>
  );
}
