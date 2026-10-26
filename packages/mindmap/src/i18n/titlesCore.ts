// packages/mindmap/src/i18n/titlesCore.ts
// 写入文档内容的默认素材名（根节点/分支节点/概要/默认文档标题）。
// 键 = 中文原文，值 = [en, es, pt-BR]；创建文档时按当前语言落地。
type Row = readonly [string, string, string];

export const CORE_TITLES = {
  '中心主题': ['Central topic', 'Tema central', 'Tópico central'],
  '分支主题': ['Branch topic', 'Tema de rama', 'Tópico de ramo'],
  '概要': ['Summary', 'Resumen', 'Resumo'],
} as const satisfies Record<string, Row>;
