import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../database/init.js';

const router = express.Router();

// ==================== 训练计划 ====================

// 获取用户的训练计划列表
router.get('/plans', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const { active } = req.query;

    let sql = 'SELECT * FROM training_plans WHERE user_id = ?';
    const params = [userId];

    if (active === 'true') {
      sql += ' AND is_active = 1';
    } else if (active === 'false') {
      sql += ' AND is_active = 0';
    }

    sql += ' ORDER BY created_at DESC';

    const plans = db.prepare(sql).all(...params);

    // 获取每个计划的项目数
    for (const plan of plans) {
      const count = db.prepare('SELECT COUNT(*) as count FROM plan_items WHERE plan_id = ?').get(plan.id);
      plan.item_count = count.count;
    }

    res.json({ plans });
  } catch (error) {
    next(error);
  }
});

// 获取单个训练计划详情（包含项目）
router.get('/plans/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const planId = req.params.id;

    const plan = db.prepare('SELECT * FROM training_plans WHERE id = ? AND user_id = ?').get(planId, userId);

    if (!plan) {
      throw Object.assign(new Error('计划不存在'), { status: 404 });
    }

    // 获取计划项目
    const items = db.prepare(`
      SELECT pi.*, e.name as equipment_name, e.category as equipment_category
      FROM plan_items pi
      LEFT JOIN equipment e ON pi.equipment_id = e.id
      WHERE pi.plan_id = ?
      ORDER BY pi.day_of_week, pi.sort_order
    `).all(planId);

    plan.items = items;

    res.json({ plan });
  } catch (error) {
    next(error);
  }
});

// 创建训练计划
router.post('/plans', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const { name, description, startDate, endDate, items } = req.body;

    if (!name) {
      throw Object.assign(new Error('计划名称不能为空'), { status: 400 });
    }

    const planId = uuidv4();

    // 创建计划
    db.prepare(`
      INSERT INTO training_plans (id, user_id, name, description, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(planId, userId, name, description, startDate || null, endDate || null);

    // 添加计划项目
    if (items && items.length > 0) {
      const itemStmt = db.prepare(`
        INSERT INTO plan_items (id, plan_id, equipment_id, exercise_name, sets, reps, weight, duration, day_of_week, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        itemStmt.run(
          uuidv4(),
          planId,
          item.equipmentId || null,
          item.exerciseName,
          item.sets || null,
          item.reps || null,
          item.weight || null,
          item.duration || null,
          item.dayOfWeek ?? null,
          i
        );
      }
    }

    // 获取创建的计划
    const plan = db.prepare('SELECT * FROM training_plans WHERE id = ?').get(planId);
    plan.items = db.prepare('SELECT * FROM plan_items WHERE plan_id = ? ORDER BY sort_order').all(planId);

    res.status(201).json({ plan });
  } catch (error) {
    next(error);
  }
});

// 更新训练计划
router.put('/plans/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const planId = req.params.id;
    const { name, description, startDate, endDate, isActive, items } = req.body;

    // 检查计划是否存在
    const plan = db.prepare('SELECT * FROM training_plans WHERE id = ? AND user_id = ?').get(planId, userId);
    if (!plan) {
      throw Object.assign(new Error('计划不存在'), { status: 404 });
    }

    // 更新计划
    db.prepare(`
      UPDATE training_plans
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(name, description, startDate, endDate, isActive, planId);

    // 如果提供了新的项目列表，更新项目
    if (items !== undefined) {
      // 删除旧项目
      db.prepare('DELETE FROM plan_items WHERE plan_id = ?').run(planId);

      // 添加新项目
      if (items && items.length > 0) {
        const itemStmt = db.prepare(`
          INSERT INTO plan_items (id, plan_id, equipment_id, exercise_name, sets, reps, weight, duration, day_of_week, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          itemStmt.run(
            uuidv4(),
            planId,
            item.equipmentId || null,
            item.exerciseName,
            item.sets || null,
            item.reps || null,
            item.weight || null,
            item.duration || null,
            item.dayOfWeek ?? null,
            i
          );
        }
      }
    }

    // 获取更新后的计划
    const updatedPlan = db.prepare('SELECT * FROM training_plans WHERE id = ?').get(planId);
    updatedPlan.items = db.prepare('SELECT * FROM plan_items WHERE plan_id = ? ORDER BY sort_order').all(planId);

    res.json({ plan: updatedPlan });
  } catch (error) {
    next(error);
  }
});

