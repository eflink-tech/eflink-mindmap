// AI 助手面板：设置 / 对话（携带导图大纲上下文）/ 生成导图 / 展开选中分支 / 会话历史
// 交互模式与 eflink-pptx / eflink-word / eflink-excel 的 AIChatPanel 保持一致
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, History, ListTree, Settings, Sparkles, Trash2, Wand2, X } from 'lucide-react';
import { useI18n } from '@eflink-tech/office-kit';
import { useUiStore } from '../../store/uiStore';
import { aiDb, aiSettingsStore, BUILTIN_TEMPLATES } from '../../ai/db';
import { errorMessage, sendMessage, type ChatMessage } from '../../ai/aiService';
import { buildExpandPrompt, buildTreePrompt, parseAITree } from '../../ai/systemPrompt';
import { applyAITree, getOutlineContext, getSelectedNodeText } from '../../ai/actionExecutor';
import type { AITree, AISettings, Conversation } from '../../ai/types';

type PanelView = 'chat' | 'settings' | 'history';

interface SimpleMessage {
  role: 'user' | 'assistant';
  content: string;
}

const ACCENT = '#2563eb';

/** 内置模板名（ai/db.ts 规范中文存储值）→ 展示文案键 */
const TEMPLATE_NAME_KEYS: Record<string, string> = {
  '展开分支': 'mind.ai.tpl.expand',
  '头脑风暴': 'mind.ai.tpl.inspire',
  '利弊分析': 'mind.ai.tpl.prosCons',
};

