import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../database/init.js';

const router = express.Router();

// 预置成就数据
const ACHIEVEMENTS = [
  // 打卡相关
  { id: 'ach-first-checkin', name: '初来乍到', description: '完成第一次打卡', icon: '🎯', category: '打卡', expReward: 10, criteria: { type: 'checkin', count: 1 } },
  { id: 'ach-checkin-7', name: '一周坚持', description: '累计打卡7天', icon: '📅', category: '打卡', expReward: 30, criteria: { type: 'checkin', count: 7 } },
  { id: 'ach-checkin-30', name: '月度达人', description: '累计打卡30天', icon: '🗓️', category: '打卡', expReward: 100, criteria: { type: 'checkin', count: 30 } },
  { id: 'ach-checkin-100', name: '百日传奇', description: '累计打卡100天', icon: '🏆', category: '打卡', expReward: 300, criteria: { type: 'checkin', count: 100 } },
  { id: 'ach-streak-3', name: '三连击', description: '连续打卡3天', icon: '🔥', category: '打卡', expReward: 20, criteria: { type: 'streak', count: 3 } },
  { id: 'ach-streak-7', name: '周周坚持', description: '连续打卡7天', icon: '💪', category: '打卡', expReward: 50, criteria: { type: 'streak', count: 7 } },
  { id: 'ach-streak-30', name: '月度连胜', description: '连续打卡30天', icon: '👑', category: '打卡', expReward: 200, criteria: { type: 'streak', count: 30 } },

  // 运动相关
  { id: 'ach-first-training', name: '初次训练', description: '完成第一次训练记录', icon: '🏋️', category: '训练', expReward: 10, criteria: { type: 'training', count: 1 } },
  { id: 'ach-training-10', name: '健身新手', description: '完成10次训练', icon: '🎯', category: '训练', expReward: 50, criteria: { type: 'training', count: 10 } },
  { id: 'ach-training-50', name: '健身达人', description: '完成50次训练', icon: '💪', category: '训练', expReward: 150, criteria: { type: 'training', count: 50 } },
  { id: 'ach-training-100', name: '健身大师', description: '完成100次训练', icon: '🏅', category: '训练', expReward: 300, criteria: { type: 'training', count: 100 } },

  // 健康数据相关
  { id: 'ach-first-health', name: '健康追踪', description: '记录第一条健康数据', icon: '📊', category: '健康', expReward: 10, criteria: { type: 'health', count: 1 } },
  { id: 'ach-health-7', name: '周记达人', description: '连续7天记录健康数据', icon: '📈', category: '健康', expReward: 30, criteria: { type: 'health_streak', count: 7 } },
  { id: 'ach-weight-goal', name: '体重达标', description: '体重达到目标范围', icon: '⚖️', category: '健康', expReward: 50, criteria: { type: 'weight_goal', count: 1 } },
  { id: 'ach-steps-10k', name: '万步达人', description: '单日步数超过10000步', icon: '👟', category: '健康', expReward: 20, criteria: { type: 'steps_10k', count: 1 } },

  // 等级相关
  { id: 'ach-level-5', name: '初露锋芒', description: '达到5级', icon: '⭐', category: '等级', expReward: 50, criteria: { type: 'level', count: 5 } },
  { id: 'ach-level-10', name: '小有成就', description: '达到10级', icon: '🌟', category: '等级', expReward: 100, criteria: { type: 'level', count: 10 } },
  { id: 'ach-level-20', name: '登峰造极', description: '达到20级', icon: '💫', category: '等级', expReward: 300, criteria: { type: 'level', count: 20 } },

  // 特殊成就
  { id: 'ach-early-bird', name: '早起鸟儿', description: '在早上6点前完成打卡', icon: '🌅', category: '特殊', expReward: 15, criteria: { type: 'early_bird', count: 1 } },
  { id: 'ach-night-owl', name: '夜猫子', description: '在晚上11点后完成训练', icon: '🦉', category: '特殊', expReward: 15, criteria: { type: 'night_owl', count: 1 } },
];

