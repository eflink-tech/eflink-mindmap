import 'fake-indexeddb/auto';
// 测试环境同样注册界面文案字典（生产由 MindMapEditor 入口注册），
// 否则组件里的 t() 会回落到原始消息键
import '../i18n/messages';
