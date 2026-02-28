import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../database/init.js';

const router = express.Router();

// 预置器材数据
const presetEquipment = [
  // 自由重量
  { id: 'eq-dumbbell', name: '哑铃', category: '自由重量', description: '用于力量训练的可调节重量器械' },
  { id: 'eq-barbell', name: '杠铃', category: '自由重量', description: '长杆配重片，适合大重量训练' },
  { id: 'eq-kettlebell', name: '壶铃', description: '球形配重器械，适合爆发力训练' },
  { id: 'eq-weight-plate', name: '配重片', category: '自由重量', description: '用于杠铃和器械的配重' },
  { id: 'eq-resistance-band', name: '弹力带', category: '自由重量', description: '弹性阻力训练带' },

  // 有氧器械
  { id: 'eq-treadmill', name: '跑步机', category: '有氧器械', description: '室内跑步训练设备' },
  { id: 'eq-elliptical', name: '椭圆机', category: '有氧器械', description: '低冲击全身有氧训练' },
  { id: 'eq-spinning', name: '动感单车', category: '有氧器械', description: '室内骑行训练设备' },
  { id: 'eq-rowing', name: '划船机', category: '有氧器械', description: '全身有氧划船训练' },
  { id: 'eq-stair-climber', name: '登山机', category: '有氧器械', description: '模拟登山的有氧训练' },
  { id: 'eq-jump-rope', name: '跳绳', category: '有氧器械', description: '便携式有氧训练工具' },

  // 力量器械
  { id: 'eq-bench-press', name: '卧推架', category: '力量器械', description: '胸肌训练专用器械' },
  { id: 'eq-squat-rack', name: '深蹲架', category: '力量器械', description: '腿部训练专用架子' },
  { id: 'eq-leg-press', name: '腿举机', category: '力量器械', description: '坐姿腿部推举训练' },
  { id: 'eq-lat-pulldown', name: '高位下拉机', category: '力量器械', description: '背部肌肉训练器械' },
  { id: 'eq-cable-machine', name: '龙门架', category: '力量器械', description: '多功能绳索训练器' },
  { id: 'eq-chest-fly', name: '蝴蝶机', category: '力量器械', description: '胸肌中缝训练器械' },
  { id: 'eq-shoulder-press', name: '肩推机', category: '力量器械', description: '肩部推举训练器械' },
  { id: 'eq-bicep-curl', name: '弯举机', category: '力量器械', description: '肱二头肌训练器械' },
  { id: 'eq-tricep-extension', name: '臂屈伸机', category: '力量器械', description: '肱三头肌训练器械' },
  { id: 'eq-leg-curl', name: '腿弯举机', category: '力量器械', description: '腘绳肌训练器械' },
  { id: 'eq-leg-extension', name: '腿屈伸机', category: '力量器械', description: '股四头肌训练器械' },
  { id: 'eq-calf-raise', name: '提踵机', category: '力量器械', description: '小腿肌肉训练器械' },
  { id: 'eq-ab-machine', name: '腹肌训练机', category: '力量器械', description: '腹部肌肉训练器械' },
  { id: 'eq-smith-machine', name: '史密斯机', category: '力量器械', description: '导轨式杠铃训练器' },

  // 辅助器材
  { id: 'eq-pullup-bar', name: '引体向上杆', category: '辅助器材', description: '背部和手臂训练' },
  { id: 'eq-dip-station', name: '双杠', category: '辅助器材', description: '臂屈伸和核心训练' },
  { id: 'eq-bench', name: '训练凳', category: '辅助器材', description: '可调节角度的训练凳' },
  { id: 'eq-yoga-mat', name: '瑜伽垫', category: '辅助器材', description: '地面训练和拉伸用' },
  { id: 'eq-foam-roller', name: '泡沫轴', category: '辅助器材', description: '肌肉放松和按摩' },
  { id: 'eq-medicine-ball', name: '药球', category: '辅助器材', description: '爆发力和核心训练' },
  { id: 'eq-stability-ball', name: '瑞士球', category: '辅助器材', description: '核心稳定性训练' },
];

// 初始化器材数据
async function initEquipment() {
  const db = await getDb();

  // 检查是否已有数据
  const existing = db.prepare('SELECT COUNT(*) as count FROM equipment').get();
  if (existing.count > 0) return;

  // 插入预置数据
  const stmt = db.prepare(`
    INSERT INTO equipment (id, name, category, description)
    VALUES (?, ?, ?, ?)
  `);

  for (const eq of presetEquipment) {
    stmt.run(eq.id, eq.name, eq.category, eq.description);
  }

  console.log(`✅ 已初始化 ${presetEquipment.length} 个健身器材`);
}

// 获取所有器材
router.get('/', async (req, res, next) => {
  try {
    const db = await getDb();
    const { category } = req.query;

    let sql = 'SELECT * FROM equipment';
    const params = [];

    if (category) {
      sql += ' WHERE category = ?';
      params.push(category);
    }

    sql += ' ORDER BY category, name';

    const equipment = db.prepare(sql).all(...params);
    res.json({ equipment });
  } catch (error) {
    next(error);
  }
});

// 获取器材分类
router.get('/categories', async (req, res, next) => {
  try {
    const db = await getDb();
    const categories = db.prepare('SELECT DISTINCT category FROM equipment ORDER BY category').all();
    res.json({ categories: categories.map(c => c.category) });
  } catch (error) {
    next(error);
  }
});

// 获取单个器材
router.get('/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const equipment = db.prepare('SELECT * FROM equipment WHERE id = ?').get(req.params.id);

    if (!equipment) {
      throw Object.assign(new Error('器材不存在'), { status: 404 });
    }

    res.json({ equipment });
  } catch (error) {
    next(error);
  }
});

// 获取用户拥有的器材
router.get('/user/my', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;

    const equipment = db.prepare(`
      SELECT e.*, ue.acquired_at
      FROM equipment e
      JOIN user_equipment ue ON e.id = ue.equipment_id
      WHERE ue.user_id = ?
      ORDER BY e.category, e.name
    `).all(userId);

    res.json({ equipment });
  } catch (error) {
    next(error);
  }
});

// 添加用户器材
router.post('/user/:equipmentId', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const equipmentId = req.params.equipmentId;

    // 检查器材是否存在
    const equipment = db.prepare('SELECT * FROM equipment WHERE id = ?').get(equipmentId);
    if (!equipment) {
      throw Object.assign(new Error('器材不存在'), { status: 404 });
    }

    // 检查是否已拥有
    const existing = db.prepare(`
      SELECT * FROM user_equipment WHERE user_id = ? AND equipment_id = ?
    `).get(userId, equipmentId);

    if (existing) {
      throw Object.assign(new Error('已拥有该器材'), { status: 400 });
    }

    // 添加
    const id = uuidv4();
    db.prepare(`
      INSERT INTO user_equipment (id, user_id, equipment_id)
      VALUES (?, ?, ?)
    `).run(id, userId, equipmentId);

    res.status(201).json({ message: '添加成功', equipment });
  } catch (error) {
    next(error);
  }
});

// 移除用户器材
router.delete('/user/:equipmentId', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const equipmentId = req.params.equipmentId;

    db.prepare(`
      DELETE FROM user_equipment WHERE user_id = ? AND equipment_id = ?
    `).run(userId, equipmentId);

    res.json({ message: '移除成功' });
  } catch (error) {
    next(error);
  }
});

// 导出初始化函数
export { initEquipment };
export default router;
