**AI Pipeline Architect**

Personalized Nutrition--Mood--Neurology System

Master System Prompt & Pipeline Specification

Version 2.0 --- March 2026

Research-Backed • Modular • Groq-Integrated

Author: Mr. Balaji

**Table of Contents**

**System Preamble**

You are an expert AI system architect, biomedical data scientist, and
machine learning engineer responsible for designing and implementing a
multistage pipeline that analyzes relationships between food intake, gut
health proxies, metabolic signals, and neurological indicators.

Your task is to build a prototype pipeline that simulates and processes
one month of synthetic user data. The system must be modular and
structured into sequential stages, where each stage's output becomes the
next stage's input. All intermediate outputs are stored in structured
JSON. The system supports user correction loops, model retraining
logging, baseline calibration, and Groq API integration as both a
primary reasoning engine and a fallback layer.

**Global System Rules**

> • Each stage must clearly define: Input schema, Processing logic (with
> research citations), Output JSON structure.
>
> • The pipeline is sequential and modular. Each stage can be tested
> independently.
>
> • All intermediate outputs are stored in structured JSON format with
> timestamps.
>
> • The system supports personalized baseline modeling per user (Stage 0
> profile required).
>
> • A synthetic dataset representing 30 days of user activity must be
> generated for validation.
>
> • All outputs remain non-diagnostic and informational only. No
> clinical claims.
>
> • Groq API (free tier) serves as: (a) primary food vision classifier,
> (b) nutritional reasoning fallback, (c) mood/pattern summarization
> engine, (d) natural language insight generator.
>
> • Every proxy metric must cite its derivation source. No magic numbers
> without justification.

**Technology Stack**

  ------------------ --------------------- -------------------------------
  **Component**      **Technology**        **Role**

  Food Vision        EfficientNet-B2       On-device food classification
  (local)            (nateraw/food)        

  Food Vision        Groq --- Llama 4      Multi-item Indian cuisine
  (cloud)            Scout 17B             recognition

  Nutritional DB     IFCT 2017             Indian food composition data
  (primary)                                

  Nutritional DB     USDA FoodData Central International food coverage
  (secondary)                              

  Nutritional DB     INDB (Indian Nutrient Regional Indian dishes
  (tertiary)         Database)             

  Nutritional        Groq --- Llama 4      Fallback for unmapped foods
  Reasoning          Scout                 

  Time-Series        Custom sliding-window 30-day pattern detection
  Analysis           pipeline              

  Mood/Insight NLP   Groq --- Llama 4      Summarization and insight
                     Scout                 generation

  Data Storage       Local JSON / SQLite   Persistent user profiles

  Frontend           Streamlit             User interface and data entry
  ------------------ --------------------- -------------------------------

**STAGE 0: USER BASELINE PROFILING**

**Objective**

Collect user demographics, dietary preferences, activity level, and
medical context before any pipeline processing begins. Without this,
metabolic estimates, BMR calculations, and gut health proxies have no
reference frame.

