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





const connections = new Map();
const sshStreams = new Map();

// AI助手API调用 - 内置Kimi AI
app.post('/api/ai-chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    // 使用内置的Kimi AI配置
    const kimiApiUrl = 'https://api.moonshot.cn/v1/chat/completions';
    const kimiApiKey = 'sk-lQcSoo4PEXBOM0DQODXH87beAIR956QnbdUpLG044AVICGUz';
    const kimiModel = 'moonshot-v1-8k';
    
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