import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../database/init.js';

const router = express.Router();

// ==================== 健身搭子 ====================

// 获取当前搭子关系
router.get('/partner', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;

    // 查找已建立的搭子关系（任意一方发起且已接受）
    const partner = db.prepare(`
      SELECT p.*, u.username, u.nickname, u.avatar, u.level, u.exp
      FROM partners p
      JOIN users u ON (
        CASE
          WHEN p.user_id = ? THEN p.partner_id
          WHEN p.partner_id = ? THEN p.user_id
        END = u.id
      )
      WHERE (p.user_id = ? OR p.partner_id = ?) AND p.status = 'accepted'
    `).get(userId, userId, userId, userId);

    // 查找待处理的请求
    const pendingRequests = db.prepare(`
      SELECT p.*, u.username, u.nickname, u.avatar
      FROM partners p
      JOIN users u ON p.user_id = u.id
      WHERE p.partner_id = ? AND p.status = 'pending'
    `).all(userId);

    // 查找发出的请求
    const sentRequests = db.prepare(`
      SELECT p.*, u.username, u.nickname, u.avatar
      FROM partners p
      JOIN users u ON p.partner_id = u.id
      WHERE p.user_id = ? AND p.status = 'pending'
    `).all(userId);

    res.json({
      partner,
      pendingRequests,
      sentRequests,
    });
  } catch (error) {
    next(error);
  }
});

// 搜索用户（用于邀请搭子）
router.get('/users/search', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const { keyword } = req.query;

    if (!keyword || keyword.length < 2) {
      return res.json({ users: [] });
    }

    const users = db.prepare(`
      SELECT id, username, nickname, avatar, level
      FROM users
      WHERE id != ? AND (username LIKE ? OR nickname LIKE ?)
      LIMIT 10
    `).all(userId, `%${keyword}%`, `%${keyword}%`);

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// 发送搭子请求
router.post('/partner/request', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const { partnerId } = req.body;

    if (!partnerId) {
      throw Object.assign(new Error('请选择要邀请的用户'), { status: 400 });
    }

    // 检查目标用户是否存在
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(partnerId);
    if (!targetUser) {
      throw Object.assign(new Error('用户不存在'), { status: 404 });
    }

    // 检查是否已有搭子关系
    const existingPartner = db.prepare(`
      SELECT * FROM partners
      WHERE (user_id = ? OR partner_id = ?) AND status = 'accepted'
    `).get(userId, userId);

    if (existingPartner) {
      throw Object.assign(new Error('你已有健身搭子，不能重复绑定'), { status: 400 });
    }

    // 检查目标用户是否已有搭子
    const targetExistingPartner = db.prepare(`
      SELECT * FROM partners
      WHERE (user_id = ? OR partner_id = ?) AND status = 'accepted'
    `).get(partnerId, partnerId);

    if (targetExistingPartner) {
      throw Object.assign(new Error('对方已有健身搭子'), { status: 400 });
    }

    // 检查是否已有待处理的请求
    const existingRequest = db.prepare(`
      SELECT * FROM partners
      WHERE ((user_id = ? AND partner_id = ?) OR (user_id = ? AND partner_id = ?))
    `).get(userId, partnerId, partnerId, userId);

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        throw Object.assign(new Error('已发送过请求，请等待对方回应'), { status: 400 });
      } else if (existingRequest.status === 'rejected') {
        // 之前被拒绝，可以重新发送
        db.prepare('DELETE FROM partners WHERE id = ?').run(existingRequest.id);
      }
    }

    // 创建搭子请求
    const requestId = uuidv4();
    db.prepare(`
      INSERT INTO partners (id, user_id, partner_id, status)
      VALUES (?, ?, ?, 'pending')
    `).run(requestId, userId, partnerId);

    res.status(201).json({
      message: '请求已发送',
      request: {
        id: requestId,
        partnerId,
        partnerName: targetUser.nickname || targetUser.username,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 接受搭子请求
router.post('/partner/accept', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const { requestId } = req.body;

    // 查找请求
    const request = db.prepare(`
      SELECT * FROM partners WHERE id = ? AND partner_id = ? AND status = 'pending'
    `).get(requestId, userId);

    if (!request) {
      throw Object.assign(new Error('请求不存在或已处理'), { status: 404 });
    }

    // 检查自己是否已有搭子
    const existingPartner = db.prepare(`
      SELECT * FROM partners
      WHERE (user_id = ? OR partner_id = ?) AND status = 'accepted'
    `).get(userId, userId);

    if (existingPartner) {
      throw Object.assign(new Error('你已有健身搭子'), { status: 400 });
    }

    // 接受请求
    db.prepare('UPDATE partners SET status = ? WHERE id = ?').run('accepted', requestId);

    // 获取搭子信息
    const partner = db.prepare('SELECT id, username, nickname, avatar, level FROM users WHERE id = ?').get(request.user_id);

    res.json({
      message: '已成为健身搭子！',
      partner,
    });
  } catch (error) {
    next(error);
  }
});

// 拒绝搭子请求
router.post('/partner/reject', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const { requestId } = req.body;

    const request = db.prepare(`
      SELECT * FROM partners WHERE id = ? AND partner_id = ? AND status = 'pending'
    `).get(requestId, userId);

    if (!request) {
      throw Object.assign(new Error('请求不存在或已处理'), { status: 404 });
    }

    db.prepare('UPDATE partners SET status = ? WHERE id = ?').run('rejected', requestId);

    res.json({ message: '已拒绝请求' });
  } catch (error) {
    next(error);
  }
});

