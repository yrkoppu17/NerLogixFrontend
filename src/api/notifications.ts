import api from './axios';

export interface NotificationItem {
  id: number;
  alertId?: number;
  title: string;
  message: string;
  readAt?: string;
  createdAt: string;
}

export interface NotificationPageResponse {
  content: NotificationItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const getNotifications = async (params?: { page?: number; size?: number }): Promise<NotificationPageResponse> => {
  const res = await api.get('/notifications', { params });
  return res.data;
};

export const markNotificationRead = async (id: number): Promise<void> => {
  await api.post(`/notifications/${id}/read`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await api.post('/notifications/read-all');
};

export const broadcastNotification = async (titles: Record<string, string>, messages: Record<string, string>): Promise<void> => {
  await api.post('/notifications/broadcast', { titles, messages });
};
