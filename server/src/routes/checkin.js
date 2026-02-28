import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../database/init.js';

const router = express.Router();

// 打卡类型配置
const CHECKIN_TYPES = {
  exercise: { name: '运动打卡', icon: '🏃', expReward: 20 },
  water: { name: '喝水打卡', icon: '💧', expReward: 5 },
  sleep: { name: '早睡打卡', icon: '😴', expReward: 10 },
  diet: { name: '健康饮食', icon: '🥗', expReward: 10 },
  meditation: { name: '冥想打卡', icon: '🧘', expReward: 15 },
  steps: { name: '步数达标', icon: '👟', expReward: 15 },
};

// 获取今日日期
function getToday() {
  return new Date().toISOString().split('T')[0];
}

// 获取打卡类型列表
router.get('/types', (req, res) => {
  res.json({ types: CHECKIN_TYPES });
});

// 获取用户打卡记录
router.get('/records', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const { startDate, endDate, type } = req.query;

    let sql = 'SELECT * FROM check_ins WHERE user_id = ?';
    const params = [userId];

    if (startDate) {
      sql += ' AND check_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND check_date <= ?';
      params.push(endDate);
    }
    if (type) {
      sql += ' AND check_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY check_date DESC, created_at DESC';

    const records = db.prepare(sql).all(...params);
    res.json({ records });
  } catch (error) {
    next(error);
  }
});

// 获取今日打卡状态
router.get('/today', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const today = getToday();

    const records = db.prepare(`
      SELECT * FROM check_ins
      WHERE user_id = ? AND check_date = ?
    `).all(userId, today);

    // 构建今日打卡状态
    const todayStatus = {};
    for (const [key, config] of Object.entries(CHECKIN_TYPES)) {
      const record = records.find(r => r.check_type === key);
      todayStatus[key] = {
        ...config,
        checked: !!record,
        record: record || null,
      };
    }

    res.json({ today: todayStatus, date: today });
  } catch (error) {
    next(error);
  }
});

// 获取打卡统计
router.get('/stats', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;

    // 总打卡次数
    const totalCheckins = db.prepare('SELECT COUNT(*) as count FROM check_ins WHERE user_id = ?').get(userId);

    // 各类型打卡次数
    const typeStats = db.prepare(`
      SELECT check_type, COUNT(*) as count
      FROM check_ins
      WHERE user_id = ?
      GROUP BY check_type
    `).all(userId);

    // 连续打卡天数
    const records = db.prepare(`
      SELECT DISTINCT check_date
      FROM check_ins
      WHERE user_id = ?
      ORDER BY check_date DESC
    `).all(userId);

    let currentStreak = 0;
    let longestStreak = 0;
    const today = getToday();

    if (records.length > 0) {
      // 计算当前连续天数
      const todayDate = new Date(today);
      let checkDate = todayDate;
      let streak = 0;

      // 检查今天或昨天是否打卡
      const firstRecordDate = new Date(records[0].check_date);
      const dayDiff = Math.floor((todayDate - firstRecordDate) / (1000 * 60 * 60 * 24));

      if (dayDiff <= 1) {
        // 从今天或昨天开始计算连续天数
        for (let i = 0; i < records.length; i++) {
          const recordDate = new Date(records[i].check_date);
          const expectedDate = new Date(checkDate);
          expectedDate.setDate(expectedDate.getDate() - i);

          if (recordDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
            streak++;
          } else {
            break;
          }
        }
      }
      currentStreak = streak;

      // 计算最长连续天数
      let tempStreak = 1;
      for (let i = 1; i < records.length; i++) {
        const prevDate = new Date(records[i - 1].check_date);
        const currDate = new Date(records[i].check_date);
        const diff = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));

        if (diff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak, currentStreak);
    }

    // 本周打卡天数
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekCheckins = db.prepare(`
      SELECT COUNT(DISTINCT check_date) as count
      FROM check_ins
      WHERE user_id = ? AND check_date >= ?
    `).get(userId, weekStartStr);

    // 本月打卡天数
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthCheckins = db.prepare(`
      SELECT COUNT(DISTINCT check_date) as count
      FROM check_ins
      WHERE user_id = ? AND check_date >= ?
    `).get(userId, monthStartStr);

    res.json({
      totalCheckins: totalCheckins.count,
      currentStreak,
      longestStreak,
      weekDays: weekCheckins.count,
      monthDays: monthCheckins.count,
      typeStats: typeStats.reduce((acc, t) => ({ ...acc, [t.check_type]: t.count }), {}),
    });
  } catch (error) {
    next(error);
  }
});

