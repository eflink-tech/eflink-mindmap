// XMind / FreeMind 共用的标记 id → Marker 映射；同分组只保留第一个
import type { Marker, MarkerColor } from '../../types/mindmap';
import { groupOf } from '../markers/registry';

const MARKER_COLORS = new Set<MarkerColor>(['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray']);

const SMILEY: Record<string, string> = {
  'smiley-smile': '😊',
  'smiley-laugh': '😄',
  'smiley-happy': '😃',
  'smiley-surprise': '😲',
  'smiley-worry': '😟',
  'smiley-angry': '😠',
  'smiley-cry': '😢',
  'smiley-embarrassed': '😳',
  'smiley-cool': '😎',
  'smiley-sad': '☹️',
  'smiley-sleep': '😴',
  'smiley-kiss': '😘',
  'smiley-tongue': '😛',
  'smiley-afraid': '😨',
  'smiley-evil': '😈',
  'smiley-shocked': '😱',
  'smiley-confused': '😕',
};

const TASK_BY_ID: Record<string, 'start' | 'p25' | 'p50' | 'p75' | 'p100' | 'done'> = {
  'task-start': 'start',
  'task-oct': 'start',
  'task-quarter': 'p25',
  'task-3oct': 'p25',
  'task-half': 'p50',
  'task-5oct': 'p50',
  'task-3quarter': 'p75',
  'task-7oct': 'p75',
  'task-full': 'p100',
  'task-done': 'done',
};

export function normalizeMarkers(ids: (string | undefined)[]): Marker[] | undefined {
  const seen = new Set<string>();
  const markers: Marker[] = [];
  for (const raw of ids) {
    if (!raw) continue;
    const marker = markerFromId(raw);
    if (!marker) continue;
    const group = groupOf(marker);
    if (seen.has(group)) continue;
    seen.add(group);
    markers.push(marker);
  }
  return markers.length ? markers : undefined;
}

export function markerFromId(raw: string): Marker | null {
  const id = raw.trim().toLowerCase();
  const priority = /^priority-([1-7])$/.exec(id);
  if (priority) return { type: 'priority', level: Number(priority[1]) as 1 | 2 | 3 | 4 | 5 | 6 | 7 };
  const task = TASK_BY_ID[id];
  if (task) return { type: 'task', state: task };
  const numericTask = /^task-(\d{1,3})$/.exec(id);
  if (numericTask) {
    const percent = Math.max(0, Math.min(100, Number(numericTask[1])));
    const state = percent >= 100 ? 'done' : percent >= 75 ? 'p75' : percent >= 50 ? 'p50' : percent >= 25 ? 'p25' : 'start';
    return { type: 'task', state };
  }
  const family = /^(flag|star|people)-(.+)$/.exec(id);
  if (family && MARKER_COLORS.has(family[2] as MarkerColor)) {
    return { type: family[1] as 'flag' | 'star' | 'people', color: family[2] as MarkerColor };
  }
  const emoji = SMILEY[id];
  if (emoji) return { type: 'emoji', value: emoji };
  return null;
}
