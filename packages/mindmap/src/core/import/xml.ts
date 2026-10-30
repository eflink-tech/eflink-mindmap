// 导入解析共用 XML 工具；解析失败文案由调用方按格式本地化传入
export function parseXml(text: string, errorMessage: string): Document {
  if (typeof DOMParser === 'undefined') throw new Error(errorMessage);
  const dom = new DOMParser().parseFromString(text, 'application/xml');
  if (dom.getElementsByTagName('parsererror').length) throw new Error(errorMessage);
  return dom;
}

export function directChild(parent: Element, localName: string): Element | null {
  for (const child of Array.from(parent.children)) {
    if (child.localName === localName) return child;
  }
  return null;
}

export function directChildren(parent: Element, localName: string): Element[] {
  return Array.from(parent.children).filter((child) => child.localName === localName);
}

export function directText(parent: Element, localName: string): string | undefined {
  const text = directChild(parent, localName)?.textContent?.replaceAll('\u0000', '').trim();
  return text ? text : undefined;
}

/** 富文本转纯文本：保留段落/换行，去掉标签与常见实体 */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .trim();
}
