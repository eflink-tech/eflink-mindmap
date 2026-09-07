// AI 助手面板：设置 / 对话（携带导图大纲上下文）/ 生成导图 / 展开选中分支 / 会话历史
// 交互模式与 eflink-pptx / eflink-word / eflink-excel 的 AIChatPanel 保持一致
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, History, ListTree, Settings, Sparkles, Trash2, Wand2, X } from 'lucide-react';
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

export function AIChatPanel() {
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
      title: messages[0]?.content.replace(/\n/g, ' ').slice(0, 24) || '新对话',
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
      const label = `生成导图：${topic.trim()}`;
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
            setMessages([...next, { role: 'assistant', content: `正在生成…（${full.length} 字）` }]);
          },
        });
        const tree = parseAITree(content);
        setPendingTree(tree);
        const preview = tree.children
          .map((c) => `· ${c.text}${c.children?.length ? `（${c.children.length} 子分支）` : ''}`)
          .slice(0, 10);
        setMessages([
          ...next,
          {
            role: 'assistant',
            content: `已生成「${tree.root ?? topic.trim()}」：${countNodes(tree)} 个节点，${tree.children.length} 条主分支。\n${preview.join('\n')}`,
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
      showToast(`已应用 ${count} 个节点`);
      setMessages((prev) => [...prev, { role: 'assistant', content: `已应用到导图（新增 ${count} 个节点）。可撤销（Ctrl+Z）回退。` }]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '应用失败');
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${error instanceof Error ? error.message : '应用失败'}` }]);
    }
  }

  /** 展开选中分支：把 AI 生成的子分支挂到选中节点下 */
  const runExpand = (templateId: string) => {
    const selected = getSelectedNodeText();
    if (!selected) {
      setMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ 请先选中要展开的节点' }]);
      return;
    }
    const tpl = BUILTIN_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    void (async () => {
      const s = await aiSettingsStore.getSettings();
      if (!s.baseUrl || !s.apiKey || !s.model) {
        setView('settings');
        return;
      }
      setBusy(true);
      const label = `${tpl.name}：${selected}`;
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
            setMessages([...next, { role: 'assistant', content: `正在生成…（${full.length} 字）` }]);
          },
        });
        // expand 模式：忽略 root，分支挂到选中节点下
        const tree = parseAITree(content, true);
        const count = applyAITree(tree);
        showToast(`已新增 ${count} 个节点`);
        setMessages([...next, { role: 'assistant', content: `已在「${selected}」下新增 ${count} 个节点。可撤销（Ctrl+Z）回退。` }]);
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
          AI 助手
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="会话历史"
            onClick={() => { loadHistory(); setView(view === 'history' ? 'chat' : 'history'); }}
          >
            <History size={15} />
          </button>
          <button
            type="button"
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="AI 设置"
            onClick={() => setView(view === 'settings' ? 'chat' : 'settings')}
          >
            <Settings size={15} />
          </button>
          <button
            type="button"
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="新对话"
            onClick={() => { setMessages([]); setPendingTree(null); setConvId(null); setView('chat'); }}
          >
            <Trash2 size={15} />
          </button>
          <button
            type="button"
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="收起"
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
            返回对话
          </button>
          {historyList.length === 0 && <div className="py-6 text-center text-xs text-slate-400">暂无历史会话</div>}
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
                  title="删除"
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
            配置任意 OpenAI 兼容接口（如通义千问、DeepSeek、Kimi）。密钥仅保存在本地浏览器（IndexedDB），不会上传。
          </div>
          {([
            ['baseUrl', '接口地址', 'https://dashscope.aliyuncs.com/compatible-mode/v1'],
            ['apiKey', 'API Key', 'sk-…'],
            ['model', '模型', 'qwen-plus'],
          ] as const).map(([key, label, placeholder]) => (
            <div key={key} className="mb-2">
              <div className="mb-1 text-xs text-slate-500">{label}</div>
              <input
                type={key === 'apiKey' ? 'password' : 'text'}
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
            保存设置
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
                AI 生成导图
              </button>
            ) : (
              <div className="rounded-md bg-slate-50 p-2">
                <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                  <span>生成导图</span>
                  <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => setGenView(false)}>收起</button>
                </div>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="输入主题，如：产品发布计划"
                  className="mb-1.5 w-full rounded border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-[#2563eb]"
                  data-testid="ai-gen-topic"
                />
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="补充要求（可选）：角度、层级、数量…"
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
                  {busy ? '生成中…' : '生成'}
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
                    应用到导图
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 消息列表 */}
          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3" data-testid="ai-messages">
            {!configured && (
              <div className="rounded-md bg-[#e8effd] p-2 text-xs text-slate-700">
                尚未配置 AI 接口，点击右上角 ⚙️ 进行设置。
              </div>
            )}
            {configured && messages.length === 0 && (
              <div className="rounded-md bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-500">
                你可以让我生成整张导图，或选中节点后用下方快捷操作展开分支。
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
            {BUILTIN_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500 hover:border-[#2563eb] hover:text-[#2563eb] disabled:opacity-50"
                disabled={busy}
                onClick={() => runExpand(t.id)}
              >
                {t.name}
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
              placeholder="输入消息，Enter 发送"
              className="flex-1 resize-none rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-[#2563eb]"
              data-testid="ai-input"
            />
            {busy ? (
              <button
                type="button"
                className="rounded-md bg-slate-200 px-3 py-2 text-xs text-slate-600"
                onClick={() => abortRef.current?.abort()}
              >
                停止
              </button>
            ) : (
              <button
                type="button"
                className="rounded-md px-3 py-2 text-xs text-white disabled:opacity-50"
                style={{ backgroundColor: ACCENT }}
                disabled={!input.trim()}
                onClick={() => input.trim() && void doSend(input.trim())}
              >
                发送
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