// 解除搭子关系
router.delete('/partner', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;

    const result = db.prepare(`
      DELETE FROM partners
      WHERE (user_id = ? OR partner_id = ?) AND status = 'accepted'
    `).run(userId, userId);

    if (result.changes === 0) {
      throw Object.assign(new Error('没有搭子关系'), { status: 404 });
    }

    res.json({ message: '已解除搭子关系' });
  } catch (error) {
    next(error);
  }
});

// 取消搭子请求
router.delete('/partner/request/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const requestId = req.params.id;

    const result = db.prepare(`
      DELETE FROM partners WHERE id = ? AND user_id = ? AND status = 'pending'
    `).run(requestId, userId);

    if (result.changes === 0) {
      throw Object.assign(new Error('请求不存在'), { status: 404 });
    }

    res.json({ message: '已取消请求' });
  } catch (error) {
    next(error);
  }
});

// 获取搭子的打卡记录
router.get('/partner/checkins', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;

    // 获取搭子ID
    const partner = db.prepare(`
      SELECT partner_id, user_id FROM partners
      WHERE (user_id = ? OR partner_id = ?) AND status = 'accepted'
    `).get(userId, userId);

    if (!partner) {
      return res.json({ checkins: [], partner: null });
    }

    const partnerId = partner.user_id === userId ? partner.partner_id : partner.user_id;

    // 获取搭子最近7天的打卡记录
    const checkins = db.prepare(`
      SELECT c.*, u.nickname, u.avatar
      FROM check_ins c
      JOIN users u ON c.user_id = u.id
      WHERE c.user_id = ?
      ORDER BY c.check_date DESC
      LIMIT 20
    `).all(partnerId);

    res.json({
      checkins,
      partner: db.prepare('SELECT id, username, nickname, avatar, level FROM users WHERE id = ?').get(partnerId),
    });
  } catch (error) {
    next(error);
  }
});

// ==================== 健身群组 ====================

// 获取群组列表
router.get('/groups', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;

    // 获取用户加入的群组
    const groups = db.prepare(`
      SELECT fg.*, u.nickname as creator_name,
        (SELECT COUNT(*) FROM group_members WHERE group_id = fg.id) as member_count
      FROM fitness_groups fg
      JOIN group_members gm ON fg.id = gm.group_id
      LEFT JOIN users u ON fg.creator_id = u.id
      WHERE gm.user_id = ?
      ORDER BY fg.created_at DESC
    `).all(userId);

    res.json({ groups });
  } catch (error) {
    next(error);
  }
});

