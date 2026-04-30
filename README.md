# PaperPolish Frontend - 论文降重润色工具前端

## 技术栈
- Vue 3 + TypeScript + Vite
- Tailwind CSS 4 + Radix Vue (Shadcn UI 风格)
- Lucide Icons
- Axios + Vue Router
- pdfjs-dist (PDF 预览)

## 快速开始

### 安装依赖
```bash
pnpm install
```

### 启动开发服务
```bash
pnpm dev
```

服务运行在 `http://localhost:5173`，`/api` 请求自动代理到后端 `http://localhost:8080`。

### 构建生产包
```bash
pnpm build
```

## 页面结构
| 页面 | 路径 | 说明 |
|------|------|------|
| 上传页 | `/` | 拖拽/点击上传 Word 文档 |
| 编辑器页 | `/editor/:id` | 段落编辑器，支持逐段 AI 润色、原文/润色对比、采纳/放弃 |
