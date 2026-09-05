---
'@eflink-tech/mindmap': minor
---

1. **feat**：新增 `setMindMapStorageBackend`：宿主可注入自定义存储后端对接远端 API（实现 put/get/remove/list/rename）；未注入时行为与之前完全一致。
2. **fix**：修复 StrictMode 下挂载时 effect 双执行导致重复建档的问题。
