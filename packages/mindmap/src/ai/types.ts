// AI 模块类型定义（与 eflink-pptx / eflink-draw 的 AI 模块同构）
export interface AISettings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  /** 关联产物（如已应用导图的树形 JSON） */
  payload?: unknown;
  time: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface Template {
  id: string;
  name: string;
  builtin: boolean;
  /** 提示词模板：{topic} 占位符替换选中节点文本 */
  content: string;
}

export class AIError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AIError';
    this.cause = cause;
  }
}

/** AI 生成的导图树（systemPrompt 约定，actionExecutor 落为节点） */
export interface AITreeNode {
  text: string
  children?: AITreeNode[]
}

export interface AITree {
  /** 中心主题；应用到根节点且根为主题占位文本时用于重命名 */
  root?: string
  /** 中心主题下的分支 */
  children: AITreeNode[]
}

/** 判断错误是否为用户取消 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  const message = error instanceof Error ? error.message : '';
  return /aborted/i.test(message);
}
