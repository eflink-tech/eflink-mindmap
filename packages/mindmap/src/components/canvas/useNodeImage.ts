// 节点内嵌图片的 HTMLImageElement 缓存：同一 src 只加载一次，加载完成通知所有订阅者重渲染
import { useEffect, useReducer } from 'react';

interface Entry {
  img?: HTMLImageElement;
  failed?: boolean;
}

const cache = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();

function notify(src: string) {
  listeners.get(src)?.forEach((fn) => fn());
}

function loadImage(src: string): Entry {
  const hit = cache.get(src);
  if (hit) return hit;
  const entry: Entry = {};
  cache.set(src, entry);
  const img = new window.Image();
  // 远程图片开启 CORS，避免 Konva 画布被污染导致导出 PNG 失败；data/blob 无需设置
  if (!/^(data|blob):/.test(src)) img.crossOrigin = 'anonymous';
  img.onload = () => {
    entry.img = img;
    notify(src);
  };
  img.onerror = () => {
    entry.failed = true;
    notify(src);
  };
  img.src = src;
  return entry;
}

export function useNodeImage(src?: string): HTMLImageElement | null {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!src) return;
    const set = listeners.get(src) ?? new Set<() => void>();
    set.add(force);
    listeners.set(src, set);
    return () => {
      set.delete(force);
      if (!set.size) listeners.delete(src);
    };
  }, [src, force]);
  if (!src) return null;
  return loadImage(src).img ?? null;
}
