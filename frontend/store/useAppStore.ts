import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, DailyLog, QueuedRequest, MealEntry, SleepOutput, DigestInput } from '../types/models';
import { getLocalTodayString } from '../utils/date';

export interface AppStore {
  // Auth
  userId: string | null;
  accessToken: string | null;
  profile: UserProfile | null;

  // Daily data
  todayLog: DailyLog | null;
  dailyLogCache: Record<string, DailyLog>;

  // Pipeline unlock state
  daysLogged: number;
  trendsUnlocked: boolean;
  baselinesUnlocked: boolean;
  riskUnlocked: boolean;

  // Offline queue
  pendingRequests: QueuedRequest[];

  // Actions
  setAuth: (userId: string, token: string) => void;
  setProfile: (p: UserProfile) => void;
  appendMeal: (date: string, meal: MealEntry) => void;
  setSleep: (date: string, sleep: SleepOutput) => void;
  setDigestion: (date: string, digestion: DigestInput) => void;
  setDailyLog: (date: string, log: DailyLog) => void;
  logout: () => void;

  // Queue actions
  enqueueRequest: (req: Omit<QueuedRequest, 'id' | 'createdAt' | 'retries'>) => void;
  removeRequest: (id: string) => void;
  updateRequestRetries: (id: string, retries: number) => void;
  clearQueue: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      userId: null,
      accessToken: null,
      profile: null,
      todayLog: null,
      dailyLogCache: {},
      daysLogged: 0,
      trendsUnlocked: true,
      baselinesUnlocked: true,
      riskUnlocked: true,
      pendingRequests: [],

      setAuth: (userId, token) => set({ userId, accessToken: token }),
      setProfile: (profile) => set({ profile }),
      
      setDailyLog: (date, log) => {
        set((state) => {
          const newDaysLogged = Object.keys({ ...state.dailyLogCache, [date]: log }).length;
          return {
            dailyLogCache: { ...state.dailyLogCache, [date]: log },
            daysLogged: newDaysLogged,
            trendsUnlocked: true,
            baselinesUnlocked: true,
            riskUnlocked: true,
          };
        });
      },

      appendMeal: (date, meal) => set((state) => {
        const currentLog = state.dailyLogCache[date] || createEmptyLog(date);
        const updatedLog = { ...currentLog, meals: [...currentLog.meals, meal] };
        return {
          dailyLogCache: { ...state.dailyLogCache, [date]: updatedLog },
          todayLog: date === getLocalTodayString() ? updatedLog : state.todayLog
        };
      }),

      setSleep: (date, sleep) => set((state) => {
        const currentLog = state.dailyLogCache[date] || createEmptyLog(date);
        const updatedLog = { ...currentLog, sleep };
        return {
          dailyLogCache: { ...state.dailyLogCache, [date]: updatedLog },
          todayLog: date === getLocalTodayString() ? updatedLog : state.todayLog
        };
      }),

      setDigestion: (date, digestion) => set((state) => {
        const currentLog = state.dailyLogCache[date] || createEmptyLog(date);
        const updatedLog = { ...currentLog, digestion };
        return {
          dailyLogCache: { ...state.dailyLogCache, [date]: updatedLog },
          todayLog: date === getLocalTodayString() ? updatedLog : state.todayLog
        };
      }),

      enqueueRequest: (req) => set((state) => ({
        pendingRequests: [...state.pendingRequests, {
          ...req,
          id: Math.random().toString(36).substring(2) + Date.now().toString(36),
          createdAt: Date.now(),
          retries: 0
        }]
      })),

      removeRequest: (id) => set((state) => ({
        pendingRequests: state.pendingRequests.filter(r => r.id !== id)
      })),

      updateRequestRetries: (id, retries) => set((state) => ({
        pendingRequests: state.pendingRequests.map(r => r.id === id ? { ...r, retries } : r)
      })),

      clearQueue: () => set({ pendingRequests: [] }),

      logout: () => set({ userId: null, accessToken: null, profile: null, dailyLogCache: {}, todayLog: null, daysLogged: 0, trendsUnlocked: true, baselinesUnlocked: true, riskUnlocked: true, pendingRequests: [] })
    }),
    {
      name: 'gutsense-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        userId: state.userId,
        accessToken: state.accessToken,
        profile: state.profile,
        dailyLogCache: state.dailyLogCache,
        daysLogged: state.daysLogged,
        trendsUnlocked: state.trendsUnlocked,
        baselinesUnlocked: state.baselinesUnlocked,
        riskUnlocked: state.riskUnlocked,
        pendingRequests: state.pendingRequests,
      }),
    }
  )
);

function createEmptyLog(date: string): DailyLog {
  return {
    date,
    meals: [],
    digestion: { bloating: "none", stool_quality: 4, fermented_food_today: false, gas_discomfort: "none", digestion_quality: "fair" },
    sleep: null,
    daily_totals: { calories_kcal: 0, carbs_g: 0, protein_g: 0, fat_g: 0, fiber_g: 0, glycemic_load: "low", tryptophan_mg: 0, omega3_mg: 0, iron_mg: 0, magnesium_mg: 0, b6_mg: 0, b12_mcg: 0, zinc_mg: 0 },
    daily_gut: { microbiome_diversity_index: 0, inflammation_risk_score: 0, inflammation_risk_level: "low", digestion_stability_score: 0, scfa_production_proxy: "low" },
    daily_mood_summary: { avg_mood_score: 0, min_mood_score: 0, max_mood_score: 0, dominant_cognitive_state: "clear" },
    diet_type: "omnivore"
  };
}
