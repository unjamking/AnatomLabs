import { apiClient } from '../../shared/api';
import {
  AdminStats, AdminUserListResponse, AdminUserDetail,
  AdminCoachApplication, AdminAnalytics, AdminDemographics, AdminEngagement,
} from '../../shared/types';

export async function getAdminStats(): Promise<AdminStats> {
  const response = await apiClient.get<AdminStats>('/admin/stats');
  return response.data;
}

export async function getAdminUsers(params?: { page?: number; limit?: number; search?: string; role?: string }): Promise<AdminUserListResponse> {
  const response = await apiClient.get<AdminUserListResponse>('/admin/users', { params });
  return response.data;
}

export async function getAdminUserDetail(id: string): Promise<AdminUserDetail> {
  const response = await apiClient.get<AdminUserDetail>(`/admin/users/${id}`);
  return response.data;
}

export async function updateAdminUser(id: string, data: { isAdmin?: boolean; isCoach?: boolean }): Promise<any> {
  const response = await apiClient.put(`/admin/users/${id}`, data);
  return response.data;
}

export async function deleteAdminUser(id: string): Promise<{ message: string }> {
  const response = await apiClient.delete<{ message: string }>(`/admin/users/${id}`);
  return response.data;
}

export async function getAdminApplications(status?: string): Promise<AdminCoachApplication[]> {
  const params = status ? { status } : {};
  const response = await apiClient.get<AdminCoachApplication[]>('/admin/applications', { params });
  return response.data;
}

export async function approveApplication(id: string): Promise<{ message: string }> {
  const response = await apiClient.put<{ message: string }>(`/admin/applications/${id}/approve`);
  return response.data;
}

export async function rejectApplication(id: string, note?: string): Promise<{ message: string }> {
  const response = await apiClient.put<{ message: string }>(`/admin/applications/${id}/reject`, { note });
  return response.data;
}

export async function getAdminAnalytics(days?: number): Promise<AdminAnalytics> {
  const params = days ? { days } : {};
  const response = await apiClient.get<AdminAnalytics>('/admin/analytics', { params });
  return response.data;
}

export async function getAdminDemographics(): Promise<AdminDemographics> {
  const response = await apiClient.get<AdminDemographics>('/admin/analytics/users');
  return response.data;
}

export async function getAdminEngagement(days?: number): Promise<AdminEngagement> {
  const params = days ? { days } : {};
  const response = await apiClient.get<AdminEngagement>('/admin/analytics/engagement', { params });
  return response.data;
}

export async function banAdminUser(id: string, isBanned: boolean): Promise<any> {
  const response = await apiClient.put(`/admin/users/${id}/ban`, { isBanned });
  return response.data;
}
