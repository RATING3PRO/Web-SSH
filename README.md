# Web SSH Terminal Pro

一个基于Web的SSH终端工具，集成AI助手和代理连接功能。

## 核心功能

- **现代化UI设计** - 美观的渐变背景和响应式布局
- **完整SSH支持** - 密码/密钥认证、实时终端交互
- **代理连接** - SOCKS4/SOCKS5代理，支持认证
- **AI智能助手** - 内置Kimi AI助手，提供Linux命令建议
- **连接管理** - 保存和管理常用连接配置
- **完整终端体验** - 命令历史、快捷键、自动补全
- **响应式设计** - 完美支持移动设备
- **专业主题** - 精美的终端和UI主题

## 快速开始

### Windows 用户
```bash
# 双击运行
start.bat
```

### 手动安装
```bash
# 安装依赖
npm install

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
   - 选择密码或密钥认证
   - 点击"连接"按钮

2. **代理连接**
   - 勾选"使用代理连接"
   - 配置SOCKS4/SOCKS5代理信息
   - 支持代理用户名密码认证

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

### 快捷键
- `Ctrl+C` / `Ctrl+V` - 复制粘贴
- `↑` / `↓` - 命令历史浏览
- `Tab` - 命令自动补全
- `Ctrl+L` - 清屏

## 技术栈

- **后端**: Node.js + Express + Socket.IO
- **SSH连接**: ssh2库
- **代理支持**: socks库（SOCKS4/5）
- **AI集成**: Kimi AI
- **前端**: 原生JavaScript + CSS3
- **UI框架**: Font Awesome图标

## 安全特性

- 所有连接数据仅在本地存储
- 支持SSH密钥认证
- 代理连接全程加密
- AI配置本地存储
- 建议在HTTPS环境下使用

## AI助手特色

- **智能命令建议** - 根据当前目录和上下文提供准确建议
- **内置Kimi AI** - 无需配置即可使用的AI助手
- **代码高亮** - AI回复中的代码自动高亮显示
- **一键复制** - 代码块支持一键复制功能
- **中文支持** - 完美支持中文对话和命令解释

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

### 环境变量
- `PORT` - 服务端口（默认3000）
- `NODE_ENV` - 运行环境

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT License