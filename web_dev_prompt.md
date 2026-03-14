# GutSense Web App — Developer Prompt

> **Target audience:** Next.js/React developers with ZERO knowledge of the GutSense backend pipeline.
> **Generated from:** Complete source analysis of all 10 pipeline stages, utils, schemas, and data models.

---

## Section 1: Web Architecture Overview

### Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Framework | Next.js 14 (App Router) | File-based routing, server components, API routes, SSR/SSG — all in one repo |
| Styling | Tailwind CSS + shadcn/ui | Utility-first CSS with pre-built accessible components; no custom design system needed |
| Server State | **TanStack Query (React Query v5)** | Caching, background refetch, stale-while-revalidate — ideal for API-heavy dashboards |
| UI State | **Zustand** | Minimal boilerplate for cross-page state (profile, unlock flags, daily log cache). Context API gets unwieldy once you have 8+ screens reading from shared state. |
| Auth | NextAuth.js (placeholder) | Drop-in OAuth/credentials scaffold; swap to real provider when needed |
| HTTP Client | Axios with interceptors (client) / native fetch (server) | Request/response interceptors for auth headers, retry on 429 |
| Image Upload | react-dropzone + preview | Drag-and-drop + click-to-upload with immediate thumbnail preview |
| Charts | Recharts | Composable, responsive React charts; supports line, bar, scatter, radar out of the box |
| Backend Integration | Python FastAPI sidecar **or** subprocess calls from Next.js API routes | Next.js `/app/api/` routes act as the BFF (Backend for Frontend); each route either shells out to `run_pipeline.py` or proxies to a local FastAPI server |
| Deployment | Vercel (frontend + API routes) + Railway/Render (Python backend) | Vercel for Next.js, Railway/Render for the Python FastAPI process |

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
  trendsUnlocked: boolean;    // daysLogged >= 30
  baselinesUnlocked: boolean; // daysLogged >= 30
  riskUnlocked: boolean;      // daysLogged >= 7

  // Meal log form (in-progress multi-section form state)
  mealFormData: Partial<MealFormState> | null;

  // Actions
  setProfile: (p: UserProfile) => void;
  appendMeal: (date: string, meal: MealEntry) => void;
  setSleep: (date: string, sleep: SleepOutput) => void;
  setDigestion: (date: string, digestion: DigestInput) => void;
  setMealFormData: (data: Partial<MealFormState>) => void;
  clearMealForm: () => void;
}
```

### Python Backend Integration Strategy

Next.js API routes communicate with the Python pipeline in one of two ways:

**Option A — FastAPI sidecar (recommended for production):**
- Python runs `uvicorn app:main --port 8000` as a separate process
- Next.js API routes proxy requests using `fetch("http://localhost:8000/...")`
- FastAPI handles all pipeline orchestration internally

**Option B — subprocess (simpler for local dev):**
- Each Next.js API route shells out: `python run_pipeline.py --mode <stage> --user <id> --input <json>`
- Output is captured from stdout as JSON

Each API route section below specifies the exact subprocess command or FastAPI endpoint it calls.

---

## Section 2: Layout

### Application Shell

```
Root Layout (app/layout.tsx)
└── AuthProvider (NextAuth.js SessionProvider)
    └── QueryProvider (TanStack Query QueryClientProvider)
        └── ZustandProvider (no wrapper needed — Zustand is global)
            └── AppShell
                ├── Sidebar (collapsible on mobile, persistent on desktop ≥ 1024px)
                │     ├── Logo + App name
                │     ├── Nav links (same tree as mobile app — see Section 2 nav tree)
                │     └── User avatar + name (bottom)
                └── MainContent (flex-1, scrollable)
                      └── page.tsx content (each route)