// 获取可加入的群组（通过邀请码）
router.get('/groups/available', async (req, res, next) => {
  try {
    const db = await getDb();
    const { code } = req.query;

    if (!code) {
      return res.json({ groups: [] });
    }

    const groups = db.prepare(`
      SELECT fg.*, u.nickname as creator_name,
        (SELECT COUNT(*) FROM group_members WHERE group_id = fg.id) as member_count
      FROM fitness_groups fg
      LEFT JOIN users u ON fg.creator_id = u.id
      WHERE fg.id = ?
    `).all(code);

    res.json({ groups });
  } catch (error) {
    next(error);
  }
});

// 创建群组
router.post('/groups', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const { name, description, maxMembers } = req.body;

    if (!name) {
      throw Object.assign(new Error('群组名称不能为空'), { status: 400 });
    }

    // 检查用户是否已加入其他群组
    const existingGroup = db.prepare(`
      SELECT * FROM group_members WHERE user_id = ?
    `).get(userId);

    if (existingGroup) {
      throw Object.assign(new Error('你已加入群组，不能重复加入'), { status: 400 });
    }

    // 创建群组
    const groupId = uuidv4();
    db.prepare(`
      INSERT INTO fitness_groups (id, name, description, creator_id, max_members)
      VALUES (?, ?, ?, ?, ?)
    `).run(groupId, name, description || null, userId, maxMembers || 4);

    // 创建者自动成为成员
    const memberId = uuidv4();
    db.prepare(`
      INSERT INTO group_members (id, group_id, user_id, role)
      VALUES (?, ?, ?, 'creator')
    `).run(memberId, groupId, userId);

    const group = db.prepare('SELECT * FROM fitness_groups WHERE id = ?').get(groupId);
    group.member_count = 1;
    group.creator_name = db.prepare('SELECT nickname FROM users WHERE id = ?').get(userId)?.nickname;

    res.status(201).json({ group });
  } catch (error) {
    next(error);
  }
});

// 获取群组详情
router.get('/groups/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const groupId = req.params.id;

    const group = db.prepare(`
      SELECT fg.*, u.nickname as creator_name,
        (SELECT COUNT(*) FROM group_members WHERE group_id = fg.id) as member_count
      FROM fitness_groups fg
      LEFT JOIN users u ON fg.creator_id = u.id
      WHERE fg.id = ?
    `).get(groupId);

    if (!group) {
      throw Object.assign(new Error('群组不存在'), { status: 404 });
    }

    // 检查用户是否是成员
    const membership = db.prepare(`
      SELECT * FROM group_members WHERE group_id = ? AND user_id = ?
    `).get(groupId, userId);

    group.is_member = !!membership;
    group.role = membership?.role || null;

    res.json({ group });
  } catch (error) {
    next(error);
  }
});

// 加入群组
router.post('/groups/:id/join', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const groupId = req.params.id;

    // 检查群组是否存在
    const group = db.prepare('SELECT * FROM fitness_groups WHERE id = ?').get(groupId);
    if (!group) {
      throw Object.assign(new Error('群组不存在'), { status: 404 });
    }

    // 检查用户是否已加入群组
    const existingMembership = db.prepare(`
      SELECT * FROM group_members WHERE user_id = ?
    `).get(userId);

    if (existingMembership) {
      throw Object.assign(new Error('你已加入其他群组，不能重复加入'), { status: 400 });
    }

    // 检查群组是否已满
    const memberCount = db.prepare('SELECT COUNT(*) as count FROM group_members WHERE group_id = ?').get(groupId);
    if (memberCount.count >= group.max_members) {
      throw Object.assign(new Error('群组已满'), { status: 400 });
    }

    // 加入群组
    const memberId = uuidv4();
    db.prepare(`
      INSERT INTO group_members (id, group_id, user_id, role)
      VALUES (?, ?, ?, 'member')
    `).run(memberId, groupId, userId);

    res.json({ message: '已加入群组' });
  } catch (error) {
    next(error);
  }
});

