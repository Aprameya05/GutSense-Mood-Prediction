const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail?.error || body.detail || body.message || `API error ${res.status}`);
  }
  return res.json();
}

export function getProfile(userId: string) {
  return request<any>(`/api/profile?user_id=${userId}`);
}

export function updateProfile(data: any) {
  return request<any>("/api/profile", { method: "PUT", body: JSON.stringify(data) });
}

export function register(data: any) {
  return request<any>("/api/auth/register", { method: "POST", body: JSON.stringify(data) });
}

export function getDailyLog(date: string, userId: string) {
  return request<any>(`/api/daily-log/${date}?user_id=${userId}`);
}

export function getHistory(userId: string, from?: string, to?: string) {
  let url = `/api/history?user_id=${userId}`;
  if (from) url += `&from=${from}`;
  if (to) url += `&to=${to}`;
  return request<{ logs: any[]; count: number }>(url);
}

export function getTrends(userId: string) {
  return request<any>(`/api/trends?user_id=${userId}`);
}

export function getBaselines(userId: string) {
  return request<any>(`/api/baselines?user_id=${userId}`);
}

export function getRisks(userId: string) {
  return request<any>(`/api/risks?user_id=${userId}`);
}

export function getInsights(userId: string) {
  return request<any>(`/api/insights?user_id=${userId}`);
}

export function submitDigestion(data: {
  user_id: string;
  date: string;
  digestion: {
    bloating: string;
    stool_quality: number;
    gas_discomfort: string;
    digestion_quality: string;
    fermented_food_today: boolean;
  };
}) {
  return request<{ stage3: any }>("/api/digestion/submit", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function submitMood(data: {
  user_id: string;
  date: string;
  meal_timestamp: string;
  stage2_totals: any;
  stage0_profile: any;
  mood_input: {
    mood_emoji: string;
    mood_rating: number;
    cognitive_state: string;
    energy_level: string;
    anxiety_level: string;
  };
}) {
  return request<{ stage4: any; stage5: any }>("/api/mood/submit", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function saveMeal(data: {
  user_id: string;
  date: string;
  meal_data: any;
}) {
  return request<any>("/api/meals/save", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function submitSleep(data: {
  user_id: string;
  date: string;
  sleep_input: {
    sleep_onset: string;
    wake_time: string;
    sleep_quality: string;
    night_awakenings: number;
    caffeine_after_14h: boolean;
    screen_before_bed_min: number;
    last_meal_to_bed_hours?: number;
  };
}) {
  return request<any>("/api/sleep/log", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function uploadMealImage(image: File, userId: string) {
  const form = new FormData();
  form.append("image", image);
  form.append("user_id", userId);
  return fetch(`${BASE}/api/meals/log`, { method: "POST", body: form }).then(
    async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail?.error || `API error ${res.status}`);
      }
      return res.json();
    }
  );
}

export const USER_ID = "balaji_001";
export const TODAY = new Date().toISOString().slice(0, 10);
