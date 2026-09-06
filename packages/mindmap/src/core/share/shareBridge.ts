// 分享桥接：宿主注入分享实现，包内只负责分享入口 UI
// 与 setMindMapStorageBackend 同一注入模式：登录态、接口调用、链接拼装都由宿主决定，
// 组件库保持可独立运行（未注入时分享弹窗展示"当前环境不支持分享"）
import type { MindMapDocument } from '../../types/mindmap';

/**
 * 分享实现：接收当前导图文档，返回完整分享链接（如 {origin}/office/share/{token}）。
 * 抛错时分享弹窗展示错误信息并提供重试。
 */
export type MindMapShareHandler = (doc: MindMapDocument) => Promise<string>;

let shareHandler: MindMapShareHandler | null = null;

/** 注册分享实现（宿主在编辑器挂载前调用；传 null 撤销） */
export function setMindMapShareHandler(handler: MindMapShareHandler | null): void {
  shareHandler = handler;
}

export function getMindMapShareHandler(): MindMapShareHandler | null {
  return shareHandler;
}