// 离开群组
router.delete('/groups/:id/leave', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const groupId = req.params.id;

    const membership = db.prepare(`
      SELECT * FROM group_members WHERE group_id = ? AND user_id = ?
    `).get(groupId, userId);

    if (!membership) {
      throw Object.assign(new Error('你不是群组成员'), { status: 400 });
    }

    // 如果是创建者，需要先转让或解散群组
    if (membership.role === 'creator') {
      // 检查是否还有其他成员
      const otherMembers = db.prepare(`
        SELECT * FROM group_members WHERE group_id = ? AND user_id != ?
      `).all(groupId, userId);

      if (otherMembers.length > 0) {
        throw Object.assign(new Error('请先将群主转让给其他成员或解散群组'), { status: 400 });
      }

      // 只剩创建者，解散群组
      db.prepare('DELETE FROM group_members WHERE group_id = ?').run(groupId);
      db.prepare('DELETE FROM fitness_groups WHERE id = ?').run(groupId);
    } else {
      db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(groupId, userId);
    }

    res.json({ message: '已离开群组' });
  } catch (error) {
    next(error);
  }
});

// 解散群组（仅创建者）
router.delete('/groups/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const groupId = req.params.id;

    const group = db.prepare('SELECT * FROM fitness_groups WHERE id = ? AND creator_id = ?').get(groupId, userId);

    if (!group) {
      throw Object.assign(new Error('群组不存在或无权操作'), { status: 404 });
    }

    // 删除所有成员
    db.prepare('DELETE FROM group_members WHERE group_id = ?').run(groupId);
    // 删除群组
    db.prepare('DELETE FROM fitness_groups WHERE id = ?').run(groupId);

    res.json({ message: '群组已解散' });
  } catch (error) {
    next(error);
  }
});

// 获取群组成员
router.get('/groups/:id/members', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const groupId = req.params.id;

    // 检查用户是否是成员
    const membership = db.prepare(`
      SELECT * FROM group_members WHERE group_id = ? AND user_id = ?
    `).get(groupId, userId);

    if (!membership) {
      throw Object.assign(new Error('无权查看'), { status: 403 });
    }

    const members = db.prepare(`
      SELECT gm.*, u.username, u.nickname, u.avatar, u.level, u.exp
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
      ORDER BY gm.role = 'creator' DESC, gm.joined_at
    `).all(groupId);

    res.json({ members });
  } catch (error) {
    next(error);
  }
});

// 获取群组打卡记录
router.get('/groups/:id/checkins', async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const groupId = req.params.id;
    const { days = 7 } = req.query;

    // 检查用户是否是成员
    const membership = db.prepare(`
      SELECT * FROM group_members WHERE group_id = ? AND user_id = ?
    `).get(groupId, userId);

    if (!membership) {
      throw Object.assign(new Error('无权查看'), { status: 403 });
    }

    // 获取群组成员ID列表
    const memberIds = db.prepare('SELECT user_id FROM group_members WHERE group_id = ?').all(groupId);
    const ids = memberIds.map(m => m.user_id);

    if (ids.length === 0) {
      return res.json({ checkins: [] });
    }

    // 获取最近N天的打卡记录
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const placeholders = ids.map(() => '?').join(',');
    const checkins = db.prepare(`
      SELECT c.*, u.nickname, u.avatar
      FROM check_ins c
      JOIN users u ON c.user_id = u.id
      WHERE c.user_id IN (${placeholders}) AND c.check_date >= ?
      ORDER BY c.check_date DESC, c.created_at DESC
    `).all(...ids, startDateStr);

    res.json({ checkins });
  } catch (error) {
    next(error);
  }
});

export default router;
