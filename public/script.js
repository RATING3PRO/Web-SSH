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
        this.setupTerminal();
        this.bindEvents();
        this.loadAiConfig();
        this.loadSettings();
        this.loadSavedConnections();
    }

    initializeElements() {
        this.terminalContainer = document.getElementById('terminal');
        this.statusContainer = document.getElementById('statusContainer');
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        this.connectBtn = document.getElementById('connectBtn');
        this.disconnectBtn = document.getElementById('disconnectBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
        this.sidebar = document.getElementById('sidebar');
        this.collapseSidebarBtn = document.getElementById('collapseSidebarBtn');
        this.collapseIcon = document.getElementById('collapseIcon');
        this.useProxyCheckbox = document.getElementById('useProxy');
        this.proxyConfig = document.getElementById('proxyConfig');
        this.connectionsList = document.getElementById('connectionsList');
        
        // 认证相关元素
        this.authMethodSelect = document.getElementById('authMethod');
        this.authPassword = document.getElementById('authPassword');
        this.authKey = document.getElementById('authKey');
        
        // AI助手相关元素
        this.aiAssistant = document.getElementById('aiAssistant');
        this.closeAiBtn = document.getElementById('closeAiBtn');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendChatBtn = document.getElementById('sendChatBtn');
        
        // 会话信息
        this.sessionInfo = document.getElementById('sessionInfo');
        
        // 文件管理器相关元素
        this.fileManagerPanel = document.getElementById('fileManagerPanel');
        this.fileManagerContent = document.getElementById('fileManagerContent');
        this.fileManagerPlaceholder = document.getElementById('fileManagerPlaceholder');
        this.fileList = document.getElementById('fileList');
        this.currentPath = document.getElementById('currentPath');
        this.refreshFilesBtn = document.getElementById('refreshFilesBtn');
        this.goUpBtn = document.getElementById('goUpBtn');
        this.toggleFileManagerBtn = document.getElementById('toggleFileManagerBtn');
        
        // 文件管理器状态
        this.currentDirectory = '/';
        this.fileManagerCollapsed = false;
        
        // 模态框相关元素
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        
        this.connectionsModal = document.getElementById('connectionsModal');
        this.closeConnectionsBtn = document.getElementById('closeConnectionsBtn');
        this.addConnectionBtn = document.getElementById('addConnectionBtn');
        this.importConnectionsBtn = document.getElementById('importConnectionsBtn');
        this.exportConnectionsBtn = document.getElementById('exportConnectionsBtn');
        this.searchConnectionsInput = document.getElementById('searchConnectionsInput');
        this.searchConnectionsBtn = document.getElementById('searchConnectionsBtn');
        
        this.editConnectionModal = document.getElementById('editConnectionModal');
        this.closeEditConnectionBtn = document.getElementById('closeEditConnectionBtn');
        this.cancelEditConnectionBtn = document.getElementById('cancelEditConnectionBtn');
        this.saveEditConnectionBtn = document.getElementById('saveEditConnectionBtn');
        this.editConnectionTitle = document.getElementById('editConnectionTitle');
        
        // 设置相关元素
        this.fontSizeSelect = document.getElementById('fontSizeSelect');
        this.fontFamilySelect = document.getElementById('fontFamilySelect');
        this.terminalThemeSelect = document.getElementById('terminalThemeSelect');
        this.enableBellCheckbox = document.getElementById('enableBellCheckbox');
        this.enableAiCheckbox = document.getElementById('enableAiCheckbox');
        this.aiModelSelect = document.getElementById('aiModelSelect');
        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.autoSaveCheckbox = document.getElementById('autoSaveCheckbox');
        this.confirmDisconnectCheckbox = document.getElementById('confirmDisconnectCheckbox');
        this.languageSelect = document.getElementById('languageSelect');
        
        // 连接编辑相关元素
        this.editConnectionName = document.getElementById('editConnectionName');
        this.editConnectionHost = document.getElementById('editConnectionHost');
        this.editConnectionPort = document.getElementById('editConnectionPort');
        this.editConnectionUsername = document.getElementById('editConnectionUsername');
        this.editConnectionAuthMethod = document.getElementById('editConnectionAuthMethod');
        this.editConnectionPassword = document.getElementById('editConnectionPassword');
        this.editConnectionPrivateKey = document.getElementById('editConnectionPrivateKey');
        this.editConnectionDescription = document.getElementById('editConnectionDescription');
        this.editConnectionPasswordDiv = document.getElementById('editConnectionPasswordDiv');
        this.editConnectionKeyDiv = document.getElementById('editConnectionKeyDiv');
        
        // 保存的连接数据
        this.savedConnections = [];
        this.currentEditingConnection = null;
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
        
        // 收起侧边栏
        if (this.collapseSidebarBtn) {
            this.collapseSidebarBtn.addEventListener('click', () => this.toggleSidebarCollapse());
        }
        
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
        
        // AI助手事件
        if (this.closeAiBtn) this.closeAiBtn.addEventListener('click', () => this.toggleAiAssistant());
        if (this.sendChatBtn) this.sendChatBtn.addEventListener('click', () => this.sendChatMessage());
        if (this.chatInput) this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });
        
        // 文件管理器事件
        if (this.refreshFilesBtn) this.refreshFilesBtn.addEventListener('click', () => this.refreshFiles());
        if (this.goUpBtn) this.goUpBtn.addEventListener('click', () => this.goUpDirectory());
        if (this.toggleFileManagerBtn) this.toggleFileManagerBtn.addEventListener('click', () => this.toggleFileManager());
        
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
        // 更新状态指示器
        if (this.statusContainer && this.statusDot && this.statusText) {
            // 更新状态容器的类
            this.statusContainer.className = this.statusContainer.className.replace(/connection-\w+/, '');
            if (data.status === 'connected') {
                this.statusContainer.classList.add('connection-active');
                this.statusDot.style.backgroundColor = 'rgba(149, 218, 127, 1)';
            } else if (data.status === 'connecting') {
                this.statusContainer.classList.add('connection-inactive');
                this.statusDot.style.backgroundColor = 'rgba(255, 193, 7, 1)';
            } else {
                this.statusContainer.classList.add('connection-inactive');
                this.statusDot.style.backgroundColor = 'rgba(255, 84, 91, 1)';
            }
            
            this.statusText.textContent = data.message;
        }
        
        // 更新会话信息
        if (this.sessionInfo) {
            if (data.status === 'connected') {
                this.sessionInfo.textContent = `Session: Connected to ${document.getElementById('host').value}`;
            } else {
                this.sessionInfo.textContent = 'Session: Not Connected';
            }
        }
        
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
            
            // 连接成功后加载文件列表
            this.initFileManager();
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
    
    toggleAiAssistant() {
        if (this.aiAssistant) {
            this.aiAssistant.style.display = this.aiAssistant.style.display === 'none' ? 'flex' : 'none';
        }
    }
    
    async sendChatMessage() {
        const input = this.chatInput;
        const message = input.value.trim();
        
        if (!message) return;
        
        // 清空输入框
        input.value = '';
        
        // 添加用户消息到聊天界面
        this.addChatMessage('user', message);
        
        try {
            // 发送到AI API
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.addChatMessage('ai', data.response);
            } else {
                this.addChatMessage('ai', '抱歉，AI助手暂时无法响应。请稍后再试。');
            }
        } catch (error) {
            console.error('AI聊天错误:', error);
            this.addChatMessage('ai', '网络错误，请检查连接后重试。');
        }
    }
    
    addChatMessage(sender, message) {
        if (!this.chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `mb-[12px] pt-[12px] pr-[12px] pb-[12px] pl-[12px] rounded-tl-[8px] rounded-tr-[8px] rounded-br-[8px] rounded-bl-[8px]`;
        
        if (sender === 'user') {
            messageDiv.style.backgroundColor = 'rgba(58, 65, 72, 1)';
            messageDiv.style.maxWidth = '80%';
            messageDiv.style.marginLeft = 'auto';
        } else {
            messageDiv.style.backgroundColor = 'rgba(26, 29, 33, 1)';
        }
        
        messageDiv.innerHTML = `
            <div class="mb-[6px] text-[12px]" style="color: rgba(176, 184, 193, 1);">${sender === 'user' ? '您' : 'AI 助手'}</div>
            <div class="text-[12px]">${this.formatMessage(message)}</div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    formatMessage(message) {
        // 简单的代码块格式化
        return message.replace(/```([\s\S]*?)```/g, (match, code) => {
            return `<div class="font-['Consolas','Courier New',monospace] relative mt-[12px] mb-[12px] pt-[12px] pr-[12px] pb-[12px] pl-[12px] rounded-tl-[6px] rounded-tr-[6px] rounded-br-[6px] rounded-bl-[6px]" style="background-color: rgba(36, 37, 41, 1); color: rgba(0, 112, 250, 1);"><pre class="text-[12px]">${code.trim()}</pre></div>`;
        });
    }
    
    loadSavedConnections() {
        // 保存连接功能暂时禁用
        return;
    }
    
    renderSavedConnections(connections) {
        if (!this.connectionsList) {
            console.log('connectionsList元素未找到');
            return;
        }
        
        try {
            this.connectionsList.innerHTML = '';
            connections.forEach(conn => {
                const connDiv = document.createElement('div');
                connDiv.className = 'mb-[6px] pt-[12px] pr-[12px] pb-[12px] pl-[12px] rounded-tl-[6px] rounded-tr-[6px] rounded-br-[6px] rounded-bl-[6px] cursor-pointer';
                connDiv.style.backgroundColor = 'rgba(26, 29, 33, 1)';
                
                connDiv.innerHTML = `
                    <div class="flex justify-between items-center">
                        <span class="text-[14px] font-medium">${conn.name || 'Unknown'}</span>
                        <div class="w-[8px] h-[8px] rounded-full" style="background-color: rgba(255, 84, 91, 1);"></div>
                    </div>
                    <div class="text-[12px]" style="color: rgba(176, 184, 193, 1);">${conn.username || 'user'}@${conn.host || 'localhost'}:${conn.port || '22'}</div>
                `;
                
                connDiv.addEventListener('click', () => this.loadConnection(conn));
                this.connectionsList.appendChild(connDiv);
            });
        } catch (error) {
            console.error('渲染保存连接时出错:', error);
        }
    }
    
    loadConnection(conn) {
        document.getElementById('host').value = conn.host;
        document.getElementById('port').value = conn.port;
        document.getElementById('username').value = conn.username;
        if (conn.password) {
            document.getElementById('password').value = conn.password;
        }
    }
    
    loadAiConfig() {
        // AI配置已内置，无需额外配置
        this.aiConfigured = true;
    }
    
    setupModalEvents() {
        // 模态框事件处理（如果需要的话）
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
        console.log('AI配置已加载');
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
        // 设置模态框事件
        if (this.closeSettingsBtn) {
            this.closeSettingsBtn.addEventListener('click', () => this.closeSettingsModal());
        }
        if (this.cancelSettingsBtn) {
            this.cancelSettingsBtn.addEventListener('click', () => this.closeSettingsModal());
        }
        if (this.saveSettingsBtn) {
            this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }
        
        // 连接管理模态框事件
        if (this.closeConnectionsBtn) {
            this.closeConnectionsBtn.addEventListener('click', () => this.closeConnectionsModal());
        }
        if (this.addConnectionBtn) {
            this.addConnectionBtn.addEventListener('click', () => this.showEditConnectionModal());
        }
        if (this.importConnectionsBtn) {
            this.importConnectionsBtn.addEventListener('click', () => this.importConnections());
        }
        if (this.exportConnectionsBtn) {
            this.exportConnectionsBtn.addEventListener('click', () => this.exportConnections());
        }
        if (this.searchConnectionsBtn) {
            this.searchConnectionsBtn.addEventListener('click', () => this.searchConnections());
        }
        if (this.searchConnectionsInput) {
            this.searchConnectionsInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchConnections();
            });
        }
        
        // 编辑连接模态框事件
        if (this.closeEditConnectionBtn) {
            this.closeEditConnectionBtn.addEventListener('click', () => this.closeEditConnectionModal());
        }
        if (this.cancelEditConnectionBtn) {
            this.cancelEditConnectionBtn.addEventListener('click', () => this.closeEditConnectionModal());
        }
        if (this.saveEditConnectionBtn) {
            this.saveEditConnectionBtn.addEventListener('click', () => this.saveConnection());
        }
        if (this.editConnectionAuthMethod) {
            this.editConnectionAuthMethod.addEventListener('change', (e) => {
                if (e.target.value === 'password') {
                    this.editConnectionPasswordDiv.style.display = 'block';
                    this.editConnectionKeyDiv.style.display = 'none';
                } else {
                    this.editConnectionPasswordDiv.style.display = 'none';
                    this.editConnectionKeyDiv.style.display = 'block';
                }
            });
        }
        
        // 模态框背景点击关闭
        [this.settingsModal, this.connectionsModal, this.editConnectionModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.classList.add('hidden');
                    }
                });
            }
        });
        
        // 加载设置和连接
        this.loadSettings();
        this.loadSavedConnections();
    }

    // 文件管理器功能
    initFileManager() {
        if (this.isConnected) {
            console.log('初始化文件管理器');
            if (this.fileManagerPlaceholder) {
                this.fileManagerPlaceholder.style.display = 'none';
            }
            if (this.fileList) {
                this.fileList.classList.remove('hidden');
                this.fileList.style.display = 'block';
            }
            this.refreshFiles();
        }
    }

    toggleFileManager() {
        this.fileManagerCollapsed = !this.fileManagerCollapsed;
        if (this.fileManagerCollapsed) {
            this.fileManagerPanel.classList.add('file-manager-collapsed');
            this.toggleFileManagerBtn.innerHTML = '<i class="fas fa-chevron-up text-[12px]" style="color: rgba(176, 184, 193, 1);"></i>';
        } else {
            this.fileManagerPanel.classList.remove('file-manager-collapsed');
            this.toggleFileManagerBtn.innerHTML = '<i class="fas fa-chevron-down text-[12px]" style="color: rgba(176, 184, 193, 1);"></i>';
        }
    }

    refreshFiles() {
        if (!this.isConnected) {
            this.showError('请先连接SSH服务器');
            return;
        }
        
        // 发送文件列表请求
        this.socket.emit('file-list', { path: this.currentDirectory });
    }

    goUpDirectory() {
        if (!this.isConnected) return;
        
        if (this.currentDirectory !== '/') {
            const parentPath = this.currentDirectory.split('/').slice(0, -1).join('/') || '/';
            this.navigateToDirectory(parentPath);
        }
    }

    navigateToDirectory(path) {
        if (!this.isConnected) return;
        
        this.currentDirectory = path;
        this.currentPath.textContent = path;
        this.socket.emit('file-list', { path: path });
    }

    renderFileList(files) {
        if (!this.fileList) {
            console.log('fileList元素未找到');
            return;
        }
        
        console.log('渲染文件列表，文件数量:', files.length);
        
        // 确保文件列表可见
        this.fileList.classList.remove('hidden');
        this.fileList.style.display = 'block';
        
        // 隐藏占位符
        if (this.fileManagerPlaceholder) {
            this.fileManagerPlaceholder.style.display = 'none';
        }
        
        this.fileList.innerHTML = '';
        
        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            const isDirectory = file.type === 'directory';
            const icon = isDirectory ? 'fa-folder' : this.getFileIcon(file.name);
            const size = isDirectory ? '' : this.formatFileSize(file.size);
            
            fileItem.innerHTML = `
                <i class="fas ${icon} file-icon" style="color: ${isDirectory ? 'rgba(255, 193, 7, 1)' : 'rgba(176, 184, 193, 1)'};"></i>
                <span class="file-name">${file.name}</span>
                <span class="file-size">${size}</span>
                <div class="file-actions">
                    ${isDirectory ? 
                        '<button class="file-action-btn" onclick="window.terminal.openDirectory(\'' + file.name + '\')" title="打开目录"><i class="fas fa-folder-open"></i></button>' :
                        '<button class="file-action-btn download" onclick="window.terminal.downloadFile(\'' + file.name + '\')" title="下载文件"><i class="fas fa-download"></i></button>'
                    }
                </div>
            `;
            
            if (isDirectory) {
                fileItem.addEventListener('dblclick', () => {
                    this.openDirectory(file.name);
                });
            }
            
            this.fileList.appendChild(fileItem);
        });
    }

    openDirectory(dirName) {
        const newPath = this.currentDirectory === '/' ? 
            '/' + dirName : 
            this.currentDirectory + '/' + dirName;
        this.navigateToDirectory(newPath);
    }

    downloadFile(fileName) {
        if (!this.isConnected) {
            this.showError('请先连接SSH服务器');
            return;
        }
        
        const filePath = this.currentDirectory === '/' ? 
            '/' + fileName : 
            this.currentDirectory + '/' + fileName;
            
        // 创建下载链接
        const downloadUrl = `/api/download?path=${encodeURIComponent(filePath)}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showSuccess(`开始下载文件: ${fileName}`);
    }

    getFileIcon(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const iconMap = {
            'txt': 'fa-file-text',
            'log': 'fa-file-text',
            'conf': 'fa-file-code',
            'config': 'fa-file-code',
            'js': 'fa-file-code',
            'html': 'fa-file-code',
            'css': 'fa-file-code',
            'json': 'fa-file-code',
            'xml': 'fa-file-code',
            'yml': 'fa-file-code',
            'yaml': 'fa-file-code',
            'sh': 'fa-file-code',
            'py': 'fa-file-code',
            'php': 'fa-file-code',
            'jpg': 'fa-file-image',
            'jpeg': 'fa-file-image',
            'png': 'fa-file-image',
            'gif': 'fa-file-image',
            'pdf': 'fa-file-pdf',
            'zip': 'fa-file-archive',
            'tar': 'fa-file-archive',
            'gz': 'fa-file-archive',
            'rar': 'fa-file-archive'
        };
        return iconMap[ext] || 'fa-file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // 侧边栏收起功能
    toggleSidebarCollapse() {
        const isCollapsed = this.sidebar.classList.contains('sidebar-collapsed');
        
        if (isCollapsed) {
            // 展开侧边栏
            this.sidebar.classList.remove('sidebar-collapsed');
            this.collapseIcon.className = 'fas fa-chevron-left text-[10px]';
            this.collapseSidebarBtn.title = '收起侧边栏';
        } else {
            // 收起侧边栏
            this.sidebar.classList.add('sidebar-collapsed');
            this.collapseIcon.className = 'fas fa-chevron-right text-[10px]';
            this.collapseSidebarBtn.title = '展开侧边栏';
        }
        
        // 调整终端大小
        setTimeout(() => {
            if (this.isConnected) {
                this.fitAddon.fit();
            }
        }, 300);
    }

    // 设置相关方法
    showSettingsModal() {
        this.settingsModal.classList.remove('hidden');
    }
    
    closeSettingsModal() {
        this.settingsModal.classList.add('hidden');
    }
    
    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('webssh_settings') || '{}');
        
        if (settings.fontSize) this.fontSizeSelect.value = settings.fontSize;
        if (settings.fontFamily) this.fontFamilySelect.value = settings.fontFamily;
        if (settings.terminalTheme) this.terminalThemeSelect.value = settings.terminalTheme;
        if (settings.enableBell !== undefined) this.enableBellCheckbox.checked = settings.enableBell;
        if (settings.enableAi !== undefined) this.enableAiCheckbox.checked = settings.enableAi;
        if (settings.aiModel) this.aiModelSelect.value = settings.aiModel;
        if (settings.apiKey) this.apiKeyInput.value = settings.apiKey;
        if (settings.autoSave !== undefined) this.autoSaveCheckbox.checked = settings.autoSave;
        if (settings.confirmDisconnect !== undefined) this.confirmDisconnectCheckbox.checked = settings.confirmDisconnect;
        if (settings.language) this.languageSelect.value = settings.language;
        
        // 应用终端设置
        this.applyTerminalSettings(settings);
    }
    
    saveSettings() {
        const settings = {
            fontSize: this.fontSizeSelect.value,
            fontFamily: this.fontFamilySelect.value,
            terminalTheme: this.terminalThemeSelect.value,
            enableBell: this.enableBellCheckbox.checked,
            enableAi: this.enableAiCheckbox.checked,
            aiModel: this.aiModelSelect.value,
            apiKey: this.apiKeyInput.value,
            autoSave: this.autoSaveCheckbox.checked,
            confirmDisconnect: this.confirmDisconnectCheckbox.checked,
            language: this.languageSelect.value
        };
        
        localStorage.setItem('webssh_settings', JSON.stringify(settings));
        this.applyTerminalSettings(settings);
        this.closeSettingsModal();
        this.showSuccess('设置已保存');
    }
    
    applyTerminalSettings(settings) {
        if (this.term && settings.fontSize) {
            this.term.options.fontSize = parseInt(settings.fontSize);
        }
        if (this.term && settings.fontFamily) {
            this.term.options.fontFamily = settings.fontFamily;
        }
        if (this.term && settings.enableBell !== undefined) {
            this.term.options.bellStyle = settings.enableBell ? 'sound' : 'none';
        }
    }
    
    // 连接管理相关方法
    showConnectionsModal() {
        this.connectionsModal.classList.remove('hidden');
        this.renderConnectionsList();
    }
    
    closeConnectionsModal() {
        this.connectionsModal.classList.add('hidden');
    }
    
    loadSavedConnections() {
        this.savedConnections = JSON.parse(localStorage.getItem('webssh_connections') || '[]');
    }
    
    saveConnectionsToStorage() {
        localStorage.setItem('webssh_connections', JSON.stringify(this.savedConnections));
    }
    
    renderConnectionsList() {
        const connectionsList = this.connectionsModal.querySelector('#connectionsList');
        const noConnectionsMessage = this.connectionsModal.querySelector('#noConnectionsMessage');
        
        if (this.savedConnections.length === 0) {
            connectionsList.innerHTML = '';
            connectionsList.appendChild(noConnectionsMessage);
            return;
        }
        
        noConnectionsMessage.style.display = 'none';
        connectionsList.innerHTML = '';
        
        this.savedConnections.forEach((conn, index) => {
            const connElement = document.createElement('div');
            connElement.className = 'flex items-center justify-between p-3 bg-[rgba(58,65,72,1)] rounded border border-[rgba(76,84,93,1)] hover:bg-[rgba(76,84,93,1)]';
            connElement.innerHTML = `
                <div class="flex items-center gap-3">
                    <i class="fas fa-server text-blue-400"></i>
                    <div>
                        <div class="text-white font-medium">${conn.name}</div>
                        <div class="text-gray-400 text-sm">${conn.username}@${conn.host}:${conn.port}</div>
                        ${conn.description ? `<div class="text-gray-500 text-xs">${conn.description}</div>` : ''}
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button class="px-2 py-1 bg-[rgba(0,112,250,1)] text-white rounded text-sm hover:bg-[rgba(0,96,214,1)]" onclick="window.terminal.connectToSaved(${index})">
                        <i class="fas fa-plug mr-1"></i>连接
                    </button>
                    <button class="px-2 py-1 bg-[rgba(58,65,72,1)] text-gray-300 rounded text-sm hover:bg-[rgba(76,84,93,1)]" onclick="window.terminal.editConnection(${index})">
                        <i class="fas fa-edit mr-1"></i>编辑
                    </button>
                    <button class="px-2 py-1 bg-[rgba(220,53,69,1)] text-white rounded text-sm hover:bg-[rgba(200,35,51,1)]" onclick="window.terminal.deleteConnection(${index})">
                        <i class="fas fa-trash mr-1"></i>删除
                    </button>
                </div>
            `;
            connectionsList.appendChild(connElement);
        });
    }
    
    // 编辑连接相关方法
    showEditConnectionModal(connection = null) {
        this.currentEditingConnection = connection;
        
        if (connection) {
            this.editConnectionTitle.textContent = '编辑连接';
            this.editConnectionName.value = connection.name || '';
            this.editConnectionHost.value = connection.host || '';
            this.editConnectionPort.value = connection.port || 22;
            this.editConnectionUsername.value = connection.username || '';
            this.editConnectionAuthMethod.value = connection.authMethod || 'password';
            this.editConnectionPassword.value = connection.password || '';
            this.editConnectionPrivateKey.value = connection.privateKey || '';
            this.editConnectionDescription.value = connection.description || '';
        } else {
            this.editConnectionTitle.textContent = '新建连接';
            this.editConnectionName.value = '';
            this.editConnectionHost.value = '';
            this.editConnectionPort.value = '22';
            this.editConnectionUsername.value = '';
            this.editConnectionAuthMethod.value = 'password';
            this.editConnectionPassword.value = '';
            this.editConnectionPrivateKey.value = '';
            this.editConnectionDescription.value = '';
        }
        
        // 触发认证方式切换
        this.editConnectionAuthMethod.dispatchEvent(new Event('change'));
        
        this.editConnectionModal.classList.remove('hidden');
    }
    
    closeEditConnectionModal() {
        this.editConnectionModal.classList.add('hidden');
        this.currentEditingConnection = null;
    }
    
    saveConnection() {
        const connection = {
            name: this.editConnectionName.value.trim(),
            host: this.editConnectionHost.value.trim(),
            port: parseInt(this.editConnectionPort.value) || 22,
            username: this.editConnectionUsername.value.trim(),
            authMethod: this.editConnectionAuthMethod.value,
            password: this.editConnectionPassword.value,
            privateKey: this.editConnectionPrivateKey.value,
            description: this.editConnectionDescription.value.trim(),
            createdAt: new Date().toISOString()
        };
        
        // 验证必填字段
        if (!connection.name || !connection.host || !connection.username) {
            this.showError('请填写连接名称、服务器地址和用户名');
            return;
        }
        
        if (connection.authMethod === 'password' && !connection.password) {
            this.showError('请填写密码');
            return;
        }
        
        if (connection.authMethod === 'key' && !connection.privateKey) {
            this.showError('请填写私钥');
            return;
        }
        
        if (this.currentEditingConnection) {
            // 编辑现有连接
            const index = this.savedConnections.findIndex(conn => conn === this.currentEditingConnection);
            if (index !== -1) {
                this.savedConnections[index] = connection;
            }
        } else {
            // 添加新连接
            this.savedConnections.push(connection);
        }
        
        this.saveConnectionsToStorage();
        this.renderConnectionsList();
        this.closeEditConnectionModal();
        this.showSuccess('连接已保存');
    }
    
    editConnection(index) {
        const connection = this.savedConnections[index];
        if (connection) {
            this.showEditConnectionModal(connection);
        }
    }
    
    deleteConnection(index) {
        if (confirm('确定要删除这个连接吗？')) {
            this.savedConnections.splice(index, 1);
            this.saveConnectionsToStorage();
            this.renderConnectionsList();
            this.showSuccess('连接已删除');
        }
    }
    
    connectToSaved(index) {
        const connection = this.savedConnections[index];
        if (connection) {
            // 填充连接表单
            document.getElementById('host').value = connection.host;
            document.getElementById('port').value = connection.port;
            document.getElementById('username').value = connection.username;
            
            if (connection.authMethod === 'password') {
                this.authMethodSelect.value = 'password';
                document.getElementById('password').value = connection.password;
            } else {
                this.authMethodSelect.value = 'key';
                document.getElementById('privateKey').value = connection.privateKey;
            }
            
            // 触发认证方式切换
            this.authMethodSelect.dispatchEvent(new Event('change'));
            
            this.closeConnectionsModal();
            this.showSuccess(`已加载连接配置: ${connection.name}`);
        }
    }
    
    searchConnections() {
        const query = this.searchConnectionsInput.value.toLowerCase().trim();
        if (!query) {
            this.renderConnectionsList();
            return;
        }
        
        const filtered = this.savedConnections.filter(conn => 
            conn.name.toLowerCase().includes(query) ||
            conn.host.toLowerCase().includes(query) ||
            conn.username.toLowerCase().includes(query) ||
            (conn.description && conn.description.toLowerCase().includes(query))
        );
        
        const originalConnections = this.savedConnections;
        this.savedConnections = filtered;
        this.renderConnectionsList();
        this.savedConnections = originalConnections;
    }
    
    importConnections() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const connections = JSON.parse(e.target.result);
                        if (Array.isArray(connections)) {
                            this.savedConnections = [...this.savedConnections, ...connections];
                            this.saveConnectionsToStorage();
                            this.renderConnectionsList();
                            this.showSuccess(`成功导入 ${connections.length} 个连接`);
                        } else {
                            this.showError('无效的连接文件格式');
                        }
                    } catch (error) {
                        this.showError('文件解析失败: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
    
    exportConnections() {
        if (this.savedConnections.length === 0) {
            this.showError('没有可导出的连接');
            return;
        }
        
        const dataStr = JSON.stringify(this.savedConnections, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `webssh_connections_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showSuccess('连接配置已导出');
    }

}

// 初始化终端
document.addEventListener('DOMContentLoaded', () => {
    const terminal = new WebSSHTerminal();
    window.terminal = terminal; // 将terminal暴露到全局作用域，供HTML中的onclick使用
    
    // 监听文件列表响应
    terminal.socket.on('file-list-response', (data) => {
        if (data.success) {
            terminal.renderFileList(data.files);
        } else {
            terminal.showError('获取文件列表失败: ' + data.error);
        }
    });
});

// 全局函数供HTML调用
function toggleSettings() {
    // 设置功能暂未实现
    console.log('设置功能开发中...');
}

function toggleAI() {
    if (window.terminal) {
        window.terminal.toggleAiAssistant();
    }
}

function showSavedConnections() {
    // 显示保存连接管理页面
    console.log('连接管理功能开发中...');
}