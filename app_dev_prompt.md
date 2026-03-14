# GutSense Mobile App — Developer Prompt

> **Target audience:** React Native developers with ZERO knowledge of the GutSense backend pipeline.
> **Generated from:** Complete source analysis of all 10 pipeline stages, utils, schemas, and data models.

---

## Section 1: App Architecture Overview

### Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Framework | React Native + Expo (SDK 52+) | Cross-platform, fast iteration, OTA updates via EAS |
| Navigation | React Navigation v7 (drawer + stack) | Mature, supports nested navigators, deep linking |
| State Management | **Zustand** | Minimal boilerplate, no provider wrapping, built-in persist middleware, works with AsyncStorage out of the box. Context API gets unwieldy once you have 8+ screens reading from shared state (daily logs, profile, risk flags). Zustand's `persist` middleware gives offline-first for free. |
| Local Storage | expo-sqlite (structured queries) + AsyncStorage (key-value) | SQLite for daily logs & meal history (queryable), AsyncStorage for user preferences & auth tokens |
| HTTP Client | Axios with interceptors | Request/response interceptors for auth headers, retry on 429, offline queue |
| Image Handling | expo-image-picker + expo-file-system | Camera/gallery access, image resizing before upload |
| Charts | react-native-chart-kit or Victory Native | Scatter plots, line charts, radar charts for Trends/Baselines |
| Notifications | expo-notifications | Local push notifications for mood prompts & reminders |

### State Management (Zustand Store Shape)

```typescript
interface AppStore {
  // Auth
  userId: string | null;
  profile: UserProfile | null;

  // Daily data
  todayLog: DailyLog | null;
  dailyLogCache: Record<string, DailyLog>; // keyed by "YYYY-MM-DD"

  // Pipeline unlock state
  daysLogged: number;
  trendsUnlocked: boolean;  // daysLogged >= 30
  baselinesUnlocked: boolean; // daysLogged >= 30
  riskUnlocked: boolean; // daysLogged >= 7

  // Offline queue
  pendingRequests: QueuedRequest[];

  // Actions
  setProfile: (p: UserProfile) => void;
  appendMeal: (date: string, meal: MealEntry) => void;
  setSleep: (date: string, sleep: SleepOutput) => void;
  setDigestion: (date: string, digestion: DigestInput) => void;
  syncPendingRequests: () => Promise<void>;
}
```

### Offline-First Strategy

1. **Write-through cache:** Every successful API response is written to local SQLite/AsyncStorage immediately.
2. **Optimistic UI:** When logging a meal, sleep, or digestion, display the data locally before the API confirms.
3. **Offline queue:** If `NetInfo` reports no connectivity, serialize the request into `pendingRequests[]` with a `createdAt` timestamp.
4. **Sync on reconnect:** Listen to `NetInfo` events. When connectivity resumes, drain the queue in FIFO order. Retry failed items with exponential backoff (2s, 4s, 8s, max 3 retries).
5. **Conflict resolution:** Server wins. After sync, re-fetch the daily log for any dates that had queued writes.

---

## Section 2: Navigation Structure

```
DrawerNavigator
├── DashboardScreen          (route: "Dashboard")
├── LogMealNavigator         (route: "LogMeal")
│     └── StackNavigator
│           ├── MealStep1_Camera       (route: "MealStep1")
│           ├── MealStep2_FoodReview   (route: "MealStep2")
│           ├── MealStep3_Nutrition    (route: "MealStep3")
│           ├── MealStep4_Digestion    (route: "MealStep4")
│           ├── MealStep5_Mood         (route: "MealStep5")
│           └── MealStep6_Summary      (route: "MealStep6")
├── LogSleepScreen           (route: "LogSleep")
├── HistoryNavigator         (route: "History")
│     └── StackNavigator
│           ├── HistoryCalendar        (route: "HistoryCalendar")
│           └── DayDrillDown           (route: "DayDetail", params: { date: string })
├── TrendsScreen             (route: "Trends")       [locked until day 30]
├── BaselinesScreen          (route: "Baselines")    [locked until day 30]
├── RiskMonitorScreen        (route: "RiskMonitor")  [locked until day 7]
└── ProfileScreen            (route: "Profile")
```

---

## Section 3: Screen-by-Screen Specification

### 3.1 Dashboard

**Component:** `DashboardScreen`
**Route:** `"Dashboard"`
**API calls on mount:**
- `GET /api/daily-log/:today` — today's aggregated log
- `GET /api/profile` — user profile (for name display)
- `GET /api/risks` — active risk flag count (if daysLogged >= 7)

**Displayed data:**

| Widget | Source field | Format |
|--------|------------|--------|
| Meal count today | `dailyLog.meals.length` | "2 meals logged" |
| Calorie total | `dailyLog.daily_totals.calories_kcal` | "1,420 kcal" |
| Fiber total | `dailyLog.daily_totals.fiber_g` | "18.3g fiber" |
| Latest mood | Last meal's `stage4.emoji_used` + `stage4.mood_label` | emoji + "happy" |
| Sleep score | `dailyLog.sleep.sleep_hours` | "7.2h" with debt indicator |
| Gut health traffic light | `dailyLog.daily_gut.microbiome_diversity_index` | Green: MDI > 0.6, Yellow: 0.4–0.6, Red: < 0.4 |
| Quick actions | — | "Log Meal" button, "Log Sleep" button |
| Days until trends | `30 - daysLogged` | "12 days until Trends unlock" (hidden if >= 30) |
| Active risk flags | `riskOutput.risk_count` | Badge: "2 flags" (hidden if 0 or < 7 days) |

**States:**
- **Loading:** Skeleton cards for each widget
- **Empty (no meals today):** "Start your day! Log your first meal." with prominent CTA
- **Error:** "Couldn't load today's data. Pull to refresh." with retry button

---

### 3.2 Log Meal Flow (Multi-Step Wizard)

#### Step 1: Camera / Gallery (`MealStep1_Camera`)

**Route:** `"MealStep1"`
**Input:** Image file (JPEG/PNG) from camera or photo library
**Action:** User taps camera icon or gallery icon. Image is captured/selected.
**On next:** Navigate to `MealStep2` passing `{ imageUri: string }`

#### Step 2: Food Review (`MealStep2_FoodReview`)

**Route:** `"MealStep2"`, params: `{ imageUri: string }`
**API call:** `POST /api/meals/log` with multipart image + `user_id`
**Displays Stage 1 output:**

| Field | Type | Description |
|-------|------|-------------|
| `food_items` | `string[]` | List of identified foods. Rendered as editable chips. |
| `en_pred` | `string` | EfficientNet's single prediction (shown as secondary info) |
| `confidence` | `number` (0.0–1.0) | Confidence bar. Warn if < 0.5: "Low confidence — please verify" |
| `source` | `string` | Badge: "groq" / "efficientnet" / "stub" |

