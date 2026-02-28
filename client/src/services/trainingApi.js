import api from './api';

// 器材相关 API
export const equipmentApi = {
  // 获取所有器材
  getAll: (category) => api.get('/equipment', { params: { category } }),

  // 获取器材分类
  getCategories: () => api.get('/equipment/categories'),

  // 获取单个器材
  getById: (id) => api.get(`/equipment/${id}`),

  // 获取用户拥有的器材
  getMyEquipment: () => api.get('/equipment/user/my'),

  // 添加用户器材
  addEquipment: (equipmentId) => api.post(`/equipment/user/${equipmentId}`),

  // 移除用户器材
  removeEquipment: (equipmentId) => api.delete(`/equipment/user/${equipmentId}`),
};

// 训练计划相关 API
export const trainingPlanApi = {
  // 获取计划列表
  getPlans: (active) => api.get('/training/plans', { params: { active } }),

  // 获取计划详情
  getPlan: (id) => api.get(`/training/plans/${id}`),

  // 创建计划
  createPlan: (data) => api.post('/training/plans', data),

  // 更新计划
  updatePlan: (id, data) => api.put(`/training/plans/${id}`, data),

  // 删除计划
  deletePlan: (id) => api.delete(`/training/plans/${id}`),

  // 激活/停用计划
  setActive: (id, isActive) => api.patch(`/training/plans/${id}/active`, { isActive }),
};

// 训练日志相关 API
export const trainingLogApi = {
  // 获取日志列表
  getLogs: (params) => api.get('/training/logs', { params }),

  // 获取日志详情
  getLog: (id) => api.get(`/training/logs/${id}`),

  // 创建日志
  createLog: (data) => api.post('/training/logs', data),

  // 更新日志
  updateLog: (id, data) => api.put(`/training/logs/${id}`, data),

  // 删除日志
  deleteLog: (id) => api.delete(`/training/logs/${id}`),

  // 获取训练统计
  getStats: () => api.get('/training/stats'),
};
