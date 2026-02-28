import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../database/init.js';
import { PROVIDERS, sendChatMessage, parseStreamResponse, buildContextMessages } from '../services/aiService.js';

const router = express.Router();

// 获取支持的模型服务商
router.get('/providers', (req, res) => {
  const providers = Object.entries(PROVIDERS).map(([key, config]) => ({
    id: key,
    name: config.name,
    models: config.models,
  }));

  res.json({ providers });
});

// 获取用户的 AI 配置列表
router.get('/configs', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;

    const configs = db.prepare(`
      SELECT id, name, provider, model, base_url, is_default, created_at
      FROM ai_configs
      WHERE user_id = ?
      ORDER BY is_default DESC, created_at DESC
    `).all(userId);

    // 隐藏 API Key
    const safeConfigs = configs.map(c => ({
      ...c,
      hasApiKey: true, // 表示有 API Key，但不返回具体值
    }));

    res.json({ configs: safeConfigs });
  } catch (error) {
    next(error);
  }
});

// 获取单个配置
router.get('/configs/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const configId = req.params.id;

    const config = db.prepare(`
      SELECT id, name, provider, model, base_url, is_default, created_at
      FROM ai_configs
      WHERE id = ? AND user_id = ?
    `).get(configId, userId);

    if (!config) {
      throw Object.assign(new Error('配置不存在'), { status: 404 });
    }

    res.json({ config: { ...config, hasApiKey: true } });
  } catch (error) {
    next(error);
  }
});