```

**Sidebar behavior:**
- Desktop (≥ 1024px): Always visible, 240px wide, fixed left
- Tablet/Mobile (< 1024px): Hidden by default, slides in over content via shadcn/ui `Sheet` component, triggered by hamburger button in top nav bar
- Active route is highlighted in sidebar with a colored left border accent

**Top bar (mobile only, < 1024px):**
- Hamburger icon (left) → opens sidebar Sheet
- Page title (center)
- Notification bell (right) — badge if risk flags exist

### Navigation Tree

```
Sidebar Nav
├── Dashboard              → /dashboard
├── Log Meal               → /meal/log
├── Log Sleep              → /sleep/log
├── History                → /history
│     └── Day Detail       → /history/[date]
├── Trends                 → /trends        [locked until day 30]
├── Baselines              → /baselines     [locked until day 30]
├── Risk Monitor           → /risk          [locked until day 7]
└── Profile                → /profile
```

**Locked nav items:** Rendered with `opacity-50` and a `Lock` icon from `lucide-react`. Clicking a locked item shows a shadcn/ui `Alert` toast: "Unlock after X more days of logging."

### Dashboard Layout

The Dashboard uses CSS Grid for metric cards:

```css
/* 2-col on tablet, 3-col on desktop, 1-col on mobile */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}
```

Each metric card is a shadcn/ui `Card` component.

---

## Section 3: Screen-by-Screen Specification

### 3.1 Dashboard

**File:** `app/dashboard/page.tsx`
**Component:** `DashboardPage` (server component for initial data fetch, client components for interactive widgets)
**Data fetching:** TanStack Query `useQuery` for each endpoint (client-side, after initial server render)

**API calls on mount:**
- `GET /api/daily-log/:today` — today's aggregated log
- `GET /api/profile` — user profile (for name display)
- `GET /api/risks` — active risk flag count (if daysLogged >= 7)

**Displayed data:**

| Widget | Source field | Format | shadcn/ui Component |
|--------|------------|--------|---------------------|
| Meal count today | `dailyLog.meals.length` | "2 meals logged" | `Card` + `CardContent` |
| Calorie total | `dailyLog.daily_totals.calories_kcal` | "1,420 kcal" | `Card` |
| Fiber total | `dailyLog.daily_totals.fiber_g` | "18.3g fiber" | `Card` |
| Latest mood | Last meal's `stage4.emoji_used` + `stage4.mood_label` | emoji + "happy" | `Card` with emoji display |
| Sleep score | `dailyLog.sleep.sleep_hours` | "7.2h" with debt indicator | `Card` + `Badge` |
| Gut health traffic light | `dailyLog.daily_gut.microbiome_diversity_index` | Green: MDI > 0.6, Yellow: 0.4–0.6, Red: < 0.4 | `Card` + colored `Badge` |
| Quick actions | — | "Log Meal" + "Log Sleep" | `Button` (primary/outline) |
| Days until trends | `30 - daysLogged` | "12 days until Trends unlock" (hidden if >= 30) | `Alert` (info variant) |
| Active risk flags | `riskOutput.risk_count` | Badge: "2 flags" (hidden if 0 or < 7 days) | `Badge` (destructive) |

**States:**
- **Loading:** shadcn/ui `Skeleton` components for each card
- **Empty (no meals today):** `Alert` with CTA: "Start your day! Log your first meal." + `Button` → `/meal/log`
- **Error:** `Alert` (destructive) with "Couldn't load today's data." + `Button` onClick refetch

---

### 3.2 Log Meal Flow (Single Scrollable Page with Anchored Sections)

**File:** `app/meal/log/page.tsx`
**Component:** `MealLogPage`

> Unlike the mobile wizard, this is a **single scrollable page** with all sections visible simultaneously, connected by anchor links. Each section becomes interactive only after the preceding section is completed (earlier sections remain editable). A sticky "Section completed" checkmark appears next to each completed anchor.

**Sticky section nav (top of page, scrolls with you):**
```
① Upload Photo  →  ② Review Foods  →  ③ Nutrition  →  ④ Digestion  →  ⑤ Mood  →  ⑥ Save
```
Each anchor is a `Button` variant="ghost" that scrolls to the section via `id` anchor.

---

#### Section A: Upload Photo (`#upload`)

**Component:** `MealUploadSection` (`components/meal/MealUploadSection.tsx`)
**Input:** Image file (JPEG/PNG) via react-dropzone

**UI:**
- `react-dropzone` drag-and-drop zone with dashed border, "Drop meal photo here or click to upload" label
- On file select: show thumbnail preview (next.js `Image` component with `objectFit: contain`)
- "Analyze Meal" `Button` (primary) triggers `POST /api/meals/log`
- Loading state: shadcn/ui `Progress` bar + "Identifying your meal..." text
- **No "camera" option** on web — file upload only

**On success:** Section B unlocks and scrolls into view automatically.

---

#### Section B: Review Foods (`#review`)

**Component:** `FoodReviewSection` (`components/meal/FoodReviewSection.tsx`)
**Displays Stage 1 output:**

| Field | Type | shadcn/ui Component |
|-------|------|---------------------|
| `food_items` | `string[]` | Editable `Badge` list; click badge → `Input` inline edit; `Button` variant="outline" size="sm" to add/remove |
| `en_pred` | `string` | Secondary text label (muted) |
| `confidence` | `number` (0.0–1.0) | shadcn/ui `Progress` component; if < 0.5 show `Alert` "Low confidence — please verify" |
| `source` | `string` | `Badge` variant based on source: "groq"=blue, "efficientnet"=green, "stub"=gray |

**User interactions:**
- **Confirm:** "Looks correct" `Button` → Section C unlocks
- **Edit:** Click any food badge → inline edit Input field
- **Add item:** "Add food" Button → appends new editable badge
- **Remove:** × icon on each badge removes it
- **Re-upload:** "Try another photo" link → resets to Section A

**Stage 2 nutrition is also returned by the same API call** — passed down to Section C.

---

#### Section C: Nutrition Breakdown (`#nutrition`)

**Component:** `NutritionBreakdownSection` (`components/meal/NutritionBreakdownSection.tsx`)
**Chart library:** Recharts

**Displays Stage 2 output as nutrient cards using CSS Grid (3-col desktop, 2-col tablet, 1-col mobile):**

| Nutrient | Field path | Unit | shadcn/ui Component |
|----------|-----------|------|---------------------|
| Calories | `stage2.totals.calories_kcal` | kcal | `Card` with large heading |
| Carbohydrates | `stage2.totals.carbs_g` | g | `Card` |
| Protein | `stage2.totals.protein_g` | g | `Card` |
| Fat | `stage2.totals.fat_g` | g | `Card` |
| Fiber | `stage2.totals.fiber_g` | g | `Card`; green border if > 8g |
| Glycemic Load | `stage2.totals.glycemic_load` | "low" \| "medium" \| "high" | `Badge` (green/yellow/red) |
| Tryptophan | `stage2.totals.tryptophan_mg` | mg | `Card` |
| Omega-3 | `stage2.totals.omega3_mg` | mg | `Card` |
| Iron | `stage2.totals.iron_mg` | mg | `Card` |
| Magnesium | `stage2.totals.magnesium_mg` | mg | `Card` |
| Vitamin B6 | `stage2.totals.b6_mg` | mg | `Card` |
| Vitamin B12 | `stage2.totals.b12_mcg` | µg | `Card`; `Alert` if 0 + vegetarian diet |
| Zinc | `stage2.totals.zinc_mg` | mg | `Card` |

