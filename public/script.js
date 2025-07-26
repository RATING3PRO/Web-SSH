class WebSSHTerminal {
    constructor() {
        this.socket = io();
        this.isConnected = false;
        this.currentPath = '/';
        this.aiConfigured = false;
        this.chatHistory = [];
        this.elfinderInstance = null;
        
        // 初始化xterm.js
        this.term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Courier New, monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#ffffff',
                cursor: '#ffffff',
                selection: '#3498db'
            },
            cols: 80,
            rows: 24
        });
        
        this.fitAddon = new FitAddon.FitAddon();
        this.term.loadAddon(this.fitAddon);
        
        this.initializeElements();
        this.bindEvents();
        this.loadSavedConnections();
        this.loadAiConfig();
        this.setupTerminal();
    }

    initializeElements() {
        this.terminalContainer = document.getElementById('terminal');
        this.status = document.getElementById('status');
        this.connectBtn = document.getElementById('connectBtn');
        this.disconnectBtn = document.getElementById('disconnectBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
        this.sidebar = document.getElementById('sidebar');
        this.useProxyCheckbox = document.getElementById('useProxy');
        this.proxyConfig = document.getElementById('proxyConfig');
        this.saveConnectionBtn = document.getElementById('saveConnectionBtn');
        this.connectionList = document.getElementById('connectionList');
        
        // 新增元素
        this.authMethodSelect = document.getElementById('authMethod');
        this.authPassword = document.getElementById('authPassword');
        this.authKey = document.getElementById('authKey');
        this.toggleAiBtn = document.getElementById('toggleAiBtn');
        this.aiAssistant = document.getElementById('aiAssistant');
        this.closeAiBtn = document.getElementById('closeAiBtn');
        this.aiConfig = document.getElementById('aiConfig');
        this.aiChat = document.getElementById('aiChat');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendChatBtn = document.getElementById('sendChatBtn');
        
        // 标签页
        this.tabs = document.querySelectorAll('.tab');
        this.tabPanels = document.querySelectorAll('.tab-panel');
    }
    
    setupTerminal() {
        // 清空容器并挂载xterm.js
        this.terminalContainer.innerHTML = '';
        this.term.open(this.terminalContainer);
        this.fitAddon.fit();
        
        // 显示欢迎消息
        this.term.writeln('\x1b[32m欢迎使用 Web SSH Terminal\x1b[0m');
        this.term.writeln('请在左侧配置连接信息，然后点击连接按钮开始使用\n');
    }

    bindEvents() {
        // 连接按钮事件
        this.connectBtn.addEventListener('click', () => this.connect());
        this.disconnectBtn.addEventListener('click', () => this.disconnect());
        
        // 清屏按钮
        this.clearBtn.addEventListener('click', () => this.term.clear());
        
        // 切换侧边栏
        this.toggleSidebarBtn.addEventListener('click', () => this.toggleSidebar());
        
        // 代理配置切换
        this.useProxyCheckbox.addEventListener('change', (e) => {
            this.proxyConfig.style.display = e.target.checked ? 'block' : 'none';
        });
        
        // 认证方式切换
        this.authMethodSelect.addEventListener('change', (e) => {
            if (e.target.value === 'password') {
                this.authPassword.style.display = 'block';
                this.authKey.style.display = 'none';
            } else {
                this.authPassword.style.display = 'none';
                this.authKey.style.display = 'block';
            }
        });
        
        // 保存连接
        this.saveConnectionBtn.addEventListener('click', () => this.saveConnection());
        
        // AI助手事件
        if (this.toggleAiBtn) this.toggleAiBtn.addEventListener('click', () => this.toggleAiAssistant());
        if (this.closeAiBtn) this.closeAiBtn.addEventListener('click', () => this.toggleAiAssistant());
        // saveAiConfigBtn 已移除，Kimi AI 无需配置
        if (this.sendChatBtn) this.sendChatBtn.addEventListener('click', () => this.sendChatMessage());
        if (this.chatInput) this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });
        
        // 标签页事件
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
        
        // xterm.js 键盘事件处理
        this.term.onData((data) => {
            if (this.isConnected) {
                this.socket.emit('ssh-input', data);
            }
        });
        
        // 终端大小调整
        this.term.onResize((size) => {
            if (this.isConnected) {
                this.socket.emit('ssh-resize', {
                    rows: size.rows,
                    cols: size.cols,
                    width: this.terminalContainer.clientWidth,
                    height: this.terminalContainer.clientHeight
                });
            }
        });
        
        // Socket事件
        this.socket.on('ssh-status', (data) => this.updateStatus(data));
        this.socket.on('ssh-data', (data) => this.appendToTerminal(data));
        this.socket.on('ssh-error', (error) => this.showError(error));
        
        // 窗口大小变化
        window.addEventListener('resize', () => {
            if (this.isConnected) {
                this.fitAddon.fit();
            }
        });
        
        // 模态框事件
        this.setupModalEvents();
    }

    connect() {
        console.log('连接按钮被点击');
        
        const config = {
            host: document.getElementById('host').value,
            port: parseInt(document.getElementById('port').value),
            username: document.getElementById('username').value
        };

        console.log('连接配置:', config);

        // 验证必填字段
        if (!config.host || !config.username) {
            this.showError('请填写服务器地址和用户名');
            return;
        }

        // 根据认证方式设置认证信息
        const authMethod = this.authMethodSelect.value;
        if (authMethod === 'password') {
            config.password = document.getElementById('password').value;
            if (!config.password) {
                this.showError('请填写密码');
                return;
            }
        } else {
            config.privateKey = document.getElementById('privateKey').value;
            if (!config.privateKey) {
                this.showError('请填写私钥');
                return;
            }
        }

        // 代理配置
        if (this.useProxyCheckbox.checked) {
            const proxyHost = document.getElementById('proxyHost').value;
            const proxyPort = document.getElementById('proxyPort').value;
            
            if (!proxyHost || !proxyPort) {
                this.showError('请填写完整的代理配置');
                return;
            }
            
            config.proxy = {
                enabled: true,
                host: proxyHost,
                port: parseInt(proxyPort),
                type: parseInt(document.getElementById('proxyType').value),
                username: document.getElementById('proxyUsername').value,
                password: document.getElementById('proxyPassword').value
            };
        }

        this.updateStatus({ status: 'connecting', message: '正在连接...' });
        this.connectBtn.disabled = true;

        console.log('发送SSH连接请求:', config);
        this.socket.emit('ssh-connect', config);
    }

    disconnect() {
        if (this.isConnected) {
            this.term.writeln('\x1b[33m正在断开连接...\x1b[0m');
            this.disconnectBtn.disabled = true;
            
            this.socket.emit('ssh-disconnect');
            
            // 延迟500ms后刷新页面
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
    }

    updateStatus(data) {
        const statusDot = this.status.querySelector('.status-dot');
        const statusText = this.status.querySelector('.status-text');
        
        statusDot.className = `status-dot ${data.status}`;
        statusText.textContent = data.message;
        
        if (data.status === 'connected') {
            this.isConnected = true;
            this.connectBtn.disabled = true;
            this.disconnectBtn.disabled = false;
            
            // 清空终端并显示连接成功信息
            this.term.clear();
            this.term.writeln('\x1b[32m✓ SSH连接成功！\x1b[0m\n');
            
            // 调整终端大小
            this.fitAddon.fit();
            
            // 设置终端焦点
            setTimeout(() => {
                this.term.focus();
            }, 100);
            
            // 如果当前在文件标签页，自动刷新文件列表
            const activeTab = document.querySelector('.tab.active');
            if (activeTab && activeTab.dataset.tab === 'files') {
                setTimeout(() => {
                    this.refreshFiles();
                }, 500);
            }
        } else if (data.status === 'disconnected') {
            this.isConnected = false;
            this.connectBtn.disabled = false;
            this.disconnectBtn.disabled = true;
            
            this.term.writeln('\x1b[31m✗ SSH连接已断开\x1b[0m');
            

        }
    }

    appendToTerminal(data) {
        // 直接写入xterm.js，它会自动处理ANSI转义序列
        this.term.write(data);
    }



    toggleSidebar() {
        const container = document.querySelector('.container');
        container.classList.toggle('sidebar-hidden');
        
        // 延迟调整终端大小，等待CSS动画完成
        setTimeout(() => {
            if (this.isConnected) {
                this.fitAddon.fit();
            }
        }, 300);
    }

    // xterm.js 会自动处理键盘输入，不再需要手动处理

    showError(message) {
        this.term.writeln(`\x1b[31m错误: ${message}\x1b[0m`);
    }

    showSuccess(message) {
        this.term.writeln(`\x1b[32m成功: ${message}\x1b[0m`);
    }

    saveConnection() {
        const name = prompt('请输入连接名称:');
        if (!name) return;

        const config = {
            name: name,
            host: document.getElementById('host').value,
            port: document.getElementById('port').value,
            username: document.getElementById('username').value,
            authMethod: this.authMethodSelect.value,
            useProxy: this.useProxyCheckbox.checked,
            proxyHost: document.getElementById('proxyHost').value,
            proxyPort: document.getElementById('proxyPort').value,
            proxyType: document.getElementById('proxyType').value,
            proxyUsername: document.getElementById('proxyUsername').value,
            proxyPassword: document.getElementById('proxyPassword').value
        };
        
        // 根据认证方式保存相应的认证信息
        if (config.authMethod === 'password') {
            const savePassword = confirm('是否保存密码？（注意：密码将以明文形式保存在本地）');
            if (savePassword) {
                config.password = document.getElementById('password').value;
            }
        } else {
            const saveKey = confirm('是否保存私钥？（注意：私钥将保存在本地）');
            if (saveKey) {
                config.privateKey = document.getElementById('privateKey').value;
            }
        }

        let savedConnections = JSON.parse(localStorage.getItem('sshConnections') || '[]');
        savedConnections.push(config);
        localStorage.setItem('sshConnections', JSON.stringify(savedConnections));
        
        this.loadSavedConnections();
        this.showSuccess(`连接配置 "${name}" 已保存`);
    }

    loadSavedConnections() {
        const savedConnections = JSON.parse(localStorage.getItem('sshConnections') || '[]');
        this.connectionList.innerHTML = '';

        savedConnections.forEach((conn, index) => {
            const item = document.createElement('div');
            item.className = 'connection-item';
            item.innerHTML = `
                <div class="connection-info">
                    <div class="connection-name">${conn.name}</div>
                    <div class="connection-details">${conn.username}@${conn.host}:${conn.port}</div>
                </div>
                <div class="connection-actions">
                    <button onclick="terminal.loadConnection(${index})" title="加载">
                        <i class="fas fa-download"></i>
                    </button>
                    <button onclick="terminal.deleteConnection(${index})" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            this.connectionList.appendChild(item);
        });
    }

    loadConnection(index) {
        const savedConnections = JSON.parse(localStorage.getItem('sshConnections') || '[]');
        const conn = savedConnections[index];
        if (!conn) return;

        document.getElementById('host').value = conn.host;
        document.getElementById('port').value = conn.port;
        document.getElementById('username').value = conn.username;
        this.authMethodSelect.value = conn.authMethod || 'password';
        
        // 触发认证方式切换
        this.authMethodSelect.dispatchEvent(new Event('change'));
        
        // 加载认证信息
        if (conn.authMethod === 'password' && conn.password) {
            document.getElementById('password').value = conn.password;
        } else if (conn.authMethod === 'key' && conn.privateKey) {
            document.getElementById('privateKey').value = conn.privateKey;
        }
        
        // 加载代理配置
        this.useProxyCheckbox.checked = conn.useProxy || false;
        this.proxyConfig.style.display = conn.useProxy ? 'block' : 'none';
        document.getElementById('proxyHost').value = conn.proxyHost || '';
        document.getElementById('proxyPort').value = conn.proxyPort || '';
        document.getElementById('proxyType').value = conn.proxyType || '5';
        document.getElementById('proxyUsername').value = conn.proxyUsername || '';
        document.getElementById('proxyPassword').value = conn.proxyPassword || '';
        
        this.showSuccess(`已加载连接配置 "${conn.name}"`);
    }

    deleteConnection(index) {
        if (confirm('确定要删除这个连接配置吗？')) {
            let savedConnections = JSON.parse(localStorage.getItem('sshConnections') || '[]');
            savedConnections.splice(index, 1);
            localStorage.setItem('sshConnections', JSON.stringify(savedConnections));
            this.loadSavedConnections();
        }
    }

    // AI助手功能
    toggleAiAssistant() {
        this.aiAssistant.classList.toggle('show');
    }

    loadAiConfig() {
        // 直接使用内置的Kimi AI配置
        this.aiConfigured = true;
        this.aiConfig.style.display = 'none';
        this.aiChat.style.display = 'flex';
        
        // 添加欢迎消息
        // this.addChatMessage('system', '🤖 Kimi AI助手已就绪！我可以帮助您解决Linux命令和系统管理问题。');
    }

    saveAiConfig() {
        // Kimi AI已内置，无需配置
        this.aiConfigured = true;
        this.aiConfig.style.display = 'none';
        this.aiChat.style.display = 'flex';
        // this.addChatMessage('system', 'Kimi AI助手已就绪！');
    }

    async sendChatMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;

        this.chatInput.value = '';
        this.addChatMessage('user', message);

        const context = this.isConnected ? `用户当前已连接SSH，当前路径: ${this.currentPath}` : '用户未连接SSH';

        try {
            this.addChatMessage('system', 'Kimi正在思考...');
            
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    context
                })
            });

            const data = await response.json();
            
            // 移除"正在思考"消息
            const systemMessages = this.chatMessages.querySelectorAll('.chat-message.system');
            if (systemMessages.length > 0) {
                systemMessages[systemMessages.length - 1].remove();
            }

            if (data.success) {
                this.addChatMessage('ai', data.response);
            } else {
                this.addChatMessage('system', `错误: ${data.error}`);
            }
        } catch (error) {
            this.addChatMessage('system', `网络错误: ${error.message}`);
        }
    }

    addChatMessage(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        
        if (type === 'ai' && content.includes('```')) {
            // 处理代码块
            const codeBlocks = [];
            content = content.replace(/```([\s\S]*?)```/g, (match, code) => {
                const codeId = `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                // 移除语言标识符，只保留纯代码内容
                const lines = code.trim().split('\n');
                const actualCode = lines[0].match(/^[a-zA-Z]+$/) ? lines.slice(1).join('\n') : code.trim();
                codeBlocks.push({ id: codeId, code: actualCode });
                return `<div class="code-block">
                    <button class="copy-btn" data-code-id="${codeId}">复制</button>
                    <pre>${code.trim()}</pre>
                </div>`;
            });
            messageDiv.innerHTML = content;
            
            // 为每个复制按钮添加事件监听器
            codeBlocks.forEach(({ id, code }) => {
                const copyBtn = messageDiv.querySelector(`[data-code-id="${id}"]`);
                if (copyBtn) {
                    copyBtn.addEventListener('click', async () => {
                        try {
                            await navigator.clipboard.writeText(code);
                            copyBtn.textContent = '已复制';
                            setTimeout(() => {
                                copyBtn.textContent = '复制';
                            }, 2000);
                        } catch (err) {
                            console.error('复制失败:', err);
                            // 降级方案：使用传统的复制方法
                            const textArea = document.createElement('textarea');
                            textArea.value = code;
                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                            copyBtn.textContent = '已复制';
                            setTimeout(() => {
                                copyBtn.textContent = '复制';
                            }, 2000);
                        }
                    });
                }
            });
        } else {
            messageDiv.textContent = content;
        }
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    // 标签页切换
    switchTab(tabName) {
        this.tabs.forEach(tab => {
            tab.classList.remove('active');
        });
        
        this.tabPanels.forEach(panel => {
            panel.classList.remove('active');
        });

        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-panel`).classList.add('active');

        if (tabName === 'files' && this.isConnected) {
            this.refreshFiles();
        }
    }









    setupModalEvents() {
        // 模态框事件处理已简化
    }


}

// 初始化终端
document.addEventListener('DOMContentLoaded', () => {
    const terminal = new WebSSHTerminal();
    window.terminal = terminal; // 将terminal暴露到全局作用域，供HTML中的onclick使用
});