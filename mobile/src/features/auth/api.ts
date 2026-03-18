import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { apiClient, resolveUrl } from '../../shared/api';
import { User, LoginCredentials, RegisterData, AuthResponse } from '../../shared/types';

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiClient.post('/auth/login', credentials);
  const { token, user } = response.data;
  await AsyncStorage.setItem('auth_token', token);
  await AsyncStorage.setItem('user_data', JSON.stringify(user));
  if (credentials.rememberMe) {
    await AsyncStorage.setItem('remembered_email', credentials.email);
  } else {
    await AsyncStorage.removeItem('remembered_email');
  }
  return { token, user };
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await apiClient.post('/auth/register', data);
  const { token, user } = response.data;
  await AsyncStorage.setItem('auth_token', token);
  await AsyncStorage.setItem('user_data', JSON.stringify(user));
  return { token, user };
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem('auth_token');
  await AsyncStorage.removeItem('user_data');
}

export async function getCurrentUser(): Promise<User | null> {
  if (Platform.OS === 'web') {
    try {
      const cached = await AsyncStorage.getItem('user_data');
      const cachedUser = cached ? JSON.parse(cached) : null;
      apiClient.get('/users/me').then(async r => {
        if (r.data) await AsyncStorage.setItem('user_data', JSON.stringify(r.data));
      }).catch(() => {});
      return cachedUser;
    } catch {
      return null;
    }
  }
  try {
    const response = await apiClient.get('/users/me');
    const user = response.data;
    if (user?.avatar) user.avatar = resolveUrl(user.avatar);
    if (user) await AsyncStorage.setItem('user_data', JSON.stringify(user));
    return user;
  } catch (error) {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) return null;
      const user = JSON.parse(userData);
      if (user?.avatar) user.avatar = resolveUrl(user.avatar);
      return user;
    } catch {
      return null;
    }
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await AsyncStorage.getItem('auth_token');
  return token !== null && token !== undefined && token !== '';
}

export async function verifyEmail(code: string): Promise<{ message: string }> {
  const response = await apiClient.post('/auth/verify-email', { code });
  return response.data;
}

export async function resendVerification(): Promise<{ message: string }> {
  const response = await apiClient.post('/auth/resend-verification');
  return response.data;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const response = await apiClient.post('/auth/forgot-password', { email });
  return response.data;
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
  const response = await apiClient.post('/auth/reset-password', { email, code, newPassword });
  return response.data;
}