**User interactions:**
- **Confirm:** Accept food items as-is → navigate to Step 3
- **Edit:** Tap a food chip to rename it, tap + to add items, swipe to delete
- **Retake:** Go back to Step 1

**Shows Stage 2 nutrition alongside (from same API response).**

#### Step 3: Nutrition Breakdown (`MealStep3_Nutrition`)

**Route:** `"MealStep3"`, params: `{ stage1, stage2 }`
**Displays Stage 2 output as nutrient cards:**

| Nutrient | Field path | Unit | Display |
|----------|-----------|------|---------|
| Calories | `stage2.totals.calories_kcal` | kcal | Large header number |
| Carbohydrates | `stage2.totals.carbs_g` | g | Card |
| Protein | `stage2.totals.protein_g` | g | Card |
| Fat | `stage2.totals.fat_g` | g | Card |
| Fiber | `stage2.totals.fiber_g` | g | Card with color (green if >8g per meal) |
| Glycemic Load | `stage2.totals.glycemic_load` | "low" \| "medium" \| "high" | Badge with color |
| Tryptophan | `stage2.totals.tryptophan_mg` | mg | Card |
| Omega-3 | `stage2.totals.omega3_mg` | mg | Card |
| Iron | `stage2.totals.iron_mg` | mg | Card |
| Magnesium | `stage2.totals.magnesium_mg` | mg | Card |
| Vitamin B6 | `stage2.totals.b6_mg` | mg | Card |
| Vitamin B12 | `stage2.totals.b12_mcg` | µg | Card (warn if 0 for vegetarians) |
| Zinc | `stage2.totals.zinc_mg` | mg | Card |

**Per-item breakdown** available in `stage2.items[]` — each item shows `food_item`, `portion_g`, `source_db`.

#### Step 4: Digestion Report (`MealStep4_Digestion`)

**Route:** `"MealStep4"`
**Note:** This is the DAILY digestion report, not per-meal. Show a notice: "This updates your daily digestion report."

**Input fields:**

| Field | Widget | Values | Required |
|-------|--------|--------|----------|
| `bloating` | Segmented picker | `"none"` \| `"mild"` \| `"moderate"` \| `"severe"` | Yes |
| `stool_quality` | Visual picker (Bristol Scale 1–7 with icons) | `1` \| `2` \| `3` \| `4` \| `5` \| `6` \| `7` | Yes |
| `gas_discomfort` | Segmented picker | `"none"` \| `"mild"` \| `"moderate"` \| `"severe"` | Yes |
| `digestion_quality` | Segmented picker | `"poor"` \| `"fair"` \| `"good"` \| `"excellent"` | Yes |
| `fermented_food_today` | Toggle switch | `true` \| `false` | Yes |

**Bristol Scale reference for icons:**
- Type 1: Hard lumps (constipation)
- Type 2: Lumpy sausage
- Type 3: Cracked sausage (optimal)
- Type 4: Smooth sausage (optimal)
- Type 5: Soft blobs
- Type 6: Fluffy pieces
- Type 7: Watery (diarrhea)

**On "Next" — Stage 3 runs silently:**
When the user taps "Next" after completing the digestion form, call `POST /api/digestion/submit` in the background. The server persists the digestion data and runs Stage 3 (Gut Proxy) using the day's `daily_totals` + the submitted digestion report. Show a brief loading spinner. The Stage 3 results (`microbiome_diversity_index`, `inflammation_risk_score`, `digestion_stability_score`) are stored locally for display in Step 6 but the user proceeds immediately to Step 5 without waiting for a result screen.

#### Step 5: Mood Check-In (`MealStep5_Mood`)

**Route:** `"MealStep5"`

**Input fields:**

| Field | Widget | Values | Required |
|-------|--------|--------|----------|
| `mood_emoji` | Emoji picker (horizontal scroll) | `"😄"` \| `"🙂"` \| `"😐"` \| `"😟"` \| `"😔"` \| `"😴"` \| `"🤯"` | Yes |
| `mood_rating` | Slider | Integer `1`–`10` | Yes |
| `cognitive_state` | Segmented picker | `"sharp"` \| `"clear"` \| `"mild_fog"` \| `"brain_fog"` \| `"drowsy"` | Yes |
| `energy_level` | Segmented picker | `"very_low"` \| `"low"` \| `"moderate"` \| `"high"` \| `"very_high"` | Yes |
| `anxiety_level` | Segmented picker | `"none"` \| `"mild"` \| `"moderate"` \| `"high"` | Yes |

**Emoji-to-score mapping (displayed to user as labels):**

| Emoji | Label | Internal Score |
|-------|-------|---------------|
| 😄 | Very Happy | +2 |
| 🙂 | Happy | +1 |
| 😐 | Neutral | 0 |
| 😟 | Worried | -1 |
| 😔 | Sad | -2 |
| 😴 | Sleepy | -1 |
| 🤯 | Overwhelmed | -2 |

**On "Next" — Stages 4 & 5 run silently:**
When the user taps "Next" after completing the mood form, call `POST /api/mood/submit` in the background. The server runs Stage 4 (Mood scoring: emoji→numeric, cognitive penalty) and Stage 5 (Metabolic response: glucose spike, fiber attenuation, energy crash probability, late-meal penalty). Show a brief loading spinner. The Stage 4 and Stage 5 results are stored locally for display in Step 6.

#### Step 6: Summary & Save (`MealStep6_Summary`)

**Route:** `"MealStep6"`, receives all prior step data + stage outputs from Steps 4–5
**Displays:** Summary card with:
- Food items + confidence source
- Top-line nutrition (calories, protein, carbs, fat, fiber)
- Gut health scores from Stage 3 (MDI traffic light, IRS level, DSS)
- Mood: emoji + label + cognitive state + mood score
- Metabolic: glucose spike level + crash probability + late meal flag
- Digestion summary (bloating, stool quality)

**"Save Meal Log" button action:**
1. Calls `POST /api/meals/save` with the complete meal payload (stage1, stage2, stage3, stage4, stage5 outputs already computed)
2. Server persists the assembled `MealEntry` into the daily log, recomputes `daily_totals` and `daily_mood_summary`
3. Response confirms save with updated `daily_totals`
4. Navigate back to Dashboard with success toast

**Meal ID inference:** Derived from current time on the server:
- Before 11:00 → `"breakfast"`
- 11:00–14:59 → `"lunch"`
- 15:00–18:59 → `"snack"`
- 19:00+ → `"dinner"`

Or user can override via a picker with options: `"breakfast"` | `"lunch"` | `"dinner"` | `"snack"`

---

### 3.3 Log Sleep Flow

**Component:** `LogSleepScreen`
**Route:** `"LogSleep"`
**API call on save:** `POST /api/sleep/log`

**Input fields:**