**Per-item breakdown:** shadcn/ui `Accordion` — each food item expands to show `food_item`, `portion_g`, `source_db`.

**Recharts macro bar chart:** `BarChart` showing calories/carbs/protein/fat as colored bars side-by-side.

Section is read-only. "Continue" `Button` → Section D unlocks.

---

#### Section D: Digestion Report (`#digestion`)

**Component:** `DigestionReportSection` (`components/meal/DigestionReportSection.tsx`)
**Note:** Daily digestion report. Show `Alert` info: "This updates your daily digestion report for the entire day."

**Input fields:**

| Field | shadcn/ui Component | Values |
|-------|---------------------|--------|
| `bloating` | `Select` | none / mild / moderate / severe |
| `stool_quality` | Custom visual picker (7 icon buttons in a row) | Bristol Scale 1–7 with SVG icons; selected state uses ring highlight |
| `gas_discomfort` | `Select` | none / mild / moderate / severe |
| `digestion_quality` | `Select` | poor / fair / good / excellent |
| `fermented_food_today` | `Switch` | true / false |

**Bristol Scale icons** (simple SVG icons inline in the component):
- Type 1–2: Hard/lumpy (brown oval clusters)
- Type 3–4: Optimal sausage shapes (green border highlight when selected)
- Type 5–7: Soft/watery (yellow-orange warning tones)

**On "Submit Digestion" Button:**
- Calls `POST /api/digestion/submit` in background via TanStack Query `useMutation`
- Shows `Loader2` spinner from lucide-react
- Stage 3 results stored in Zustand for display in Section F
- Section E unlocks immediately without waiting for full response

---

#### Section E: Mood Check-In (`#mood`)

**Component:** `MoodCheckInSection` (`components/meal/MoodCheckInSection.tsx`)

**Input fields:**

| Field | shadcn/ui Component | Values |
|-------|---------------------|--------|
| `mood_emoji` | Horizontal `ToggleGroup` (single) | 7 emoji buttons: 😄 🙂 😐 😟 😔 😴 🤯 |
| `mood_rating` | `Slider` (min=1, max=10, step=1) | Integer 1–10; current value shown in `Badge` next to slider |
| `cognitive_state` | `Select` | sharp / clear / mild_fog / brain_fog / drowsy |
| `energy_level` | `Select` | very_low / low / moderate / high / very_high |
| `anxiety_level` | `Select` | none / mild / moderate / high |

**Emoji-to-score labels** displayed below the ToggleGroup:

| Emoji | Label |
|-------|-------|
| 😄 | Very Happy |
| 🙂 | Happy |
| 😐 | Neutral |
| 😟 | Worried |
| 😔 | Sad |
| 😴 | Sleepy |
| 🤯 | Overwhelmed |

**On "Submit Mood" Button:**
- Calls `POST /api/mood/submit` via TanStack Query `useMutation`
- Shows `Loader2` spinner
- Stage 4 & 5 results stored in Zustand for Section F
- Section F unlocks on success

---

#### Section F: Summary & Save (`#summary`)

**Component:** `MealSummarySection` (`components/meal/MealSummarySection.tsx`)

**Displays** a shadcn/ui `Card` with sub-sections:
- Food items + confidence `Badge`
- Top-line nutrition (calories, protein, carbs, fat, fiber) as a Recharts `RadialBarChart`
- Gut health: MDI traffic light `Badge`, IRS level, DSS score
- Mood: emoji + label + cognitive state + mood score
- Metabolic: glucose spike level + crash probability + late meal flag
- Digestion summary (bloating, stool quality)

**Meal ID picker** (override before save):
```tsx
<Select>
  <SelectItem value="breakfast">Breakfast</SelectItem>
  <SelectItem value="lunch">Lunch</SelectItem>
  <SelectItem value="dinner">Dinner</SelectItem>
  <SelectItem value="snack">Snack</SelectItem>
</Select>
```
Default is auto-inferred from current time (before 11→breakfast, 11–15→lunch, 15–19→snack, 19+→dinner).

**"Save Meal Log" Button (primary, full-width on mobile):**
1. Calls `POST /api/meals/save` via TanStack Query `useMutation`
2. On success: show `toast` ("Meal saved!") via shadcn/ui `Sonner`
3. Invalidate TanStack Query cache for `/api/daily-log/:today`
4. `router.push("/dashboard")`

---

### 3.3 Log Sleep

**File:** `app/sleep/log/page.tsx`
**Component:** `SleepLogPage`
**API call on save:** `POST /api/sleep/log`

**Input fields:**

| Field | shadcn/ui Component | Type/Range |
|-------|---------------------|-----------|
| `sleep_onset` | `Input` type="time" | "HH:MM" format |
| `wake_time` | `Input` type="time" | "HH:MM" format |
| `sleep_quality` | `Select` | poor / fair / good / excellent |
| `night_awakenings` | `Input` type="number" min=0 max=10 | Integer |
| `caffeine_after_14h` | `Switch` | boolean |
| `screen_before_bed_min` | `Slider` min=0 max=180 step=5 | Integer (minutes); value shown in `Badge` |

**On save response, display Stage 6 results** in a results `Card` below the form:

| Metric | Field | shadcn/ui Component |
|--------|-------|---------------------|
| Sleep duration | `sleep_hours` | Stat display: "6.75 hours" |
| Sleep debt | `sleep_debt` | `Badge` green if 0, red if > 2 |
| Weekly cumulative debt | `cumulative_debt_7d` | Text: "4.25h this week" |
| Circadian Regularity Index | `circadian_regularity_index` | Recharts `RadialBarChart` (0.0–1.0); green > 0.7, yellow 0.5–0.7, red < 0.5 |
| Neurological Stress Proxy | `neurological_stress_proxy` | Recharts `RadialBarChart`; green < 0.5, yellow 0.5–0.7, red > 0.7 |
| Sleep Stability | `sleep_stability` | `Badge` |

