// src/components/toolbar/exportActions.ts
// 导出动作：PNG 截图与 *.efm.json 下载/上传
import { EFM_EXTENSION, exportToEfmJson, importFromEfmJson } from '../../core/export/efmJson';
import { pngExportRegion } from '../../core/export/png';
import { scheduleSave } from '../../core/persistence/autosave';
import { getCanvasBackground } from '../../core/style/canvasOptions';
import type { MindMapDocument } from '../../types/mindmap';
import { useMindMapStore } from '../../store/mindMapStore';
import { getStage } from '../canvas/stageRef';

// 标题可能来自用户导入内容，清洗文件名中的非法字符
function safeFilename(title: string, ext: string): string {
  const cleaned = title.replace(/[\\/:*?"<>|\r\n]/g, '_').trim();
  return `${cleaned || '思维导图'}.${ext}`;
}

// 导出文件名优先文档标题，否则中心主题，最后默认名
export function exportBasename(doc: MindMapDocument): string {
  const title = doc.title.trim();
  if (title) return title;
  const rootText = doc.nodes[doc.rootId]?.text?.trim();
  return rootText || '思维导图';
}

function download(href: string, filename: string): void {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  // 挂载后再点击，兼容 Safari 对未挂载节点 click() 的处理
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function downloadText(text: string, filename: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  download(url, filename);
  // 延迟回收，避免下载尚未开始即被撤销
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportPng(): void {
  const { doc, layoutResult } = useMindMapStore.getState();
  const stage = getStage();
  if (!doc || !layoutResult || !stage) return;
  const region = pngExportRegion(layoutResult, doc.viewport, 40);
  if (region.width === 0) return;
  // Konva 10 的 toDataURL 不支持 fill：先 toCanvas 再在内容之下补画背景色
  const canvas = stage.toCanvas({
    x: region.x,
    y: region.y,
    width: region.width,
    height: region.height,
    pixelRatio: 2,
  });
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = getCanvasBackground(doc);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  download(canvas.toDataURL('image/png'), safeFilename(exportBasename(doc), 'png'));
}

export function exportEfmJson(): void {
  const { doc } = useMindMapStore.getState();
  if (!doc) return;
  downloadText(
    exportToEfmJson(doc),
    safeFilename(exportBasename(doc), EFM_EXTENSION),
    'application/json;charset=utf-8',
  );
}

export function importEfmJsonFile(file: File): void {
  void file
    .text()
    .then((text) => {
      const doc = importFromEfmJson(text);
      useMindMapStore.getState().open(doc);
      // 与 App/StartScreen 的刷新恢复逻辑保持一致：记录最近打开文档
      localStorage.setItem('efmindmap:lastDoc', doc.id);
      // 导入的文档尚未入库，立即调度一次保存
      scheduleSave(doc);
    })
    .catch((err) => {
      console.error('EFM 导入失败', err);
      window.alert('导入失败，请确认选择的是有效的 *.efm.json 文件');
    });
}