| Field | Widget | Type/Range | Required |
|-------|--------|-----------|----------|
| `sleep_onset` | Time picker | `"HH:MM"` format | Yes |
| `wake_time` | Time picker | `"HH:MM"` format | Yes |
| `sleep_quality` | Segmented picker | `"poor"` \| `"fair"` \| `"good"` \| `"excellent"` | Yes |
| `night_awakenings` | Stepper / number input | Integer `0`–`10` | Yes (default: 0) |
| `caffeine_after_14h` | Toggle switch | `boolean` | Yes (default: false) |
| `screen_before_bed_min` | Slider | Integer `0`–`180` (minutes) | Yes (default: 30) |

**On save response, display Stage 6 results:**

| Metric | Field | Display |
|--------|-------|---------|
| Sleep duration | `sleep_hours` | "6.75 hours" |
| Sleep debt | `sleep_debt` | "0.75h debt" (green if 0, red if > 2) |
| Weekly cumulative debt | `cumulative_debt_7d` | "4.25h this week" |
| Circadian Regularity Index | `circadian_regularity_index` | 0.0–1.0 gauge (green > 0.7, yellow 0.5–0.7, red < 0.5) |
| Neurological Stress Proxy | `neurological_stress_proxy` | 0.0–1.0 gauge (green < 0.5, yellow 0.5–0.7, red > 0.7) |
| Sleep Stability | `sleep_stability` | Badge: "high" / "moderate" / "low" |

**Warning behavior:** If sleep already logged today, show confirmation: "You've already logged sleep today. This will overwrite your previous entry."

---

### 3.4 History

#### Calendar View (`HistoryCalendar`)

**Route:** `"HistoryCalendar"`
**API call:** `GET /api/history?from=YYYY-MM-DD&to=YYYY-MM-DD` (load current month)

**Calendar coloring logic (computed client-side from daily log data):**

```
compositeScore = (normalizedMood + normalizedSleep + normalizedGut) / 3

where:
  normalizedMood  = (avg_mood_score + 2) / 4     // maps [-2,+2] → [0,1]
  normalizedSleep = min(sleep_hours / 8, 1.0)     // 8h = perfect
  normalizedGut   = microbiome_diversity_index     // already [0,1]

Colors:
  compositeScore > 0.7  → green
  compositeScore 0.4–0.7 → yellow
  compositeScore < 0.4  → red
  No data → gray
```

#### Day Drill-Down (`DayDrillDown`)

**Route:** `"DayDetail"`, params: `{ date: "YYYY-MM-DD" }`
**API call:** `GET /api/daily-log/:date`

**Sections displayed:**

1. **Header:** Date, overall day quality badge, diet_type
2. **Meals list** (expandable accordion, one per meal):
   - `meal_id` + `meal_time`
   - Food items (`stage1.food_items`) + confidence badge
   - Nutrition summary (`stage2.totals`: calories, protein, carbs, fat, fiber)
   - Mood: emoji + label + cognitive state + energy level
   - Metabolic: glucose spike level + crash probability + late meal penalty flag
3. **Daily Totals:** All 13 nutrients summed
4. **Digestion Report:** bloating, stool quality, gas, fermented food
5. **Gut Health:** MDI, IRS (with risk level badge), DSS, SCFA proxy
6. **Mood Summary:** avg/min/max mood score, dominant cognitive state
7. **Sleep:** hours, debt, CRI, neuro stress, stability, awakenings

---

### 3.5 My Trends (Locked Until Day 30)

**Component:** `TrendsScreen`
**Route:** `"Trends"`
**API call:** `GET /api/trends`
**Lock condition:** `daysLogged < 30` → show locked state with countdown

**When unlocked, display Stage 7 output:**

**Correlation Visualizations:**

| Chart | X-axis source | Y-axis source | Chart type |
|-------|--------------|--------------|------------|
| GL ↔ Mood | `glycemic_load` (low=0, medium=1, high=2) | `mood_score` | Scatter plot |
| Fiber ↔ MDI | `fiber_g` (1-day lag) | `microbiome_diversity_index` | Line chart (dual axis) |
| Late meals ↔ Sleep | `late_meal` (boolean→bar groups) | `sleep_quality` (poor=1..excellent=4) | Grouped bar chart |
| Tryptophan ↔ Next-day mood | `tryptophan_mg` (1-day lag) | `mood_score` | Scatter plot |
| Sleep debt ↔ Cognitive | `cumulative_sleep_debt` | `cognitive_penalty` | Line chart |
| Fermented food ↔ Digestion | `fermented_food_consumed` (boolean→groups) | `digestion_stability_score` | Box plot or bar |
| Sugar ↔ Inflammation | `carbohydrates_g` | `inflammation_risk_score` | Scatter plot |

**For each correlation, display:**
- Pearson r value and p-value
- "Significant" badge if `|r| > 0.3 AND p < 0.05`
- Direction indicator (arrow up/down matching expected direction)

**Anomaly timeline:** Horizontal scrollable timeline marking dates with z-score anomalies. Each anomaly shows `metric`, `z_score`, `value` vs `rolling_mean`.

**Groq summary:** Rendered as a styled card with the `groq_summary` text.

**Trend indicators:** `fiber_trend` and `mdi_trend` shown as "increasing" / "decreasing" / "flat" badges.

**Pattern confidence:** Badge showing `"high"` / `"moderate"` / `"low"`.

**Locked state:** Illustration + "Your personalized trends will unlock after 30 days of logging. You've logged {daysLogged} days so far. Keep going!"

---

### 3.6 My Baselines (Locked Until Day 30)

**Component:** `BaselinesScreen`
**Route:** `"Baselines"`
**API call:** `GET /api/baselines`
**Lock condition:** `daysLogged < 30`

**When unlocked, display Stage 8 output as radar/spider chart with 8 axes:**

| Metric | Field | Normal Range | Chart axis label |
|--------|-------|-------------|-----------------|
| Mood | `baseline_mood` | 5.0–7.5 | "Mood" |
| Sleep | `baseline_sleep_hours` | 7.0–9.0 | "Sleep" |
| Glucose Spike | `baseline_glucose_spike` | "mild"=good, "high"=bad | "Glucose" |
| Digestion Stability | `baseline_digestion_stability` | > 0.6 = stable | "Digestion" |
| Microbiome Diversity | `baseline_MDI` | > 0.5 = adequate | "MDI" |
| Inflammation Risk | `baseline_inflammation_risk` | < 0.4 = low risk | "Inflammation" |
| Cognitive Score | `baseline_cognitive_score` | > 5.0 = normal | "Cognition" |
| Neurological Stress | `baseline_neuro_stress` | < 0.5 = low | "Neuro Stress" |

**For each metric, show stability indicator:**
- Read from `stability_details[metric].cv_percent` and `stability_details[metric].stable`
- If `stable === true` (CV < 15%): green "Stable" badge
- If `stable === false`: yellow "Collecting data" badge with CV percentage

**Additional display:**
- `all_baselines_stable`: Overall status banner
- `baseline_period_days`: "Based on 30 days of data"

---

### 3.7 Risk Monitor (Locked Until Day 7)

