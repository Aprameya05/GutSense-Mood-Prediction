import axios from 'axios';
import Constants from 'expo-constants';
import { useAppStore } from '../store/useAppStore';

// IP Autodetection Strategy
let backendIp = "192.168.1.1"; // Fallback IP
const uri = Constants.expoConfig?.hostUri;

if (uri) {
  backendIp = uri.split(':')[0];
} else if (process.env.EXPO_PUBLIC_API_BASE_URL) {
  try {
    const parsedUrl = new URL(process.env.EXPO_PUBLIC_API_BASE_URL);
    backendIp = parsedUrl.hostname;
  } catch (e) {
    backendIp = process.env.EXPO_PUBLIC_API_BASE_URL.replace(/https?:\/\//, '').split(':')[0];
  }
}

export const API_BASE_URL = `http://${backendIp}:8000`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAppStore.getState();
  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Session Expiration (401 Unauthorized)
    if (error.response && error.response.status === 401) {
      console.log('[Auth] 401 Token Expired or Invalid, logging out...');
      useAppStore.getState().logout();
    }

    // Network Error (Offline, DNS failure, Timeout)
    if (!error.response && error.config) {
      const config = error.config;
      const method = config.method?.toUpperCase();
      
      // Auto-queue mutating endpoints if there's no connection
      if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        // Exclude image uploads (FormData) from simple auto-queue JSON parsing
        if (!(config.data instanceof FormData)) {
          console.log(`[Offline] Enqueuing ${method} request to ${config.url}`);
          useAppStore.getState().enqueueRequest({
            url: config.url || '',
            method: method as any,
            body: config.data ? JSON.parse(config.data) : undefined,
          });
        }
      }
    }
    return Promise.reject(error);
  }
);
