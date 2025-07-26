# Web SSH Terminal Pro

一个基于Web的SSH终端工具，集成AI助手和代理连接功能。

## 核心功能

- **SSH支持** - 密码认证、实时终端交互
- **AI智能助手** - 内置Kimi K2模型，提供Linux命令建议
- **连接管理** - 保存和管理常用连接配置
- **终端体验** - 命令历史、快捷键

## 快速开始

在线使用(使用服务器向目标连接):

### 手动安装
```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的 Kimi API 密钥

# 启动服务
npm start

# 开发模式
npm run dev
```

访问 http://localhost:3000 开始使用

## 使用说明

### SSH连接
1. **基本连接**
   - 填写服务器地址、端口、用户名
   - 选择密码认证
   - 点击"连接"按钮

3. **连接管理**
   - 保存常用连接配置
   - 快速加载已保存的连接
   - 管理连接列表

### AI助手使用
1. **使用内置AI**
   - 点击右上角机器人图标
   - 直接开始与Kimi AI对话
   - 无需额外配置

2. **智能对话**
   - 询问Linux命令用法
   - 获取系统管理建议
   - 代码和配置文件帮助

## 技术栈

- **后端**: Node.js + Express + Socket.IO
- **SSH连接**: ssh2
- **AI集成**: Kimi AI
- **前端**: JavaScript + CSS3

## AI助手特色

- **智能命令建议** - 根据当前目录和上下文提供准确建议
- **内置Kimi AI** - 无需配置即可使用的AI助手
- **代码高亮** - AI回复中的代码自动高亮显示
- **一键复制** - 代码块支持一键复制功能
- **中文支持** - 完美支持中文对话和命令解释

## 环境变量配置

创建 `.env` 文件并配置以下变量：

```bash
# Kimi AI 配置（必需）
KIMI_API_KEY=your_kimi_api_key_here
KIMI_API_URL=https://api.moonshot.cn/v1/chat/completions
KIMI_MODEL=moonshot-v1-8k

# 服务器配置（可选）
PORT=3000
NODE_ENV=production
```

**重要提醒：**
- 请勿将包含真实API密钥的 `.env` 文件提交到版本控制系统
- 可以复制 `.env.example` 文件作为模板
- 获取Kimi API密钥请访问：https://platform.moonshot.cn/

## 部署建议

### Docker部署
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```
