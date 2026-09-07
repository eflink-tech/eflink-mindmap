// AI 数据持久化（Dexie）：设置 / 会话历史 / 内置提示词模板
import Dexie, { type Table } from 'dexie';
import type { AISettings, Conversation, Template } from './types';

export class AIDb extends Dexie {
  conversations!: Table<Conversation, string>;
  settings!: Table<AISettings & { key: string }, string>;
  templates!: Table<Template, string>;

  constructor() {
    super('eflink-mindmap-ai');
    this.version(1).stores({
      conversations: 'id, updatedAt',
      settings: 'key',
      templates: 'id, builtin',
    });
  }
}

export const aiDb = new AIDb();

const SETTINGS_KEY = 'main';
const DEFAULT_SETTINGS: AISettings = { baseUrl: '', apiKey: '', model: '' };

export const aiSettingsStore = {
  async getSettings(): Promise<AISettings> {
    const row = await aiDb.settings.get(SETTINGS_KEY);
    if (!row) return { ...DEFAULT_SETTINGS };
    return { baseUrl: row.baseUrl, apiKey: row.apiKey, model: row.model };
  },

  async saveSettings(s: AISettings): Promise<void> {
    await aiDb.settings.put({ key: SETTINGS_KEY, ...s });
  },

  async isConfigured(): Promise<boolean> {
    const s = await this.getSettings();
    return Boolean(s.baseUrl && s.apiKey && s.model);
  },
};

/** 选中节点快捷操作模板：{topic} 替换为选中节点文本 */
export const BUILTIN_TEMPLATES: Template[] = [
  {
    id: 'tpl-expand',
    name: '展开分支',
    builtin: true,
    content:
      '请围绕思维导图主题「{topic}」展开 4-8 个直接子分支，每个分支可视需要带 2-4 个下级子分支，覆盖该主题的关键方面。只输出导图 JSON。',
  },
  {
    id: 'tpl-inspire',
    name: '头脑风暴',
    builtin: true,
    content:
      '请针对思维导图主题「{topic}」做头脑风暴，给出 6-10 个有创意、角度各异的想法分支（不要带下级子分支）。只输出导图 JSON。',
  },
  {
    id: 'tpl-pros-cons',
    name: '利弊分析',
    builtin: true,
    content:
      '请对思维导图主题「{topic}」做利弊分析，生成「优势」「劣势」「风险」「机会」等分支，各带 2-4 个要点子分支。只输出导图 JSON。',
  },
];
