import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { generateToken } from '../middleware/auth.js';
import { getDb } from '../../database/init.js';

export async function register({ username, password, nickname }) {
  const db = await getDb();

  // 验证输入
  if (!username || !password) {
    throw Object.assign(new Error('用户名和密码不能为空'), { status: 400 });
  }

  if (username.length < 3 || username.length > 20) {
    throw Object.assign(new Error('用户名长度需要在3-20个字符之间'), { status: 400 });
  }

  if (password.length < 6) {
    throw Object.assign(new Error('密码长度至少需要6个字符'), { status: 400 });
  }

  // 检查用户名是否已存在
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUser) {
    throw Object.assign(new Error('用户名已被占用'), { status: 409 });
  }

  // 加密密码
  const hashedPassword = await bcrypt.hash(password, 10);

  // 创建用户
  const userId = uuidv4();
  db.prepare(`
    INSERT INTO users (id, username, password, nickname)
    VALUES (?, ?, ?, ?)
  `).run(userId, username, hashedPassword, nickname || username);

  // 获取新创建的用户
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  // 生成token
  const token = generateToken(user);

  return {
    message: '注册成功',
    token,
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      level: user.level,
      exp: user.exp
    }
  };
}

export async function login({ username, password }) {
  const db = await getDb();

  // 验证输入
  if (!username || !password) {
    throw Object.assign(new Error('用户名和密码不能为空'), { status: 400 });
  }

  // 查找用户
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    throw Object.assign(new Error('用户名或密码错误'), { status: 401 });
  }

  // 验证密码
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw Object.assign(new Error('用户名或密码错误'), { status: 401 });
  }

  // 生成token
  const token = generateToken(user);

  return {
    message: '登录成功',
    token,
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      level: user.level,
      exp: user.exp
    }
  };
}

export async function getCurrentUser(userId) {
  const db = await getDb();

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    throw Object.assign(new Error('用户不存在'), { status: 404 });
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      level: user.level,
      exp: user.exp,
      createdAt: user.created_at
    }
  };
}