// 获取日历数据（某月的打卡情况）
router.get('/calendar', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const { year, month } = req.query;

    const targetYear = parseInt(year) || new Date().getFullYear();
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;

    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

    const records = db.prepare(`
      SELECT check_date, check_type
      FROM check_ins
      WHERE user_id = ? AND check_date >= ? AND check_date <= ?
      ORDER BY check_date
    `).all(userId, startDate, endDate);

    // 按日期分组
    const calendar = {};
    for (const record of records) {
      if (!calendar[record.check_date]) {
        calendar[record.check_date] = [];
      }
      calendar[record.check_date].push(record.check_type);
    }

    res.json({
      year: targetYear,
      month: targetMonth,
      calendar,
    });
  } catch (error) {
    next(error);
  }
});

// 打卡
router.post('/', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const { type, notes, date } = req.body;

    if (!type || !CHECKIN_TYPES[type]) {
      throw Object.assign(new Error('无效的打卡类型'), { status: 400 });
    }

    const checkDate = date || getToday();

    // 检查今日是否已打卡该类型
    const existing = db.prepare(`
      SELECT * FROM check_ins
      WHERE user_id = ? AND check_date = ? AND check_type = ?
    `).get(userId, checkDate, type);

    if (existing) {
      throw Object.assign(new Error('今日已完成该类型打卡'), { status: 400 });
    }

    // 创建打卡记录
    const recordId = uuidv4();
    db.prepare(`
      INSERT INTO check_ins (id, user_id, check_date, check_type, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(recordId, userId, checkDate, type, notes || null);

    // 获取奖励经验
    const expReward = CHECKIN_TYPES[type].expReward;

    // 更新用户经验
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    let newExp = (user.exp || 0) + expReward;
    let newLevel = user.level || 1;

    // 检查升级（每100经验升一级）
    while (newExp >= newLevel * 100) {
      newExp -= newLevel * 100;
      newLevel++;
    }

    db.prepare('UPDATE users SET exp = ?, level = ? WHERE id = ?').run(newExp, newLevel, userId);

    const record = db.prepare('SELECT * FROM check_ins WHERE id = ?').get(recordId);

    res.status(201).json({
      record,
      expReward,
      levelUp: newLevel > user.level,
      newLevel,
      newExp,
    });
  } catch (error) {
    next(error);
  }
});

// 取消打卡
router.delete('/', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const { type, date } = req.body;

    const checkDate = date || getToday();

    const existing = db.prepare(`
      SELECT * FROM check_ins
      WHERE user_id = ? AND check_date = ? AND check_type = ?
    `).get(userId, checkDate, type);

    if (!existing) {
      throw Object.assign(new Error('未找到打卡记录'), { status: 404 });
    }

    // 扣除经验
    const expReward = CHECKIN_TYPES[type].expReward;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    let newExp = Math.max(0, (user.exp || 0) - expReward);

    db.prepare('UPDATE users SET exp = ? WHERE id = ?').run(newExp, userId);

    // 删除记录
    db.prepare('DELETE FROM check_ins WHERE id = ?').run(existing.id);

    res.json({ message: '已取消打卡', expDeducted: expReward });
  } catch (error) {
    next(error);
  }
});

export default router;