**Component:** `RiskMonitorScreen`
**Route:** `"RiskMonitor"`
**API call:** `GET /api/risks`
**Lock condition:** `daysLogged < 7`

**Display Stage 9 output:**

**Overall risk level badge:**

| Level | `neurological_risk_level` | Color | Description |
|-------|--------------------------|-------|-------------|
| None | `"none"` (0 flags) | Green | "All clear" |
| Mild | `"mild"` (1–2 flags) | Yellow | "Minor patterns detected" |
| Moderate | `"moderate"` (3–4 flags) | Orange | "Multiple risk patterns" |
| Elevated | `"elevated"` (5+ flags) | Red | "Significant patterns — see below" |

**Active flag cards (one card per flag in `active_flags[]`):**

| Flag ID | Display Name | Severity | Evidence description |
|---------|-------------|----------|---------------------|
| `persistent_brain_fog` | Persistent Brain Fog | Moderate | "Brain fog reported on 5+ of last 7 days" |
| `chronic_sleep_debt` | Chronic Sleep Debt | High | "Cumulative sleep debt > 10h for 2+ consecutive weeks" |
| `mood_instability` | Mood Instability | Moderate | "Mood score variability (std dev > 2.5) sustained 14+ days" |
| `metabolic_dysregulation` | Metabolic Dysregulation | High | "High glucose spikes on 60%+ of meals over 14+ days" |
| `inflammation_persistence` | Chronic Inflammation | Moderate | "Inflammation risk score > 0.6 for 14+ consecutive days" |
| `circadian_disruption` | Circadian Disruption | Moderate | "Circadian regularity < 0.4 for 14+ days" |
| `combined_neuro_stress` | Elevated Neurological Stress | High | "Neuro stress proxy > 0.7 for 7+ consecutive days" |
| `b12_deficiency_signal` | B12 Deficiency Signal | Moderate | "Vegetarian diet + cognitive decline trend over 21+ days" |

**Recommendation text:** Rendered from `recommendation` field.

**Professional consult banner:** If `professional_consult_suggested === true`, show a prominent (but non-alarming) banner: "Based on your patterns, you may benefit from discussing these observations with a healthcare provider."

**Disclaimer (MANDATORY):** Always visible at bottom of this screen:
> "All observations are informational only. This is NOT medical advice and should NOT be used for diagnosis. Always consult a qualified healthcare professional for medical concerns."

---

### 3.8 My Profile

**Component:** `ProfileScreen`
**Route:** `"Profile"`
**API calls:** `GET /api/profile` on mount, `PUT /api/profile` on save

**Display/edit fields:**

| Field | Widget | Type | Validation |
|-------|--------|------|-----------|
| `age` | Number input | `integer` | Required, > 0 |
| `sex` | Segmented picker | `"male"` \| `"female"` | Required |
| `height_cm` | Number input | `float` | Required, > 0 |
| `weight_kg` | Number input | `float` | Required, > 0 |
| `diet_type` | Picker | `"vegetarian"` \| `"non-vegetarian"` \| `"vegan"` | Required |
| `activity_level` | Picker | `"sedentary"` \| `"light"` \| `"moderate"` \| `"heavy"` | Required |
| `sleep_schedule` | Text input | `string` (e.g. "23:00-06:30") | Required |
| `known_conditions` | Tag input | `string[]` | Optional |
| `supplements` | Tag input | `string[]` | Optional |
| `medications` | Tag input | `string[]` | Optional |

**Computed fields (read-only, recalculated on save):**
- `bmr_kcal`: Displayed as "BMR: 1,658 kcal/day"
- `tdee_kcal`: Displayed as "TDEE: 2,571 kcal/day"
- `activity_multiplier`: Shown next to activity level selection

**BMR formula (Mifflin-St Jeor) for client-side preview:**
```
Male:   BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + 5
Female: BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) - 161

TDEE = BMR × activity_multiplier

Activity multipliers:
  sedentary: 1.2
  light:     1.375
  moderate:  1.55
  heavy:     1.725
```

---

## Section 4: Complete API Contract

### Authentication

#### `POST /api/auth/register`

Creates a new user profile (runs Stage 0).

**Request:**
```typescript
// Content-Type: application/json
{
  user_id: string;           // e.g. "balaji_001"
  age: number;               // integer, > 0
  sex: "male" | "female";
  height_cm: number;         // float
  weight_kg: number;         // float
  diet_type: "vegetarian" | "non-vegetarian" | "vegan";
  activity_level: "sedentary" | "light" | "moderate" | "heavy";
  sleep_schedule: string;    // e.g. "23:00-06:30"
  known_conditions?: string[];
  supplements?: string[];
  medications?: string[];
}
```

**Response `201 Created`:**
```typescript
{
  user_id: string;
  age: number;
  sex: string;
  height_cm: number;
  weight_kg: number;
  diet_type: string;
  activity_level: string;
  sleep_schedule: string;
  known_conditions: string[];
  supplements: string[];
  medications: string[];
  bmr_kcal: number;           // computed
  tdee_kcal: number;          // computed
  activity_multiplier: number; // 1.2 | 1.375 | 1.55 | 1.725
  baseline_established: true;
  timestamp: string;          // ISO 8601
}
```

**Error `400`:**
```typescript
{ errors: string[] }
// e.g. ["Missing required field: age", "sex must be 'male' or 'female'"]
```

---

#### `POST /api/auth/login`

Placeholder for authentication. Currently returns profile if user_id exists.

**Request:** `{ user_id: string }`
**Response `200`:** Full `UserProfile` object (same as register response)
**Error `404`:** `{ error: "User not found" }`

---

### Meal Logging

#### `POST /api/meals/log`

Upload a meal image. Runs Stage 1 (food identification) and Stage 2 (nutrition lookup).

**Request:**
```typescript
// Content-Type: multipart/form-data
{
  image: File;     // JPEG or PNG, max 10MB
  user_id: string;
}
```

**Response `200`:**
```typescript
{
  stage1: {
    food_items: string[];     // e.g. ["masala dosa", "sambar", "coconut chutney"]
    en_pred: string;          // EfficientNet prediction, e.g. "fried_rice"
    confidence: number;       // 0.0–1.0
    source: "groq" | "efficientnet" | "stub";
    timestamp: string;        // ISO 8601
  };
  stage2: {
    items: Array<{
      food_item: string;
      portion_g: number;       // default 250
      source_db: "IFCT_2017" | "USDA_FDC" | "INDB" | "groq_estimate";
      calories_kcal: number;
      carbohydrates_g: number;
      protein_g: number;
      fat_g: number;
      fiber_g: number;
      glycemic_load: "low" | "medium" | "high" | "unknown";
      tryptophan_mg: number;
      omega3_mg: number;
      iron_mg: number;
      magnesium_mg: number;
      vitamin_b6_mg: number;
      vitamin_b12_ug: number;
      zinc_mg: number;
    }>;
    totals: {
      calories_kcal: number;
      carbohydrates_g: number;  // Note: backend uses "carbs_g" in daily_totals
      protein_g: number;
      fat_g: number;
      fiber_g: number;
      glycemic_load: "low" | "medium" | "high";  // worst across items
      tryptophan_mg: number;
      omega3_mg: number;
      iron_mg: number;
      magnesium_mg: number;
      vitamin_b6_mg: number;    // Note: becomes "b6_mg" in daily_totals
      vitamin_b12_ug: number;   // Note: becomes "b12_mcg" in daily_totals
      zinc_mg: number;
    };
    timestamp: string;
  };
}
```

