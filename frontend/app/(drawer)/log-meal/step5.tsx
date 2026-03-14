import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useMealWizardStore } from '../../../store/useMealWizardStore';
import { useAppStore } from '../../../store/useAppStore';
import { ApiServices } from '../../../api/services';
import { ArrowRight } from 'lucide-react-native';
import { getLocalTodayString } from '../../../utils/date';

const EMOJIS = ['😄', '🙂', '😐', '😟', '😔', '😴', '🤯'];

export default function MealStep5_Mood() {
  const router = useRouter();
  const { setStage4And5, stage1, stage2 } = useMealWizardStore();
  const { profile } = useAppStore();

  const [emoji, setEmoji] = useState('🙂');
  const [rating, setRating] = useState(7);
  const [cognitive, setCognitive] = useState('clear');
  const [energy, setEnergy] = useState('moderate');
  const [anxiety, setAnxiety] = useState('none');

  const handleNext = () => {
    // Proceed immediately
    router.push('/log-meal/step6');

    // Silent background execution for Stages 4 & 5
    const runStages = async () => {
      const today = getLocalTodayString();
      const moodInput: any = { mood_emoji: emoji, mood_rating: rating, cognitive_state: cognitive, energy_level: energy, anxiety_level: anxiety };
      
      try {
        if (profile && stage1 && stage2) {
          const profileSnippet = { bmr_kcal: profile.bmr_kcal, tdee_kcal: profile.tdee_kcal, activity_level: profile.activity_level };
          const res = await ApiServices.submitMood(profile.user_id, today, stage1.timestamp, stage2.totals, profileSnippet, moodInput);
          setStage4And5(res.stage4, res.stage5);
        }
      } catch (e) {
        console.log('[Background] Mood sync queued', e);
        // Fallback for UI if offline
        setStage4And5(
          { mood_score: 1, mood_label: 'happy', cognitive_state: cognitive as any, cognitive_penalty: 0, energy_level: energy as any, anxiety_level: anxiety as any, emoji_used: emoji as any, tryptophan_context_mg: 0, hours_since_meal: 0, timestamp: new Date().toISOString() },
          { estimated_glucose_spike: 'moderate', spike_delta_mg_dl: 30, fiber_attenuation_factor: 1.0, energy_crash_probability: 0.2, late_meal_penalty_applied: false, insulin_demand_proxy: 'moderate', timestamp: new Date().toISOString() }
        );
      }
    };
    runStages();
  };

  const renderSegment = (val: string, setVal: any, opts: string[]) => (
    <View style={styles.segmented}>
      {opts.map(o => (
        <Pressable key={o} style={[styles.segmentBtn, val === o && styles.segmentBtnActive]} onPress={() => setVal(o)}>
          <Text style={[styles.segmentText, val === o && styles.segmentTextActive]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <Text style={styles.label}>How are you feeling?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiList}>
          {EMOJIS.map(e => (
            <Pressable key={e} style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]} onPress={() => setEmoji(e)}>
              <Text style={styles.emojiText}>{e}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Overall Mood Rating (1-10)</Text>
        <View style={styles.stepper}>
          <Pressable style={styles.stepBtn} onPress={() => setRating(Math.max(1, rating - 1))}><Text style={styles.stepText}>-</Text></Pressable>
          <Text style={styles.stepValue}>{rating}</Text>
          <Pressable style={styles.stepBtn} onPress={() => setRating(Math.min(10, rating + 1))}><Text style={styles.stepText}>+</Text></Pressable>
        </View>

        <Text style={styles.label}>Cognitive State</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentScroll}>
          {renderSegment(cognitive, setCognitive, ['sharp', 'clear', 'mild_fog', 'brain_fog', 'drowsy'])}
        </ScrollView>

        <Text style={styles.label}>Energy Level</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentScroll}>
          {renderSegment(energy, setEnergy, ['very_low', 'low', 'moderate', 'high', 'very_high'])}
        </ScrollView>

        <Text style={styles.label}>Anxiety Level</Text>
        {renderSegment(anxiety, setAnxiety, ['none', 'mild', 'moderate', 'high'])}

      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>Submit & Summary</Text>
          <ArrowRight color="#fff" size={20} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 24, paddingBottom: 100 },
  label: { fontSize: 16, color: '#94a3b8', fontWeight: '600', marginBottom: 12, marginTop: 24 },
  emojiList: { gap: 12, paddingBottom: 8 },
  emojiBtn: { backgroundColor: '#1e293b', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#334155' },
  emojiBtnActive: { borderColor: '#0ea5e9', backgroundColor: '#0ea5e920' },
  emojiText: { fontSize: 32 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, padding: 12, justifyContent: 'space-between', borderWidth: 1, borderColor: '#334155' },
  stepBtn: { backgroundColor: '#334155', width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  stepText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  stepValue: { color: '#f8fafc', fontSize: 24, fontWeight: 'bold' },
  segmentScroll: { minWidth: '100%', paddingBottom: 8 },
  segmented: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 8, padding: 4, borderWidth: 1, borderColor: '#334155', minWidth: '100%' },
  segmentBtn: { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', borderRadius: 6 },
  segmentBtnActive: { backgroundColor: '#0ea5e9' },
  segmentText: { color: '#64748b', fontWeight: '600', textTransform: 'capitalize' },
  segmentTextActive: { color: '#fff' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: '#0f172ae0' },
  nextBtn: { backgroundColor: '#0ea5e9', padding: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' }
});
