// OPML .opml 导入：<outline> 层级映射为节点
// 兼容 text/title、_note 备注、_link/url 链接；多个顶层 outline 时用一个根节点收拢。
import type { MindMapDocument } from '../../types/mindmap';
import { mindT } from '../../i18n/runtime';
import { buildDocumentFromTree, type ImportedTopic } from './document';
import { trimText } from './values';
import { directChild, directChildren, directText, parseXml } from './xml';

export interface OpmlImportOptions {
  /** 文件名（含扩展名），用于文档标题兜底 */
  fileName?: string;
}

export function parseOpml(text: string, options: OpmlImportOptions = {}): MindMapDocument {
  const dom = parseXml(text, mindT('mind.store.opml.parseFailed'));
  const opml = dom.documentElement;
  const body = opml?.localName === 'opml' ? directChild(opml, 'body') : null;
  const outlines = body ? directChildren(body, 'outline') : [];
  if (!opml || !body || !outlines.length) throw new Error(mindT('mind.store.opml.parseFailed'));

  const headTitle = directText(directChild(opml, 'head') ?? opml, 'title');
  let counter = 0;
  const nextId = () => `opml-${++counter}`;
  const root =
    outlines.length === 1
      ? outlineToTopic(outlines[0], nextId)
      : { text: headTitle ?? '', children: outlines.map((outline) => outlineToTopic(outline, nextId)) };

  return buildDocumentFromTree({ root, title: headTitle }, { fileName: options.fileName });
}

function outlineToTopic(element: Element, nextId: () => string): ImportedTopic {
  return {
    sourceId: nextId(),
    text: trimText(attribute(element, 'text')) ?? trimText(attribute(element, 'title')) ?? '',
    children: directChildren(element, 'outline').map((child) => outlineToTopic(child, nextId)),
    note: trimText(attribute(element, '_note')) ?? trimText(attribute(element, 'note')),
    link:
      trimText(attribute(element, '_link')) ??
      trimText(attribute(element, 'url')) ??
      trimText(attribute(element, 'htmlUrl')),
  };
}

function attribute(element: Element, name: string): string | undefined {
  return element.getAttribute(name) ?? undefined;
}
