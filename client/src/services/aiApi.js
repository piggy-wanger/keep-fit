import api from './api';

// AI 配置相关 API
export const aiConfigApi = {
  // 获取支持的模型服务商
  getProviders: () => api.get('/ai/providers'),

  // 获取配置列表
  getConfigs: () => api.get('/ai/configs'),

  // 获取单个配置
  getConfig: (id) => api.get(`/ai/configs/${id}`),

  // 创建配置
  createConfig: (data) => api.post('/ai/configs', data),

  // 更新配置
  updateConfig: (id, data) => api.put(`/ai/configs/${id}`, data),

  // 删除配置
  deleteConfig: (id) => api.delete(`/ai/configs/${id}`),

  // 设为默认
  setDefault: (id) => api.patch(`/ai/configs/${id}/default`),
};

// AI 聊天相关 API
export const aiChatApi = {
  // 发送聊天消息（非流式）
  chat: (configId, messages, context) =>
    api.post('/ai/chat', { configId, messages, context }),

  // 发送聊天消息（流式）
  chatStream: async function* (configId, messages, context) {
    const token = localStorage.getItem('keep-fit-auth');
    const authData = token ? JSON.parse(token) : null;

    const response = await fetch('/api/ai/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData?.state?.token || ''}`,
      },
      body: JSON.stringify({ configId, messages, context }),
    });

    if (!response.ok) {
      throw new Error('请求失败');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return;
          }

          try {
            const json = JSON.parse(data);
            if (json.content) {
              yield json.content;
            }
            if (json.error) {
              throw new Error(json.error);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  },

  // 快速建议
  suggest: (type) => api.post('/ai/suggest', { type }),
};
