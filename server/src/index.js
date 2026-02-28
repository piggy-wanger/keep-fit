import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// 健康检查路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 认证路由
import authRoutes from './routes/auth.js';
import healthRoutes from './routes/health.js';
import equipmentRoutes, { initEquipment } from './routes/equipment.js';
import trainingRoutes from './routes/training.js';
import checkinRoutes from './routes/checkin.js';
import achievementsRoutes, { initAchievements } from './routes/achievements.js';
import aiRoutes from './routes/ai.js';
import socialRoutes from './routes/social.js';
import { authenticateToken } from './middleware/auth.js';

app.use('/api/auth', authRoutes);
app.use('/api/health', authenticateToken, healthRoutes);
app.use('/api/equipment', authenticateToken, equipmentRoutes);
app.use('/api/training', authenticateToken, trainingRoutes);
app.use('/api/checkin', authenticateToken, checkinRoutes);
app.use('/api/achievements', authenticateToken, achievementsRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/social', authenticateToken, socialRoutes);

// 初始化数据
initEquipment().catch(console.error);
initAchievements().catch(console.error);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误'
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.listen(PORT, () => {
  console.log(`🚀 Keep-Fit Server running on http://localhost:${PORT}`);
});
