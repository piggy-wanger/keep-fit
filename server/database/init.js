import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'keepfit.db');

let db = null;
let SQL = null;

// 创建数据库包装器，提供类似 better-sqlite3 的接口
class DatabaseWrapper {
  constructor(sqlDb) {
    this.db = sqlDb;
  }

  exec(sql) {
    this.db.run(sql);
    saveDatabase();
  }

  prepare(sql) {
    return new StatementWrapper(this.db, sql);
  }

  pragma(pragma) {
    this.db.run(`PRAGMA ${pragma}`);
  }

  close() {
    this.db.close();
  }
}

// Statement 包装器
class StatementWrapper {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
  }

  run(...params) {
    try {
      this.db.run(this.sql, params);
      saveDatabase();
      return { changes: this.db.getRowsModified() };
    } catch (err) {
      console.error('SQL Error:', err);
      throw err;
    }
  }

  get(...params) {
    try {
      const stmt = this.db.prepare(this.sql);
      stmt.bind(params);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return undefined;
    } catch (err) {
      console.error('SQL Error:', err);
      throw err;
    }
  }

  all(...params) {
    try {
      const stmt = this.db.prepare(this.sql);
      stmt.bind(params);
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    } catch (err) {
      console.error('SQL Error:', err);
      throw err;
    }
  }
}

// 保存数据库到文件
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// 创建表
function initDatabase() {
  // 用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT,
      avatar TEXT,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 健康数据表
  db.run(`
    CREATE TABLE IF NOT EXISTS health_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      record_date DATE NOT NULL,
      weight REAL,
      systolic INTEGER,
      diastolic INTEGER,
      steps INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 健康阈值表
  db.run(`
    CREATE TABLE IF NOT EXISTS health_thresholds (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      weight_min REAL,
      weight_max REAL,
      systolic_min INTEGER,
      systolic_max INTEGER,
      diastolic_min INTEGER,
      diastolic_max INTEGER,
      steps_goal INTEGER DEFAULT 10000,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 打卡记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS check_ins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      check_date DATE NOT NULL,
      check_type TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, check_date, check_type)
    )
  `);

  // 健身器材表
  db.run(`
    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      image_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 用户器材表
  db.run(`
    CREATE TABLE IF NOT EXISTS user_equipment (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      equipment_id TEXT NOT NULL,
      acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (equipment_id) REFERENCES equipment(id)
    )
  `);

  // 训练计划表
  db.run(`
    CREATE TABLE IF NOT EXISTS training_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      start_date DATE,
      end_date DATE,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 计划项目表
  db.run(`
    CREATE TABLE IF NOT EXISTS plan_items (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      equipment_id TEXT,
      exercise_name TEXT NOT NULL,
      sets INTEGER,
      reps INTEGER,
      weight REAL,
      duration INTEGER,
      day_of_week INTEGER,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (plan_id) REFERENCES training_plans(id),
      FOREIGN KEY (equipment_id) REFERENCES equipment(id)
    )
  `);

  // 训练日志表
  db.run(`
    CREATE TABLE IF NOT EXISTS training_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT,
      log_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      duration INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (plan_id) REFERENCES training_plans(id)
    )
  `);

  // 日志项目表
  db.run(`
    CREATE TABLE IF NOT EXISTS log_items (
      id TEXT PRIMARY KEY,
      log_id TEXT NOT NULL,
      equipment_id TEXT,
      exercise_name TEXT NOT NULL,
      sets INTEGER,
      reps INTEGER,
      weight REAL,
      duration INTEGER,
      FOREIGN KEY (log_id) REFERENCES training_logs(id),
      FOREIGN KEY (equipment_id) REFERENCES equipment(id)
    )
  `);

  // 成就表
  db.run(`
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      category TEXT,
      exp_reward INTEGER DEFAULT 0,
      criteria TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 用户成就表
  db.run(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (achievement_id) REFERENCES achievements(id),
      UNIQUE(user_id, achievement_id)
    )
  `);

  // AI配置表
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_configs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      api_key TEXT,
      base_url TEXT,
      config TEXT,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 健身搭子表
  db.run(`
    CREATE TABLE IF NOT EXISTS partners (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      partner_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (partner_id) REFERENCES users(id),
      UNIQUE(user_id, partner_id)
    )
  `);

  // 健身群组表
  db.run(`
    CREATE TABLE IF NOT EXISTS fitness_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      creator_id TEXT NOT NULL,
      max_members INTEGER DEFAULT 4,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id)
    )
  `);

  // 群组成员表
  db.run(`
    CREATE TABLE IF NOT EXISTS group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES fitness_groups(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(group_id, user_id)
    )
  `);

  // 保存数据库
  saveDatabase();
  console.log('✅ 数据库表初始化完成');
}

// 异步初始化
async function init() {
  SQL = await initSqlJs();

  // 尝试加载现有数据库
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
    console.log('📂 已加载数据库文件');
  } else {
    db = new SQL.Database();
    console.log('📝 创建新数据库文件');
  }

  // 启用外键约束
  db.run('PRAGMA foreign_keys = ON');

  // 初始化表
  initDatabase();

  return new DatabaseWrapper(db);
}

// 同步导出的 Promise
let dbPromise = null;

// 获取数据库实例
export async function getDb() {
  if (!dbPromise) {
    dbPromise = init();
  }
  return dbPromise;
}

export default { getDb };
