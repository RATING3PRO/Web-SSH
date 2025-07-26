require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Client } = require('ssh2');
const { SocksClient } = require('socks');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));
app.use(express.json());

// 文件下载API
app.get('/api/download', (req, res) => {
  const { path: filePath } = req.query;
  
  if (!filePath) {
    return res.status(400).json({ error: '缺少文件路径参数' });
  }
  
  // 从连接池中找到活跃的SSH连接
  const activeConnection = Array.from(connections.values())[0];
  
  if (!activeConnection) {
    return res.status(400).json({ error: '没有活跃的SSH连接' });
  }
  
  activeConnection.sftp((err, sftp) => {
    if (err) {
      return res.status(500).json({ error: 'SFTP连接失败: ' + err.message });
    }
    
    // 获取文件信息
    sftp.stat(filePath, (err, stats) => {
      if (err) {
        return res.status(404).json({ error: '文件不存在: ' + err.message });
      }
      
      if (stats.isDirectory()) {
        return res.status(400).json({ error: '不能下载目录' });
      }
      
      // 设置响应头
      const fileName = path.basename(filePath);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', stats.size);
      
      // 创建读取流并传输文件
      const readStream = sftp.createReadStream(filePath);
      
      readStream.on('error', (err) => {
        console.error('文件读取错误:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: '文件读取失败: ' + err.message });
        }
      });
      
      readStream.pipe(res);
    });
  });
});





const connections = new Map();
const sshStreams = new Map();

// AI助手API调用 - 内置Kimi AI
app.post('/api/ai-chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    // 使用环境变量中的Kimi AI配置
    const kimiApiUrl = process.env.KIMI_API_URL || 'https://api.moonshot.cn/v1/chat/completions';
    const kimiApiKey = process.env.KIMI_API_KEY;
    const kimiModel = process.env.KIMI_MODEL || 'moonshot-v1-8k';
    
    if (!kimiApiKey) {
      return res.json({
        success: false,
        error: '请配置KIMI_API_KEY环境变量'
      });
    }
    
    const response = await axios.post(kimiApiUrl, {
      model: kimiModel,
      messages: [
        {
          role: 'system',
          content: `你是Kimi，一个专业的Linux系统管理员和DevOps专家。用户正在使用SSH终端，请提供准确、实用的建议和命令。当前上下文：${context || '无'}。请用中文回答，并在适当时候提供具体的命令示例。`
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${kimiApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      response: response.data.choices[0].message.content
    });
  } catch (error) {
    console.error('Kimi AI API Error:', error.response?.data || error.message);
    res.json({
      success: false,
      error: error.response?.data?.error?.message || error.message || '连接Kimi AI服务失败'
    });
  }
});



io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);




  socket.on('ssh-connect', async (config) => {
    try {
      const conn = new Client();
      connections.set(socket.id, conn);

      conn.on('ready', async () => {
        socket.emit('ssh-status', { status: 'connected', message: 'SSH连接成功' });
        

        
        conn.shell({ term: 'xterm-256color' }, (err, stream) => {
          if (err) {
            socket.emit('ssh-error', err.message);
            return;
          }

          sshStreams.set(socket.id, stream);

          stream.on('close', () => {
            socket.emit('ssh-status', { status: 'disconnected', message: '连接已断开' });
            sshStreams.delete(socket.id);
          });

          stream.on('data', (data) => {
            socket.emit('ssh-data', data.toString());
          });

          socket.on('ssh-input', (data) => {
            stream.write(data);
          });

          socket.on('ssh-resize', (size) => {
            stream.setWindow(size.rows, size.cols, size.width, size.height);
          });

          // 执行命令
          socket.on('ssh-execute-command', (command) => {
            stream.write(command + '\n');
          });
          
          // 处理主动断开SSH连接
          socket.on('ssh-disconnect', () => {
            console.log('Received ssh-disconnect event for:', socket.id);
            if (stream) {
              stream.end();
            }
            if (conn) {
              conn.end();
            }
          });
          
          // 处理文件列表请求
          socket.on('file-list', (data) => {
            const { path } = data;
            conn.sftp((err, sftp) => {
              if (err) {
                socket.emit('file-list-response', {
                  success: false,
                  error: err.message
                });
                return;
              }
              
              sftp.readdir(path, (err, list) => {
                if (err) {
                  socket.emit('file-list-response', {
                    success: false,
                    error: err.message
                  });
                  return;
                }
                
                const files = list.map(item => ({
                  name: item.filename,
                  type: item.attrs.isDirectory() ? 'directory' : 'file',
                  size: item.attrs.size,
                  modified: new Date(item.attrs.mtime * 1000)
                }));
                
                socket.emit('file-list-response', {
                  success: true,
                  files: files
                });
              });
            });
          });
        });
      });

      conn.on('error', (err) => {
        socket.emit('ssh-error', err.message);
      });

      // 处理代理连接
      if (config.proxy && config.proxy.enabled) {
        const socksOptions = {
          proxy: {
            host: config.proxy.host,
            port: config.proxy.port,
            type: config.proxy.type || 5
          },
          command: 'connect',
          destination: {
            host: config.host,
            port: config.port
          }
        };

        if (config.proxy.username) {
          socksOptions.proxy.userId = config.proxy.username;
          socksOptions.proxy.password = config.proxy.password;
        }

        const info = await SocksClient.createConnection(socksOptions);
        const connectConfig = {
          sock: info.socket,
          username: config.username,
          readyTimeout: 20000,
          keepaliveInterval: 1000
        };

        if (config.privateKey) {
          connectConfig.privateKey = config.privateKey;
        } else if (config.password) {
          connectConfig.password = config.password;
        }

        conn.connect(connectConfig);
      } else {
        // 直接连接
        const connectConfig = {
          host: config.host,
          port: config.port,
          username: config.username,
          readyTimeout: 20000,
          keepaliveInterval: 1000
        };

        if (config.privateKey) {
          connectConfig.privateKey = config.privateKey;
        } else if (config.password) {
          connectConfig.password = config.password;
        }

        conn.connect(connectConfig);
      }
    } catch (error) {
      socket.emit('ssh-error', error.message);
    }
  });

  socket.on('disconnect', () => {
    const conn = connections.get(socket.id);
    const stream = sshStreams.get(socket.id);
    
    if (stream) {
      stream.end();
      sshStreams.delete(socket.id);
    }
    
    if (conn) {
      conn.end();
      connections.delete(socket.id);
    }
    
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`SSH Web Terminal running on port ${PORT}`);
});