// 初始化成就数据
async function initAchievements() {
  const db = await getDb();

  // 检查是否已有数据
  const existing = db.prepare('SELECT COUNT(*) as count FROM achievements').get();
  if (existing.count > 0) return;

  // 插入预置数据
  const stmt = db.prepare(`
    INSERT INTO achievements (id, name, description, icon, category, exp_reward, criteria)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const ach of ACHIEVEMENTS) {
    stmt.run(
      ach.id,
      ach.name,
      ach.description,
      ach.icon,
      ach.category,
      ach.expReward,
      JSON.stringify(ach.criteria)
    );
  }

  console.log(`✅ 已初始化 ${ACHIEVEMENTS.length} 个成就`);
}

// 获取所有成就
router.get('/', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;

    // 获取所有成就
    const achievements = db.prepare('SELECT * FROM achievements ORDER BY category, exp_reward').all();

    // 获取用户已解锁的成就
    const unlocked = db.prepare(`
      SELECT achievement_id, unlocked_at
      FROM user_achievements
      WHERE user_id = ?
    `).all(userId);

    const unlockedMap = new Map(unlocked.map(u => [u.achievement_id, u.unlocked_at]));

    // 组合数据
    const result = achievements.map(ach => ({
      ...ach,
      criteria: JSON.parse(ach.criteria || '{}'),
      unlocked: unlockedMap.has(ach.id),
      unlockedAt: unlockedMap.get(ach.id) || null,
    }));

    res.json({ achievements: result });
  } catch (error) {
    next(error);
  }
});

// 获取成就分类
router.get('/categories', async (req, res, next) => {
  try {
    const db = await getDb();
    const categories = db.prepare('SELECT DISTINCT category FROM achievements ORDER BY category').all();
    res.json({ categories: categories.map(c => c.category) });
  } catch (error) {
    next(error);
  }
});

// 获取用户成就统计
router.get('/stats', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;

    // 总成就数
    const total = db.prepare('SELECT COUNT(*) as count FROM achievements').get();

    // 已解锁数
    const unlocked = db.prepare(`
      SELECT COUNT(*) as count FROM user_achievements WHERE user_id = ?
    `).get(userId);

    // 获得的总经验奖励
    const expEarned = db.prepare(`
      SELECT COALESCE(SUM(a.exp_reward), 0) as total
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = ?
    `).get(userId);

    // 各分类完成情况
    const categoryStats = db.prepare(`
      SELECT a.category,
        COUNT(*) as total,
        COUNT(ua.id) as unlocked
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
      GROUP BY a.category
    `).all(userId);

    res.json({
      total: total.count,
      unlocked: unlocked.count,
      expEarned: expEarned.total,
      categoryStats,
    });
  } catch (error) {
    next(error);
  }
});

// 手动检查并解锁成就（供内部调用）
async function checkAndUnlockAchievements(userId, type) {
  const db = await getDb();
  const unlockedAchievements = [];

  // 获取用户数据
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  // 获取打卡统计
  const totalCheckins = db.prepare('SELECT COUNT(*) as count FROM check_ins WHERE user_id = ?').get(userId);

  // 获取连续打卡天数
  const records = db.prepare(`
    SELECT DISTINCT check_date FROM check_ins WHERE user_id = ? ORDER BY check_date DESC
  `).all(userId);

  let currentStreak = 0;
  if (records.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const todayDate = new Date(today);
    const firstRecordDate = new Date(records[0].check_date);
    const dayDiff = Math.floor((todayDate - firstRecordDate) / (1000 * 60 * 60 * 24));

    if (dayDiff <= 1) {
      let streak = 0;
      for (let i = 0; i < records.length; i++) {
        const recordDate = new Date(records[i].check_date);
        const expectedDate = new Date(todayDate);
        expectedDate.setDate(expectedDate.getDate() - i);

        if (recordDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
          streak++;
        } else {
          break;
        }
      }
      currentStreak = streak;
    }
  }

  // 获取训练次数
  const totalTrainings = db.prepare('SELECT COUNT(*) as count FROM training_logs WHERE user_id = ?').get(userId);

  // 获取健康记录数
  const totalHealth = db.prepare('SELECT COUNT(*) as count FROM health_records WHERE user_id = ?').get(userId);

  // 获取已解锁的成就
  const unlockedIds = db.prepare('SELECT achievement_id FROM user_achievements WHERE user_id = ?').all(userId);
  const unlockedSet = new Set(unlockedIds.map(u => u.achievement_id));

  // 检查每个成就
  for (const ach of ACHIEVEMENTS) {
    if (unlockedSet.has(ach.id)) continue;

    const criteria = ach.criteria;
    let shouldUnlock = false;

    switch (criteria.type) {
      case 'checkin':
        shouldUnlock = totalCheckins.count >= criteria.count;
        break;
      case 'streak':
        shouldUnlock = currentStreak >= criteria.count;
        break;
      case 'training':
        shouldUnlock = totalTrainings.count >= criteria.count;
        break;
      case 'level':
        shouldUnlock = (user.level || 1) >= criteria.count;
        break;
      case 'health':
        shouldUnlock = totalHealth.count >= criteria.count;
        break;
    }

    if (shouldUnlock) {
      // 解锁成就
      const uaId = uuidv4();
      db.prepare(`
        INSERT INTO user_achievements (id, user_id, achievement_id)
        VALUES (?, ?, ?)
      `).run(uaId, userId, ach.id);

      // 奖励经验
      const newExp = (user.exp || 0) + ach.expReward;
      db.prepare('UPDATE users SET exp = ? WHERE id = ?').run(newExp, userId);

      unlockedAchievements.push(ach);
    }
  }

  return unlockedAchievements;
}

// 检查成就（API端点）
router.post('/check', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const unlocked = await checkAndUnlockAchievements(userId);
    res.json({ unlocked, count: unlocked.length });
  } catch (error) {
    next(error);
  }
});

export { initAchievements, checkAndUnlockAchievements };
export default router;