export function AIChatPanel() {
  const { t } = useI18n();
  const closePanel = useUiStore((s) => s.closePanel);
  const showToast = useUiStore((s) => s.showToast);
  const [view, setView] = useState<PanelView>('chat');
  const [settings, setSettings] = useState<AISettings>({ baseUrl: '', apiKey: '', model: '' });
  const [configured, setConfigured] = useState(false);
  const [messages, setMessages] = useState<SimpleMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [genView, setGenView] = useState(false);
  const [topic, setTopic] = useState('');
  const [requirements, setRequirements] = useState('');
  const [pendingTree, setPendingTree] = useState<AITree | null>(null);
  const [convId, setConvId] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<Conversation[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void aiSettingsStore.getSettings().then((s) => {
      setSettings(s);
      setConfigured(Boolean(s.baseUrl && s.apiKey && s.model));
    });
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, busy]);

  // 会话持久化：消息变化时写入 Dexie
  useEffect(() => {
    if (!messages.length) return;
    const id = convId ?? (() => { const nid = `conv-${Date.now()}`; setConvId(nid); return nid; })();
    const now = Date.now();
    void aiDb.conversations.put({
      id,
      title: messages[0]?.content.replace(/\n/g, ' ').slice(0, 24) || t('mind.ai.newChat'),
      messages: messages.map((m) => ({ ...m, time: now })),
      createdAt: now,
      updatedAt: now,
    });
  }, [messages, convId]);

  const loadHistory = () => {
    void aiDb.conversations.orderBy('updatedAt').reverse().toArray().then(setHistoryList);
  };

  const openConversation = (conv: Conversation) => {
    setMessages(conv.messages.map((m) => ({ role: m.role, content: m.content })));
    setConvId(conv.id);
    setView('chat');
  };

  const deleteConversation = (id: string) => {
    void aiDb.conversations.delete(id).then(loadHistory);
  };

  const saveSettings = () => {
    void aiSettingsStore.saveSettings(settings).then(() => {
      setConfigured(Boolean(settings.baseUrl && settings.apiKey && settings.model));
      setView('chat');
    });
  };

  const buildSystemPrompt = (): string => {
    const outline = getOutlineContext();
    return [
      '你是易飞思维导图的 AI 助手，回答简洁专业，用中文。',
      outline ? `当前导图结构如下（供参考）：\n${outline}` : '当前导图为空。',
    ].join('\n');
  };

  const doSend = async (userText: string, onText?: (text: string) => string) => {
    if (busy) return;
    const s = await aiSettingsStore.getSettings();
    if (!s.baseUrl || !s.apiKey || !s.model) {
      setView('settings');
      return;
    }
    const text = onText ? onText(userText) : userText;
    const next: SimpleMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const chat: ChatMessage[] = [
      { role: 'system', content: buildSystemPrompt() },
      ...next.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
    ];

    try {
      await sendMessage({
        settings: s,
        messages: chat,
        signal: controller.signal,
        onContentChunk: (_chunk, full) => {
          setMessages([...next, { role: 'assistant', content: full }]);
        },
      });
    } catch (error) {
      setMessages([...next, { role: 'assistant', content: `⚠️ ${errorMessage(error)}` }]);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  /** 生成整张导图（树形 JSON），结果先展示摘要，由用户确认后应用到画布 */
  const generateTree = () => {
    if (busy) return;
    if (!topic.trim()) return;
    void (async () => {
      const s = await aiSettingsStore.getSettings();
      if (!s.baseUrl || !s.apiKey || !s.model) {
        setView('settings');
        return;
      }
      setBusy(true);
      setPendingTree(null);
      const label = t('mind.ai.genTitle', { topic: topic.trim() });
      const next: SimpleMessage[] = [...messages, { role: 'user', content: label }];
      setMessages(next);
      try {
        const { content } = await sendMessage({
          settings: s,
          messages: [
            { role: 'system', content: '你是专业的思维导图策划师，只输出 JSON。' },
            { role: 'user', content: buildTreePrompt(topic.trim(), requirements.trim()) },
          ],
          onContentChunk: (_c, full) => {
            setMessages([...next, { role: 'assistant', content: t('mind.ai.generatingChars', { count: full.length }) }]);
          },
        });
        const tree = parseAITree(content);
        setPendingTree(tree);
        const preview = tree.children
          .map((c) => `· ${c.text}${c.children?.length ? t('mind.ai.subBranches', { count: c.children.length }) : ''}`)
          .slice(0, 10);
        setMessages([
          ...next,
          {
            role: 'assistant',
            content: `${t('mind.ai.generatedSummary', {
              root: tree.root ?? topic.trim(),
              nodes: countNodes(tree),
              branches: tree.children.length,
            })}\n${preview.join('\n')}`,
          },
        ]);
      } catch (error) {
        setMessages([...next, { role: 'assistant', content: `⚠️ ${errorMessage(error)}` }]);
      } finally {
        setBusy(false);
      }
    })();
  };

  const applyPendingTree = () => {
    if (!pendingTree) return;
    try {
      const count = applyAITree(pendingTree);
      setPendingTree(null);
      setGenView(false);
      showToast(t('mind.ai.appliedCount', { count }));
      setMessages((prev) => [...prev, { role: 'assistant', content: t('mind.ai.appliedToMap', { count }) }]);
    } catch (error) {
      const reason = error instanceof Error ? error.message : t('mind.ai.applyFailed');
      showToast(reason, { error: true });
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${reason}` }]);
    }
  }

  /** 模板 chip 展示名：规范中文名为存储键，按 mind.ai.tpl.* 字典换语言 */
  const templateName = (name: string) => {
    const key = TEMPLATE_NAME_KEYS[name];
    return key ? t(key) : name;
  };

  /** 展开选中分支：把 AI 生成的子分支挂到选中节点下 */
  const runExpand = (templateId: string) => {
    const selected = getSelectedNodeText();
    if (!selected) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${t('mind.ai.selectNodeFirst')}` }]);
      return;
    }
    const tpl = BUILTIN_TEMPLATES.find((x) => x.id === templateId);
    if (!tpl) return;
    void (async () => {
      const s = await aiSettingsStore.getSettings();
      if (!s.baseUrl || !s.apiKey || !s.model) {
        setView('settings');
        return;
      }
      setBusy(true);
      const label = t('mind.ai.expandTitle', { template: templateName(tpl.name), node: selected });
      const next: SimpleMessage[] = [...messages, { role: 'user', content: label }];
      setMessages(next);
      try {
        const { content } = await sendMessage({
          settings: s,
          messages: [
            { role: 'system', content: '你是思维导图专家，只输出 JSON。' },
            { role: 'user', content: buildExpandPrompt(tpl.content, selected, getOutlineContext(1200)) },
          ],
          onContentChunk: (_c, full) => {
            setMessages([...next, { role: 'assistant', content: t('mind.ai.generatingChars', { count: full.length }) }]);
          },
        });
        // expand 模式：忽略 root，分支挂到选中节点下
        const tree = parseAITree(content, true);
        const count = applyAITree(tree);
        showToast(t('mind.ai.addedCount', { count }));
        setMessages([...next, { role: 'assistant', content: t('mind.ai.expandedUnder', { node: selected, count }) }]);
      } catch (error) {
        setMessages([...next, { role: 'assistant', content: `⚠️ ${errorMessage(error)}` }]);
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-slate-200 bg-white" data-testid="ai-panel">
      {/* 头部 */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-100 px-3">
        <span className="flex items-center gap-1 text-sm font-medium text-slate-800">
          <Sparkles size={15} style={{ color: ACCENT }} />
          {t('mind.ai.title')}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title={t('mind.ai.history')}
            onClick={() => { loadHistory(); setView(view === 'history' ? 'chat' : 'history'); }}
          >
            <History size={15} />
          </button>
          <button
            type="button"
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title={t('mind.ai.settings')}
            onClick={() => setView(view === 'settings' ? 'chat' : 'settings')}
          >
            <Settings size={15} />
          </button>
          <button
            type="button"
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title={t('mind.ai.newChat')}
            onClick={() => { setMessages([]); setPendingTree(null); setConvId(null); setView('chat'); }}
          >
            <Trash2 size={15} />
          </button>
          <button
            type="button"
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title={t('mind.ai.collapse')}
            onClick={closePanel}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {view === 'history' ? (
        <div className="flex-1 overflow-y-auto p-3" data-testid="ai-history">
          <button
            type="button"
            className="mb-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
            onClick={() => setView('chat')}
          >
            <ChevronLeft size={14} />
            {t('mind.ai.backToChat')}
          </button>
          {historyList.length === 0 && <div className="py-6 text-center text-xs text-slate-400">{t('mind.ai.noHistory')}</div>}
          <div className="space-y-1.5">
            {historyList.map((conv) => (
              <div key={conv.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <button
                  type="button"
                  className="flex-1 truncate text-left text-xs text-slate-700"
                  onClick={() => openConversation(conv)}
                >
                  {conv.title}
                </button>
                <span className="shrink-0 text-[10px] text-slate-400">
                  {new Date(conv.updatedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  title={t('action.delete')}
                  onClick={() => deleteConversation(conv.id)}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : view === 'settings' ? (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-3 text-xs leading-relaxed text-slate-500">
            {t('mind.ai.settingsIntro')}
          </div>
          {([
            ['baseUrl', t('mind.ai.baseUrl'), 'https://dashscope.aliyuncs.com/compatible-mode/v1'],
            ['apiKey', 'API Key', 'sk-…'],
            ['model', t('mind.ai.model'), 'qwen-plus'],
          ] as const).map(([key, label, placeholder]) => (
            <div key={key} className="mb-2">
              <div className="mb-1 text-xs text-slate-500">{label}</div>
              <input
                type={key === 'apiKey' ? 'password' : 'text'}
                name={`eflink-ai-${key}`}
                autoComplete={key === 'apiKey' ? 'new-password' : 'off'}
                // 只读直到聚焦：避免 Chrome 把「接口地址 + 密码框」识别为登录表单而自动填充保存的账号密码
                readOnly
                onFocus={(e) => { e.currentTarget.readOnly = false; }}
                value={settings[key]}
                placeholder={placeholder}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-[#2563eb]"
              />
            </div>
          ))}
          <button
            type="button"
            className="mt-2 w-full rounded-md py-1.5 text-xs text-white"
            style={{ backgroundColor: ACCENT }}
            onClick={saveSettings}
          >
            {t('mind.ai.saveSettings')}
          </button>
        </div>
      ) : (
        <>
          {/* 生成导图流程 */}
          <div className="shrink-0 border-b border-slate-100 p-2">
            {!genView ? (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-xs"
                style={{ backgroundColor: '#e8effd', color: ACCENT }}
                onClick={() => setGenView(true)}
                data-testid="ai-gen-toggle"
              >
                <Wand2 size={14} />
                {t('mind.ai.generateMap')}
              </button>
            ) : (
              <div className="rounded-md bg-slate-50 p-2">
                <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                  <span>{t('mind.ai.generate')}</span>
                  <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => setGenView(false)}>{t('mind.ai.collapse')}</button>
                </div>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={t('mind.ai.topicPlaceholder')}
                  className="mb-1.5 w-full rounded border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-[#2563eb]"
                  data-testid="ai-gen-topic"
                />
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder={t('mind.ai.requirementsPlaceholder')}
                  rows={2}
                  className="mb-1.5 w-full resize-none rounded border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-[#2563eb]"
                />
                <button
                  type="button"
                  className="w-full rounded-md py-1.5 text-xs text-white disabled:opacity-50"
                  style={{ backgroundColor: ACCENT }}
                  disabled={busy || !topic.trim()}
                  onClick={generateTree}
                  data-testid="ai-gen-tree"
                >
                  {busy ? t('mind.ai.generatingBtn') : t('mind.ai.generateBtn')}
                </button>
                {pendingTree && (
                  <button
                    type="button"
                    className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-md border py-1.5 text-xs"
                    style={{ borderColor: ACCENT, color: ACCENT }}
                    onClick={applyPendingTree}
                    data-testid="ai-insert-tree"
                  >
                    <ListTree size={13} />
                    {t('mind.ai.applyToMap')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 消息列表 */}
          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3" data-testid="ai-messages">
            {!configured && (
              <div className="rounded-md bg-[#e8effd] p-2 text-xs text-slate-700">
                {t('mind.ai.notConfiguredHint')}
              </div>
            )}
            {configured && messages.length === 0 && (
              <div className="rounded-md bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-500">
                {t('mind.ai.welcomeHint')}
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`whitespace-pre-wrap rounded-md px-2.5 py-2 text-xs leading-relaxed ${
                  m.role === 'user' ? 'ml-6 text-white' : 'mr-2 bg-slate-100 text-slate-700'
                }`}
                style={m.role === 'user' ? { backgroundColor: ACCENT } : undefined}
              >
                {m.content}
              </div>
            ))}
          </div>

          {/* 选中节点快捷操作 */}
          <div className="flex shrink-0 flex-wrap gap-1 border-t border-slate-100 px-2 pt-2">
            {BUILTIN_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500 hover:border-[#2563eb] hover:text-[#2563eb] disabled:opacity-50"
                disabled={busy}
                onClick={() => runExpand(tpl.id)}
              >
                {templateName(tpl.name)}
              </button>
            ))}
          </div>

          {/* 输入区 */}
          <div className="flex shrink-0 items-end gap-1.5 p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim()) void doSend(input.trim());
                }
              }}
              rows={2}
              placeholder={t('mind.ai.inputPlaceholder')}
              className="flex-1 resize-none rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-[#2563eb]"
              data-testid="ai-input"
            />
            {busy ? (
              <button
                type="button"
                className="rounded-md bg-slate-200 px-3 py-2 text-xs text-slate-600"
                onClick={() => abortRef.current?.abort()}
              >
                {t('mind.ai.stop')}
              </button>
            ) : (
              <button
                type="button"
                className="rounded-md px-3 py-2 text-xs text-white disabled:opacity-50"
                style={{ backgroundColor: ACCENT }}
                disabled={!input.trim()}
                onClick={() => input.trim() && void doSend(input.trim())}
              >
                {t('mind.ai.send')}
              </button>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

function countNodes(tree: AITree): number {
  const walk = (node: { children?: AITree['children'] }): number =>
    (node.children ?? []).reduce((sum, c) => sum + 1 + walk(c), 0);
  return walk(tree);
}
