<p align="center">
  <img src="docs/media/demo-idle.gif" width="150" alt="Ender Coder idle animation" />
</p>

<h1 align="center">Ender Coder 👾</h1>

<p align="center">
  <b>A desktop pet that <i>watches you code</i>.</b><br/>
  一个会「看」你写代码的 Windows 桌面宠物。
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg" alt="License: AGPL-3.0"></a>
  <img src="https://img.shields.io/badge/Electron-37-47848F?logo=electron&logoColor=white" alt="Electron 37">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Platform-Windows%20x64-0078D6?logo=windows&logoColor=white" alt="Windows x64">
  <img src="https://img.shields.io/badge/Version-1.0.0-2f81f7" alt="Version 1.0.0">
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen" alt="PRs Welcome">
</p>

<p align="center">
  <b>30fps tweened animation · 10-state machine · real-time Claude Code / Codex monitoring · bilingual UI</b><br/>
  30fps 插值动画 · 10 状态机 · 实时监听 Claude Code / Codex · 中英双语界面
</p>

<p align="center">
  <a href="https://github.com/harrylyu20260808-pixel/ender-coder/releases"><img src="docs/media/demo-run.gif" width="260" alt="Ender Coder running on desktop" /></a>
</p>

> **Demo video:** see `docs/media/demo.mp4` in this repo, or grab the installer from [Releases](https://github.com/harrylyu20260808-pixel/ender-coder/releases) and meet Ender on your own desktop.
> **演示视频：** 仓库内 `docs/media/demo.mp4`，或直接从 [Releases](https://github.com/harrylyu20260808-pixel/ender-coder/releases) 下载安装包，让 Ender 住进你的桌面。

---

## ✨ 特性 Features

| 中文 | English |
| --- | --- |
| 30fps 双帧交叉淡化 + 位移插值动画 | 30fps dual-frame crossfade + positional tweening |
| 10 状态机（idle / blink / happy / notify / peek / code / coffee / bug / pet / **sleeping**） | 10-state machine (incl. **sleeping**) |
| 4 个角色专属互动（敲代码 / 喂咖啡 / 抓Bug / 摸摸头） | 4 character interactions (write code / feed coffee / catch a bug / pet head) |
| 实时监听 Claude Code 与 Codex 会话 | Live monitoring of Claude Code & Codex sessions |
| Claude Code command hooks 可选安装 | Optional Claude Code command-hook installation |
| 中英双语 UI 与 Dashboard | Bilingual UI + Dashboard |
| 好感度 / 心情 / 互动统计 / 陪伴时长 | Affection / mood / interaction stats / companion time |
| 提醒、贴边、拖拽、托盘、置顶、穿透 | Reminders, edge snap, drag, tray, always-on-top, click-through |
| 零第三方运行时依赖的渲染器（原生 DOM + CSS transitions） | Dependency-free renderer (vanilla DOM + CSS transitions) |
| Squirrel 安装器 `Setup.exe` | Squirrel installer `Setup.exe` |

---

## 🎬 动画预览 Animation Gallery

每一帧都来自项目内真实的素材帧（512×512，透明背景，AI 原创角色）。

Every GIF below is rendered from the real sprite frames shipped in this repo (512×512, transparent, original AI artwork).

| idle 呼吸 | happy 开心 | coffee 喂咖啡 |
| --- | --- | --- |
| <img src="docs/media/demo-idle.gif" width="120" alt="idle" /> | <img src="docs/media/demo-happy.gif" width="120" alt="happy" /> | <img src="docs/media/demo-coffee.gif" width="120" alt="coffee" /> |

| bug 抓Bug | sleeping 打盹 | code 敲代码 |
| --- | --- | --- |
| <img src="docs/media/demo-bug.gif" width="120" alt="bug" /> | <img src="docs/media/demo-sleeping.gif" width="120" alt="sleeping" /> | <img src="docs/media/demo-code.gif" width="120" alt="code" /> |

| peek 偷看 | notify 提醒 | pet 摸摸头 |
| --- | --- | --- |
| <img src="docs/media/demo-peek.gif" width="120" alt="peek" /> | <img src="docs/media/demo-notify.gif" width="120" alt="notify" /> | <img src="docs/media/demo-pet.gif" width="120" alt="pet" /> |

---

## 📸 真实截图 Screenshots

| 桌宠运行中 On your desktop | 右键菜单 Right-click menu |
| --- | --- |
| <img src="docs/screenshots/desktop-full.png" width="420" alt="Ender Coder on desktop" /> | <img src="docs/screenshots/menu.png" width="420" alt="Right-click menu" /> |

| 控制面板 Dashboard | 桌宠特写 Close-up |
| --- | --- |
| <img src="docs/screenshots/dashboard.png" width="420" alt="Dashboard panel" /> | <img src="docs/screenshots/pet-region.png" width="420" alt="Ender close-up" /> |

---

## 🚀 快速开始 Quick Start

### 安装版 Installer（推荐 recommended）

下载 [Releases](https://github.com/harrylyu20260808-pixel/ender-coder/releases) 里的 `Ender Coder-<version>-x64-Setup.exe`，双击安装，桌宠自动出现在桌面。

Download `Ender Coder-<version>-x64-Setup.exe` from [Releases](https://github.com/harrylyu20260808-pixel/ender-coder/releases), double-click to install — Ender appears on your desktop automatically.

> 未签名应用首次运行可能触发 Windows SmartScreen / Defender 提示，选择「更多信息 → 仍要运行」即可。这是个人开源项目，没有代码签名证书。
> Unsigned builds may trigger SmartScreen / Defender. Choose "More info → Run anyway". This is a personal open-source project with no code-signing certificate.

### 源码运行 From source

```bash
cd app
npm ci                    # install locked dependencies (first time)
npm run preflight         # verify Electron runtime
npm run check             # type + contract + UI/experience/asset QA
npm run package:win       # ready-to-run directory in release/
npm run make:win          # Squirrel Setup.exe
```

Requirements: Windows x64 + Node 24 or earlier. First build downloads the ~100MB+ Electron runtime.
要求：Windows x64 + Node 24 或更早；首次构建会下载约 100MB+ Electron 运行时。

---

## 🎮 使用 Usage

| 操作 Action | 效果 Effect |
| --- | --- |
| 左键点击 Click | 开心反馈 + 挤压回弹 squash & happy |
| 按住拖拽 Drag | 拖动桌宠，拖到屏幕边缘自动贴边 drag & edge snap |
| 右键 Right-click | 互动菜单 / 面板 / 提醒 / 退出 menu / dashboard / reminders / quit |
| 面板 → 设置 Settings | 置顶、鼠标穿透、四档大小、**语言切换（中文/EN）** |
| 面板 → Agents | 开启/关闭 Claude Code 与 Codex 监听、查看最近事件、**Install hooks** |

### 🤖 编程助手监听 Agent Monitoring

| 来源 Source | 路径 Path | 检测内容 Detected |
| --- | --- | --- |
| Claude Code | `~/.claude/projects/*.jsonl` | 工具调用 typing、思考 thinking、工具报错 error |
| Codex CLI | `~/.codex/sessions/*.jsonl` | function_call、报错、消息 |
| Claude Code Hooks | `~/.endercoder-pet/agent-events.jsonl` | SessionStart / Pre/PostToolUse / Stop / SessionEnd |

事件 → 桌宠状态映射：思考→偷看、写代码→敲键盘、报错→抓 Bug、完成→庆祝、60 秒无活动→打盹。

Event → pet state: thinking→peek, typing/building→code, error→bug, done→happy, 60s idle→sleeping.

**隐私 Privacy**：监听只读、只提取「事件类型 + 工具名」，绝不落盘/记录任何提示词、回复或会话正文。Hooks 安装只写 `~/.claude/settings.json` 的 hooks 配置（保留你已有的其他配置）。

Monitoring is **read-only**: only event kinds and tool names are extracted. No prompt/response text is ever stored or logged. Hooks install merges into your existing `~/.claude/settings.json` without touching other settings.

---

## 🧱 技术栈 Tech Stack

Electron 37 · TypeScript · Webpack · Electron Forge · Squirrel · 零第三方运行时依赖的插值渲染器（原生 DOM + CSS transitions）

Electron 37 · TypeScript · Webpack · Electron Forge · Squirrel · dependency-free tween renderer (vanilla DOM + CSS transitions)

---

## 🤝 贡献 Contributing

Issues, feature ideas and PRs are all welcome! Check the [issues](https://github.com/harrylyu20260808-pixel/ender-coder/issues) tab or open a new one.
欢迎提交 Issue、想法与 PR！有什么想让 Ender 学会的新动作，直接开 Issue 聊。

---

## 📄 许可 License

[GNU Affero General Public License v3.0](LICENSE)（AGPL-3.0）© Ender Coder contributors

本项目角色素材为 AI 原创，不属于任何第三方。源码与素材均以 AGPL-3.0 发布。

The character artwork in this project is original AI-generated work and is not owned by any third party. Source code and artwork are both released under AGPL-3.0.
