import api from './api';

// 打卡相关 API
export const checkinApi = {
  // 获取打卡类型
  getTypes: () => api.get('/checkin/types'),

  // 获取打卡记录
  getRecords: (params) => api.get('/checkin/records', { params }),

  // 获取今日打卡状态
  getToday: () => api.get('/checkin/today'),

  // 获取打卡统计
  getStats: () => api.get('/checkin/stats'),

  // 获取日历数据
  getCalendar: (year, month) => api.get('/checkin/calendar', { params: { year, month } }),

  // 打卡
  checkin: (type, notes, date) => api.post('/checkin', { type, notes, date }),

  // 取消打卡
  cancel: (type, date) => api.delete('/checkin', { data: { type, date } }),
};

// 成就相关 API
export const achievementApi = {
  // 获取所有成就
  getAll: () => api.get('/achievements'),

  // 获取成就分类
  getCategories: () => api.get('/achievements/categories'),

  // 获取成就统计
  getStats: () => api.get('/achievements/stats'),

  // 检查成就
  check: () => api.post('/achievements/check'),
};
