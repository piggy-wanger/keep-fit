import api from './api';

// 健康数据相关 API
export const healthApi = {
  // 获取健康记录列表
  getRecords: (params) => api.get('/health/records', { params }),

  // 添加健康记录
  addRecord: (data) => api.post('/health/records', data),

  // 更新健康记录
  updateRecord: (id, data) => api.put(`/health/records/${id}`, data),

  // 删除健康记录
  deleteRecord: (id) => api.delete(`/health/records/${id}`),

  // 获取健康阈值
  getThresholds: () => api.get('/health/thresholds'),

  // 保存健康阈值
  saveThresholds: (data) => api.post('/health/thresholds', data),

  // 获取统计数据
  getStats: (period) => api.get('/health/stats', { params: { period } }),
};