// 删除训练计划
router.delete('/plans/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const planId = req.params.id;

    // 检查计划是否存在
    const plan = db.prepare('SELECT * FROM training_plans WHERE id = ? AND user_id = ?').get(planId, userId);
    if (!plan) {
      throw Object.assign(new Error('计划不存在'), { status: 404 });
    }

    // 删除计划项目
    db.prepare('DELETE FROM plan_items WHERE plan_id = ?').run(planId);

    // 删除计划
    db.prepare('DELETE FROM training_plans WHERE id = ?').run(planId);

    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

// 激活/停用计划
router.patch('/plans/:id/active', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const planId = req.params.id;
    const { isActive } = req.body;

    // 检查计划是否存在
    const plan = db.prepare('SELECT * FROM training_plans WHERE id = ? AND user_id = ?').get(planId, userId);
    if (!plan) {
      throw Object.assign(new Error('计划不存在'), { status: 404 });
    }

    if (isActive) {
      // 先停用其他计划
      db.prepare('UPDATE training_plans SET is_active = 0 WHERE user_id = ?').run(userId);
    }

    // 更新当前计划状态
    db.prepare('UPDATE training_plans SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, planId);

    res.json({ message: isActive ? '已激活' : '已停用' });
  } catch (error) {
    next(error);
  }
});

// ==================== 训练日志 ====================

// 获取训练日志列表
router.get('/logs', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const { startDate, endDate, planId, limit = 20 } = req.query;

    let sql = 'SELECT l.*, p.name as plan_name FROM training_logs l LEFT JOIN training_plans p ON l.plan_id = p.id WHERE l.user_id = ?';
    const params = [userId];

    if (startDate) {
      sql += ' AND l.log_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND l.log_date <= ?';
      params.push(endDate);
    }
    if (planId) {
      sql += ' AND l.plan_id = ?';
      params.push(planId);
    }

    sql += ' ORDER BY l.log_date DESC LIMIT ?';
    params.push(parseInt(limit));

    const logs = db.prepare(sql).all(...params);

    // 获取每个日志的项目
    for (const log of logs) {
      log.items = db.prepare(`
        SELECT li.*, e.name as equipment_name
        FROM log_items li
        LEFT JOIN equipment e ON li.equipment_id = e.id
        WHERE li.log_id = ?
        ORDER BY li.id
      `).all(log.id);
    }

    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

// 获取单个训练日志详情
router.get('/logs/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const logId = req.params.id;

    const log = db.prepare(`
      SELECT l.*, p.name as plan_name
      FROM training_logs l
      LEFT JOIN training_plans p ON l.plan_id = p.id
      WHERE l.id = ? AND l.user_id = ?
    `).get(logId, userId);

    if (!log) {
      throw Object.assign(new Error('日志不存在'), { status: 404 });
    }

    // 获取日志项目
    log.items = db.prepare(`
      SELECT li.*, e.name as equipment_name
      FROM log_items li
      LEFT JOIN equipment e ON li.equipment_id = e.id
      WHERE li.log_id = ?
      ORDER BY li.id
    `).all(logId);

    res.json({ log });
  } catch (error) {
    next(error);
  }
});