**Warning:** If sleep already logged today, show shadcn/ui `AlertDialog` before saving: "You've already logged sleep today. This will overwrite your previous entry."

---

### 3.4 History

#### Calendar View

**File:** `app/history/page.tsx`
**Component:** `HistoryPage`
**shadcn/ui Component:** `Calendar` (from `@/components/ui/calendar`) — customized to color each day

**API call:** `GET /api/history?from=YYYY-MM-DD&to=YYYY-MM-DD` (load current month)

**Calendar coloring logic** (computed client-side from daily log data):

```
compositeScore = (normalizedMood + normalizedSleep + normalizedGut) / 3

where:
  normalizedMood  = (avg_mood_score + 2) / 4     // maps [-2,+2] → [0,1]
  normalizedSleep = min(sleep_hours / 8, 1.0)     // 8h = perfect
  normalizedGut   = microbiome_diversity_index     // already [0,1]

Day cell className:
  compositeScore > 0.7  → bg-green-100 text-green-800
  compositeScore 0.4–0.7 → bg-yellow-100 text-yellow-800
  compositeScore < 0.4  → bg-red-100 text-red-800
  No data → default (gray)
```

Click a day → `router.push("/history/" + date)`

#### Day Drill-Down

**File:** `app/history/[date]/page.tsx`
**Component:** `DayDetailPage`
**API call:** `GET /api/daily-log/:date`

**Sections displayed using shadcn/ui `Accordion` for each meal, `Card` for each aggregate block:**

1. **Header:** Date, overall day quality `Badge`, diet_type
2. **Meals list** (shadcn/ui `Accordion`, one item per meal):
   - `meal_id` + `meal_time`
   - Food items (`stage1.food_items`) + confidence `Badge`
   - Nutrition summary (`stage2.totals`) as compact inline badges
   - Mood: emoji + label + cognitive state + energy level
   - Metabolic: glucose spike level + crash probability + late meal flag
3. **Daily Totals:** All 13 nutrients as a Recharts `BarChart`
4. **Digestion Report:** bloating, stool quality, gas, fermented food — `Card` with icon grid
5. **Gut Health:** MDI, IRS (with risk level `Badge`), DSS, SCFA proxy — `Card` grid
6. **Mood Summary:** avg/min/max mood score (Recharts `AreaChart`), dominant cognitive state `Badge`
7. **Sleep:** hours, debt, CRI, neuro stress (two `RadialBarChart` side by side), stability, awakenings

---

### 3.5 My Trends (Locked Until Day 30)

**File:** `app/trends/page.tsx`
**Component:** `TrendsPage`
**API call:** `GET /api/trends`
**Lock condition:** `daysLogged < 30` → full page locked state

**Locked state:** Large centered `Card` with `Lock` icon, "Your personalized trends unlock after 30 days of logging. You've logged {daysLogged} days so far. Keep going!" + `Progress` bar showing `daysLogged / 30 * 100`%

**When unlocked, display Stage 7 output using Recharts:**

**Correlation Visualizations (each in its own `Card`):**

| Chart | X-axis source | Y-axis source | Recharts Component |
|-------|--------------|--------------|-------------------|
| GL ↔ Mood | `glycemic_load` (low=0, medium=1, high=2) | `mood_score` | `ScatterChart` |
| Fiber ↔ MDI | `fiber_g` (1-day lag) | `microbiome_diversity_index` | `ComposedChart` (dual `YAxis`) |
| Late meals ↔ Sleep | `late_meal` (boolean→bar groups) | `sleep_quality` (poor=1..excellent=4) | `BarChart` (grouped) |
| Tryptophan ↔ Next-day mood | `tryptophan_mg` (1-day lag) | `mood_score` | `ScatterChart` |
| Sleep debt ↔ Cognitive | `cumulative_sleep_debt` | `cognitive_penalty` | `LineChart` |
| Fermented food ↔ Digestion | `fermented_food_consumed` (boolean→groups) | `digestion_stability_score` | `BarChart` |
| Sugar ↔ Inflammation | `carbohydrates_g` | `inflammation_risk_score` | `ScatterChart` |

**For each correlation, display below chart:**
- Pearson r value and p-value as `Badge` pair
- "Significant" `Badge` (green) if `|r| > 0.3 AND p < 0.05`
- Direction arrow icon (↑↓) matching expected direction

**Anomaly timeline:** Recharts `ReferenceLine` markers on a date `LineChart`; each anomaly shown in a `Tooltip` with metric, z_score, value vs rolling_mean.

**Groq summary:** shadcn/ui `Card` with italic styled body text.

**Trend indicators:** `fiber_trend` and `mdi_trend` as `Badge` with arrow icon.

**Pattern confidence:** `Badge` ("high"=green, "moderate"=yellow, "low"=red).

---

### 3.6 My Baselines (Locked Until Day 30)

**File:** `app/baselines/page.tsx`
**Component:** `BaselinesPage`
**API call:** `GET /api/baselines`
**Lock condition:** `daysLogged < 30`

**Locked state:** Same lock UI pattern as Trends.

**When unlocked, display Stage 8 output:**

**Radar/Spider chart** using Recharts `RadarChart` with 8 axes:

