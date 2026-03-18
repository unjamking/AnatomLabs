import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ApiError } from '../types';

const PRODUCTION_API_URL = 'https://anatomlabs.onrender.com/api';

const getApiUrl = () => {
  return PRODUCTION_API_URL;
};

export const API_BASE_URL = getApiUrl();
export const SERVER_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

export const resolveUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${SERVER_BASE_URL}${url}`;
};

let onAuthFailure: (() => void) | null = null;

export const setAuthFailureCallback = (callback: () => void) => {
  onAuthFailure = callback;
};

function handleError(error: AxiosError): ApiError {
  if (error.response) {
    const status = error.response.status;
    const serverMessage = (error.response.data as any)?.message || (error.response.data as any)?.error;

    let friendlyMessage: string;

    switch (status) {
      case 400:
        friendlyMessage = serverMessage || 'There was a problem with your request. Please check your input and try again.';
        break;
      case 401:
        friendlyMessage = serverMessage || 'Invalid email or password.';
        break;
      case 403:
        friendlyMessage = 'Sorry, you do not have permission to access this. Please contact support if you believe this is an error.';
        break;
      case 404:
        friendlyMessage = serverMessage || 'We could not find the information you were looking for. It might have been moved or deleted.';
        break;
      case 405:
        friendlyMessage = 'The action you are trying to do is not allowed.';
        break;
      case 409:
        friendlyMessage = serverMessage || 'It seems this item already exists. Please try a different name or option.';
        break;
      case 422:
        friendlyMessage = serverMessage || 'The data you provided could not be processed. Please check for errors and try again.';
        break;
      case 429:
        friendlyMessage = 'You are making too many requests. Please wait a moment before trying again.';
        break;
      case 500:
        friendlyMessage = 'A server error occurred. We are working on fixing it. Please try again later.';
        break;
      case 502:
      case 503:
      case 504:
        friendlyMessage = 'We are having trouble connecting to our servers. This is a temporary issue, please try again in a few moments.';
        break;
      default:
        friendlyMessage = serverMessage || `An unexpected error occurred (Code: ${status}). Please try again.`;
    }

    return {
      success: false,
      error: friendlyMessage,
      message: friendlyMessage,
      statusCode: status,
    };
  } else if (error.request) {
    let networkMessage = 'Unable to connect. Please check your internet connection.';

    if (error.code === 'ECONNABORTED') {
      networkMessage = 'Request timed out. Please check your connection and try again.';
    } else if (error.code === 'ERR_NETWORK') {
      networkMessage = 'Network error. Make sure you\'re connected to the internet.';
    }

    return {
      success: false,
      error: networkMessage,
      message: networkMessage,
      statusCode: 0,
    };
  }

  return {
    success: false,
    error: 'Something unexpected happened. Please try again.',
    message: 'Something unexpected happened. Please try again.',
    statusCode: 0,
  };
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: Platform.OS === 'web' ? 4000 : 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const url = error.config?.url || '';
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register');
    if (error.response?.status === 401 && !isAuthRoute) {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      if (onAuthFailure) {
        onAuthFailure();
      }
    }
    return Promise.reject(handleError(error));
  }
);
