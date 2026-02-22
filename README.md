# SnapChat Web

![Vue](https://img.shields.io/badge/Vue-3.x-42b883?logo=vue.js)
![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-latest-black?logo=vercel)
![DeepSeek](https://img.shields.io/badge/DeepSeek-API-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📖 项目介绍

**SnapChat Web** 是一款基于 **Vue 3** 构建的 AI 对话网页应用，类似 ChatGPT 交互界面。项目集成 **Vercel AI SDK** 与 **DeepSeek API**，实现流式对话响应，带来流畅、实时的 AI 聊天体验。

> 技术栈：Vue 3 · Vite · Vercel AI SDK · DeepSeek API · TypeScript

---

## ✨ 功能需求

### 核心功能

- **AI 对话**：基于 DeepSeek API 实现智能多轮对话，支持上下文记忆
- **流式输出**：借助 Vercel AI SDK 实现 Streaming 流式响应，逐字输出效果
- **Markdown 渲染**：支持对话内容中的 Markdown 格式化（代码高亮、表格、列表等）
- **代码块高亮**：AI 返回的代码片段支持语法高亮与一键复制

### 对话管理

- **新建对话**：随时开启新的对话会话
- **历史记录**：侧边栏展示历史对话列表，支持切换与管理
- **重命名会话**：对对话会话进行自定义命名
- **删除会话**：支持单条或批量删除历史对话

### 界面交互

- **响应式布局**：兼容桌面端与移动端，自适应屏幕尺寸
- **深色 / 浅色模式**：支持主题切换，默认跟随系统偏好
- **消息操作**：支持复制消息内容、重新生成回复
- **停止生成**：在 AI 输出过程中支持手动中断

### 用户体验

- **快捷键支持**：`Enter` 发送消息，`Shift + Enter` 换行
- **自动滚动**：对话内容自动滚动至最新消息
- **加载状态**：消息发送中展示加载动画
- **错误提示**：网络异常或 API 报错时友好提示用户

---

## 🗂️ 项目结构

```text
snap-chat-web/
├── api/
│   └── chat.ts            # Vercel Edge Function（生产环境 API 路由）
├── server/
│   └── index.ts           # 本地开发用 Express API 服务（端口 3000）
├── public/                # 静态资源
├── src/
│   ├── assets/            # 图片、样式等资源
│   ├── components/        # 公共组件
│   │   ├── ChatInput.vue      # 消息输入框
│   │   ├── ChatMessage.vue    # 消息气泡
│   │   └── ChatSidebar.vue    # 历史对话侧边栏
│   ├── composables/       # Vue 组合式函数
│   │   └── useChat.ts         # 调用 /api/chat 的流式请求封装
│   ├── stores/            # Pinia 状态管理
│   ├── types/             # TypeScript 类型定义
│   ├── views/
│   │   └── ChatView.vue       # 主对话页面
│   ├── App.vue
│   └── main.ts
├── .env.example           # 环境变量示例
├── vercel.json            # Vercel 部署配置
├── vite.config.ts
└── package.json
```

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18.x
- pnpm / npm / yarn

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

复制 `.env.example` 为 `.env.local`，并填入对应参数：

```env
# DeepSeek API 配置（仅服务端使用，不会暴露给前端）
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

### 启动开发服务器

```bash
npm run dev
```

> 会同时启动：
>
> - **Express API 服务**（`http://localhost:3000`）— 负责中转 DeepSeek 调用，保护 API Key
> - **Vite 前端**（`http://localhost:5173`）— 前端页面，`/api` 请求自动代理到 3000 端口

### 构建生产版本

```bash
npm run build
```

---

## ☁️ 部署到 Vercel

1. 将项目推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入该仓库
3. 在项目的 **Environment Variables** 中添加：
   - `DEEPSEEK_API_KEY` — 你的 DeepSeek API Key
   - `DEEPSEEK_BASE_URL` — `https://api.deepseek.com/v1`（可选）
   - `DEEPSEEK_MODEL` — `deepseek-chat`（可选）
4. 点击 Deploy，完成！

---

## 🔧 技术栈

| 技术                                           | 说明                                             |
| ---------------------------------------------- | ------------------------------------------------ |
| [Vue 3](https://vuejs.org/)                    | 渐进式前端框架，使用 `<script setup>` 组合式 API |
| [Vite](https://vitejs.dev/)                    | 极速前端构建工具                                 |
| [Vercel AI SDK](https://sdk.vercel.ai/)        | 提供流式 AI 响应能力的 SDK                       |
| [DeepSeek API](https://platform.deepseek.com/) | 高性能大语言模型 API                             |
| [Pinia](https://pinia.vuejs.org/)              | Vue 3 官方推荐状态管理库                         |
| [TypeScript](https://www.typescriptlang.org/)  | 类型安全的 JavaScript 超集                       |

---

## 📄 License

[MIT](./LICENSE) © 2026 SnapChat Web