**Error `400`:** `{ errors: ["food_items must not be empty"] }`
**Error `500`:** `{ error: "Image processing failed" }`

---

#### `POST /api/digestion/submit`

Submit the daily digestion report and run Stage 3 (Gut Proxy) silently. Called during the meal wizard after Step 4.

**Request:**
```typescript
// Content-Type: application/json
{
  user_id: string;
  date: string;              // "YYYY-MM-DD"
  digestion: {
    bloating: "none" | "mild" | "moderate" | "severe";
    stool_quality: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    gas_discomfort: "none" | "mild" | "moderate" | "severe";
    digestion_quality: "poor" | "fair" | "good" | "excellent";
    fermented_food_today: boolean;
  };
}
```

**Response `200`:**
```typescript
{
  stage3: {
    microbiome_diversity_index: number;    // [0.0, 1.0]
    inflammation_risk_score: number;       // [0.0, 1.0]
    inflammation_risk_level: "low" | "moderate" | "high";
    digestion_stability_score: number;     // [0.0, 1.0]
    scfa_production_proxy: "low" | "moderate" | "high";
    fiber_intake_today_g: number;
    fermented_food_consumed: boolean;
    timestamp: string;
  };
}
```

**Error `400`:** `{ errors: ["Missing required field: bloating", "stool_quality must be between 1 and 7"] }`

---

#### `POST /api/mood/submit`

Submit mood + cognitive self-report and run Stages 4 & 5 silently. Called during the meal wizard after Step 5.

**Request:**
```typescript
// Content-Type: application/json
{
  user_id: string;
  date: string;                    // "YYYY-MM-DD"
  meal_timestamp: string;          // ISO 8601, from stage1.timestamp
  stage2_totals: NutritionTotals;  // passed through from Step 3
  stage0_profile: {                // subset needed by Stage 5
    bmr_kcal: number;
    tdee_kcal: number;
    activity_level: string;
  };
  mood_input: {
    mood_emoji: "😄" | "🙂" | "😐" | "😟" | "😔" | "😴" | "🤯";
    mood_rating: number;           // 1–10
    cognitive_state: "sharp" | "clear" | "mild_fog" | "brain_fog" | "drowsy";
    energy_level: "very_low" | "low" | "moderate" | "high" | "very_high";
    anxiety_level: "none" | "mild" | "moderate" | "high";
  };
}
```

**Response `200`:**
```typescript
{
  stage4: {
    mood_score: number;          // -2, -1, 0, +1, +2
    mood_label: "very_happy" | "happy" | "neutral" | "worried" | "sad" | "sleepy" | "overwhelmed";
    cognitive_state: "sharp" | "clear" | "mild_fog" | "brain_fog" | "drowsy";
    cognitive_penalty: number;   // 0.0 | -0.5 | -1.0 | -1.5
    energy_level: string;
    anxiety_level: string;
    tryptophan_context_mg: number;
    hours_since_meal: number;
    timestamp: string;
  };
  stage5: {
    estimated_glucose_spike: "mild" | "moderate" | "high";
    spike_delta_mg_dl: number;
    fiber_attenuation_factor: number;  // [0.7, 1.0]
    energy_crash_probability: number;  // [0.0, 1.0]
    late_meal_penalty_applied: boolean;
    insulin_demand_proxy: "low" | "moderate" | "high";
    timestamp: string;
  };
}
```

**Error `400`:** `{ errors: ["mood_emoji must be one of the supported emojis", "mood_rating must be between 1 and 10"] }`

---

#### `POST /api/meals/save`

Persist the fully-assembled meal entry (all stages already computed). Called from the summary screen (Step 6).

**Request:**
```typescript
// Content-Type: application/json
{
  user_id: string;
  date: string;              // "YYYY-MM-DD"
  meal_id?: "breakfast" | "lunch" | "dinner" | "snack"; // auto-inferred if omitted
  meal_data: {
    stage1: {
      food_items: string[];
      en_pred: string;
      confidence: number;
      source: string;
      timestamp: string;
    };
    stage2: {
      items: NutritionRecord[];
      totals: NutritionTotals;
    };
    stage4: {
      mood_score: number;
      mood_label: string;
      cognitive_state: string;
      cognitive_penalty: number;
      energy_level: string;
      anxiety_level: string;
      emoji_used: string;
      tryptophan_context_mg: number;
      hours_since_meal: number;
      timestamp: string;
    };
    stage5: {
      estimated_glucose_spike: string;
      spike_delta_mg_dl: number;
      fiber_attenuation_factor: number;
      energy_crash_probability: number;
      late_meal_penalty_applied: boolean;
      insulin_demand_proxy: string;
      timestamp: string;
    };
  };
}
```

**Response `200`:**
```typescript
{
  meal_id: string;
  meal_count: number;          // total meals for the day after this append
  daily_totals: {
    calories_kcal: number;
    carbs_g: number;
    protein_g: number;
    fat_g: number;
    fiber_g: number;
    glycemic_load: "low" | "medium" | "high" | "unknown";
    tryptophan_mg: number;
    omega3_mg: number;
    iron_mg: number;
    magnesium_mg: number;
    b6_mg: number;
    b12_mcg: number;
    zinc_mg: number;
  };
  daily_mood_summary: {
    avg_mood_score: number;
    min_mood_score: number;
    max_mood_score: number;
    dominant_cognitive_state: string;
  };
}
```

**Error `400`:** Validation errors (see validators section)
**Error `404`:** `{ error: "User not found" }`

---

### Sleep Logging

#### `POST /api/sleep/log`

Save sleep data and run Stage 6.

**Request:**
```typescript
{
  user_id: string;
  date: string;                    // "YYYY-MM-DD"
  sleep_input: {
    sleep_onset: string;           // "HH:MM" e.g. "23:30"
    wake_time: string;             // "HH:MM" e.g. "06:15"
    sleep_quality: "poor" | "fair" | "good" | "excellent";
    night_awakenings: number;      // integer >= 0
    caffeine_after_14h: boolean;
    screen_before_bed_min: number; // integer >= 0, minutes
    last_meal_to_bed_hours?: number; // float, default 3.0
  };
}
```