| Metric | Field | Normal Range |
|--------|-------|-------------|
| Mood | `baseline_mood` | 5.0–7.5 |
| Sleep | `baseline_sleep_hours` | 7.0–9.0 |
| Glucose Spike | `baseline_glucose_spike` | "mild"=good, "high"=bad |
| Digestion Stability | `baseline_digestion_stability` | > 0.6 = stable |
| Microbiome Diversity | `baseline_MDI` | > 0.5 = adequate |
| Inflammation Risk | `baseline_inflammation_risk` | < 0.4 = low risk |
| Cognitive Score | `baseline_cognitive_score` | > 5.0 = normal |
| Neurological Stress | `baseline_neuro_stress` | < 0.5 = low |

**Below the radar chart, a 2-col card grid for each metric:**
- Metric name + current baseline value
- `stability_details[metric].cv_percent` and `stability_details[metric].stable`
- `Badge`: green "Stable" (CV < 15%) or yellow "Collecting data" with CV%

**Banner:** `all_baselines_stable` → green `Alert`; else blue `Alert` info variant.
**Period:** "`baseline_period_days` days of data" as muted text below the chart.

---

### 3.7 Risk Monitor (Locked Until Day 7)

**File:** `app/risk/page.tsx`
**Component:** `RiskMonitorPage`
**API call:** `GET /api/risks`
**Lock condition:** `daysLogged < 7`

**Locked state:** Lock UI with 7-day threshold progress.

**Overall risk level `Badge` (full-width banner at top):**

| Level | `neurological_risk_level` | shadcn/ui variant | Description |
|-------|--------------------------|-------------------|-------------|
| None | `"none"` (0 flags) | success / green | "All clear" |
| Mild | `"mild"` (1–2 flags) | warning / yellow | "Minor patterns detected" |
| Moderate | `"moderate"` (3–4 flags) | warning / orange | "Multiple risk patterns" |
| Elevated | `"elevated"` (5+ flags) | destructive / red | "Significant patterns — see below" |

**Active flag cards** (one `Card` per flag in `active_flags[]`):

| Flag ID | Display Name | Severity `Badge` | Evidence description |
|---------|-------------|------------------|---------------------|
| `persistent_brain_fog` | Persistent Brain Fog | Moderate | "Brain fog reported on 5+ of last 7 days" |
| `chronic_sleep_debt` | Chronic Sleep Debt | High | "Cumulative sleep debt > 10h for 2+ consecutive weeks" |
| `mood_instability` | Mood Instability | Moderate | "Mood score variability (std dev > 2.5) sustained 14+ days" |
| `metabolic_dysregulation` | Metabolic Dysregulation | High | "High glucose spikes on 60%+ of meals over 14+ days" |
| `inflammation_persistence` | Chronic Inflammation | Moderate | "Inflammation risk score > 0.6 for 14+ consecutive days" |
| `circadian_disruption` | Circadian Disruption | Moderate | "Circadian regularity < 0.4 for 14+ days" |
| `combined_neuro_stress` | Elevated Neurological Stress | High | "Neuro stress proxy > 0.7 for 7+ consecutive days" |
| `b12_deficiency_signal` | B12 Deficiency Signal | Moderate | "Vegetarian diet + cognitive decline trend over 21+ days" |

**Recommendation text:** `Card` with `recommendation` field body.

**Professional consult banner:** If `professional_consult_suggested === true`, shadcn/ui `Alert` (info, not destructive): "Based on your patterns, you may benefit from discussing these observations with a healthcare provider."

**Disclaimer (MANDATORY — sticky at bottom of page):**
> "All observations are informational only. This is NOT medical advice and should NOT be used for diagnosis. Always consult a qualified healthcare professional for medical concerns."

---

### 3.8 Profile

**File:** `app/profile/page.tsx`
**Component:** `ProfilePage`
**API calls:** TanStack Query `useQuery` for `GET /api/profile` on mount; `useMutation` for `PUT /api/profile` on save

**Input fields:**

| Field | shadcn/ui Component | Type | Validation |
|-------|---------------------|------|-----------|
| `age` | `Input` type="number" | integer | Required, > 0 |
| `sex` | `Select` | "male" \| "female" | Required |
| `height_cm` | `Input` type="number" step="0.1" | float | Required, > 0 |
| `weight_kg` | `Input` type="number" step="0.1" | float | Required, > 0 |
| `diet_type` | `Select` | "vegetarian" \| "non-vegetarian" \| "vegan" | Required |
| `activity_level` | `Select` | "sedentary" \| "light" \| "moderate" \| "heavy" | Required |
| `sleep_schedule` | `Input` type="text" placeholder="23:00-06:30" | string | Required |
| `known_conditions` | Tag input (custom, or `react-tag-input`) | string[] | Optional |
| `supplements` | Tag input | string[] | Optional |
| `medications` | Tag input | string[] | Optional |

**Computed fields (read-only `Card` below the form, updates live as user types):**
- BMR: `"BMR: 1,658 kcal/day"` — computed client-side with Mifflin-St Jeor
- TDEE: `"TDEE: 2,571 kcal/day"` — BMR × activity_multiplier
- Activity multiplier shown next to activity level `Select`

**BMR formula for live client-side preview:**
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

**Save button:** `PUT /api/profile` via `useMutation`; success shows `toast` via Sonner.

---

## Section 4: API Routes (Next.js App Router)

All routes live under `app/api/`. Each route is a TypeScript file at `app/api/<path>/route.ts`. They act as a BFF layer over the Python backend.

**Python backend call convention:**

```typescript
// Option A: FastAPI sidecar proxy (recommended)
const res = await fetch(`http://localhost:8000${pythonPath}`, {
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
return Response.json(await res.json(), { status: res.status });

