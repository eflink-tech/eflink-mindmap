// AI 提示词与结果解析：约定输出导图树形 JSON，由 actionExecutor 落为节点
import type { AITree, AITreeNode } from './types';

const MAX_NODES = 200;
const MAX_DEPTH = 8;
const ROOT_PLACEHOLDER = '中心主题';

export const TREE_SCHEMA_PROMPT = `输出 JSON（不要输出 JSON 之外的任何文字），结构如下：
{
  "root": "中心主题",
  "children": [
    {
      "text": "一级分支",
      "children": [
        { "text": "二级分支" },
        { "text": "二级分支", "children": [ { "text": "三级分支" } ] }
      ]
    }
  ]
}
约定：root 为中心主题；children 为其下分支，每个节点用 text 表示文字，可嵌套 children；层级不超过 4 层；每条文字简洁（建议 20 字以内）；不要输出 markdown 代码块。`;

/** 生成整张导图的提示词 */
export function buildTreePrompt(topic: string, requirements: string): string {
  return `请围绕主题「${topic}」生成一张结构清晰的思维导图。
${requirements ? `要求：${requirements}\n` : ''}${TREE_SCHEMA_PROMPT}`;
}

/** 展开选中节点的提示词（children 会挂到选中节点下） */
export function buildExpandPrompt(templateContent: string, topic: string, context: string): string {
  return (
    templateContent.replace('{topic}', topic)
    + (context ? `\n\n（当前导图已有内容供参考，避免重复：\n${context}）` : '')
  );
}

export function parseJSONFromText(text: string): unknown {
  // 去掉可能的 markdown 代码块包裹
  const cleaned = text.replace(/```(?:json)?/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // 尝试截取第一个 { 到最后一个 }
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('AI 返回的内容不是有效的 JSON');
  }
}

/**
 * 解析并校验导图树：非法节点丢弃、超量截断、深度限制。
 * expandMode 时忽略 root 字段，仅取 children（挂到选中节点下）。
 */
export function parseAITree(text: string, expandMode = false): AITree {
  const data = parseJSONFromText(text) as Partial<AITree>;
  if (!data || !Array.isArray(data.children)) {
    // 兼容直接返回 { "text": ..., "children": [...] } 单节点结构
    const node = data as unknown as AITreeNode;
    if (node && typeof node.text === 'string' && Array.isArray(node.children)) {
      const children = sanitizeNodes(node.children, 1);
      if (children.length) return { root: undefined, children };
    }
    throw new Error('导图 JSON 结构不正确');
  }
  const children = sanitizeNodes(data.children, 1);
  if (!children.length) throw new Error('AI 未生成有效的导图内容');
  return {
    root: !expandMode && typeof data.root === 'string' && data.root.trim() ? data.root.trim() : undefined,
    children,
  };
}

/** 递归校验节点：统计总量、限制深度 */
function sanitizeNodes(nodes: unknown, depth: number): AITreeNode[] {
  if (depth > MAX_DEPTH || !Array.isArray(nodes)) return [];
  const out: AITreeNode[] = [];
  for (const raw of nodes) {
    if (out.length >= MAX_NODES) break;
    if (!raw || typeof raw !== 'object') continue;
    const node = raw as AITreeNode;
    if (typeof node.text !== 'string' || !node.text.trim()) continue;
    out.push({
      text: node.text.trim().slice(0, 100),
      children: sanitizeNodes(node.children ?? [], depth + 1),
    });
  }
  return out;
}

/** 根节点是否仍是默认占位文本（可安全重命名） */
export function isPlaceholderRoot(rootText: string): boolean {
  return !rootText.trim() || rootText.trim() === ROOT_PLACEHOLDER;
}
