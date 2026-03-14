import { apiClient } from './client';
import {
  UserProfile,
  DailyLog,
  Stage1Output,
  Stage2Output,
  Stage3Output,
  Stage4Output,
  Stage5Output,
  SleepOutput,
  TrendsOutput,
  BaselinesOutput,
  RiskOutput,
  InsightsOutput,
  DigestInput,
  MoodInput,
} from '../types/models';
import { useAppStore } from '../store/useAppStore';


export const ApiServices = {
  // Auth
  register: async (profile: Partial<UserProfile> & { password?: string }) => {
    const res = await apiClient.post('/api/auth/register', profile);
    return res.data as { access_token: string, user: UserProfile };
  },
  login: async (userId: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', userId);
    formData.append('password', password);
    const res = await apiClient.post('/api/auth/login', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return res.data as { access_token: string, user: UserProfile };
  },
  getProfile: async () => {
    const userId = useAppStore.getState().profile?.user_id;
    const res = await apiClient.get(`/api/profile?user_id=${userId}`);
    return res.data as UserProfile;
  },
  updateProfile: async (profile: Partial<UserProfile>) => {
    const res = await apiClient.put('/api/profile', profile);
    return res.data as UserProfile;
  },

  // Meals
  logMealImage: async (imageUri: string, userId: string) => {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'meal.jpg',
    } as any);
    formData.append('user_id', userId);

    const res = await apiClient.post('/api/meals/log', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data as { stage1: Stage1Output; stage2: Stage2Output };
  },
  saveMeal: async (userId: string, date: string, mealData: any, mealId?: string) => {
    const body: any = { user_id: userId, date, meal_data: mealData };
    if (mealId) body.meal_id = mealId;
    const res = await apiClient.post('/api/meals/save', body);
    return res.data;
  },

  // Daily Logging Steps
  submitDigestion: async (userId: string, date: string, digestion: DigestInput) => {
    const res = await apiClient.post('/api/digestion/submit', { user_id: userId, date, digestion });
    return res.data as { stage3: Stage3Output };
  },
  submitMood: async (userId: string, date: string, mealTimestamp: string, stage2Totals: any, profileSnippet: any, moodInput: MoodInput) => {
    const payload = {
      user_id: userId,
      date,
      meal_timestamp: mealTimestamp,
      stage2_totals: stage2Totals,
      stage0_profile: profileSnippet,
      mood_input: moodInput
    };
    const res = await apiClient.post('/api/mood/submit', payload);
    return res.data as { stage4: Stage4Output; stage5: Stage5Output };
  },

  // Sleep
  logSleep: async (userId: string, date: string, sleepInput: any) => {
    const res = await apiClient.post('/api/sleep/log', { user_id: userId, date, sleep_input: sleepInput });
    return res.data as SleepOutput;
  },

  // Data Fetching
  getDailyLog: async (date: string) => {
    const userId = useAppStore.getState().profile?.user_id;
    const res = await apiClient.get(`/api/daily-log/${date}?user_id=${userId}`);
    return res.data as DailyLog;
  },
  getLatestLog: async () => {
    const userId = useAppStore.getState().profile?.user_id;
    const res = await apiClient.get(`/api/latest-log?user_id=${userId}`);
    return res.data as DailyLog;
  },
  getHistory: async (from: string, to: string) => {
    const userId = useAppStore.getState().profile?.user_id;
    const res = await apiClient.get(`/api/history?user_id=${userId}&from=${from}&to=${to}`);
    return res.data as { logs: DailyLog[]; count: number };
  },
  getTrends: async () => {
    const userId = useAppStore.getState().profile?.user_id;
    const res = await apiClient.get(`/api/trends?user_id=${userId}`);
    return res.data as TrendsOutput;
  },
  getBaselines: async () => {
    const userId = useAppStore.getState().profile?.user_id;
    const res = await apiClient.get(`/api/baselines?user_id=${userId}`);
    return res.data as BaselinesOutput;
  },
  getRisks: async () => {
    const userId = useAppStore.getState().profile?.user_id;
    const res = await apiClient.get(`/api/risks?user_id=${userId}`);
    return res.data as RiskOutput;
  },
  getInsights: async () => {
    const userId = useAppStore.getState().profile?.user_id;
    const res = await apiClient.get(`/api/insights?user_id=${userId}`);
    return res.data as InsightsOutput;
  }
};

export const syncOfflineQueue = async () => {
  const { pendingRequests, removeRequest, updateRequestRetries } = useAppStore.getState();
  
  if (pendingRequests.length === 0) return;
  console.log(`[Offline Sync] Attempting to sync ${pendingRequests.length} requests`);

  for (const req of pendingRequests) {
    try {
      await apiClient.request({
        url: req.url,
        method: req.method,
        data: req.body,
      });
      console.log(`[Offline Sync] Success: ${req.method} ${req.url}`);
      removeRequest(req.id);
    } catch (e: any) {
      console.log(`[Offline Sync] Failed: ${req.method} ${req.url}`, e.message);
      if (req.retries >= 3) {
         // Optionally drop it after 3 tries, or keep it depending on your conflict policy.
         removeRequest(req.id);
      } else {
         updateRequestRetries(req.id, req.retries + 1);
      }
    }
  }
};