// Option B: subprocess fallback
import { execFile } from "child_process";
// execFile("python", ["run_pipeline.py", "--mode", mode, "--input", JSON.stringify(payload)])
```

---

### Authentication

#### `POST /api/auth/register` → `app/api/auth/register/route.ts`

Creates a new user profile (runs Stage 0).

**Python backend call:**
- FastAPI: `POST http://localhost:8000/api/auth/register`
- Subprocess: `python run_pipeline.py --mode register --input <json>`

**Request:**
```typescript
// Content-Type: application/json
{
  user_id: string;
  age: number;
  sex: "male" | "female";
  height_cm: number;
  weight_kg: number;
  diet_type: "vegetarian" | "non-vegetarian" | "vegan";
  activity_level: "sedentary" | "light" | "moderate" | "heavy";
  sleep_schedule: string;
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
  bmr_kcal: number;
  tdee_kcal: number;
  activity_multiplier: number;
  baseline_established: true;
  timestamp: string;
}
```

**Error `400`:** `{ errors: string[] }`

---

#### `POST /api/auth/login` → `app/api/auth/login/route.ts`

Placeholder. Returns profile if user_id exists.

**Python backend call:**
- FastAPI: `POST http://localhost:8000/api/auth/login`
- Subprocess: `python run_pipeline.py --mode login --user <user_id>`

**Request:** `{ user_id: string }`
**Response `200`:** Full `UserProfile` object
**Error `404`:** `{ error: "User not found" }`

---

### Meal Logging

#### `POST /api/meals/log` → `app/api/meals/log/route.ts`

Upload a meal image. Runs Stage 1 (food identification) and Stage 2 (nutrition lookup).

**Python backend call:**
- FastAPI: `POST http://localhost:8000/api/meals/log` (multipart)
- Subprocess: `python run_pipeline.py --mode meal_log --user <id> --image <tmp_path>`
- The route saves the uploaded file to a temp path, passes it to Python, then cleans up.

**Request:**
```typescript
// Content-Type: multipart/form-data
{
  image: File;      // JPEG or PNG, max 10MB
  user_id: string;
}
```

**Response `200`:**
```typescript
{
  stage1: {
    food_items: string[];
    en_pred: string;
    confidence: number;
    source: "groq" | "efficientnet" | "stub";
    timestamp: string;
  };
  stage2: {
    items: Array<{
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
    }>;
    totals: {
      calories_kcal: number;
      carbohydrates_g: number;
      protein_g: number;
      fat_g: number;
      fiber_g: number;
      glycemic_load: "low" | "medium" | "high";
      tryptophan_mg: number;
      omega3_mg: number;
      iron_mg: number;
      magnesium_mg: number;
      vitamin_b6_mg: number;
      vitamin_b12_ug: number;
      zinc_mg: number;
    };
    timestamp: string;
  };
}
```

**Error `400`:** `{ errors: ["food_items must not be empty"] }`
**Error `500`:** `{ error: "Image processing failed" }`

---

#### `POST /api/digestion/submit` → `app/api/digestion/submit/route.ts`

Submit daily digestion report and run Stage 3 (Gut Proxy) silently.

**Python backend call:**
- FastAPI: `POST http://localhost:8000/api/digestion/submit`
- Subprocess: `python run_pipeline.py --mode digestion --user <id> --input <json>`

**Request:**
```typescript
{
  user_id: string;
  date: string;
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
    microbiome_diversity_index: number;
    inflammation_risk_score: number;
    inflammation_risk_level: "low" | "moderate" | "high";
    digestion_stability_score: number;
    scfa_production_proxy: "low" | "moderate" | "high";
    fiber_intake_today_g: number;
    fermented_food_consumed: boolean;
    timestamp: string;
  };
}
```

**Error `400`:** `{ errors: string[] }`

---

#### `POST /api/mood/submit` → `app/api/mood/submit/route.ts`

Submit mood + cognitive self-report and run Stages 4 & 5 silently.

**Python backend call:**
- FastAPI: `POST http://localhost:8000/api/mood/submit`
- Subprocess: `python run_pipeline.py --mode mood --user <id> --input <json>`

**Request:**
```typescript
{
  user_id: string;
  date: string;
  meal_timestamp: string;
  stage2_totals: NutritionTotals;
  stage0_profile: {
    bmr_kcal: number;
    tdee_kcal: number;
    activity_level: string;
  };
  mood_input: {
    mood_emoji: "😄" | "🙂" | "😐" | "😟" | "😔" | "😴" | "🤯";
    mood_rating: number;
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
    mood_score: number;
    mood_label: "very_happy" | "happy" | "neutral" | "worried" | "sad" | "sleepy" | "overwhelmed";
    cognitive_state: string;
    cognitive_penalty: number;
    energy_level: string;
    anxiety_level: string;
    tryptophan_context_mg: number;
    hours_since_meal: number;
    timestamp: string;
  };
  stage5: {
    estimated_glucose_spike: "mild" | "moderate" | "high";
    spike_delta_mg_dl: number;
    fiber_attenuation_factor: number;
    energy_crash_probability: number;
    late_meal_penalty_applied: boolean;
    insulin_demand_proxy: "low" | "moderate" | "high";
    timestamp: string;
  };
}
```

**Error `400`:** `{ errors: string[] }`

---

#### `POST /api/meals/save` → `app/api/meals/save/route.ts`

Persist the fully-assembled meal entry (all stages already computed).

**Python backend call:**
- FastAPI: `POST http://localhost:8000/api/meals/save`
- Subprocess: `python run_pipeline.py --mode meal_save --user <id> --input <json>`

