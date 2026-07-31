/**
 * AI 服务模块
 * 
 * 支持多种 AI 服务商：阿里云百炼、腾讯混元、百度文心一言、千帆、自定义 API
 * 使用 Node.js 内置模块 http/https，无需额外依赖
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const aiConfig = require('../config/ai-config');

class AIService {
  constructor() {
    this.config = aiConfig;
    this.conversationHistory = new Map(); // 存储对话历史
  }

  /**
   * 获取当前启用的服务配置
   */
  getActiveService() {
    const serviceName = this.config.ENABLED_SERVICE;
    return {
      name: serviceName,
      config: this.config.services[serviceName]
    };
  }

  /**
   * 发送 HTTP/HTTPS 请求
   */
  async makeRequest(apiUrl, options, body) {
    return new Promise((resolve, reject) => {
      const url = new URL(apiUrl);
      const protocol = url.protocol === 'https:' ? https : http;
      const method = options.method || 'POST';

      const reqOptions = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      };

      const req = protocol.request(reqOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const responseData = JSON.parse(data);
            resolve({
              statusCode: res.statusCode,
              data: responseData
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              data: data
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('请求超时'));
      });

      // 只有 POST/PUT 等方法才发送 body
      if (method !== 'GET' && body && Object.keys(body).length > 0) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  /**
   * 构建阿里云百炼请求
   */
  async callAliyun(question, sessionId) {
    const service = this.config.services.aliyun;
    const history = this.getHistory(sessionId);

    const messages = [
      { role: 'system', content: service.systemPrompt },
      ...history,
      { role: 'user', content: question }
    ];

    const body = {
      model: service.model,
      messages: messages,
      temperature: service.temperature,
      max_tokens: service.maxTokens
    };

    const headers = {
      'Authorization': `Bearer ${service.apiKey}`
    };

    const response = await this.makeRequest(service.apiUrl, { headers }, body);
    
    if (response.statusCode === 200 && response.data.choices) {
      const answer = response.data.choices[0].message.content;
      this.addToHistory(sessionId, 'user', question);
      this.addToHistory(sessionId, 'assistant', answer);
      return answer;
    }

    throw new Error(`阿里云API错误: ${JSON.stringify(response.data)}`);
  }

  /**
   * 构建腾讯混元请求（需要额外处理签名）
   */
  async callTencent(question, sessionId) {
    const service = this.config.services.tencent;
    const history = this.getHistory(sessionId);

    const body = {
      Model: service.model,
      Messages: [
        { Role: 'system', Content: service.systemPrompt },
        ...history.map(h => ({ Role: h.role, Content: h.content })),
        { Role: 'user', Content: question }
      ],
      Temperature: service.temperature
    };

    // 腾讯云需要签名认证，这里简化处理
    // 实际使用时需要实现 TC3-HMAC-SHA256 签名算法
    throw new Error('腾讯云混元需要配置签名认证，请参考腾讯云文档实现');
  }

  /**
   * 构建百度文心一言请求（千帆2.0 API + access_token）
   */
  async callBaidu(question, sessionId) {
    const service = this.config.services.baidu;
    
    // 先获取 access_token
    const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${service.apiKey}&client_secret=${service.secretKey}`;
    
    const tokenResponse = await this.makeRequest(tokenUrl, { method: 'GET' }, {});
    
    if (tokenResponse.statusCode !== 200) {
      throw new Error(`获取access_token失败: ${JSON.stringify(tokenResponse.data)}`);
    }
    
    const accessToken = tokenResponse.data.access_token;
    
    // 获取对话历史
    const history = this.getHistory(sessionId);
    
    // 使用配置中的 API 端点，通过 query 参数传 access_token
    const apiUrl = `${service.apiUrl}?access_token=${accessToken}`;
    
    const body = {
      model: service.model,
      messages: [
        { role: 'user', content: service.systemPrompt },
        ...history,
        { role: 'user', content: question }
      ],
      temperature: service.temperature
    };

    const response = await this.makeRequest(apiUrl, { method: 'POST' }, body);
    
    // 千帆2.0 API 返回格式：choices[0].message.content
    if (response.statusCode === 200 && response.data.choices) {
      const answer = response.data.choices[0].message.content;
      this.addToHistory(sessionId, 'user', question);
      this.addToHistory(sessionId, 'assistant', answer);
      return answer;
    }
    
    // 旧版 API 返回格式：result
    if (response.data && response.data.result) {
      const answer = response.data.result;
      this.addToHistory(sessionId, 'user', question);
      this.addToHistory(sessionId, 'assistant', answer);
      return answer;
    }
    
    throw new Error(`百度API错误: ${JSON.stringify(response.data)}`);
  }

  /**
   * 千帆 API 请求（千帆 2.0 API，使用 API Key 作为 Bearer token）
   */
  async callQianfan(question, sessionId) {
    const service = this.config.services.qianfan;
    
    // 获取对话历史
    const history = this.getHistory(sessionId);

    const messages = [
      { role: 'user', content: service.systemPrompt },
      ...history,
      { role: 'user', content: question }
    ];

    const body = {
      model: service.model,
      messages: messages,
      temperature: service.temperature,
      max_output_tokens: service.maxTokens
    };

    // 千帆 2.0 API 直接使用 API Key 作为 Bearer token
    const headers = {
      'Authorization': `Bearer ${service.apiKey}`
    };

    const response = await this.makeRequest(service.apiUrl, { headers }, body);
    
    if (response.statusCode === 200 && response.data.choices) {
      const answer = response.data.choices[0].message.content;
      this.addToHistory(sessionId, 'user', question);
      this.addToHistory(sessionId, 'assistant', answer);
      return answer;
    }

    throw new Error(`千帆API错误: ${JSON.stringify(response.data)}`);
  }

  /**
   * 自定义 API 请求（兼容 OpenAI 格式）
   */
  async callCustom(question, sessionId) {
    const service = this.config.services.custom;
    const history = this.getHistory(sessionId);

    const messages = [
      { role: 'system', content: service.systemPrompt },
      ...history,
      { role: 'user', content: question }
    ];

    const body = {
      model: service.model,
      messages: messages,
      temperature: service.temperature,
      max_tokens: service.maxTokens
    };

    const headers = {
      'Authorization': `Bearer ${service.apiKey}`
    };

    const response = await this.makeRequest(service.apiUrl, { headers }, body);
    
    if (response.statusCode === 200 && response.data.choices) {
      const answer = response.data.choices[0].message.content;
      this.addToHistory(sessionId, 'user', question);
      this.addToHistory(sessionId, 'assistant', answer);
      return answer;
    }

    throw new Error(`自定义API错误: ${JSON.stringify(response.data)}`);
  }

  /**
   * 获取 AI 回答（主入口）
   */
  async getAIAnswer(question, sessionId = 'default') {
    const { name, config } = this.getActiveService();

    console.log(`[AI服务] 当前启用: ${config.name}, 模型: ${config.model}`);
    console.log(`[AI服务] API Key 配置状态: ${config.apiKey ? (config.apiKey.startsWith('YOUR_') ? '未配置' : '已配置') : '未配置'}`);

    // 检查 API Key 是否已配置
    if (!config.apiKey || config.apiKey.startsWith('YOUR_')) {
      throw new Error(`请在 config/ai-config.js 中配置 ${config.name} 的 API Key`);
    }

    try {
      console.log(`[AI服务] 正在调用 ${config.name}，问题: "${question.substring(0, 50)}..."`);
      let result;
      switch (name) {
        case 'aliyun':
          result = await this.callAliyun(question, sessionId);
          break;
        case 'tencent':
          result = await this.callTencent(question, sessionId);
          break;
        case 'baidu':
          result = await this.callBaidu(question, sessionId);
          break;
        case 'qianfan':
          result = await this.callQianfan(question, sessionId);
          break;
        case 'custom':
          result = await this.callCustom(question, sessionId);
          break;
        default:
          throw new Error(`不支持的 AI 服务: ${name}`);
      }
      console.log(`[AI服务] 调用成功，回答长度: ${result.length}`);
      return result;
    } catch (error) {
      console.error(`[AI服务] 调用失败 (${name}):`, error.message);
      throw error;
    }
  }

  /**
   * 对话历史管理
   */
  getHistory(sessionId) {
    if (!this.conversationHistory.has(sessionId)) {
      this.conversationHistory.set(sessionId, []);
    }
    // 只保留最近 10 轮对话
    const history = this.conversationHistory.get(sessionId);
    return history.slice(-10);
  }

  addToHistory(sessionId, role, content) {
    if (!this.conversationHistory.has(sessionId)) {
      this.conversationHistory.set(sessionId, []);
    }
    this.conversationHistory.get(sessionId).push({ role, content });
  }

  clearHistory(sessionId) {
    this.conversationHistory.delete(sessionId);
  }

  /**
   * 测试连接
   */
  async testConnection() {
    const { name, config } = this.getActiveService();
    
    if (!config.apiKey || config.apiKey.startsWith('YOUR_')) {
      return {
        success: false,
        message: `请先在 config/ai-config.js 中配置 ${config.name} 的 API Key`
      };
    }

    try {
      const answer = await this.getAIAnswer('你好，请简单介绍一下你自己', 'test');
      return {
        success: true,
        message: `连接成功！${config.name} 可用`,
        response: answer
      };
    } catch (error) {
      return {
        success: false,
        message: `连接失败: ${error.message}`
      };
    }
  }

  /**
   * 获取当前服务信息
   */
  getServiceInfo() {
    const { name, config } = this.getActiveService();
    return {
      service: config.name,
      model: config.model,
      apiConfigured: config.apiKey && !config.apiKey.startsWith('YOUR_')
    };
  }
}

// 导出单例
module.exports = new AIService();
