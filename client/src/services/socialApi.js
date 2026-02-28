import api from './api';

// 健身搭子相关 API
export const partnerApi = {
  // 获取搭子关系
  getPartner: () => api.get('/social/partner'),

  // 搜索用户
  searchUsers: (keyword) => api.get('/social/users/search', { params: { keyword } }),

  // 发送搭子请求
  sendRequest: (partnerId) => api.post('/social/partner/request', { partnerId }),

  // 接受请求
  acceptRequest: (requestId) => api.post('/social/partner/accept', { requestId }),

  // 拒绝请求
  rejectRequest: (requestId) => api.post('/social/partner/reject', { requestId }),

  // 解除搭子关系
  removePartner: () => api.delete('/social/partner'),

  // 取消请求
  cancelRequest: (requestId) => api.delete(`/social/partner/request/${requestId}`),

  // 获取搭子打卡记录
  getPartnerCheckins: () => api.get('/social/partner/checkins'),
};

// 健身群组相关 API
export const groupApi = {
  // 获取群组列表
  getGroups: () => api.get('/social/groups'),

  // 获取可加入的群组
  getAvailableGroups: (code) => api.get('/social/groups/available', { params: { code } }),

  // 创建群组
  createGroup: (data) => api.post('/social/groups', data),

  // 获取群组详情
  getGroup: (id) => api.get(`/social/groups/${id}`),

  // 加入群组
  joinGroup: (id) => api.post(`/social/groups/${id}/join`),

  // 离开群组
  leaveGroup: (id) => api.delete(`/social/groups/${id}/leave`),

  // 解散群组
  deleteGroup: (id) => api.delete(`/social/groups/${id}`),

  // 获取群组成员
  getMembers: (id) => api.get(`/social/groups/${id}/members`),

  // 获取群组打卡记录
  getGroupCheckins: (id, days = 7) => api.get(`/social/groups/${id}/checkins`, { params: { days } }),
};
