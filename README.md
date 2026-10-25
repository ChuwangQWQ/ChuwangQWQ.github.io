# SFM 节点式代码生成器

一个纯前端（HTML / CSS / JavaScript）的可视化节点编辑器，用于通过拖拽节点、连线的方式生成 SFM（Super Factory Manager）脚本代码。

无需构建工具，直接由 IIS 等静态服务器托管即可运行。

---

## 功能概览

### 节点编辑器
- 右键画布空白处呼出菜单，添加节点。
- 支持的节点类型：
  - **输入**（base）：一条输入链的起点，可设置 Tick。
  - **输出**（output）：一条输出链的终点，可设置标签。
  - **条件**（condition）：生成 `if` 判断，支持 `>= <= > < == !=`。
  - **集线器**（hub）：透明通路，用于整理连线，本身不产生代码。
  - **输入/输出参数节点**：`数量`（含 each）、`资源类型`、`资源ID`、`保留数量`、`方向`、`槽位`（含 empty）。
- 拖拽节点头部移动节点；拖拽端口连线；双击连线删除。
- 画布空白处拖拽可整体平移所有节点。

### 代码生成
- 自动遍历所有从输入节点出发、最终到达输出节点的路径。
- 同一输入下的多条输出会合并为一条 `input` 语句 + 多条 `output` 语句。
- 同一 `every` 块内，不同输入链之间自动插入 `forget`，避免资源冲突。
- 参数顺序标准化：数量、`each`、资源ID、保留，方向与槽位置于 `from/to` 之后。
- 资源类型前缀：`item` 无前缀；`fluid::`、`forge_energy::`、`gas::`。
- 支持只指定资源类型（不指定具体 ID）来生成类型级别的资源标识。

### 物品选择器
- 从 `items.json` 加载物品数据库，优先读取 `localStorage` 缓存，其次 `fetch('/items.json')`，失败时回退到内置示例数据。
- 列表滚动到底部自动加载更多。
- 支持按 Mod 筛选（全选 / 全不选 / 搜索 Mod 名），`minecraft` 置顶，其余按字母序。
- 输入未收录的物品命名空间即可生成自定义物品卡片，直接选用。

### 多工程管理
- 顶部标签栏支持多个工程同时打开、切换、关闭。
- 主页视图集中管理所有工程，双击卡片进入编辑。
- 支持新建、重命名、删除工程。
- 工程数据保存在 `localStorage`（`sfm_projects_data` / `sfm_open_projects`）。
- 支持导出 / 导入工程为 JSON 文件。
- 修改后自动保存，并显示“已保存 / 未保存”状态；关闭页面前若有未保存修改会提示。

### 其他
- 右侧面板 Tab：代码、标签管理、工程设置。
- 标签管理：增删改标签，节点引用同步更新。
- 导出调试 JSON，便于排查问题。
- 左右面板可拖拽分隔条调整宽度。

---

## 目录结构

```
main.html              入口页面，按顺序动态加载 scripts 下的脚本
style.css              全部样式
items.json             物品数据库（可选，缺失时使用内置示例）
scripts/
  01-splitter.js       左右面板分隔条拖拽
  02-labels.js         全局标签管理
  03-data.js           数据模型、颜色配置、getNode
  04-node-class.js     Node 类：渲染、设置项、端口、拖拽
  05-node-manager.js   节点创建 / 删除 / 清空、端口状态刷新
  06-connections.js    连线系统（canvas 贝塞尔曲线）、临时连线
  07-context-menu.js   右键菜单
  08-item-picker.js    物品选择器（懒加载 + Mod 筛选 + 自定义物品）
  09-code-gen.js       代码生成
  10-export-debug.js   导出调试 JSON
  11-copy-code.js      复制代码
  12-tabs.js           右侧面板 Tab 切换
  13-init.js           初始化：恢复工程或创建默认示例
  14-save-load.js      单工程导入导出与自动保存（多工程时跳过）
  15-projects.js       多工程管理
  16-home.js           主页与工程设置
  17-pan.js            画布空白拖拽整体平移
```

脚本由 `main.html` 中的加载器按数组顺序串行加载，**顺序不可随意调整**，存在依赖关系。

---

## 运行方式

1. 将整个目录放到任意静态服务器根目录（如 IIS）。
2. 浏览器访问 `main.html`。
3. 打开物品选择器时会自动加载 `items.json`；若不存在则使用内置示例数据。

无需 Node.js、无需打包。

---

## 开发约定

- **节点 ID 一律使用字符串 UUID**；保存 / 恢复时必须 `String(id)`，避免类型不匹配导致连线失败。
- 节点类型：`base` / `output` / `condition` / `hub` / `num` / `resType` / `resId` / `retain` / `side` / `slots`。
- 集线器（`hub`）固定 1 个输入端口与 1 个输出端口，无设置项，不参与代码生成但可被路径穿过。
- 连接线由 `#connection-canvas` 绘制，尺寸随 `#canvas-wrapper` 变化，窗口 resize 时需调用 `resizeCanvas()`。
- 新增节点类型需要同步修改：
  - `03-data.js` 的 `COLORS` 与 `getNodeColor`
  - `04-node-class.js` 的 `defaultSettings`、`buildSettings`、`updateUI`、端口渲染
  - `09-code-gen.js` 的 `buildStatementLine`（若参与代码生成）
  - `main.html` 右键菜单项
- 修改数据后调用 `window.markDirty()` 触发自动保存。

---

## 已知限制

- 画布不支持缩放，仅支持整体平移。
- 物品数据库首次加载后缓存于 `localStorage`，若 `items.json` 更新，需清除该缓存键 `sfm_items_data` 才会重新拉取。

---

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)。
