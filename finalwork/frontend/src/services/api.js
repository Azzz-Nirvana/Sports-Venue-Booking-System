import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 用户相关
export const register = (data) => 
  api.post('/users/register', data).then(res => res.data);

export const login = (data) => 
  api.post('/users/login', data).then(res => res.data);

export const getAllUsers = () => 
  api.get('/users').then(res => res.data);

export const getUserById = (id) => 
  api.get(`/users/${id}`).then(res => res.data);

export const updateUser = (id, data) => 
  api.put(`/users/${id}`, data).then(res => res.data);

export const deleteUser = (id) => 
  api.delete(`/users/${id}`).then(res => res.data);

// 场馆相关
export const getAllVenues = (params) => 
  api.get('/venues', { params }).then(res => res.data);

export const getVenueById = (id) => 
  api.get(`/venues/${id}`).then(res => res.data);

export const getSubVenues = (venueId) => 
  api.get(`/venues/${venueId}/sub-venues`).then(res => res.data);

export const getAvailableTimes = (venueId, subVenueId, date) => 
  api.get(`/venues/${venueId}/sub-venues/${subVenueId}/available-times`, { params: { date } }).then(res => res.data);

export const getRemainingCapacity = (venueId, date, time) => 
  api.get(`/venues/${venueId}/remaining-capacity`, { params: { date, time } }).then(res => res.data);

export const createVenue = (data) => 
  api.post('/venues', data).then(res => res.data);

export const updateVenue = (id, data) => 
  api.put(`/venues/${id}`, data).then(res => res.data);

export const deleteVenue = (id) => 
  api.delete(`/venues/${id}`).then(res => res.data);

// 子场地相关
export const getAllSubVenues = (params) => 
  api.get('/sub-venues', { params }).then(res => res.data);

export const createSubVenue = (data) => 
  api.post('/sub-venues', data).then(res => res.data);

export const updateSubVenue = (id, data) => 
  api.put(`/sub-venues/${id}`, data).then(res => res.data);

export const deleteSubVenue = (id) => 
  api.delete(`/sub-venues/${id}`).then(res => res.data);

// 预约相关
export const getAllReservations = (params) => 
  api.get('/reservations', { params }).then(res => res.data);

export const getReservationById = (id) => 
  api.get(`/reservations/${id}`).then(res => res.data);

export const createReservation = (data) => 
  api.post('/reservations', data).then(res => res.data);

export const updateReservationStatus = (id, status) => 
  api.put(`/reservations/${id}/status`, { status }).then(res => res.data);

export const updateReservation = (id, data) => 
  api.put(`/reservations/${id}`, data).then(res => res.data);

export const cancelReservation = (id) => 
  api.delete(`/reservations/${id}`).then(res => res.data);

// 使用记录相关
export const getAllUsageRecords = (params) => 
  api.get('/usage', { params }).then(res => res.data);

export const getUsageRecordById = (id) => 
  api.get(`/usage/${id}`).then(res => res.data);

export const createUsageRecord = (data) => 
  api.post('/usage', data).then(res => res.data);

export const completeUsageRecord = (id, duration_hours) => 
  api.put(`/usage/${id}/complete`, { duration_hours }).then(res => res.data);

export const payUsageRecord = (id) => 
  api.put(`/usage/${id}/pay`).then(res => res.data);

export const getCurrentInUse = () => 
  api.get('/usage/current/in-use').then(res => res.data);

// 统计相关
export const getRevenueByDate = (params) => 
  api.get('/stats/revenue/by-date', { params }).then(res => res.data);

export const getVenueUsageStats = () => 
  api.get('/stats/venue/usage').then(res => res.data);

export const getOverviewStats = () => 
  api.get('/stats/overview').then(res => res.data);

// 账户相关
export const getUserAccount = (userId) => 
  api.get(`/accounts/user/${userId}`).then(res => res.data);

export const rechargeAccount = (userId, amount, description) => 
  api.post(`/accounts/${userId}/recharge`, { amount, description }).then(res => res.data);

export const getAccountTransactions = (userId, params) => 
  api.get(`/accounts/${userId}/transactions`, { params }).then(res => res.data);

export const payFromAccount = (userId, usageRecordId, amount) => 
  api.post(`/accounts/${userId}/pay`, { usage_record_id: usageRecordId, amount }).then(res => res.data);

// 通知相关
export const getUserNotifications = (userId, params) => 
  api.get(`/notifications/user/${userId}`, { params }).then(res => res.data);

export const getUnreadNotificationCount = (userId) => 
  api.get(`/notifications/user/${userId}/unread-count`).then(res => res.data);

export const markNotificationAsRead = (notificationId) => 
  api.put(`/notifications/${notificationId}/read`).then(res => res.data);

export const markAllNotificationsAsRead = (userId) => 
  api.put(`/notifications/user/${userId}/read-all`).then(res => res.data);

export const deleteNotification = (notificationId) => 
  api.delete(`/notifications/${notificationId}`).then(res => res.data);

// 评价相关
export const getAllReviews = (params) => 
  api.get('/reviews', { params }).then(res => res.data);

export const getReviewById = (id) => 
  api.get(`/reviews/${id}`).then(res => res.data);

export const getVenueReviewStats = (venueId) => 
  api.get(`/reviews/venue/${venueId}/stats`).then(res => res.data);

export const createReview = (data) => 
  api.post('/reviews', data).then(res => res.data);

export const updateReview = (id, data) => 
  api.put(`/reviews/${id}`, data).then(res => res.data);

export const deleteReview = (id) => 
  api.delete(`/reviews/${id}`).then(res => res.data);

// 用户相关（密码修改）
export const changePassword = (userId, oldPassword, newPassword) => 
  api.put(`/users/${userId}/password`, { oldPassword, newPassword }).then(res => res.data);

export default api;