// 创建 AI 配置
router.post('/configs', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const { name, provider, model, apiKey, baseUrl, isDefault } = req.body;

    if (!name || !provider || !model || !apiKey) {
      throw Object.assign(new Error('请填写完整的配置信息'), { status: 400 });
    }

    // 如果设为默认，先取消其他默认
    if (isDefault) {
      db.prepare('UPDATE ai_configs SET is_default = 0 WHERE user_id = ?').run(userId);
    }

    const configId = uuidv4();
    db.prepare(`
      INSERT INTO ai_configs (id, user_id, name, provider, model, api_key, base_url, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      configId,
      userId,
      name,
      provider,
      model,
      apiKey,
      baseUrl || null,
      isDefault ? 1 : 0
    );

    const config = db.prepare('SELECT id, name, provider, model, base_url, is_default, created_at FROM ai_configs WHERE id = ?').get(configId);

    res.status(201).json({ config: { ...config, hasApiKey: true } });
  } catch (error) {
    next(error);
  }
});

// 更新 AI 配置
router.put('/configs/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const configId = req.params.id;
    const { name, provider, model, apiKey, baseUrl, isDefault } = req.body;

    // 检查配置是否存在
    const existing = db.prepare('SELECT * FROM ai_configs WHERE id = ? AND user_id = ?').get(configId, userId);
    if (!existing) {
      throw Object.assign(new Error('配置不存在'), { status: 404 });
    }

    // 如果设为默认，先取消其他默认
    if (isDefault) {
      db.prepare('UPDATE ai_configs SET is_default = 0 WHERE user_id = ?').run(userId);
    }

    // 更新配置
    if (apiKey) {
      // 提供了新的 API Key
      db.prepare(`
        UPDATE ai_configs
        SET name = ?, provider = ?, model = ?, api_key = ?, base_url = ?, is_default = ?
        WHERE id = ?
      `).run(name, provider, model, apiKey, baseUrl || null, isDefault ? 1 : 0, configId);
    } else {
      // 不更新 API Key
      db.prepare(`
        UPDATE ai_configs
        SET name = ?, provider = ?, model = ?, base_url = ?, is_default = ?
        WHERE id = ?
      `).run(name, provider, model, baseUrl || null, isDefault ? 1 : 0, configId);
    }

    const config = db.prepare('SELECT id, name, provider, model, base_url, is_default, created_at FROM ai_configs WHERE id = ?').get(configId);

    res.json({ config: { ...config, hasApiKey: true } });
  } catch (error) {
    next(error);
  }
});

// 删除 AI 配置
router.delete('/configs/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const configId = req.params.id;

    const existing = db.prepare('SELECT * FROM ai_configs WHERE id = ? AND user_id = ?').get(configId, userId);
    if (!existing) {
      throw Object.assign(new Error('配置不存在'), { status: 404 });
    }

    db.prepare('DELETE FROM ai_configs WHERE id = ?').run(configId);

    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

// 设为默认配置
router.patch('/configs/:id/default', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const configId = req.params.id;

    const existing = db.prepare('SELECT * FROM ai_configs WHERE id = ? AND user_id = ?').get(configId, userId);
    if (!existing) {
      throw Object.assign(new Error('配置不存在'), { status: 404 });
    }

    // 取消其他默认
    db.prepare('UPDATE ai_configs SET is_default = 0 WHERE user_id = ?').run(userId);

    // 设为默认
    db.prepare('UPDATE ai_configs SET is_default = 1 WHERE id = ?').run(configId);

    res.json({ message: '已设为默认' });
  } catch (error) {
    next(error);
  }
});

// 聊天接口（非流式）
router.post('/chat', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const { configId, messages, context } = req.body;

    // 获取配置
    let config;
    if (configId) {
      config = db.prepare('SELECT * FROM ai_configs WHERE id = ? AND user_id = ?').get(configId, userId);
    } else {
      // 使用默认配置
      config = db.prepare('SELECT * FROM ai_configs WHERE user_id = ? AND is_default = 1').get(userId);
    }

    if (!config) {
      throw Object.assign(new Error('请先配置 AI 模型'), { status: 400 });
    }

    // 构建消息
    const chatMessages = context
      ? buildContextMessages(context, messages[messages.length - 1].content)
      : messages;

    // 发送请求
    const response = await sendChatMessage({
      provider: config.provider,
      model: config.model,
      apiKey: config.api_key,
      baseUrl: config.base_url,
    }, chatMessages, false);

    res.json({ response });
  } catch (error) {
    next(error);
  }
});

// 聊天接口（流式）
router.post('/chat/stream', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const { configId, messages, context } = req.body;

    // 获取配置
    let config;
    if (configId) {
      config = db.prepare('SELECT * FROM ai_configs WHERE id = ? AND user_id = ?').get(configId, userId);
    } else {
      config = db.prepare('SELECT * FROM ai_configs WHERE user_id = ? AND is_default = 1').get(userId);
    }

    if (!config) {
      throw Object.assign(new Error('请先配置 AI 模型'), { status: 400 });
    }

    // 构建消息
    const chatMessages = context
      ? buildContextMessages(context, messages[messages.length - 1].content)
      : messages;

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 发送请求
    const response = await sendChatMessage({
      provider: config.provider,
      model: config.model,
      apiKey: config.api_key,
      baseUrl: config.base_url,
    }, chatMessages, true);

    // 流式传输
    for await (const chunk of parseStreamResponse(response, config.provider)) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    // 如果响应头已发送，发送错误事件
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    } else {
      next(error);
    }
  }
});

// 快速建议接口
router.post('/suggest', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const { type } = req.body; // type: 'training' | 'diet' | 'plan'

    // 获取默认配置
    const config = db.prepare('SELECT * FROM ai_configs WHERE user_id = ? AND is_default = 1').get(userId);

    if (!config) {
      throw Object.assign(new Error('请先配置 AI 模型'), { status: 400 });
    }

    // 获取用户数据作为上下文
    const healthRecords = db.prepare(`
      SELECT * FROM health_records WHERE user_id = ?
      ORDER BY record_date DESC LIMIT 7
    `).all(userId);

    const trainingLogs = db.prepare(`
      SELECT * FROM training_logs WHERE user_id = ?
      ORDER BY log_date DESC LIMIT 10
    `).all(userId);

    // 构建上下文
    let contextText = '';
    if (healthRecords.length > 0) {
      contextText += '最近健康数据：\n';
      healthRecords.forEach(r => {
        contextText += `- ${r.record_date}: 体重${r.weight || '-'}kg, 步数${r.steps || '-'}\n`;
      });
    }
    if (trainingLogs.length > 0) {
      contextText += '\n最近训练记录：\n';
      trainingLogs.forEach(r => {
        contextText += `- ${r.log_date}: 训练${r.duration || '-'}分钟\n`;
      });
    }

    // 根据类型构建提示
    const prompts = {
      training: '根据我的训练历史，给我一些训练改进建议。',
      diet: '根据我的训练情况，给我一些饮食营养建议。',
      plan: '根据我当前的身体状况，帮我制定一个合理的训练计划。',
    };

    const messages = [
      { role: 'user', content: contextText + '\n\n' + (prompts[type] || prompts.training) },
    ];

    // 发送请求
    const response = await sendChatMessage({
      provider: config.provider,
      model: config.model,
      apiKey: config.api_key,
      baseUrl: config.base_url,
    }, messages, false);

    res.json({ response, type });
  } catch (error) {
    next(error);
  }
});

export default router;