// 创建训练日志
router.post('/logs', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const { planId, duration, notes, items } = req.body;

    const logId = uuidv4();

    // 创建日志
    db.prepare(`
      INSERT INTO training_logs (id, user_id, plan_id, duration, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(logId, userId, planId || null, duration || null, notes || null);

    // 添加日志项目
    if (items && items.length > 0) {
      const itemStmt = db.prepare(`
        INSERT INTO log_items (id, log_id, equipment_id, exercise_name, sets, reps, weight, duration)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        itemStmt.run(
          uuidv4(),
          logId,
          item.equipmentId || null,
          item.exerciseName,
          item.sets || null,
          item.reps || null,
          item.weight || null,
          item.duration || null
        );
      }
    }

    // 获取创建的日志
    const log = db.prepare('SELECT * FROM training_logs WHERE id = ?').get(logId);
    log.items = db.prepare('SELECT * FROM log_items WHERE log_id = ?').all(logId);

    res.status(201).json({ log });
  } catch (error) {
    next(error);
  }
});

// 更新训练日志
router.put('/logs/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const logId = req.params.id;
    const { duration, notes, items } = req.body;

    // 检查日志是否存在
    const log = db.prepare('SELECT * FROM training_logs WHERE id = ? AND user_id = ?').get(logId, userId);
    if (!log) {
      throw Object.assign(new Error('日志不存在'), { status: 404 });
    }

    // 更新日志
    db.prepare(`
      UPDATE training_logs
      SET duration = COALESCE(?, duration),
          notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(duration, notes, logId);

    // 如果提供了新的项目列表，更新项目
    if (items !== undefined) {
      // 删除旧项目
      db.prepare('DELETE FROM log_items WHERE log_id = ?').run(logId);

      // 添加新项目
      if (items && items.length > 0) {
        const itemStmt = db.prepare(`
          INSERT INTO log_items (id, log_id, equipment_id, exercise_name, sets, reps, weight, duration)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of items) {
          itemStmt.run(
            uuidv4(),
            logId,
            item.equipmentId || null,
            item.exerciseName,
            item.sets || null,
            item.reps || null,
            item.weight || null,
            item.duration || null
          );
        }
      }
    }

    // 获取更新后的日志
    const updatedLog = db.prepare('SELECT * FROM training_logs WHERE id = ?').get(logId);
    updatedLog.items = db.prepare('SELECT * FROM log_items WHERE log_id = ?').all(logId);

    res.json({ log: updatedLog });
  } catch (error) {
    next(error);
  }
});

// 删除训练日志
router.delete('/logs/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const logId = req.params.id;

    // 检查日志是否存在
    const log = db.prepare('SELECT * FROM training_logs WHERE id = ? AND user_id = ?').get(logId, userId);
    if (!log) {
      throw Object.assign(new Error('日志不存在'), { status: 404 });
    }

    // 删除日志项目
    db.prepare('DELETE FROM log_items WHERE log_id = ?').run(logId);

    // 删除日志
    db.prepare('DELETE FROM training_logs WHERE id = ?').run(logId);

    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

// 获取训练统计
router.get('/stats', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;

    // 总训练次数
    const totalLogs = db.prepare('SELECT COUNT(*) as count FROM training_logs WHERE user_id = ?').get(userId);

    // 总训练时长（分钟）
    const totalDuration = db.prepare('SELECT COALESCE(SUM(duration), 0) as total FROM training_logs WHERE user_id = ?').get(userId);

    // 本周训练次数
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekLogs = db.prepare('SELECT COUNT(*) as count FROM training_logs WHERE user_id = ? AND log_date >= ?').get(userId, weekStartStr);

    // 最近7天训练日期
    const recentLogs = db.prepare(`
      SELECT DISTINCT date(log_date) as log_date
      FROM training_logs
      WHERE user_id = ?
      ORDER BY log_date DESC
      LIMIT 7
    `).all(userId);

    res.json({
      totalLogs: totalLogs.count,
      totalDuration: totalDuration.total,
      weekLogs: weekLogs.count,
      recentDates: recentLogs.map(l => l.log_date)
    });
  } catch (error) {
    next(error);
  }
});

export default router;