**Response `200`:**
```typescript
{
  sleep_hours: number;                    // e.g. 6.75
  sleep_debt: number;                     // max(0, 7.5 - sleep_hours)
  cumulative_debt_7d: number;             // sum of last 7 days' debts
  circadian_regularity_index: number;     // [0.0, 1.0]
  neurological_stress_proxy: number;      // [0.0, 1.0]
  sleep_stability: "low" | "moderate" | "high";
  timestamp: string;
}
```

**Error `400`:** `{ errors: ["Missing required field: sleep_onset", "sleep_quality must be one of {poor, fair, good, excellent}"] }`

---

### Data Retrieval

#### `GET /api/daily-log/:date`

Get full daily log for a specific date.

**URL params:** `date` — `"YYYY-MM-DD"`

**Response `200`:** Complete `DailyLog` object:
```typescript
{
  date: string;
  meals: MealEntry[];
  digestion: DigestInput;
  sleep: SleepOutput;
  daily_totals: DailyTotals;
  daily_gut: DailyGut;
  daily_mood_summary: DailyMoodSummary;
  diet_type: string;
}
```

**Response `200` (no data):** Returns empty scaffold with zero values (the backend always returns a scaffold, never 404 for missing dates).

---

#### `GET /api/history?from=DATE&to=DATE`

Get daily logs for a date range.

**Query params:**
- `from`: `"YYYY-MM-DD"` (inclusive)
- `to`: `"YYYY-MM-DD"` (inclusive)

**Response `200`:**
```typescript
{
  logs: DailyLog[];    // one per date in range
  count: number;       // total days with data
}
```

---

#### `GET /api/trends`

Stage 7 output — time-series pattern analysis.

**Response `200`:**
```typescript
{
  correlations: Array<{
    pair: string;           // e.g. "glycemic_load <-> mood_score"
    r: number;              // Pearson r, -1.0 to 1.0
    p: number;              // p-value
    lag_days: number;       // 0 or 1
    n: number;              // sample count
    expected_direction: "positive" | "negative";
    significant: boolean;   // |r| > 0.3 AND p < 0.05
  }>;
  significant_correlations: Array</* same shape, filtered */>;
  anomalies: Array<{
    date: string;
    metric: string;
    z_score: number;
    value: number;
    rolling_mean: number;
    rolling_std: number;
  }>;
  anomalies_detected: number;
  fiber_trend: { slope: number; direction: "increasing" | "decreasing" | "flat" };
  mdi_trend: { slope: number; direction: "increasing" | "decreasing" | "flat" };
  groq_summary: string;        // natural language
  pattern_confidence: "high" | "moderate" | "low";
  days_analyzed: number;
  timestamp: string;
}
```

**Error `404`:** `{ error: "Trends require 30+ days of data", days_logged: number }`

---

#### `GET /api/baselines`

Stage 8 output — personalized baseline metrics.

**Response `200`:**
```typescript
{
  baseline_mood: number;                   // trimmed mean of mood scores
  baseline_sleep_hours: number;            // median sleep hours
  baseline_glucose_spike: "mild" | "moderate" | "high";  // mode
  baseline_digestion_stability: number;    // mean DSS
  baseline_MDI: number;                    // mean MDI (last 14 days)
  baseline_inflammation_risk: number;      // mean IRS
  baseline_cognitive_score: number;        // mean (mood_score + cognitive_penalty)
  baseline_neuro_stress: number;           // mean neurological_stress_proxy
  all_baselines_stable: boolean;
  baseline_period_days: number;
  stability_details: {
    [metric: string]: {
      cv_percent: number;
      stable: boolean;     // true if CV < 15%
    };
  };
  timestamp: string;
}
```

**Error `404`:** `{ error: "Baselines require 30+ days of data", days_logged: number }`

---

#### `GET /api/risks`

Stage 9 output — neurological risk pattern detection.

**Response `200`:**
```typescript
{
  neurological_risk_level: "none" | "mild" | "moderate" | "elevated";
  active_flags: string[];   // subset of the 8 possible flags (see Section 3.7)
  risk_count: number;
  recommendation: string;
  professional_consult_suggested: boolean;
  timestamp: string;
}
```

**Error `404`:** `{ error: "Risk analysis requires 7+ days of data", days_logged: number }`

---

#### `GET /api/insights`

Stage 10 output — AI-generated health insights.

**Response `200`:**
```typescript
{
  diet_mood_correlation: "detected" | "none";
  gut_health_proxy: "low" | "moderate" | "high" | "unknown";
  metabolic_stability: "mild" | "moderate" | "high" | "unknown";
  sleep_stability: "low" | "moderate" | "high" | "unknown";
  neurological_risk_flag: "none" | "mild" | "moderate" | "elevated";
  top_insight: string;
  insights_count: number;
  insights: string[];          // 3–5 actionable insight strings
  disclaimer: "Informational only. Not medical advice.";
  generated_by: "groq/llama-4-scout-17b";
  timestamp: string;
}
```

---

### Profile Management

#### `GET /api/profile`

**Response `200`:** Full `UserProfile` object (same as auth/register response)
**Error `404`:** `{ error: "User not found" }`

#### `PUT /api/profile`

**Request:** Same body as `POST /api/auth/register`
**Response `200`:** Updated `UserProfile` with recalculated BMR/TDEE
**Error `400`:** Validation errors

---

## Section 5: Data Models (TypeScript)

These interfaces are direct translations from `utils/daily_log_schema.py`, `stage0/profile.py`, and each stage's output TypedDicts.

