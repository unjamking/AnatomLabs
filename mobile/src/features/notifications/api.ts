import { apiClient } from '../../shared/api';

export async function getNotifications(): Promise<any[]> {
  const response = await apiClient.get('/notifications');
  return response.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.put(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('/notifications/read-all');
}

export async function registerPushToken(token: string): Promise<void> {
  await apiClient.post('/notifications/push-token', { token });
}

export async function removePushToken(): Promise<void> {
  await apiClient.delete('/notifications/push-token');
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiClient.get<{ count: number }>('/notifications/unread-count');
  return response.data.count;
}
