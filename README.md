# Ender Coder 👾

一个会「看」你写代码的 Windows 桌面宠物。末影人风格的方块程序员，用 **30fps 程序化插值动画**（关键帧 + 位移/呼吸插值，参照 [Clawd on Desk](https://github.com/marcluque/clawd-on-desk) 的实现思路）在桌面陪你干活，并**实时监听 Claude Code / Codex CLI 的活动**——你敲代码它就敲键盘，报错它就抓 Bug，跑完就庆祝。

A Windows desktop pet that *watches* you code. An Enderman-style block programmer rendered with **30fps tweened animation** (keyframes + procedural sway/bob, inspired by [Clawd on Desk](https://github.com/marcluque/clawd-on-desk)), sitting on your desktop while it **monitors Claude Code / Codex CLI in real time** — typing with you, catching bugs, and celebrating when builds pass.

---

## ✨ 特性 Features

| 中文 | English |
| --- | --- |
| 30fps 双帧交叉淡化 + 位移插值动画 | 30fps dual-frame crossfade + positional tweening |
| 9+ 状态机（含新增 sleeping 打盹状态） | 9+ state machine (incl. new *sleeping* state) |
| 4 个角色专属互动（写代码/喂咖啡/抓Bug/摸摸头） | 4 character interactions (write code / feed coffee / catch a bug / pet head) |
| 实时监听 Claude Code 会话与 Codex 会话 | Live monitoring of Claude Code & Codex sessions |
| Claude Code command hooks 可选安装 | Optional Claude Code command-hook installation |
| 中英双语 UI 与 Dashboard（4 页签） | Bilingual UI + Dashboard (4 tabs) |
| 好感度 / 心情 / 互动统计 / 陪伴时长 | Affection / mood / interaction stats / companion time |
| 提醒、贴边、拖拽、托盘、置顶、穿透 | Reminders, edge snap, drag, tray, always-on-top, click-through |
| Squirrel 安装器 `Setup.exe` | Squirrel installer `Setup.exe` |

---

## 📦 安装 Installation

### Windows

- **安装版（推荐）**：下载 GitHub Releases 里的 `Ender Coder-<version>-x64-Setup.exe`，双击安装。
- **便携版**：`npm run package:win` 后运行 `release/Ender Coder-win32-x64-ready-to-run/Ender Coder.exe`（需保留整个目录，不能只拷 EXE）。

> 未签名应用首次运行可能触发 Windows SmartScreen / Defender 提示，选择「仍要运行」即可。这是个人开源项目，没有代码签名证书。

- **Installer (recommended)**: grab `Ender Coder-<version>-x64-Setup.exe` from GitHub Releases and double-click.
- **Portable**: `npm run package:win`, then run `release/Ender Coder-win32-x64-ready-to-run/Ender Coder.exe` (keep the whole directory — the EXE alone won't run).

> Unsigned builds may trigger SmartScreen / Defender. Choose "More info → Run anyway". This is a personal open-source project with no code-signing certificate.

---

## 🎮 使用 Usage

| 操作 Action | 效果 Effect |
| --- | --- |
| 左键点击 | 开心反馈 + 挤压回弹 squash & happy |
| 按住拖拽 | 拖动桌宠，拖到屏幕边缘自动贴边 |
| 右键 | 互动菜单 / 面板 / 提醒 / 退出 |
| 面板 → 设置 | 置顶、鼠标穿透、四档大小、**语言切换（中文/EN）** |
| 面板 → Agents | 开启/关闭 Claude Code 与 Codex 监听、查看最近事件、**Install hooks** |

### 🤖 编程助手监听 Agent Monitoring

| 来源 Source | 路径 Path | 检测内容 Detected |
| --- | --- | --- |
| Claude Code | `~/.claude/projects/*.jsonl` | 工具调用（typing）、思考（thinking）、工具报错（error） |
| Codex CLI | `~/.codex/sessions/*.jsonl` | function_call、报错、消息 |
| Claude Code Hooks | `~/.endercoder-pet/agent-events.jsonl` | SessionStart / Pre/PostToolUse / Stop / SessionEnd |

事件 → 桌宠状态映射：思考→偷看、写代码→敲键盘、报错→抓 Bug、完成→庆祝、60 秒无活动→打盹。

Event → pet state: thinking→peek, typing/building→code, error→bug, done→happy, 60s idle→sleeping.

**隐私 Privacy**：监听只读、只提取「事件类型 + 工具名」，绝不落盘/记录任何提示词、回复或会话正文。Hooks 安装只写 `~/.claude/settings.json` 的 hooks 配置（保留你已有的其他配置）。

Monitoring is **read-only**: only event kinds and tool names are extracted. No prompt/response text is ever stored or logged. Hooks install merges into your existing `~/.claude/settings.json` without touching other settings.

---

## 🛠 构建 Build

```bash
cd app
npm ci            # 安装锁定依赖（首次）
npm run preflight # 校验 Electron 运行时
npm run check     # 类型 + 契约 + UI/体验/素材 QA
npm test          # 单元测试
npm run test:dev-smoke   # 开发冒烟（三个 renderer + IPC + 素材）
npm run package:win      # 可运行目录 release/
npm run make:win         # Squirrel Setup.exe
```

要求：Windows x64 + Node 24 或更早（Forge 兼容）；首次构建会下载约 100MB+ Electron 运行时。

Requirements: Windows x64 + Node 24 or earlier. First build downloads the ~100MB+ Electron runtime.

---

## 🧱 技术栈 Tech Stack

Electron 37 · TypeScript · Webpack · Electron Forge · Squirrel · 零第三方运行时依赖的插值渲染器（原生 DOM + CSS transitions）

Electron 37 · TypeScript · Webpack · Electron Forge · Squirrel · dependency-free tween renderer (vanilla DOM + CSS transitions)

---

## 📄 许可 License

[GNU Affero General Public License v3.0](LICENSE)（AGPL-3.0）© Ender Coder contributors

与 [Clawd on Desk](https://github.com/rullerzhou-afk/clawd-on-desk) 的源码许可一致（AGPL-3.0）。本项目角色素材为 AI 原创，不属于任何第三方。

[GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0) © Ender Coder contributors

Same source license as [Clawd on Desk](https://github.com/rullerzhou-afk/clawd-on-desk). The character artwork in this project is original AI-generated work and is not owned by any third party.