```typescript
// ─── Stage 0: User Profile ───────────────────────────────────────────

interface UserProfile {
  user_id: string;
  age: number;
  sex: "male" | "female";
  height_cm: number;
  weight_kg: number;
  diet_type: "vegetarian" | "non-vegetarian" | "vegan";
  activity_level: "sedentary" | "light" | "moderate" | "heavy";
  sleep_schedule: string;
  known_conditions: string[];
  supplements: string[];
  medications: string[];
  bmr_kcal: number;
  tdee_kcal: number;
  activity_multiplier: number;   // 1.2 | 1.375 | 1.55 | 1.725
  baseline_established: boolean;
  timestamp: string;             // ISO 8601
}

// ─── Stage 1: Food Identification ────────────────────────────────────

interface Stage1Output {
  food_items: string[];
  en_pred: string;
  confidence: number;             // 0.0–1.0
  source: "groq" | "efficientnet" | "stub" | "synthetic";
  timestamp: string;
}

// ─── Stage 2: Nutrition ──────────────────────────────────────────────

interface NutritionRecord {
  food_item: string;
  portion_g: number;
  source_db: "IFCT_2017" | "USDA_FDC" | "INDB" | "groq_estimate";
  calories_kcal: number;
  carbohydrates_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number;
  glycemic_load: "low" | "medium" | "high" | "unknown";
  tryptophan_mg: number;
  omega3_mg: number;
  iron_mg: number;
  magnesium_mg: number;
  vitamin_b6_mg: number;
  vitamin_b12_ug: number;
  zinc_mg: number;
}

interface NutritionTotals {
  calories_kcal: number;
  carbs_g: number;                // Note: stage2 uses "carbohydrates_g", daily_totals uses "carbs_g"
  protein_g: number;
  fat_g: number;
  fiber_g: number;
  glycemic_load: "low" | "medium" | "high" | "unknown";
  tryptophan_mg: number;
  omega3_mg: number;
  iron_mg: number;
  magnesium_mg: number;
  b6_mg: number;                  // Note: stage2 uses "vitamin_b6_mg"
  b12_mcg: number;                // Note: stage2 uses "vitamin_b12_ug"
  zinc_mg: number;
}

interface Stage2Output {
  items: NutritionRecord[];
  totals: NutritionTotals;
  timestamp: string;
}

// ─── Stage 3: Gut Microbiome Proxy ───────────────────────────────────

interface Stage3Output {
  microbiome_diversity_index: number;   // [0.0, 1.0]
  inflammation_risk_score: number;      // [0.0, 1.0]
  inflammation_risk_level: "low" | "moderate" | "high";
  digestion_stability_score: number;    // [0.0, 1.0]
  scfa_production_proxy: "low" | "moderate" | "high";
  fiber_intake_today_g: number;
  fermented_food_consumed: boolean;
  timestamp: string;
}

// ─── Stage 4: Mood ───────────────────────────────────────────────────

type MoodEmoji = "😄" | "🙂" | "😐" | "😟" | "😔" | "😴" | "🤯";
type CognitiveState = "sharp" | "clear" | "mild_fog" | "brain_fog" | "drowsy";
type EnergyLevel = "very_low" | "low" | "moderate" | "high" | "very_high";
type AnxietyLevel = "none" | "mild" | "moderate" | "high";

interface MoodInput {
  mood_emoji: MoodEmoji;
  mood_rating: number;           // 1–10
  cognitive_state: CognitiveState;
  energy_level: EnergyLevel;
  anxiety_level: AnxietyLevel;
  timestamp?: string;
}

interface Stage4Output {
  mood_score: number;            // -2 | -1 | 0 | +1 | +2
  mood_label: "very_happy" | "happy" | "neutral" | "worried" | "sad" | "sleepy" | "overwhelmed";
  cognitive_state: CognitiveState;
  cognitive_penalty: number;     // 0.0 | -0.5 | -1.0 | -1.5
  energy_level: EnergyLevel;
  anxiety_level: AnxietyLevel;
  emoji_used: MoodEmoji;
  tryptophan_context_mg: number;
  hours_since_meal: number;
  timestamp: string;
}

// ─── Stage 5: Metabolic Response ─────────────────────────────────────

interface Stage5Output {
  estimated_glucose_spike: "mild" | "moderate" | "high";
  spike_delta_mg_dl: number;
  fiber_attenuation_factor: number;   // [0.7, 1.0]
  energy_crash_probability: number;   // [0.0, 1.0]
  late_meal_penalty_applied: boolean;
  insulin_demand_proxy: "low" | "moderate" | "high";
  timestamp: string;
}

// ─── Stage 6: Sleep ──────────────────────────────────────────────────

type SleepQuality = "poor" | "fair" | "good" | "excellent";

interface SleepInput {
  sleep_onset: string;               // "HH:MM"
  wake_time: string;                 // "HH:MM"
  sleep_quality: SleepQuality;
  night_awakenings: number;          // integer >= 0
  caffeine_after_14h: boolean;
  screen_before_bed_min: number;     // integer >= 0
  last_meal_to_bed_hours?: number;   // float, default 3.0
}

interface SleepOutput {
  sleep_onset: string;
  wake_time: string;
  sleep_hours: number;
  sleep_debt: number;                // max(0, 7.5 - sleep_hours)
  cumulative_debt_7d: number;
  circadian_regularity_index: number; // [0.0, 1.0]
  neurological_stress_proxy: number;  // [0.0, 1.0]
  sleep_quality: SleepQuality;
  sleep_stability: "low" | "moderate" | "high";
  night_awakenings: number;
  caffeine_after_14h: boolean;
  screen_before_bed_min: number;
}

// ─── Digestion Input ─────────────────────────────────────────────────

interface DigestInput {
  bloating: "none" | "mild" | "moderate" | "severe";
  stool_quality: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  fermented_food_today: boolean;
  gas_discomfort: "none" | "mild" | "moderate" | "severe";
  digestion_quality: "poor" | "fair" | "good" | "excellent";
}

// ─── Meal Entry ──────────────────────────────────────────────────────

interface MealEntry {
  meal_id: "breakfast" | "lunch" | "dinner" | "snack";
  meal_time: string;                 // "HH:MM"
  stage1: Stage1Output;
  stage2: Stage2Output;
  stage4: Stage4Output;
  stage5: Stage5Output;
}

// ─── Daily Aggregates ────────────────────────────────────────────────

interface DailyTotals extends NutritionTotals {}

interface DailyGut {
  microbiome_diversity_index: number;
  inflammation_risk_score: number;
  inflammation_risk_level: "low" | "moderate" | "high";
  digestion_stability_score: number;
  scfa_production_proxy: "low" | "moderate" | "high";
}

interface DailyMoodSummary {
  avg_mood_score: number;
  min_mood_score: number;          // -2 to +2
  max_mood_score: number;          // -2 to +2
  dominant_cognitive_state: CognitiveState;
}

// ─── Daily Log (top-level per-day structure) ─────────────────────────

interface DailyLog {
  date: string;                     // "YYYY-MM-DD"
  meals: MealEntry[];
  digestion: DigestInput;
  sleep: SleepOutput;
  daily_totals: DailyTotals;
  daily_gut: DailyGut;
  daily_mood_summary: DailyMoodSummary;
  diet_type: "vegetarian" | "non-vegetarian" | "vegan" | "omnivore";
}

// ─── Stage 7: Trends ─────────────────────────────────────────────────

interface CorrelationResult {
  pair: string;
  r: number;
  p: number;
  lag_days: number;
  n: number;
  expected_direction: "positive" | "negative";
  significant: boolean;
}

interface AnomalyEvent {
  date: string;
  metric: string;
  z_score: number;
  value: number;
  rolling_mean: number;
  rolling_std: number;
}

interface TrendDirection {
  slope: number;
  direction: "increasing" | "decreasing" | "flat";
}

interface TrendsOutput {
  correlations: CorrelationResult[];
  significant_correlations: CorrelationResult[];
  anomalies: AnomalyEvent[];
  anomalies_detected: number;
  fiber_trend: TrendDirection;
  mdi_trend: TrendDirection;
  groq_summary: string;
  pattern_confidence: "high" | "moderate" | "low";
  days_analyzed: number;
  timestamp: string;
}

// ─── Stage 8: Baselines ──────────────────────────────────────────────

interface StabilityDetail {
  cv_percent: number;
  stable: boolean;
}

interface BaselinesOutput {
  baseline_mood: number;
  baseline_sleep_hours: number;
  baseline_glucose_spike: "mild" | "moderate" | "high" | "unknown";
  baseline_digestion_stability: number;
  baseline_MDI: number;
  baseline_inflammation_risk: number;
  baseline_cognitive_score: number;
  baseline_neuro_stress: number;
  all_baselines_stable: boolean;
  baseline_period_days: number;
  stability_details: {
    mood: StabilityDetail;
    sleep_hours: StabilityDetail;
    digestion_stability: StabilityDetail;
    MDI: StabilityDetail;
    inflammation: StabilityDetail;
    cognitive_score: StabilityDetail;
    neuro_stress: StabilityDetail;
  };
  timestamp: string;
}

// ─── Stage 9: Risk ───────────────────────────────────────────────────

type RiskFlag =
  | "persistent_brain_fog"
  | "chronic_sleep_debt"
  | "mood_instability"
  | "metabolic_dysregulation"
  | "inflammation_persistence"
  | "circadian_disruption"
  | "combined_neuro_stress"
  | "b12_deficiency_signal";

interface RiskOutput {
  neurological_risk_level: "none" | "mild" | "moderate" | "elevated";
  active_flags: RiskFlag[];
  risk_count: number;
  recommendation: string;
  professional_consult_suggested: boolean;
  timestamp: string;
}

// ─── Stage 10: Insights ──────────────────────────────────────────────

interface InsightsOutput {
  diet_mood_correlation: "detected" | "none";
  gut_health_proxy: "low" | "moderate" | "high" | "unknown";
  metabolic_stability: "mild" | "moderate" | "high" | "unknown";
  sleep_stability: "low" | "moderate" | "high" | "unknown";
  neurological_risk_flag: "none" | "mild" | "moderate" | "elevated";
  top_insight: string;
  insights_count: number;
  insights: string[];
  disclaimer: string;
  generated_by: string;
  timestamp: string;
}
```

