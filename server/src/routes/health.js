import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../database/init.js';

const router = express.Router();

// 获取健康记录列表
router.get('/records', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const { startDate, endDate, type } = req.query;

    let sql = 'SELECT * FROM health_records WHERE user_id = ?';
    const params = [userId];

    if (startDate) {
      sql += ' AND record_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND record_date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY record_date DESC';

    const records = db.prepare(sql).all(...params);
    res.json({ records });
  } catch (error) {
    next(error);
  }
});

// 添加健康记录
router.post('/records', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const { recordDate, weight, systolic, diastolic, steps } = req.body;

    if (!recordDate) {
      throw Object.assign(new Error('记录日期不能为空'), { status: 400 });
    }

    const recordId = uuidv4();
    db.prepare(`
      INSERT INTO health_records (id, user_id, record_date, weight, systolic, diastolic, steps)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(recordId, userId, recordDate, weight || null, systolic || null, diastolic || null, steps || null);

    const record = db.prepare('SELECT * FROM health_records WHERE id = ?').get(recordId);
    res.status(201).json({ record });
  } catch (error) {
    next(error);
  }
});

// 更新健康记录
router.put('/records/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const recordId = req.params.id;
    const { recordDate, weight, systolic, diastolic, steps } = req.body;

    // 验证记录存在且属于当前用户
    const existing = db.prepare('SELECT * FROM health_records WHERE id = ? AND user_id = ?').get(recordId, userId);
    if (!existing) {
      throw Object.assign(new Error('记录不存在'), { status: 404 });
    }

    db.prepare(`
      UPDATE health_records
      SET record_date = ?, weight = ?, systolic = ?, diastolic = ?, steps = ?
      WHERE id = ?
    `).run(recordDate || existing.record_date, weight ?? existing.weight, systolic ?? existing.systolic, diastolic ?? existing.diastolic, steps ?? existing.steps, recordId);

    const record = db.prepare('SELECT * FROM health_records WHERE id = ?').get(recordId);
    res.json({ record });
  } catch (error) {
    next(error);
  }
});

// 删除健康记录
router.delete('/records/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const recordId = req.params.id;

    // 验证记录存在且属于当前用户
    const existing = db.prepare('SELECT * FROM health_records WHERE id = ? AND user_id = ?').get(recordId, userId);
    if (!existing) {
      throw Object.assign(new Error('记录不存在'), { status: 404 });
    }

    db.prepare('DELETE FROM health_records WHERE id = ?').run(recordId);
    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

// 获取健康阈值设置
router.get('/thresholds', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;

    let threshold = db.prepare('SELECT * FROM health_thresholds WHERE user_id = ?').get(userId);

    // 如果没有设置，返回默认值
    if (!threshold) {
      threshold = {
        id: null,
        user_id: userId,
        weight_min: null,
        weight_max: null,
        systolic_min: 90,
        systolic_max: 140,
        diastolic_min: 60,
        diastolic_max: 90,
        steps_goal: 10000
      };
    }

    res.json({ threshold });
  } catch (error) {
    next(error);
  }
});

// 保存健康阈值设置
router.post('/thresholds', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const {
      weightMin, weightMax,
      systolicMin, systolicMax,
      diastolicMin, diastolicMax,
      stepsGoal
    } = req.body;

    // 检查是否已有设置
    const existing = db.prepare('SELECT * FROM health_thresholds WHERE user_id = ?').get(userId);

    if (existing) {
      // 更新
      db.prepare(`
        UPDATE health_thresholds
        SET weight_min = ?, weight_max = ?,
            systolic_min = ?, systolic_max = ?,
            diastolic_min = ?, diastolic_max = ?,
            steps_goal = ?
        WHERE user_id = ?
      `).run(weightMin, weightMax, systolicMin, systolicMax, diastolicMin, diastolicMax, stepsGoal, userId);
    } else {
      // 新增
      const thresholdId = uuidv4();
      db.prepare(`
        INSERT INTO health_thresholds
        (id, user_id, weight_min, weight_max, systolic_min, systolic_max, diastolic_min, diastolic_max, steps_goal)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(thresholdId, userId, weightMin, weightMax, systolicMin, systolicMax, diastolicMin, diastolicMax, stepsGoal);
    }

    const threshold = db.prepare('SELECT * FROM health_thresholds WHERE user_id = ?').get(userId);
    res.json({ threshold });
  } catch (error) {
    next(error);
  }
});

// 获取统计数据
router.get('/stats', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const { period = 'week' } = req.query;

    // 计算日期范围
    const now = new Date();
    let startDate;
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const startDateStr = startDate.toISOString().split('T')[0];

    // 获取统计数据
    const records = db.prepare(`
      SELECT * FROM health_records
      WHERE user_id = ? AND record_date >= ?
      ORDER BY record_date ASC
    `).all(userId, startDateStr);

    // 计算平均值
    const stats = {
      totalRecords: records.length,
      avgWeight: null,
      avgSystolic: null,
      avgDiastolic: null,
      totalSteps: 0,
      avgSteps: null
    };

    if (records.length > 0) {
      const weights = records.filter(r => r.weight != null).map(r => r.weight);
      const systolics = records.filter(r => r.systolic != null).map(r => r.systolic);
      const diastolics = records.filter(r => r.diastolic != null).map(r => r.diastolic);
      const stepsList = records.filter(r => r.steps != null).map(r => r.steps);

      if (weights.length > 0) stats.avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
      if (systolics.length > 0) stats.avgSystolic = systolics.reduce((a, b) => a + b, 0) / systolics.length;
      if (diastolics.length > 0) stats.avgDiastolic = diastolics.reduce((a, b) => a + b, 0) / diastolics.length;
      if (stepsList.length > 0) {
        stats.totalSteps = stepsList.reduce((a, b) => a + b, 0);
        stats.avgSteps = stats.totalSteps / stepsList.length;
      }
    }

    res.json({ stats, records, period });
  } catch (error) {
    next(error);
  }
});

export default router;
