import express from 'express';
import { register, login, getCurrentUser } from '../services/auth.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 用户注册
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, nickname } = req.body;
    const result = await register({ username, password, nickname });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// 用户登录
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const result = await login({ username, password });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// 获取当前用户信息
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const result = await getCurrentUser(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
