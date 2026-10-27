// AI 数据持久化（Dexie）：设置 / 会话历史 / 内置提示词模板
import Dexie, { type Table } from 'dexie';
import { isLegacyImportDone, markLegacyImportDone, readLegacyIndexedDb } from '@eflink-tech/office-kit';
import { LEGACY_AI_DB_NAME, LEGACY_AI_STORES } from '../core/persistence/legacy';
import { LEGACY_AI_IMPORT_DONE_KEYS } from '../core/persistence/keys';
import type { AISettings, Conversation, Template } from './types';

export class AIDb extends Dexie {
  conversations!: Table<Conversation, string>;
  settings!: Table<AISettings & { key: string }, string>;
  templates!: Table<Template, string>;

  constructor() {
    super('doculuma-mindmap-ai');
    this.version(1).stores({
      conversations: 'id, updatedAt',
      settings: 'key',
      templates: 'id, builtin',
    });
  }
}

export const aiDb = new AIDb();

/**
 * 旧 AI 库（efLink 时期）数据一次性导入：每张表仅在自己为空时灌入旧数据。
 * 只读旧库、不删除，失败只打日志，不阻塞 AI 面板。
 */
let legacyImport: Promise<void> | null = null;

/**
 * 单张表搬运（仿 draw 的 importTable）：旧库该表有数据且新表为空时才写入（原样搬行，不改结构）。
 * 无论导入成功还是跳过都落一次性标记：否则用户删光会话后，
 * 空表判据再次命中，旧数据会"复活"且永远删不干净。
 * bulkPut 失败不落标记，下个会话自然重试。
 */
async function importRows<T>(
  table: Table<T, string>,
  rows: unknown[] | undefined,
  markerKey: string,
): Promise<void> {
  if (isLegacyImportDone(markerKey)) return;
  if (!rows?.length) {
    markLegacyImportDone(markerKey);
    return;
  }
  if ((await table.count()) > 0) {
    markLegacyImportDone(markerKey);
    return;
  }
  await table.bulkPut(rows as T[]);
  markLegacyImportDone(markerKey);
}

export function ensureLegacyImport(): Promise<void> {
  if (!legacyImport) {
    legacyImport = (async () => {
      try {
        const legacy = await readLegacyIndexedDb(LEGACY_AI_DB_NAME, LEGACY_AI_STORES);
        if (!legacy) return;
        await Promise.all([
          importRows(aiDb.conversations, legacy.conversations, LEGACY_AI_IMPORT_DONE_KEYS.conversations),
          importRows(aiDb.settings, legacy.settings, LEGACY_AI_IMPORT_DONE_KEYS.settings),
          importRows(aiDb.templates, legacy.templates, LEGACY_AI_IMPORT_DONE_KEYS.templates),
        ]);
      } catch (error) {
        console.error('导入旧版 AI 数据失败:', error);
      }
    })();
  }
  return legacyImport;
}

const SETTINGS_KEY = 'main';
const DEFAULT_SETTINGS: AISettings = { baseUrl: '', apiKey: '', model: '' };

export const aiSettingsStore = {
  async getSettings(): Promise<AISettings> {
    await ensureLegacyImport();
    const row = await aiDb.settings.get(SETTINGS_KEY);
    if (!row) return { ...DEFAULT_SETTINGS };
    return { baseUrl: row.baseUrl, apiKey: row.apiKey, model: row.model };
  },

  async saveSettings(s: AISettings): Promise<void> {
    await ensureLegacyImport();
    await aiDb.settings.put({ key: SETTINGS_KEY, ...s });
  },

  async isConfigured(): Promise<boolean> {
    const s = await this.getSettings();
    return Boolean(s.baseUrl && s.apiKey && s.model);
  },
};

/**
 * 选中节点快捷操作模板：{topic} 替换为选中节点文本。
 * name 是规范中文存储值（chip 展示时在 AIChatPanel 按 mind.ai.tpl.* 字典换语言），
 * content 是发给模型的提示词，保持中文不翻译。
 */
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