**Request:**
```typescript
{
  user_id: string;
  date: string;
  meal_id?: "breakfast" | "lunch" | "dinner" | "snack";
  meal_data: {
    stage1: { food_items: string[]; en_pred: string; confidence: number; source: string; timestamp: string; };
    stage2: { items: NutritionRecord[]; totals: NutritionTotals; };
    stage4: { mood_score: number; mood_label: string; cognitive_state: string; cognitive_penalty: number; energy_level: string; anxiety_level: string; emoji_used: string; tryptophan_context_mg: number; hours_since_meal: number; timestamp: string; };
    stage5: { estimated_glucose_spike: string; spike_delta_mg_dl: number; fiber_attenuation_factor: number; energy_crash_probability: number; late_meal_penalty_applied: boolean; insulin_demand_proxy: string; timestamp: string; };
  };
}
```

**Response `200`:**
```typescript
{
  meal_id: string;
  meal_count: number;
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

**Error `400`:** Validation errors
**Error `404`:** `{ error: "User not found" }`

---

### Sleep Logging

#### `POST /api/sleep/log` → `app/api/sleep/log/route.ts`

Save sleep data and run Stage 6.

**Python backend call:**
- FastAPI: `POST http://localhost:8000/api/sleep/log`
- Subprocess: `python run_pipeline.py --mode sleep --user <id> --input <json>`

**Request:**
```typescript
{
  user_id: string;
  date: string;
  sleep_input: {
    sleep_onset: string;
    wake_time: string;
    sleep_quality: "poor" | "fair" | "good" | "excellent";
    night_awakenings: number;
    caffeine_after_14h: boolean;
    screen_before_bed_min: number;
    last_meal_to_bed_hours?: number;
  };
}
```

**Response `200`:**
```typescript
{
  sleep_hours: number;
  sleep_debt: number;
  cumulative_debt_7d: number;
  circadian_regularity_index: number;
  neurological_stress_proxy: number;
  sleep_stability: "low" | "moderate" | "high";
  timestamp: string;
}
```

**Error `400`:** `{ errors: string[] }`

---

### Data Retrieval

#### `GET /api/daily-log/[date]` → `app/api/daily-log/[date]/route.ts`

**Python backend call:**
- FastAPI: `GET http://localhost:8000/api/daily-log/{date}?user_id={id}`
- Subprocess: `python run_pipeline.py --mode get_log --user <id> --date <date>`

**URL params:** `date` — `"YYYY-MM-DD"`
**Response `200`:** Complete `DailyLog` object (always returns scaffold, never 404)

---

#### `GET /api/history` → `app/api/history/route.ts`

**Python backend call:**
- FastAPI: `GET http://localhost:8000/api/history?user_id={id}&from={from}&to={to}`
- Subprocess: `python run_pipeline.py --mode history --user <id> --from <date> --to <date>`

**Query params:** `from`, `to` (YYYY-MM-DD), `user_id`
**Response `200`:** `{ logs: DailyLog[]; count: number; }`

---

#### `GET /api/trends` → `app/api/trends/route.ts`

**Python backend call:**
- FastAPI: `GET http://localhost:8000/api/trends?user_id={id}`
- Subprocess: `python run_pipeline.py --mode trends --user <id>`

**Response `200`:** Full `TrendsOutput` object
**Error `404`:** `{ error: "Trends require 30+ days of data", days_logged: number }`

---

#### `GET /api/baselines` → `app/api/baselines/route.ts`

**Python backend call:**
- FastAPI: `GET http://localhost:8000/api/baselines?user_id={id}`
- Subprocess: `python run_pipeline.py --mode baselines --user <id>`

**Response `200`:** Full `BaselinesOutput` object
**Error `404`:** `{ error: "Baselines require 30+ days of data", days_logged: number }`

---

#### `GET /api/risks` → `app/api/risks/route.ts`

**Python backend call:**
- FastAPI: `GET http://localhost:8000/api/risks?user_id={id}`
- Subprocess: `python run_pipeline.py --mode risks --user <id>`

**Response `200`:** Full `RiskOutput` object
**Error `404`:** `{ error: "Risk analysis requires 7+ days of data", days_logged: number }`

---

#### `GET /api/insights` → `app/api/insights/route.ts`

**Python backend call:**
- FastAPI: `GET http://localhost:8000/api/insights?user_id={id}`
- Subprocess: `python run_pipeline.py --mode insights --user <id>`

**Response `200`:** Full `InsightsOutput` object

---

### Profile Management

#### `GET /api/profile` → `app/api/profile/route.ts` (GET handler)

**Python backend call:** `GET http://localhost:8000/api/profile?user_id={id}`

**Response `200`:** Full `UserProfile` object
**Error `404`:** `{ error: "User not found" }`

#### `PUT /api/profile` → `app/api/profile/route.ts` (PUT handler)

**Python backend call:** `PUT http://localhost:8000/api/profile`

**Request:** Same body as `POST /api/auth/register`
**Response `200`:** Updated `UserProfile` with recalculated BMR/TDEE
**Error `400`:** Validation errors

---

## Section 5: Data Models (TypeScript)

These interfaces are direct translations from `utils/daily_log_schema.py`, `stage0/profile.py`, and each stage's output TypedDicts. They are shared between Next.js API routes and client components — place them in `lib/types.ts`.

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

// ─── Meal Log Form State (web-specific) ──────────────────────────────

