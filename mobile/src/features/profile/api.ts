import { apiClient, resolveUrl } from '../../shared/api';
import { BMIResult, HealthConditionsResponse, HealthProfile } from '../../shared/types';

export async function getBMIAnalysis(): Promise<BMIResult> {
  const response = await apiClient.get<BMIResult>('/users/me/bmi');
  return response.data;
}

export async function getHealthConditions(): Promise<HealthConditionsResponse> {
  const response = await apiClient.get<{ success: boolean; data: HealthConditionsResponse }>('/health/conditions');
  return response.data.data;
}

export async function getUserProfile(): Promise<any> {
  const response = await apiClient.get('/users/me');
  return response.data;
}

export async function getHealthProfile(): Promise<HealthProfile> {
  const response = await apiClient.get<{ success: boolean; healthProfile: HealthProfile }>('/users/me/health-profile');
  return response.data.healthProfile;
}

export async function updateHealthProfile(profile: {
  healthConditions?: string[];
  physicalLimitations?: string[];
  foodAllergies?: string[];
  dietaryPreferences?: string[];
}): Promise<any> {
  const response = await apiClient.put('/users/me/health-profile', profile);
  return response.data;
}

export async function updateUserProfile(userId: string, data: { name?: string; age?: number | null; weight?: number | null; height?: number | null }): Promise<any> {
  const response = await apiClient.put(`/users/${userId}`, data);
  return response.data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  const response = await apiClient.put('/users/me/change-password', { currentPassword, newPassword });
  return response.data;
}

export async function uploadAvatar(imageUri: string): Promise<{ avatarUrl: string }> {
  const formData = new FormData();
  const filename = imageUri.split('/').pop() || 'avatar.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  formData.append('avatar', { uri: imageUri, name: filename, type } as any);
  const response = await apiClient.post('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const { avatarUrl } = response.data;
  return { avatarUrl: resolveUrl(avatarUrl) || avatarUrl };
}

export async function getMyFollowing(): Promise<any[]> {
  const response = await apiClient.get('/users/me/following');
  return response.data;
}