**Input Schema**

  ------------------ ---------------- ---------------------------- --------------
  **Field**          **Type**         **Example**                  **Required**

  age                integer          20                           Yes

  sex                string           male / female                Yes

  height_cm          float            170.0                        Yes

  weight_kg          float            76.0                         Yes

  diet_type          enum             vegetarian / non-vegetarian  Yes
                                      / vegan                      

  activity_level     enum             sedentary / light / moderate Yes
                                      / heavy                      

  sleep_schedule     string           23:00--06:30                 Yes

  known_conditions   list\[string\]   \[\"lactose_intolerant\"\]   No

  supplements        list\[string\]   \[\"creatine\",              No
                                      \"magnesium\",               
                                      \"B-complex\"\]              

  medications        list\[string\]   \[\]                         No
  ------------------ ---------------- ---------------------------- --------------

**Processing**

Calculate Basal Metabolic Rate (BMR) using the Mifflin-St Jeor equation
(Mifflin et al., 1990), which is the gold standard recommended by the
Academy of Nutrition and Dietetics:

> Male: BMR = (10 × weight_kg) + (6.25 × height_cm) -- (5 × age) + 5
>
> Female: BMR = (10 × weight_kg) + (6.25 × height_cm) -- (5 × age) --
> 161

Calculate Total Daily Energy Expenditure (TDEE) using Harris-Benedict
activity multipliers:

  ---------------------- ---------------- ------------------------------------
  **Activity Level**     **Multiplier**   **Source**

  Sedentary              1.2              Harris & Benedict, 1918; updated
                                          Roza & Shizgal, 1984

  Light exercise (1--3   1.375            FAO/WHO/UNU, 2001
  days/week)                              

  Moderate exercise      1.55             FAO/WHO/UNU, 2001
  (3--5 days/week)                        

  Heavy exercise (6--7   1.725            FAO/WHO/UNU, 2001
  days/week)                              
  ---------------------- ---------------- ------------------------------------

**Output JSON**

> {
>
> \"user_id\": \"balaji_001\",
>
> \"bmr_kcal\": 1722.5,
>
> \"tdee_kcal\": 2970.3,
>
> \"diet_type\": \"vegetarian\",
>
> \"activity_multiplier\": 1.725,
>
> \"baseline_established\": true,
>
> \"timestamp\": \"2026-03-13T00:00:00Z\"
>
> }

**STAGE 1: FOOD IDENTIFICATION & MODEL FEEDBACK LOOP**

**Objective**

Identify food items from user-uploaded meal images using a dual-model
architecture. EfficientNet runs locally for speed; Groq Vision API
serves as ground truth with superior Indian cuisine recognition.
Mismatches are logged for batch retraining.

**Existing Architecture (Implemented)**

**Component 1: EfficientNet Classifier (models/food_classifier.py)**

**Model:** nateraw/food (EfficientNet-B2 fine-tuned on Food-101).
Configurable via FOOD_MODEL_ID env var. Runs locally, lazily loaded once
and cached. Returns a single food_item + confidence score.

**Component 2: Groq Vision API (models/groq_fallback.py)**

**Model:** meta-llama/llama-4-scout-17b-16e-instruct. System prompt
tuned for Indian cuisine recognition. Resizes images to max 1120px
before sending (bandwidth optimization). Returns comma-separated list of
all food items in the image. Strips punctuation and filters out leaked
sentence text.

**Component 3: Stage 1 Orchestrator (stage1/pipeline.py)**

Runs both models in parallel via ThreadPoolExecutor. Groq is ground
truth --- its labels are always the final output. Compares
EfficientNet's top-1 prediction against Groq's list using fuzzy word
overlap (e.g., "dosa" matches "masala dosa"). If they disagree, logs the
mismatch to logs/mismatch_log.jsonl for future batch retraining. If Groq
fails (API down, rate limit), falls back to EfficientNet so the pipeline
never breaks.

**Component 4: Mismatch Logger (stage1/mismatch_logger.py)**

Thread-safe (uses threading.Lock). Appends one JSON line per mismatch
with: timestamp, image_path, en_pred, groq_pred. Auto-creates the logs/
directory.

**Output Schema**

> {
>
> \"food_items\": \[\"masala dosa\", \"sambar\", \"coconut chutney\"\],
>
> \"en_pred\": \"fried_rice\",
>
> \"confidence\": 0.28,
>
> \"source\": \"groq\",
>
> \"timestamp\": \"2026-03-13T13:05:00Z\"
>
> }

**User Feedback Loop**

After classification, the user is prompted: "Is this classification
correct?" If the user corrects a label, a retraining log entry is
created:

> {
>
> \"image_id\": \"meal_photo_001.jpg\",
>
> \"predicted_label\": \"paneer_butter_masala\",
>
> \"correct_label\": \"shahi_paneer\",
>
> \"confidence\": 0.82,
>
> \"source\": \"groq\",
>
> \"timestamp\": \"2026-03-13T13:06:00Z\"
>
> }

These entries accumulate in logs/retraining_batch.jsonl. When the batch
reaches a configurable threshold (default: 200 entries), a fine-tuning
job can be triggered for the EfficientNet classifier.

**STAGE 2: NUTRITIONAL INFORMATION CALIBRATION**

**Objective**

Convert food labels from Stage 1 into detailed nutritional composition
using a three-tier database lookup with Groq reasoning as the final
fallback.

**Database Hierarchy (Lookup Order)**

  -------------- --------------------- --------------------- -------------------
  **Priority**   **Database**          **Coverage**          **Citation**

  1 (Primary)    IFCT 2017 (Indian     528 Indian foods, 151 Longvah et al.,
                 Food Composition      nutrients per food    2017. NIN,
                 Tables)                                     Hyderabad

  2 (Secondary)  USDA FoodData Central 8,790+ foods, 150     USDA Agricultural
                 (SR Legacy + FNDDS)   nutrients             Research Service,
                                                             2019

  3 (Tertiary)   INDB (Indian Nutrient Regional recipes with Tiwari & Tiwari,
                 DataBase for Recipes) ingredient-level      2019. ICAR-CIFT
                                       breakdown             

  4 (Fallback)   Groq API Reasoning    Estimates for         Prompt-engineered
                 (Llama 4 Scout)       unmapped/novel foods  with IFCT reference
                                                             ranges
  -------------- --------------------- --------------------- -------------------

**Lookup Logic**

For each food_item from Stage 1:

**Step 1:** Fuzzy-match food_item against IFCT 2017 food names
(Levenshtein distance ≤ 3 or token overlap ≥ 60%). If matched, retrieve
all 151 nutrient values. Apply portion-size scaling.

**Step 2:** If IFCT miss, search USDA FoodData Central via FDC API
(api.nal.usda.gov/fdc/v1/foods/search). Use the "SR Legacy" dataType for
raw ingredients, "FNDDS" for prepared dishes.

**Step 3:** If USDA miss, search INDB recipe database. INDB provides
ingredient-level breakdown, so nutrients are summed from constituent
ingredients.

**Step 4 (Groq Fallback):** If all three databases miss, send the food
label to Groq with a structured prompt requesting caloric estimate,
macronutrient breakdown, and glycemic load category. The prompt includes
IFCT reference ranges as grounding context so Groq's estimates stay
within physiologically plausible bounds.

**Groq Nutritional Reasoning Prompt**

> System: You are a clinical nutritionist with expertise in Indian
> cuisine.
>
> Given the food item and portion size, estimate:
>
> calories (kcal), carbohydrates (g), protein (g), fat (g), fiber (g),
>
> glycemic_load (low/medium/high).
>
> Reference: Indian foods typically range 150--600 kcal per serving.
>
> Respond ONLY in JSON. No explanation.

**Key Nutritional Metrics**

  ---------------- ------------- ---------------------------- -------------------
  **Metric**       **Unit**      **Relevance to Pipeline**    **Source**

  Calories         kcal          TDEE comparison,             Mifflin et al.,
                                 surplus/deficit              1990

  Carbohydrates    g             Glucose spike estimation     Jenkins et al.,
                                 (Stage 5)                    1981

  Protein          g             Satiety index, muscle        Paddon-Jones et
                                 synthesis                    al., 2008

  Fat (total)      g             Caloric density,             Calder, 2006
                                 inflammation proxy           

  Dietary Fiber    g             Gut microbiome diversity     Sonnenburg &
                                 proxy (Stage 3)              Sonnenburg, 2014

  Glycemic Load    categorical   Post-meal glucose response   Foster-Powell et
                                 prediction                   al., 2002

  Tryptophan       mg            Serotonin precursor → mood   Richard et al.,
                                 (Stage 4)                    2009

  Omega-3          mg            Neuroinflammation, cognitive Grosso et al., 2014
  (ALA/EPA/DHA)                  function                     

  Iron             mg            Cognitive fatigue marker     Murray-Kolb &
                                                              Beard, 2007

  Magnesium        mg            Sleep quality, neural        Held et al., 2002
                                 excitability                 

  Vitamin B6       mg            Neurotransmitter synthesis   Hvas et al., 2004
                                 cofactor                     

  Vitamin B12      µg            Neurological function,       Pawlak et al., 2013
                                 vegetarian deficiency risk   

  Zinc             mg            Gut barrier integrity, mood  Vashum et al., 2014
                                 regulation                   
  ---------------- ------------- ---------------------------- -------------------

**Output JSON (Nutrition Cloud)**

> {
>
> \"food_item\": \"shahi_paneer\",
>
> \"portion_g\": 250,
>
> \"source_db\": \"IFCT_2017\",
>
> \"calories_kcal\": 420,
>
> \"carbohydrates_g\": 18,
>
> \"protein_g\": 14,
>
> \"fat_g\": 32,
>
> \"fiber_g\": 3,
>
> \"glycemic_load\": \"medium\",
>
> \"tryptophan_mg\": 68,
>
> \"omega3_mg\": 45,
>
> \"iron_mg\": 2.1,
>
> \"magnesium_mg\": 38,
>
> \"vitamin_b6_mg\": 0.12,
>
> \"vitamin_b12_ug\": 0.4,
>
> \"zinc_mg\": 1.8,
>
> \"timestamp\": \"2026-03-13T13:05:00Z\"
>
> }

**STAGE 3: GUT MICROBIOME PROXY MODELING**

**Objective**

Estimate gut microbiome health using dietary and digestive signal
proxies. Direct 16S rRNA sequencing is unavailable, so we use
research-validated proxy indicators derived from diet composition,
digestion self-reports, and fermented food intake.

**Scientific Basis**

The gut-brain axis is a bidirectional communication network linking the
enteric nervous system (ENS) with the central nervous system (CNS).
Short-chain fatty acids (SCFAs) produced by microbial fermentation of
dietary fiber directly influence neurotransmitter production,
neuroinflammation, and blood-brain barrier integrity (Cryan & Dinan,
2012; Foster & McVey Neufeld, 2013).

**Input**

\(A\) Nutritional data from Stage 2, specifically: fiber_g, fat_g,
carbohydrates_g, fermented food indicators.

\(B\) User digestion self-reports (collected via Streamlit interface):

  ---------------------- ---------- --------------------- -------------------------
  **Signal**             **Type**   **Options**           **Source Rationale**

  bloating               enum       none / mild /         Lewis & Heaton, 1997
                                    moderate / severe     (Bristol Stool Scale
                                                          adaptations)

  stool_quality          enum       Type 1--7 (Bristol    Lewis & Heaton, 1997
                                    Scale)                

  digestion_quality      enum       poor / fair / good /  Self-report validated in
                                    excellent             IBS studies (Francis et
                                                          al., 1997)

  fermented_food_today   boolean    true / false          Marco et al., 2017
                                                          (fermented food →
                                                          Lactobacillus enrichment)

  gas_discomfort         enum       none / mild /         Correlated with dysbiosis
                                    moderate / severe     (Ringel-Kulka et al.,
                                                          2015)
  ---------------------- ---------- --------------------- -------------------------

**Proxy Calculations (Research-Backed)**

**Proxy 1: Microbiome Diversity Index (MDI)**

Dietary fiber is the strongest dietary predictor of gut microbial
diversity. The following scoring is derived from the fiber-diversity
correlation established in the American Gut Project (McDonald et al.,
2018) and the PREDIMED trial (Garcia-Mantrana et al., 2018):

  ------------------ ---------------------- ------------------------------
  **Daily Fiber      **Diversity Score      **Evidence**
  Intake (g)**       Component**            

  \< 10              0.2 (low diversity     Sonnenburg et al., 2016 ---
                     risk)                  fiber-depleted diets reduce
                                            Bacteroidetes

  10--20             0.4 (below optimal)    EFSA, 2010 --- minimum 25g/day
                                            recommended

  20--30             0.6 (adequate)         American Gut Project --- 30+
                                            plant types/week = highest
                                            diversity

  30--40             0.8 (good)             Tap et al., 2015 --- high
                                            fiber → enriched Prevotella

  \> 40              0.95 (excellent)       De Filippo et al., 2010 ---
                                            rural African diets (50g+
                                            fiber) show highest diversity
  ------------------ ---------------------- ------------------------------

Additional modifiers:

> if fermented_food_today: diversity_score += 0.08 (Marco et al., 2017)
>
> if stool_quality in \[3, 4\]: diversity_score += 0.05 (Bristol Type
> 3-4 = optimal)
>
> if bloating == \'severe\': diversity_score -= 0.10 (dysbiosis
> indicator)
>
> MDI = clamp(diversity_score, 0.0, 1.0)

**Proxy 2: Inflammation Risk Score (IRS)**

The dietary inflammatory index (DII) concept (Shivappa et al., 2014)
correlates specific nutrient patterns with systemic inflammation.
Simplified proxy:

  --------------------- ---------------------- ----------------------- ----------------------
  **Factor**            **Pro-Inflammatory**   **Anti-Inflammatory**   **Weight**

  Saturated fat \>      +0.15                  ---                     Calder, 2006
  20g/day                                                              

  Added sugar \>        +0.20                  ---                     Ma et al., 2015
  50g/day                                                              

  Fiber \> 25g/day      ---                    -0.15                   King et al., 2007

  Omega-3 present       ---                    -0.10                   Grosso et al., 2014

  Fermented food intake ---                    -0.08                   Wastyk et al., 2021
                                                                       (Stanford)

  Severe bloating       +0.12                  ---                     Dysbiosis marker
                                                                       (Ringel-Kulka, 2015)
  --------------------- ---------------------- ----------------------- ----------------------

> IRS = clamp(0.5 + sum(applicable_weights), 0.0, 1.0)
>
> Thresholds: \< 0.3 = low, 0.3--0.6 = moderate, \> 0.6 = high

**Proxy 3: Digestion Stability Score (DSS)**

Composite score from Bristol Stool Scale consistency, bloating
frequency, and gas discomfort. Based on Rome IV criteria for functional
GI disorders (Drossman, 2016):

> bristol_score = 1.0 if Type 3--4, 0.6 if Type 2 or 5, 0.3 if Type 1,
> 6, or 7
>
> bloating_penalty = {none: 0, mild: -0.05, moderate: -0.15, severe:
> -0.25}
>
> gas_penalty = {none: 0, mild: -0.03, moderate: -0.10, severe: -0.20}
>
> DSS = clamp(bristol_score + bloating_penalty + gas_penalty, 0.0, 1.0)

**Output JSON**

> {
>
> \"microbiome_diversity_index\": 0.68,
>
> \"inflammation_risk_score\": 0.35,
>
> \"inflammation_risk_level\": \"moderate\",
>
> \"digestion_stability_score\": 0.72,
>
> \"scfa_production_proxy\": \"moderate\",
>
> \"fiber_intake_today_g\": 22,
>
> \"fermented_food_consumed\": true,
>
> \"timestamp\": \"2026-03-13T15:00:00Z\"
>
> }

**STAGE 4: MOOD & COGNITIVE STATE LOGGING**

**Objective**

Capture psychological and cognitive responses 2--3 hours post-meal. This
timing window is chosen because postprandial glucose peaks occur at \~60
minutes, with cognitive and mood effects peaking at 90--180 minutes
(Benton, 2002; Kaplan et al., 2015).

**Input (User Self-Report)**

  ----------------- ---------- ------------------------ ----------------------
  **Field**         **Type**   **Options**              **Scoring Basis**

  mood_emoji        emoji      😄 🙂 😐 😟 😔 😴 🤯     PANAS-SF mapping
                                                        (Watson et al., 1988)

  mood_rating       int        Self-rated overall mood  Visual Analog Scale
                    (1--10)                             adaptation

  cognitive_state   enum       clear / mild_fog /       Adapted from MoCA
                               brain_fog / sharp /      cognitive categories
                               drowsy                   (Nasreddine et al.,
                                                        2005)

  energy_level      enum       very_low / low /         Subjective Vitality
                               moderate / high /        Scale (Ryan &
                               very_high                Frederick, 1997)

  anxiety_level     enum       none / mild / moderate / GAD-2 simplified
                               high                     (Kroenke et al., 2007)
  ----------------- ---------- ------------------------ ----------------------

**Processing: Numeric Normalization**

Emoji-to-score mapping (derived from PANAS positive/negative affect
scoring):

  ----------- --------------- ----------- ------------------- -----------------
  **Emoji**   **Label**       **Score**   **Cognitive State** **Cognitive
                                                              Penalty**

  😄          very_happy      +2          sharp               0

  🙂          happy           +1          clear               0

  😐          neutral         0           mild_fog            -0.5

  😟          worried         -1          brain_fog           -1.5

  😔          sad             -2          drowsy              -1.0

  😴          sleepy          -1          brain_fog           -1.5

  🤯          overwhelmed     -2          brain_fog           -2.0
  ----------- --------------- ----------- ------------------- -----------------

**Tryptophan-Serotonin Pathway Link**

Stage 2 provides tryptophan_mg. Tryptophan is the sole precursor to
serotonin (5-HT) synthesis via the TPH2 enzyme pathway.
High-carbohydrate meals increase tryptophan's relative brain uptake by
raising insulin, which clears competing large neutral amino acids
(LNAAs) from blood (Fernstrom & Wurtman, 1971; Richard et al., 2009).
This creates a mechanistic link between meal composition and mood within
2--3 hours.

**Output JSON**

> {
>
> \"mood_score\": -1,
>
> \"mood_label\": \"worried\",
>
> \"cognitive_state\": \"brain_fog\",
>
> \"cognitive_penalty\": -1.5,
>
> \"energy_level\": \"low\",
>
> \"anxiety_level\": \"mild\",
>
> \"tryptophan_context_mg\": 68,
>
> \"hours_since_meal\": 2.5,
>
> \"timestamp\": \"2026-03-13T15:35:00Z\"
>
> }

**STAGE 5: METABOLIC RESPONSE APPROXIMATION**

**Objective**

Estimate post-meal metabolic impact including glucose response, energy
fluctuation, and insulin demand. These are approximations based on
glycemic load theory (Jenkins et al., 1981) and the Food Insulin Index
(Holt et al., 1997).

**Input**

\(A\) Nutrition data from Stage 2 (carbohydrates, fiber, fat,
glycemic_load).

\(B\) Meal timing relative to prior meals and sleep.

\(C\) User baseline from Stage 0 (BMR, TDEE, activity level).

**Glucose Spike Estimation**

Based on the Glycemic Load (GL) framework (Foster-Powell et al., 2002):

  ------------ ------------- --------------------- ------------------------
  **GL         **GL Value    **Estimated Spike**   **Typical Foods**
  Category**   Range**                             

  Low          GL ≤ 10       Mild (Δ \< 30 mg/dL)  Lentils, most
                                                   vegetables, nuts

  Medium       GL 11--19     Moderate (Δ 30--60    Brown rice, chapati,
                             mg/dL)                banana

  High         GL ≥ 20       High (Δ \> 60 mg/dL)  White rice, sugary
                                                   drinks, white bread
  ------------ ------------- --------------------- ------------------------

**Fiber Attenuation Factor**

Dietary fiber slows gastric emptying and glucose absorption (Weickert &
Pfeiffer, 2008). Attenuation model:

> fiber_attenuation = 1.0 - (fiber_g / 40.0) \* 0.3 // Max 30% reduction
>
> adjusted_spike = base_spike \* fiber_attenuation

**Energy Crash Probability**

Reactive hypoglycemia occurs when high-GL meals trigger insulin
overshoot, causing blood glucose to drop below fasting levels 2--4 hours
post-meal (Brun et al., 2000):

> if glycemic_load == \'high\' AND fiber_g \< 5:
>
> energy_crash_probability = \'high\' (0.75)
>
> elif glycemic_load == \'medium\' AND fiber_g \< 10:
>
> energy_crash_probability = \'moderate\' (0.45)
>
> else:
>
> energy_crash_probability = \'low\' (0.15)

**Late-Night Meal Metabolic Penalty**

Meals consumed after 21:00 show impaired glucose tolerance due to
circadian misalignment of insulin sensitivity (Garaulet et al., 2013;
Gill & Panda, 2015):

> if meal_time \> 21:00:
>
> glucose_spike \*= 1.20 // 20% amplification (Garaulet et al., 2013)
>
> energy_crash_probability += 0.10

**Output JSON**

> {
>
> \"estimated_glucose_spike\": \"moderate\",
>
> \"spike_delta_mg_dl\": 45,
>
> \"fiber_attenuation_factor\": 0.84,
>
> \"energy_crash_probability\": 0.45,
>
> \"late_meal_penalty_applied\": false,
>
> \"insulin_demand_proxy\": \"moderate\",
>
> \"timestamp\": \"2026-03-13T13:30:00Z\"
>
> }

**STAGE 6: SLEEP & PHYSIOLOGICAL INDICATORS**

**Objective**

Quantify sleep quality and derive neurological stress proxies. Sleep is
the primary modulator of glymphatic clearance (Xie et al., 2013),
neuroinflammation, and next-day cognitive performance.

**Input**

  ------------------------ ---------- ------------- ----------------------------------
  **Field**                **Type**   **Example**   **Source**

  sleep_onset              time       23:30         Self-report

  wake_time                time       06:15         Self-report

  sleep_quality            enum       poor / fair / Pittsburgh Sleep Quality Index
                                      good /        adaptation (Buysse et al., 1989)
                                      excellent     

  night_awakenings         int        2             Self-report

  caffeine_after_14h       boolean    true          Linked to sleep latency (Drake et
                                                    al., 2013)

  screen_before_bed_min    int        45            Blue light melatonin suppression
                                                    (Chang et al., 2015)

  last_meal_to_bed_hours   float      1.5           Derived from Stage 1 timestamp vs
                                                    sleep_onset
  ------------------------ ---------- ------------- ----------------------------------

**Processing**

**Sleep Debt Calculation**

Optimal sleep for adults aged 18--25 is 7--9 hours (Hirshkowitz et al.,
2015, National Sleep Foundation):

> sleep_hours = wake_time - sleep_onset
>
> sleep_debt = max(0, 7.5 - sleep_hours) // Relative to 7.5h midpoint
>
> cumulative_debt_7d = sum(last 7 days sleep_debt)

**Circadian Regularity Index (CRI)**

Measures consistency of sleep/wake timing over 7 days. Irregular sleep
patterns are associated with poorer metabolic outcomes and mood
disorders (Phillips et al., 2017):

> CRI = 1.0 - (std_dev(sleep_onset_times_7d) / 120) // Normalized to 2h
> window
>
> CRI = clamp(CRI, 0.0, 1.0)

**Neurological Stress Proxy**

> neuro_stress = 0.5 // baseline
>
> if sleep_debt \> 2: neuro_stress += 0.15 (Krause et al., 2017)
>
> if CRI \< 0.5: neuro_stress += 0.10 (Phillips et al., 2017)
>
> if caffeine_after_14h: neuro_stress += 0.05 (Drake et al., 2013)
>
> if screen_before_bed \> 60: neuro_stress += 0.08 (Chang et al., 2015)
>
> if last_meal_to_bed \< 2: neuro_stress += 0.07 (Crispim et al., 2011)
>
> neuro_stress = clamp(neuro_stress, 0.0, 1.0)

**Output JSON**

> {
>
> \"sleep_hours\": 6.75,
>
> \"sleep_debt\": 0.75,
>
> \"cumulative_debt_7d\": 4.25,
>
> \"circadian_regularity_index\": 0.68,
>
> \"neurological_stress_proxy\": 0.63,
>
> \"sleep_stability\": \"low\",
>
> \"timestamp\": \"2026-03-14T06:15:00Z\"
>
> }

**STAGE 7: TIME-SERIES PATTERN ANALYSIS**

**Objective**

Analyze 30 days of accumulated data using sliding-window correlation
analysis to detect repeating food--mood--sleep--gut patterns. This is
the intelligence layer that connects individual meals to downstream
health outcomes.

**Analysis Windows**

  ------------- --------------- ---------------------- ---------------------
  **Window**    **Duration**    **Purpose**            **Method**

  Acute         2--4 hours      Immediate              Pearson correlation:
                post-meal       mood/cognitive         GL vs mood_score
                                response               

  Short-term    Same-day        Daily digestion +      Lag-1 correlation:
                                sleep impact           dinner composition vs
                                                       sleep quality

  Medium-term   7-day rolling   Weekly pattern         Rolling mean +
                                detection              z-score anomaly
                                                       detection

  Long-term     30-day          Baseline drift and     Linear regression:
                cumulative      chronic signals        fiber trend vs MDI
                                                       trend
  ------------- --------------- ---------------------- ---------------------

**Correlation Targets**

The system computes pairwise correlations between:

> • Glycemic load ↔ Mood score (2h lag) --- Expected: negative
> correlation (Jenkins et al., 2002)
>
> • Fiber intake ↔ Microbiome Diversity Index (1--3 day lag) ---
> Expected: positive (McDonald et al., 2018)
>
> • Late meals (\>21:00) ↔ Sleep quality --- Expected: negative (Crispim
> et al., 2011)
>
> • Tryptophan intake ↔ Next-morning mood --- Expected: positive
> (Richard et al., 2009)
>
> • Cumulative sleep debt ↔ Cognitive penalty trend --- Expected:
> positive (Krause et al., 2017)
>
> • Fermented food frequency ↔ Digestion stability (7-day) --- Expected:
> positive (Wastyk et al., 2021)
>
> • Sugar intake trend ↔ Inflammation risk score --- Expected: positive
> (Ma et al., 2015)

**Anomaly Detection**

Z-score based anomaly flagging on 7-day rolling windows. Any metric
deviating \> 2σ from the rolling mean triggers a flag:

> z_score = (value - rolling_mean_7d) / rolling_std_7d
>
> if abs(z_score) \> 2.0: flag as anomaly

**Groq Summarization**

After pattern computation, the correlation matrix and anomaly flags are
sent to Groq for natural-language summarization:

> Prompt: Given these 30-day correlations and anomaly flags,
>
> summarize the top 3 diet-health patterns in plain English.
>
> Be specific about which foods and which outcomes.

**Output JSON**

> {
>
> \"significant_correlations\": \[
>
> {\"pair\": \"glycemic_load \<-\> mood_score\", \"r\": -0.62, \"p\":
> 0.003, \"lag_hours\": 2},
>
> {\"pair\": \"fiber_intake \<-\> MDI\", \"r\": 0.54, \"p\": 0.01,
> \"lag_days\": 2},
>
> {\"pair\": \"late_meal \<-\> sleep_quality\", \"r\": -0.71, \"p\":
> 0.001, \"lag_hours\": 0}
>
> \],
>
> \"anomalies_detected\": 4,
>
> \"groq_summary\": \"Your high-carb dinners consistently correlate
> with\...\",
>
> \"pattern_confidence\": \"moderate\"
>
> }

**STAGE 8: PERSONALIZED BASELINE CREATION**

**Objective**

After 30 days of data collection, compute stable per-user baseline
metrics. These baselines serve as the individual reference frame against
which all future deviations are measured.

**Baseline Metrics**

  ------------------------------ --------------------------- ------------ -------------------
  **Metric**                     **Calculation**             **Example    **Normal Range
                                                             Value**      (Population)**

  baseline_mood                  Trimmed mean (10%) of all   6.2 / 10     5.0--7.5 (Watson et
                                 mood_scores                              al., 1988)

  baseline_sleep_hours           Median of 30 sleep_hours    7.0 hours    7--9 (Hirshkowitz
                                 values                                   et al., 2015)

  baseline_glucose_spike         Mode of spike categories    moderate     Varies
                                                                          (Foster-Powell et
                                                                          al., 2002)

  baseline_digestion_stability   Mean DSS over 30 days       0.72         \> 0.6 = stable
                                                                          (Rome IV)

  baseline_MDI                   Mean MDI over last 14 days  0.65         \> 0.5 = adequate
                                                                          (McDonald et al.,
                                                                          2018)

  baseline_inflammation          Mean IRS over 30 days       0.38         \< 0.4 = low risk
                                                                          (Shivappa et al.,
                                                                          2014)

  baseline_cognitive_score       Mean (mood_score +          4.8          \> 5.0 = normal
                                 cognitive_penalty)                       

  baseline_neuro_stress          Mean                        0.55         \< 0.5 = low
                                 neurological_stress_proxy                (composite)
  ------------------------------ --------------------------- ------------ -------------------

**Baseline Stability Check**

A baseline is considered stable when the coefficient of variation (CV)
for each metric drops below 15% over the last 14 days. If CV \> 15%, the
system extends the baseline period and notifies the user.

> CV = (std_dev / mean) \* 100
>
> if CV \< 15%: baseline_stable = true
>
> if CV \>= 15%: extend collection, notify user

**Output JSON**

> {
>
> \"baseline_mood\": 6.2,
>
> \"baseline_sleep_hours\": 7.0,
>
> \"baseline_glucose_spike\": \"moderate\",
>
> \"baseline_digestion_stability\": 0.72,
>
> \"baseline_MDI\": 0.65,
>
> \"baseline_inflammation_risk\": 0.38,
>
> \"baseline_cognitive_score\": 4.8,
>
> \"baseline_neuro_stress\": 0.55,
>
> \"all_baselines_stable\": true,
>
> \"baseline_period_days\": 30,
>
> \"timestamp\": \"2026-04-12T00:00:00Z\"
>
> }

**STAGE 9: NEUROLOGICAL RISK PATTERN DETECTION**

**Objective**

Detect persistent, multi-day patterns that may indicate early
neurological or cognitive health risks. This stage looks for chronic
signal drift, not acute events. All outputs are informational --- never
diagnostic.

**Risk Signals (Research-Backed Thresholds)**

  --------------- -------------------- -------------- ---------- -------------------
  **Signal**      **Threshold**        **Duration**   **Flag     **Evidence**
                                                      Level**    

  Persistent      cognitive_state =    ≥ 5 of last 7  Moderate   Ocon, 2013
  brain fog       brain_fog            days                      (cognitive fatigue)

  Chronic sleep   cumulative_debt_7d   2+ consecutive High       Van Dongen et al.,
  debt            \> 10 hours          weeks                     2003

  Mood            mood_score std_dev   Sustained 14+  Moderate   Aan het Rot et al.,
  instability     \> 2.5 (7d)          days                      2012

  Metabolic       glucose_spike = high 14+ days       High       Blaak et al., 2012
  dysregulation   ≥ 60% of meals                                 

  Inflammation    IRS \> 0.6           14+            Moderate   Furman et al., 2019
  persistence                          consecutive               
                                       days                      

  Circadian       CRI \< 0.4           14+ days       Moderate   Phillips et al.,
  disruption                                                     2017

  Combined        neuro_stress \> 0.7  7+ consecutive High       Composite threshold
  neuro-stress                         days                      

  B12 deficiency  vegetarian +         21+ days       Moderate   Pawlak et al., 2013
  signal          cognitive decline                              
                  trend                                          
  --------------- -------------------- -------------- ---------- -------------------

**Risk Scoring**

> risk_count = number of active flags
>
> if risk_count == 0: neurological_risk = \'none\'
>
> if risk_count == 1--2: neurological_risk = \'mild\'
>
> if risk_count == 3--4: neurological_risk = \'moderate\'
>
> if risk_count \>= 5: neurological_risk = \'elevated\' + recommend
> professional consult

**Output JSON**

> {
>
> \"neurological_risk_level\": \"mild\",
>
> \"active_flags\": \[\"persistent_brain_fog\",
> \"chronic_sleep_debt\"\],
>
> \"risk_count\": 2,
>
> \"recommendation\": \"Consider increasing fiber and reducing
> late-night screen time.\",
>
> \"professional_consult_suggested\": false,
>
> \"timestamp\": \"2026-04-12T00:00:00Z\"
>
> }

**STAGE 10: FINAL INSIGHT GENERATION**

**Objective**

Generate a natural-language health summary using Groq API, synthesizing
all pipeline outputs into actionable, non-diagnostic insights.

**Groq Insight Generation Prompt**

> System: You are a health informatics assistant. NEVER diagnose.
>
> Given the user's 30-day pipeline summary:
>
> \- Baseline metrics (Stage 8)
>
> \- Significant correlations (Stage 7)
>
> \- Risk flags (Stage 9)
>
> Generate 3--5 personalized, actionable insights in plain English.
>
> Each insight must reference specific food patterns and outcomes.
>
> End with a disclaimer: These are informational observations, not
> medical advice.

**Example Output**

**Insight 1:** Your data suggests that high-carbohydrate meals after 9
PM (occurring 12 of 30 days) correlate with a 62% drop in next-day mood
scores and consistently poor sleep quality ratings.

**Insight 2:** On days when you consumed fermented foods (curd, idli),
your digestion stability score averaged 0.82 vs 0.58 on days without ---
a statistically significant difference (p \< 0.01).

**Insight 3:** Your fiber intake averaged 18g/day, below the 25g minimum
recommended by EFSA. Increasing to 25--30g may improve your microbiome
diversity index, which currently sits at 0.65.

**Insight 4:** Persistent brain fog was flagged on 5 of the last 7 days.
This correlates with both your cumulative sleep debt (4.25 hours) and
low dietary tryptophan intake. Consider tryptophan-rich vegetarian
sources: paneer, soy, pumpkin seeds.

**Final Summary JSON**

> {
>
> \"diet_mood_correlation\": \"detected\",
>
> \"gut_health_proxy\": \"moderate\",
>
> \"metabolic_stability\": \"moderate\",
>
> \"sleep_stability\": \"low\",
>
> \"neurological_risk_flag\": \"mild\",
>
> \"top_insight\": \"Late-night high-carb meals are your biggest
> lever.\",
>
> \"insights_count\": 4,
>
> \"disclaimer\": \"Informational only. Not medical advice.\",
>
> \"generated_by\": \"groq/llama-4-scout-17b\",
>
> \"timestamp\": \"2026-04-12T12:00:00Z\"
>
> }

**STAGE SIM: SYNTHETIC DATA SIMULATION SPECIFICATION**

**Objective**

Before real deployment, generate 30 days of synthetic user data to
validate the entire pipeline end-to-end. The synthetic data must be
physiologically plausible and internally consistent.

**Data Volume**

  ---------------- ------------- ---------------- -----------------------
  **Data Type**    **Volume (30  **Frequency**    **Fields Per Entry**
                   days)**                        

  Meal logs        90 entries    3 meals/day      food_items, portion,
                                                  timestamp

  Mood logs        90 entries    Post-meal (2--3h mood_emoji, rating,
                                 delay)           cognitive_state, energy

  Digestion        90 entries    Post-meal        bloating,
  reports                                         stool_quality, gas,
                                                  fermented_food

  Sleep logs       30 entries    1/day            onset, wake, quality,
                                                  awakenings, caffeine,
                                                  screen

  Nutrition        90 entries    Derived from     Full nutrient vector
  profiles                       meal logs        (Stage 2)
  ---------------- ------------- ---------------- -----------------------

**Synthetic Data Rules**

> • Vegetarian diet only (user profile constraint). Include common
> Indian vegetarian dishes: dosa, idli, paneer, dal, rice, chapati,
> curd, sabzi varieties.
>
> • Simulate 2--3 "bad pattern" weeks: high sugar, late meals, poor
> sleep --- to test anomaly detection.
>
> • Simulate 1 "good pattern" week: high fiber, fermented foods,
> consistent sleep --- to validate positive correlations.
>
> • Introduce 3--5 deliberate misclassifications in food labels to test
> the retraining feedback loop.
>
> • Sleep onset should vary by ±90 minutes to create realistic circadian
> regularity index variance.
>
> • Bristol stool types should correlate loosely with fiber intake
> (higher fiber = more Type 3--4).

**STAGE API: GROQ API INTEGRATION GUIDE**

**Overview**

Groq's free tier provides fast inference on open-source models. The
pipeline uses Groq in four distinct roles:

  --------------------- ----------- -------------------------------- -----------------
  **Role**              **Stage**   **Model**                        **Trigger
                                                                     Condition**

  Food vision           Stage 1     llama-4-scout-17b-16e-instruct   Every meal image
  classifier (primary)                                               upload

  Nutritional reasoning Stage 2     llama-4-scout-17b-16e-instruct   When IFCT +
  fallback                                                           USDA + INDB all
                                                                     miss

  Pattern summarization Stage 7     llama-4-scout-17b-16e-instruct   After 30-day
                                                                     correlation
                                                                     computation

  Insight generation    Stage 10    llama-4-scout-17b-16e-instruct   Final pipeline
                                                                     output
  --------------------- ----------- -------------------------------- -----------------

**Rate Limit Strategy (Free Tier)**

Groq free tier constraints (as of March 2026): 30 requests/minute,
14,400 requests/day, 6,000 tokens/minute. Strategy:

> • Stage 1 (vision): 3 meals/day = 3 requests/day. Well within limits.
>
> • Stage 2 (fallback): Expected \< 10% of foods unmapped = \~9
> requests/day max.
>
> • Stage 7 (summarization): 1 request per 30-day analysis cycle.
>
> • Stage 10 (insights): 1 request per 30-day cycle.
>
> • Total expected daily load: \~5--15 requests/day. Massive headroom.
>
> • Implement exponential backoff with jitter for 429 responses.
>
> • Cache Groq nutritional responses locally to avoid repeat queries for
> the same food item.

**ML Architecture Overview**

End-to-end pipeline flow:

> User Meal Image
>
> │
>
> ├─── EfficientNet-B2 (local) ───┐
>
> │ ├─── Stage 1: Fusion + Mismatch Logger
>
> └─── Groq Vision (cloud) ──────┘
>
> │
>
> Stage 2: IFCT → USDA → INDB → Groq Fallback
>
> │
>
> ┌─────────────────┼─────────────────┐
>
> Stage 3: Gut Proxy Stage 4: Mood Stage 5: Metabolic
>
> └─────────────────┼─────────────────┘
>
> │
>
> Stage 6: Sleep + Physiology
>
> │
>
> Stage 7: Time-Series Correlations (30d)
>
> │
>
> Stage 8: Baseline Calibration
>
> │
>
> Stage 9: Neuro Risk Detection
>
> │
>
> Stage 10: Groq Insight Generation
>
> │
>
> ─── Personalized Health Summary ───

**References**

All research citations referenced throughout this document, listed
alphabetically:

\[1\] Aan het Rot, M., Hogenelst, K., & Schoevers, R. A. (2012). Mood
disorders in everyday life: A systematic review of experience sampling
and ecological momentary assessment studies. Clinical Psychology Review,
32(6), 510--523.

\[2\] Benton, D. (2002). Carbohydrate ingestion, blood glucose and mood.
Neuroscience & Biobehavioral Reviews, 26(3), 293--308.

\[3\] Blaak, E. E., et al. (2012). Impact of postprandial glycaemia on
health and prevention of disease. Obesity Reviews, 13(10), 923--984.

\[4\] Brun, J. F., et al. (2000). Postprandial reactive hypoglycemia.
Diabetes & Metabolism, 26(5), 337--351.

\[5\] Buysse, D. J., et al. (1989). The Pittsburgh Sleep Quality Index:
A new instrument for psychiatric practice and research. Psychiatry
Research, 28(2), 193--213.

\[6\] Calder, P. C. (2006). Polyunsaturated fatty acids and
inflammation. Prostaglandins, Leukotrienes and Essential Fatty Acids,
75(3), 197--202.

\[7\] Chang, A. M., et al. (2015). Evening use of light-emitting
eReaders negatively affects sleep, circadian timing, and next-morning
alertness. PNAS, 112(4), 1232--1237.

\[8\] Crispim, C. A., et al. (2011). Relationship between food intake
and sleep pattern in healthy individuals. Journal of Clinical Sleep
Medicine, 7(6), 659--664.

\[9\] Cryan, J. F., & Dinan, T. G. (2012). Mind-altering microorganisms:
The impact of the gut microbiota on brain and behaviour. Nature Reviews
Neuroscience, 13(10), 701--712.

\[10\] De Filippo, C., et al. (2010). Impact of diet in shaping gut
microbiota revealed by a comparative study in children from Europe and
rural Africa. PNAS, 107(33), 14691--14696.

\[11\] Drake, C., et al. (2013). Caffeine effects on sleep taken 0, 3,
or 6 hours before going to bed. Journal of Clinical Sleep Medicine,
9(11), 1195--1200.

\[12\] Drossman, D. A. (2016). Functional gastrointestinal disorders:
History, pathophysiology, clinical features, and Rome IV.
Gastroenterology, 150(6), 1262--1279.

\[13\] EFSA Panel on Dietetic Products, Nutrition and Allergies. (2010).
Scientific opinion on dietary reference values for carbohydrates and
dietary fibre. EFSA Journal, 8(3), 1462.

\[14\] FAO/WHO/UNU. (2001). Human Energy Requirements: Report of a Joint
FAO/WHO/UNU Expert Consultation. Food and Agriculture Organization.

\[15\] Fernstrom, J. D., & Wurtman, R. J. (1971). Brain serotonin
content: Physiological dependence on plasma tryptophan levels. Science,
173(3992), 149--152.

\[16\] Foster, J. A., & McVey Neufeld, K. A. (2013). Gut--brain axis:
How the microbiome influences anxiety and depression. Trends in
Neurosciences, 36(5), 305--312.

\[17\] Foster-Powell, K., Holt, S. H. A., & Brand-Miller, J. C. (2002).
International table of glycemic index and glycemic load values. American
Journal of Clinical Nutrition, 76(1), 5--56.

\[18\] Francis, C. Y., Morris, J., & Whorwell, P. J. (1997). The
irritable bowel severity scoring system. Alimentary Pharmacology &
Therapeutics, 11(2), 395--402.

\[19\] Furman, D., et al. (2019). Chronic inflammation in the etiology
of disease across the life span. Nature Medicine, 25(12), 1822--1832.

\[20\] Garaulet, M., et al. (2013). Timing of food intake predicts
weight loss effectiveness. International Journal of Obesity, 37(4),
604--611.

\[21\] Garcia-Mantrana, I., et al. (2018). Shifts on gut microbiota
associated to Mediterranean diet adherence and specific dietary intakes
on general adult population. Frontiers in Microbiology, 9, 890.

\[22\] Gill, S., & Panda, S. (2015). A smartphone app reveals erratic
diurnal eating patterns in humans that can be modulated for health
benefits. Cell Metabolism, 22(5), 789--798.

\[23\] Grosso, G., et al. (2014). Omega-3 fatty acids and depression:
Scientific evidence and biological mechanisms. Oxidative Medicine and
Cellular Longevity, 2014, 313570.

\[24\] Harris, J. A., & Benedict, F. G. (1918). A biometric study of
human basal metabolism. PNAS, 4(12), 370--373.

\[25\] Held, K., et al. (2002). Oral Mg2+ supplementation reverses
age-related neuroendocrine and sleep EEG changes in humans.
Pharmacopsychiatry, 35(4), 135--143.

\[26\] Hirshkowitz, M., et al. (2015). National Sleep Foundation's sleep
time duration recommendations. Sleep Health, 1(1), 40--43.

\[27\] Holt, S. H. A., Miller, J. C. B., & Petocz, P. (1997). An insulin
index of foods: The insulin demand generated by 1000-kJ portions of
common foods. American Journal of Clinical Nutrition, 66(5), 1264--1276.

\[28\] Hvas, A. M., et al. (2004). Vitamin B6 level is associated with
symptoms of depression. Psychotherapy and Psychosomatics, 73(6),
340--343.

\[29\] Jenkins, D. J. A., et al. (1981). Glycemic index of foods: A
physiological basis for carbohydrate exchange. American Journal of
Clinical Nutrition, 34(3), 362--366.

\[30\] Kaplan, R. J., et al. (2015). Dietary protein, carbohydrate, and
fat enhance memory performance in the healthy elderly. American Journal
of Clinical Nutrition, 72(3), 825--836.

\[31\] King, D. E., et al. (2007). Dietary magnesium and C-reactive
protein levels. Journal of the American College of Nutrition, 24(3),
166--171.

\[32\] Krause, A. J., et al. (2017). The sleep-deprived human brain.
Nature Reviews Neuroscience, 18(7), 404--418.

\[33\] Kroenke, K., et al. (2007). Anxiety disorders in primary care:
Prevalence, impairment, comorbidity, and detection. Annals of Internal
Medicine, 146(5), 317--325.

\[34\] Lewis, S. J., & Heaton, K. W. (1997). Stool form scale as a
useful guide to intestinal transit time. Scandinavian Journal of
Gastroenterology, 32(9), 920--924.

\[35\] Longvah, T., et al. (2017). Indian Food Composition Tables.
National Institute of Nutrition, Indian Council of Medical Research,
Hyderabad.

\[36\] Ma, T., et al. (2015). Added sugar intake and cardiovascular
diseases mortality among US adults. JAMA Internal Medicine, 174(4),
516--524.

\[37\] Marco, M. L., et al. (2017). Health benefits of fermented foods:
Microbiota and beyond. Current Opinion in Biotechnology, 44, 94--102.

\[38\] McDonald, D., et al. (2018). American Gut: An open platform for
citizen science microbiome research. mSystems, 3(3), e00031-18.

\[39\] Mifflin, M. D., et al. (1990). A new predictive equation for
resting energy expenditure in healthy individuals. American Journal of
Clinical Nutrition, 51(2), 241--247.

\[40\] Murray-Kolb, L. E., & Beard, J. L. (2007). Iron treatment
normalizes cognitive functioning in young women. American Journal of
Clinical Nutrition, 85(3), 778--787.

\[41\] Nasreddine, Z. S., et al. (2005). The Montreal Cognitive
Assessment, MoCA: A brief screening tool for mild cognitive impairment.
Journal of the American Geriatrics Society, 53(4), 695--699.

\[42\] Ocon, A. J. (2013). Caught in the thickness of brain fog:
Exploring the cognitive symptoms of chronic fatigue syndrome. Frontiers
in Physiology, 4, 63.

\[43\] Paddon-Jones, D., et al. (2008). Protein, weight management, and
satiety. American Journal of Clinical Nutrition, 87(5), 1558S--1561S.

\[44\] Pawlak, R., et al. (2013). The prevalence of cobalamin deficiency
among vegetarians assessed by serum vitamin B12. European Journal of
Clinical Nutrition, 68(5), 541--548.

\[45\] Phillips, A. J. K., et al. (2017). Irregular sleep/wake patterns
are associated with poorer academic performance and delayed circadian
and sleep/wake timing. Scientific Reports, 7, 3216.

\[46\] Richard, D. M., et al. (2009). L-Tryptophan: Basic metabolic
functions, behavioral research and therapeutic indications.
International Journal of Tryptophan Research, 2, 45--60.

\[47\] Ringel-Kulka, T., et al. (2015). Intestinal microbiota in healthy
US young children and adults --- a high throughput microarray analysis.
PLoS ONE, 8(5), e64315.

\[48\] Roza, A. M., & Shizgal, H. M. (1984). The Harris Benedict
equation reevaluated. American Journal of Clinical Nutrition, 40(1),
168--182.

\[49\] Ryan, R. M., & Frederick, C. (1997). On energy, personality, and
health: Subjective vitality as a dynamic reflection of well-being.
Journal of Personality, 65(3), 529--565.

\[50\] Shivappa, N., et al. (2014). Designing and developing a
literature-derived, population-based dietary inflammatory index. Public
Health Nutrition, 17(8), 1689--1696.

\[51\] Sonnenburg, E. D., & Sonnenburg, J. L. (2014). Starving our
microbial self: The deleterious consequences of a diet deficient in
microbiota-accessible carbohydrates. Cell Metabolism, 20(5), 779--786.

\[52\] Sonnenburg, E. D., et al. (2016). Diet-induced extinctions in the
gut microbiota compound over generations. Nature, 529(7585), 212--215.

\[53\] Tap, J., et al. (2015). Gut microbiota richness promotes its
stability upon increased dietary fibre intake in healthy adults.
Environmental Microbiology, 17(12), 4954--4964.

\[54\] Tiwari, B. K., & Tiwari, U. (2019). Indian Nutrient DataBase
(INDB). ICAR-Central Institute of Fisheries Technology.

\[55\] USDA Agricultural Research Service. (2019). USDA FoodData
Central. U.S. Department of Agriculture. https://fdc.nal.usda.gov/

\[56\] Van Dongen, H. P. A., et al. (2003). The cumulative cost of
additional wakefulness: Dose-response effects on neurobehavioral
functions and sleep physiology. Sleep, 26(2), 117--126.

\[57\] Vashum, K. P., et al. (2014). Dietary zinc is associated with a
lower incidence of depression. Journal of Affective Disorders, 166,
249--257.

\[58\] Wastyk, H. C., et al. (2021). Gut-microbiota-targeted diets
modulate human immune status. Cell, 184(16), 4137--4153.

\[59\] Watson, D., Clark, L. A., & Tellegen, A. (1988). Development and
validation of brief measures of positive and negative affect: The PANAS
scales. Journal of Personality and Social Psychology, 54(6), 1063--1070.

\[60\] Weickert, M. O., & Pfeiffer, A. F. H. (2008). Metabolic effects
of dietary fiber consumption and prevention of diabetes. Journal of
Nutrition, 138(3), 439--442.

\[61\] Xie, L., et al. (2013). Sleep drives metabolite clearance from
the adult brain. Science, 342(6156), 373--377.
