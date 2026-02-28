/**
 * AI 服务 - 支持多种模型服务商
 * 支持: OpenAI, Anthropic, 自定义兼容 API
 */

// 模型服务商配置
const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    chatEndpoint: '/chat/completions',
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
    chatEndpoint: '/messages',
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder'],
    chatEndpoint: '/chat/completions',
  },
  moonshot: {
    name: 'Moonshot',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    chatEndpoint: '/chat/completions',
  },
  custom: {
    name: '自定义',
    baseUrl: '',
    models: [],
    chatEndpoint: '/chat/completions',
  },
};

// 系统提示词
const SYSTEM_PROMPT = `你是 Keep-Fit 健身应用的 AI 助手。你的职责是：

1. **训练建议**：根据用户的健身历史和身体状况，提供专业的训练建议
2. **饮食建议**：结合用户的训练目标，给出科学的营养和饮食建议
3. **计划制定**：帮助用户制定合理的训练计划，包括动作选择、组数、次数等

你的回答应该：
- 专业、准确、有科学依据
- 简洁明了，易于理解
- 针对用户的具体情况给出个性化建议
- 如果用户提供了健康数据，要结合数据分析

请用友好、鼓励的语气与用户交流，帮助他们坚持健身，达到目标。`;

/**
 * 构建 OpenAI 格式的请求
 */
function buildOpenAIRequest(messages, model, stream = false) {
  return {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    ],
    stream,
    temperature: 0.7,
    max_tokens: 2000,
  };
}

/**
 * 构建 Anthropic 格式的请求
 */
function buildAnthropicRequest(messages, model, stream = false) {
  return {
    model,
    system: SYSTEM_PROMPT,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    stream,
    max_tokens: 2000,
  };
}

/**
 * 发送 OpenAI 格式的请求
 */
async function sendOpenAIRequest(baseUrl, apiKey, endpoint, requestBody, stream = false) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API 错误: ${response.status} - ${error}`);
  }

  if (stream) {
    return response;
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 发送 Anthropic 格式的请求
 */
async function sendAnthropicRequest(baseUrl, apiKey, endpoint, requestBody, stream = false) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API 错误: ${response.status} - ${error}`);
  }

  if (stream) {
    return response;
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * 发送聊天请求
 */
async function sendChatMessage(config, messages, stream = false) {
  const { provider, model, apiKey, baseUrl } = config;

  // 根据服务商选择请求格式
  if (provider === 'anthropic') {
    const requestBody = buildAnthropicRequest(messages, model, stream);
    const url = baseUrl || PROVIDERS.anthropic.baseUrl;
    return sendAnthropicRequest(url, apiKey, PROVIDERS.anthropic.chatEndpoint, requestBody, stream);
  } else {
    // OpenAI 兼容格式 (OpenAI, DeepSeek, Moonshot, 自定义)
    const requestBody = buildOpenAIRequest(messages, model, stream);
    const providerConfig = PROVIDERS[provider] || PROVIDERS.custom;
    const url = baseUrl || providerConfig.baseUrl;
    const endpoint = providerConfig.chatEndpoint;
    return sendOpenAIRequest(url, apiKey, endpoint, requestBody, stream);
  }
}

/**
 * 解析流式响应
 */
async function* parseStreamResponse(response, provider) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          return;
        }

        try {
          const json = JSON.parse(data);

          if (provider === 'anthropic') {
            // Anthropic 格式
            if (json.type === 'content_block_delta') {
              yield json.delta?.text || '';
            }
          } else {
            // OpenAI 格式
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  }
}

/**
 * 构建上下文消息
 */
function buildContextMessages(userContext, userMessage) {
  const messages = [];

  // 添加用户上下文
  if (userContext) {
    let contextText = '用户当前状态：\n';

    if (userContext.health) {
      contextText += `- 健康数据：${userContext.health}\n`;
    }
    if (userContext.training) {
      contextText += `- 训练情况：${userContext.training}\n`;
    }
    if (userContext.goals) {
      contextText += `- 健身目标：${userContext.goals}\n`;
    }

    messages.push({
      role: 'user',
      content: contextText,
    });
    messages.push({
      role: 'assistant',
      content: '好的，我已了解你的当前状态。请告诉我你想了解什么？',
    });
  }

  // 添加用户消息
  messages.push({
    role: 'user',
    content: userMessage,
  });

  return messages;
}

export {
  PROVIDERS,
  sendChatMessage,
  parseStreamResponse,
  buildContextMessages,
};
