import { apiClient, resolveUrl } from '../../shared/api';
import { Coach, CoachReview, CoachApplication, Booking } from '../../shared/types';

export async function getCoaches(params?: { search?: string; specialty?: string }): Promise<Coach[]> {
  const response = await apiClient.get<Coach[]>('/coaches', { params });
  return response.data.map(c => ({ ...c, avatar: resolveUrl(c.avatar) }));
}

export async function getCoachProfile(id: string): Promise<Coach> {
  const response = await apiClient.get<Coach>(`/coaches/${id}`);
  const c = response.data;
  return { ...c, avatar: resolveUrl(c.avatar) };
}

export async function submitCoachReview(coachId: string, rating: number, comment?: string): Promise<CoachReview> {
  const response = await apiClient.post<CoachReview>(`/coaches/${coachId}/reviews`, { rating, comment });
  return response.data;
}

export async function deleteCoachReview(coachId: string): Promise<void> {
  await apiClient.delete(`/coaches/${coachId}/reviews`);
}

export async function followCoach(id: string): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(`/coaches/${id}/follow`);
  return response.data;
}

export async function unfollowCoach(id: string): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(`/coaches/${id}/unfollow`);
  return response.data;
}

export async function submitCoachApplication(formData: FormData): Promise<{ message: string; application: CoachApplication }> {
  const response = await apiClient.post('/coach-applications', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function getMyApplication(): Promise<CoachApplication> {
  const response = await apiClient.get<CoachApplication>('/coach-applications/me');
  return response.data;
}

export async function getCoachDashboardProfile(): Promise<any> {
  const response = await apiClient.get('/coach-dashboard/profile');
  return response.data;
}

export async function updateCoachProfile(data: { bio?: string; price?: number; availability?: string[]; avatar?: string; specialty?: string[] }): Promise<any> {
  const response = await apiClient.put('/coach-dashboard/profile', data);
  return response.data;
}

export async function uploadCoachAvatar(imageUri: string): Promise<{ avatarUrl: string }> {
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

export async function uploadPostImage(imageUri: string): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  const filename = imageUri.split('/').pop() || 'post.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  formData.append('image', { uri: imageUri, name: filename, type } as any);
  const response = await apiClient.post('/coach-dashboard/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const { imageUrl } = response.data;
  return { imageUrl: resolveUrl(imageUrl) || imageUrl };
}

export async function createCoachPost(data: { caption: string; imageUrl?: string; type?: string }): Promise<any> {
  const response = await apiClient.post('/coach-dashboard/posts', data);
  return response.data;
}

export async function deleteCoachPost(id: string): Promise<void> {
  await apiClient.delete(`/coach-dashboard/posts/${id}`);
}

export async function createCoachStory(data: { type: string; title: string; description: string }): Promise<any> {
  const response = await apiClient.post('/coach-dashboard/stories', data);
  return response.data;
}

export async function getCoachBookings(): Promise<Booking[]> {
  const response = await apiClient.get<Booking[]>('/coach-dashboard/bookings');
  return response.data;
}

export async function updateBookingStatus(id: string, status: string): Promise<{ message: string; booking: Booking }> {
  const response = await apiClient.put(`/coach-dashboard/bookings/${id}`, { status });
  return response.data;
}

export async function getCoachFollowers(): Promise<any[]> {
  const response = await apiClient.get('/coach-dashboard/followers');
  return response.data;
}

export async function likePost(postId: string): Promise<{ message: string; liked: boolean }> {
  const response = await apiClient.post(`/coaches/posts/${postId}/like`);
  return response.data;
}

export async function getPostComments(postId: string): Promise<any[]> {
  const response = await apiClient.get(`/coaches/posts/${postId}/comments`);
  return response.data;
}

export async function commentOnPost(postId: string, content: string): Promise<any> {
  const response = await apiClient.post(`/coaches/posts/${postId}/comment`, { content });
  return response.data;
}

export async function sharePost(postId: string): Promise<{ message: string }> {
  const response = await apiClient.post(`/coaches/posts/${postId}/share`);
  return response.data;
}

export async function likeComment(commentId: string): Promise<{ liked: boolean }> {
  const response = await apiClient.post(`/coaches/posts/comments/${commentId}/like`);
  return response.data;
}