---

## Section 6: Business Logic Rules for Frontend

### Meal Logging Rules

1. **Unlimited meals per day.** Users can log breakfast, lunch, dinner, snack — or multiple of the same type.
2. **Each meal gets its own mood check.** Stage 4 runs per-meal, not per-day.
3. **Meal ID is auto-inferred** from time of day (before 11→breakfast, 11–15→lunch, 15–19→snack, 19+→dinner) but the user can override.
4. **`daily_totals` are recomputed** every time a meal is appended. The server sums all 12 numeric nutrients across all meals and takes the worst `glycemic_load`.
5. **`daily_mood_summary` is recomputed** every time a meal is appended: avg/min/max mood_score and dominant cognitive state across all meals.

### Digestion Logging Rules

1. **Once per day.** Digestion is a daily-level input, not per-meal.
2. **Stage 3 runs immediately after digestion submission** (wizard Step 4 "Next" tap). It requires `daily_totals` (from meals already logged) + the digestion report to compute MDI, IRS, DSS. The call is `POST /api/digestion/submit`.
3. **If digestion is resubmitted**, the existing digestion section is overwritten and Stage 3 is re-run with updated `daily_totals`.
4. **In the Log Meal wizard**, Step 4 (digestion) should note: "This is your daily digestion report and affects your gut health scores for the entire day."

### Mood & Metabolic Processing Rules

1. **Stages 4 & 5 run immediately after mood submission** (wizard Step 5 "Next" tap). The call is `POST /api/mood/submit`.
2. **Stage 4** (Mood) maps emoji → score, applies cognitive penalty, links tryptophan context from Stage 2.
3. **Stage 5** (Metabolic) estimates glucose spike, fiber attenuation, energy crash probability, and applies late-meal penalty if `meal_time >= 21:00`.
4. The results from both stages are returned to the client and displayed in the Step 6 summary screen before final save.

### Sleep Logging Rules

1. **Once per day.** If sleep is logged again for the same date, it overwrites the previous entry.
2. **Warn before overwrite:** If `dailyLog.sleep.sleep_hours > 0`, show confirmation dialog.
3. **Sleep history** (last 7 days) is loaded server-side to compute cumulative debt and CRI.
4. **`last_meal_to_bed_hours`** should be computed client-side from the last meal's `meal_time` and `sleep_onset`, or defaulted to 3.0.

### Feature Unlock Rules

| Feature | Days Required | Check |
|---------|--------------|-------|
| Trends (Stage 7) | 30 | `daysLogged >= 30` |
| Baselines (Stage 8) | 30 | `daysLogged >= 30` |
| Risk Monitor (Stage 9) | 7 | `daysLogged >= 7` |
| Insights (Stage 10) | 1 (always available) | Any data present |

### Disclaimer Rules

1. **ALL stage outputs are informational, never diagnostic. No clinical claims anywhere.**
2. **Mandatory disclaimer** on Risk Monitor screen and Insights screen:
   > "Informational only. Not medical advice."
3. If `professional_consult_suggested === true` (risk level "elevated" with 5+ flags), show an additional non-alarming professional consult suggestion.

### Stage 2 Nutrient Key Naming Differences

The frontend must be aware that Stage 2 per-item output uses different field names than the daily_totals schema:

| Stage 2 per-item field | DailyTotals field |
|----------------------|------------------|
| `carbohydrates_g` | `carbs_g` |
| `vitamin_b6_mg` | `b6_mg` |
| `vitamin_b12_ug` | `b12_mcg` |

The API should normalize these, but the frontend should handle both naming conventions defensively.

---

## Section 7: Push Notification Triggers

Implement these using `expo-notifications` local scheduled notifications.

| Trigger | Timing | Title | Body | Condition |
|---------|--------|-------|------|-----------|
| Post-meal mood prompt | 2–3 hours after last meal logged | "How are you feeling?" | "Log your mood — it's been 2h since your last meal." | Only if no mood logged for that meal yet |
| Sleep reminder | 22:00 local time | "Log your sleep" | "Don't forget to log last night's sleep before bed." | Only if no sleep logged for today |
| Day 7 milestone | Morning of day 7 | "Risk Monitor unlocked!" | "You've logged 7 days. Check your Risk Monitor for early pattern insights." | Once, on reaching day 7 |
| Day 30 milestone | Morning of day 30 | "Trends & Baselines ready!" | "30 days of data! Your personalized Trends and Baselines are now available." | Once, on reaching day 30 |
| Meal logging reminder | 12:00 if no meals today | "Log your meals" | "You haven't logged any meals today. Tap to log your lunch." | Only if 0 meals today, after noon |

**Implementation notes:**
- Use `expo-notifications.scheduleNotificationAsync` with `trigger: { seconds: X }` after each meal save for the mood prompt.
- Use `expo-notifications.scheduleNotificationAsync` with `trigger: { hour: 22, minute: 0, repeats: true }` for the daily sleep reminder, cancelled after sleep is logged.
- Milestone notifications are one-shot: schedule them when `daysLogged` crosses the threshold, and store a flag in AsyncStorage to prevent re-triggering.