interface MealFormState {
  imageFile: File | null;
  imagePreviewUrl: string | null;
  stage1: Stage1Output | null;
  stage2: Stage2Output | null;
  stage3: Stage3Output | null;
  stage4: Stage4Output | null;
  stage5: Stage5Output | null;
  digestionInput: DigestInput | null;
  moodInput: MoodInput | null;
  mealIdOverride: "breakfast" | "lunch" | "dinner" | "snack" | null;
  completedSections: Set<"upload" | "review" | "nutrition" | "digestion" | "mood">;
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
3. **Meal ID is auto-inferred** from time of day (before 11→breakfast, 11–15→lunch, 15–19→snack, 19+→dinner) but the user can override via the Section F `Select`.
4. **`daily_totals` are recomputed** every time a meal is appended. The server sums all 12 numeric nutrients across all meals and takes the worst `glycemic_load`.
5. **`daily_mood_summary` is recomputed** every time a meal is appended: avg/min/max mood_score and dominant cognitive state across all meals.
6. **Form state persists in Zustand** (`mealFormData`) — if the user navigates away mid-form and returns, earlier sections are still filled in.

### Digestion Logging Rules

1. **Once per day.** Digestion is a daily-level input, not per-meal.
2. **Stage 3 runs immediately after digestion submission** (Section D "Submit Digestion"). It requires `daily_totals` (from meals already logged) + the digestion report. The call is `POST /api/digestion/submit`.
3. **If digestion is resubmitted**, the existing digestion section is overwritten and Stage 3 is re-run with updated `daily_totals`.
4. **In the Meal Log page**, Section D should note: "This is your daily digestion report and affects your gut health scores for the entire day."

### Mood & Metabolic Processing Rules

1. **Stages 4 & 5 run immediately after mood submission** (Section E "Submit Mood"). The call is `POST /api/mood/submit`.
2. **Stage 4** (Mood) maps emoji → score, applies cognitive penalty, links tryptophan context from Stage 2.
3. **Stage 5** (Metabolic) estimates glucose spike, fiber attenuation, energy crash probability, and applies late-meal penalty if `meal_time >= 21:00`.
4. The results from both stages are returned to the client and displayed in Section F summary before final save.

### Sleep Logging Rules

1. **Once per day.** If sleep is logged again for the same date, it overwrites the previous entry.
2. **Warn before overwrite:** If `dailyLog.sleep.sleep_hours > 0`, show shadcn/ui `AlertDialog` before proceeding.
3. **Sleep history** (last 7 days) is loaded server-side to compute cumulative debt and CRI.
4. **`last_meal_to_bed_hours`** should be computed client-side from the last meal's `meal_time` and `sleep_onset`, or defaulted to 3.0.

### Feature Unlock Rules

| Feature | Days Required | Check |
|---------|--------------|-------|
| Trends (Stage 7) | 30 | `daysLogged >= 30` |
| Baselines (Stage 8) | 30 | `daysLogged >= 30` |
| Risk Monitor (Stage 9) | 7 | `daysLogged >= 7` |
| Insights (Stage 10) | 1 (always available) | Any data present |

Locked pages show a full-page `Card` with `Lock` icon, progress bar, and countdown. Do not redirect — render the lock UI at the same URL.

### Disclaimer Rules

1. **ALL stage outputs are informational, never diagnostic. No clinical claims anywhere.**
2. **Mandatory disclaimer** on Risk Monitor page and Insights page:
   > "Informational only. Not medical advice."
3. If `professional_consult_suggested === true` (risk level "elevated" with 5+ flags), show an additional shadcn/ui `Alert` (info, not destructive) with the professional consult suggestion.

### Stage 2 Nutrient Key Naming Differences

The frontend must be aware that Stage 2 per-item output uses different field names than the daily_totals schema:

| Stage 2 per-item field | DailyTotals field |
|----------------------|------------------|
| `carbohydrates_g` | `carbs_g` |
| `vitamin_b6_mg` | `b6_mg` |
| `vitamin_b12_ug` | `b12_mcg` |

Normalize these in `lib/utils.ts` with a helper function. Handle both naming conventions defensively.

---

## Section 7: Browser Notifications & UX Cues

Web push notifications are not implemented in v1. Instead, use **in-app prompts** via shadcn/ui `Toast` (Sonner) and a persistent **notification bell** in the top bar.

| Trigger | Timing | In-App Prompt | Condition |
|---------|--------|---------------|-----------|
| Post-meal mood prompt | On Dashboard load if meal logged but mood not yet filled | `Toast` with link to `/meal/log#mood`: "Don't forget your mood check-in for your last meal." | Only if last meal has no Stage 4 data |
| Sleep reminder | Dashboard load after 21:00 if no sleep logged today | `Toast`: "Log last night's sleep to keep your data complete." | Only if no sleep logged today |
| Day 7 milestone | Dashboard load on day 7 | `Alert` banner (dismissible): "Risk Monitor unlocked! Check your patterns." | Once, stored in localStorage to prevent repeat |
| Day 30 milestone | Dashboard load on day 30 | `Alert` banner (dismissible): "Trends & Baselines are ready! 30 days of data analyzed." | Once, stored in localStorage |
| Meal logging reminder | Dashboard load after 12:00 if no meals today | `Alert` info (dismissible): "You haven't logged any meals today." + Button "Log Meal" | Only if 0 meals today, after noon |

**Implementation notes:**
- Use Sonner `toast()` for transient messages (3s auto-dismiss).
- Use shadcn/ui `Alert` with dismiss button (`X` icon) for milestone banners.
- Store dismissed milestone flags in `localStorage` with keys `gutsense_day7_banner_dismissed` and `gutsense_day30_banner_dismissed`.
- All prompts are computed client-side from Zustand state on Dashboard mount.
