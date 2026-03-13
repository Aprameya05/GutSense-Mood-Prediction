"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import CountUp from "@/components/shared/CountUp";
import { getProfile, updateProfile, register, USER_ID } from "@/lib/api";
import { toast } from "sonner";

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  heavy: 1.725,
  extreme: 1.9,
};

function calcBMR(weight_kg: number, height_cm: number, age: number, sex: string): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

function calcTDEE(bmr: number, activity: string): number {
  const mult = ACTIVITY_MULTIPLIERS[activity] ?? 1.2;
  return bmr * mult;
}

const initialForm = {
  name: "",
  age: 25,
  sex: "male" as "male" | "female",
  height_cm: 170,
  weight_kg: 70,
  diet_type: "vegetarian" as string,
  activity_level: "moderate" as string,
  sleep_schedule: "",
  supplements: "",
  medications: "",
};

export default function ProfilePage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    getProfile(USER_ID)
      .then((p) => {
        setForm({
          name: typeof window !== "undefined" ? localStorage.getItem(`gutsense_display_name_${USER_ID}`) ?? "" : "",
          age: p.age ?? initialForm.age,
          sex: (p.sex as "male" | "female") ?? "male",
          height_cm: p.height_cm ?? initialForm.height_cm,
          weight_kg: p.weight_kg ?? initialForm.weight_kg,
          diet_type: p.diet_type ?? "vegetarian",
          activity_level: p.activity_level ?? "moderate",
          sleep_schedule: p.sleep_schedule ?? "",
          supplements: Array.isArray(p.supplements) ? p.supplements.join(", ") : "",
          medications: Array.isArray(p.medications) ? p.medications.join(", ") : "",
        });
        setIsNew(false);
      })
      .catch(() => {
        setIsNew(true);
        const storedName = typeof window !== "undefined" ? localStorage.getItem(`gutsense_display_name_${USER_ID}`) : null;
        setForm((f) => ({ ...f, name: storedName ?? "" }));
      })
      .finally(() => setLoading(false));
  }, []);

  const bmr = calcBMR(form.weight_kg, form.height_cm, form.age, form.sex);
  const tdee = calcTDEE(bmr, form.activity_level);
  const mult = ACTIVITY_MULTIPLIERS[form.activity_level] ?? 1.2;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        user_id: USER_ID,
        age: form.age,
        sex: form.sex,
        height_cm: form.height_cm,
        weight_kg: form.weight_kg,
        diet_type: form.diet_type,
        activity_level: form.activity_level,
        sleep_schedule: form.sleep_schedule,
        known_conditions: [] as string[],
        supplements: form.supplements ? form.supplements.split(",").map((s) => s.trim()).filter(Boolean) : [],
        medications: form.medications ? form.medications.split(",").map((s) => s.trim()).filter(Boolean) : [],
      };

      if (isNew) {
        await register(payload);
        toast.success("Profile registered successfully!");
      } else {
        await updateProfile(payload);
        toast.success("Profile updated successfully!");
      }

      if (form.name && typeof window !== "undefined") {
        localStorage.setItem(`gutsense_display_name_${USER_ID}`, form.name);
      }
      setIsNew(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-pulse">
        <div className="h-9 w-48 bg-slate-200 rounded" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="h-32 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="font-instrument text-3xl text-[var(--text)]">User Profile</h1>
        <p className="text-sm text-[var(--muted)] mt-1 font-ibm">
          Baseline profile and metabolic calculations
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div>
          <label className="text-xs font-ibm text-[var(--muted)] uppercase tracking-wider mb-2 block">
            Name (display only)
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Your name"
            className="w-full bg-white rounded-xl border border-[var(--border)] px-4 py-3 text-[var(--text)] font-jakarta outline-none focus:ring-2 focus:ring-[var(--blue)]/30"
          />
        </div>

        <div>
          <label className="text-xs font-ibm text-[var(--muted)] uppercase tracking-wider mb-2 block">
            Age
          </label>
          <input
            type="number"
            min={1}
            max={120}
            value={form.age}
            onChange={(e) => setForm((f) => ({ ...f, age: Number(e.target.value) || 0 }))}
            className="w-full bg-white rounded-xl border border-[var(--border)] px-4 py-3 text-[var(--text)] font-jakarta outline-none focus:ring-2 focus:ring-[var(--blue)]/30"
          />
        </div>

        <div>
          <label className="text-xs font-ibm text-[var(--muted)] uppercase tracking-wider mb-2 block">
            Sex
          </label>
          <select
            value={form.sex}
            onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value as "male" | "female" }))}
            className="w-full bg-white rounded-xl border border-[var(--border)] px-4 py-3 text-[var(--text)] font-jakarta outline-none focus:ring-2 focus:ring-[var(--blue)]/30"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-ibm text-[var(--muted)] uppercase tracking-wider mb-2 block">
            Height (cm)
          </label>
          <input
            type="number"
            min={50}
            max={250}
            step={0.1}
            value={form.height_cm}
            onChange={(e) => setForm((f) => ({ ...f, height_cm: Number(e.target.value) || 0 }))}
            className="w-full bg-white rounded-xl border border-[var(--border)] px-4 py-3 text-[var(--text)] font-jakarta outline-none focus:ring-2 focus:ring-[var(--blue)]/30"
          />
        </div>

        <div>
          <label className="text-xs font-ibm text-[var(--muted)] uppercase tracking-wider mb-2 block">
            Weight (kg)
          </label>
          <input
            type="number"
            min={20}
            max={300}
            step={0.1}
            value={form.weight_kg}
            onChange={(e) => setForm((f) => ({ ...f, weight_kg: Number(e.target.value) || 0 }))}
            className="w-full bg-white rounded-xl border border-[var(--border)] px-4 py-3 text-[var(--text)] font-jakarta outline-none focus:ring-2 focus:ring-[var(--blue)]/30"
          />
        </div>

        <div>
          <label className="text-xs font-ibm text-[var(--muted)] uppercase tracking-wider mb-2 block">
            Diet Type
          </label>
          <select
            value={form.diet_type}
            onChange={(e) => setForm((f) => ({ ...f, diet_type: e.target.value }))}
            className="w-full bg-white rounded-xl border border-[var(--border)] px-4 py-3 text-[var(--text)] font-jakarta outline-none focus:ring-2 focus:ring-[var(--blue)]/30"
          >
            <option value="vegetarian">Vegetarian</option>
            <option value="non-vegetarian">Non-vegetarian</option>
            <option value="vegan">Vegan</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-ibm text-[var(--muted)] uppercase tracking-wider mb-2 block">
            Activity Level
          </label>
          <select
            value={form.activity_level}
            onChange={(e) => setForm((f) => ({ ...f, activity_level: e.target.value }))}
            className="w-full bg-white rounded-xl border border-[var(--border)] px-4 py-3 text-[var(--text)] font-jakarta outline-none focus:ring-2 focus:ring-[var(--blue)]/30"
          >
            <option value="sedentary">Sedentary</option>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="heavy">Heavy</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-ibm text-[var(--muted)] uppercase tracking-wider mb-2 block">
            Sleep Schedule
          </label>
          <input
            type="text"
            value={form.sleep_schedule}
            onChange={(e) => setForm((f) => ({ ...f, sleep_schedule: e.target.value }))}
            placeholder="e.g. 23:00-06:30"
            className="w-full bg-white rounded-xl border border-[var(--border)] px-4 py-3 text-[var(--text)] font-jakarta outline-none focus:ring-2 focus:ring-[var(--blue)]/30"
          />
        </div>

        <div>
          <label className="text-xs font-ibm text-[var(--muted)] uppercase tracking-wider mb-2 block">
            Supplements (comma-separated)
          </label>
          <input
            type="text"
            value={form.supplements}
            onChange={(e) => setForm((f) => ({ ...f, supplements: e.target.value }))}
            placeholder="e.g. Vitamin D, Omega-3"
            className="w-full bg-white rounded-xl border border-[var(--border)] px-4 py-3 text-[var(--text)] font-jakarta outline-none focus:ring-2 focus:ring-[var(--blue)]/30"
          />
        </div>

        <div>
          <label className="text-xs font-ibm text-[var(--muted)] uppercase tracking-wider mb-2 block">
            Medications (comma-separated)
          </label>
          <input
            type="text"
            value={form.medications}
            onChange={(e) => setForm((f) => ({ ...f, medications: e.target.value }))}
            placeholder="e.g. Metformin"
            className="w-full bg-white rounded-xl border border-[var(--border)] px-4 py-3 text-[var(--text)] font-jakarta outline-none focus:ring-2 focus:ring-[var(--blue)]/30"
          />
        </div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-[var(--blue)] text-white font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {saving ? "Saving…" : isNew ? "Register Profile" : "Save Profile"}
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-2xl border border-[var(--border)] p-6"
      >
        <h3 className="text-xs font-ibm uppercase tracking-wider text-[var(--muted)] mb-4">
          Metabolic Calculations (live)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-[var(--muted)] font-ibm mb-1">BMR</p>
            <p className="text-2xl font-instrument text-[var(--text)]">
              <CountUp end={bmr} decimals={0} suffix=" kcal/day" />
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)] font-ibm mb-1">TDEE</p>
            <p className="text-2xl font-instrument text-[var(--text)]">
              <CountUp end={tdee} decimals={0} suffix=" kcal/day" />
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)] font-ibm mb-1">Activity Multiplier</p>
            <p className="text-2xl font-instrument text-[var(--text)]">
              <CountUp end={mult} decimals={3} />
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
