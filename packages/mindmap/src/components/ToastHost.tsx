// 顶部轻提示（对齐 XMind：白底圆角 + 绿色勾 + 文案）
import { Check } from 'lucide-react';
import { useUiStore } from '../store/uiStore';

export function ToastHost() {
  const toast = useUiStore((s) => s.toast);
  if (!toast) return null;
  const success = !toast.includes('失败') && !toast.includes('没有');
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-14 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-white px-5 py-3 shadow-[0_8px_28px_rgba(15,23,42,0.14)]"
    >
      {success ? (
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#34C759]"
          aria-hidden
        >
          <Check size={14} strokeWidth={3} className="text-white" />
        </span>
      ) : null}
      <span className="text-sm leading-none text-slate-800">{toast}</span>
    </div>
  );
}
