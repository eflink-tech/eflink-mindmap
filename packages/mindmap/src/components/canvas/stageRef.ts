// src/components/canvas/stageRef.ts
// 持有当前 Konva Stage 引用，供导出使用
import type Konva from 'konva';

let current: Konva.Stage | null = null;

export function setStage(s: Konva.Stage | null): void {
  current = s;
}

export function getStage(): Konva.Stage | null {
  return current;
}
