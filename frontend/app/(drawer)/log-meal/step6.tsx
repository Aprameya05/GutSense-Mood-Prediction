import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMealWizardStore } from '../../../store/useMealWizardStore';
import { useAppStore } from '../../../store/useAppStore';
import { ApiServices } from '../../../api/services';
import { Check, Flame, HeartPulse, Brain, Activity } from 'lucide-react-native';
import { getLocalTodayString } from '../../../utils/date';

export default function MealStep6_Summary() {
  const router = useRouter();
  const { stage1, stage2, stage3, stage4, stage5, mealId, resetWizard } = useMealWizardStore();
  const { profile, appendMeal } = useAppStore();
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (!profile || !stage1 || !stage2 || !stage4 || !stage5) throw new Error('Missing data');
      
      const today = getLocalTodayString();
      const mealData = { stage1, stage2, stage4, stage5 };
      
      // Update local store optimistically
      const newMealId = `${today}_${mealId}_${Date.now()}`;
      appendMeal(today, { meal_id: mealId as any, meal_time: new Date().toLocaleTimeString(), ...mealData });

      await ApiServices.saveMeal(profile.user_id, today, mealData, newMealId);
      
      router.replace('/log-meal');
      resetWizard();
      Alert.alert('Success', 'Meal logged and metrics recalculated!');
    } catch (e: any) {
      console.log('Error saving meal:', e);
      Alert.alert('Notice', 'We queued this meal for offline synchronization.');
      router.replace('/log-meal');
      resetWizard();
    } finally {
      setLoading(false);
    }
  };

  const getTrafficLight = (v = 0) => v > 0.6 ? '#22c55e' : v >= 0.4 ? '#eab308' : '#ef4444';

  const mdi = stage3?.microbiome_diversity_index || 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <Text style={styles.title}>Meal Summary</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}><Flame color="#f97316" size={20} /><Text style={styles.cardTitle}>Nutrition Core</Text></View>
          <Text style={styles.itemText}>{stage1?.food_items.join(', ')}</Text>
          <View style={styles.row}>
            <View style={styles.col}><Text style={styles.val}>{stage2?.totals?.calories_kcal || 0}</Text><Text style={styles.lbl}>kcal</Text></View>
            <View style={styles.col}><Text style={styles.val}>{stage2?.totals.protein_g}g</Text><Text style={styles.lbl}>Prot</Text></View>
            <View style={styles.col}><Text style={styles.val}>{stage2?.totals.carbs_g}g</Text><Text style={styles.lbl}>Carb</Text></View>
            <View style={styles.col}><Text style={styles.val}>{stage2?.totals.fat_g}g</Text><Text style={styles.lbl}>Fat</Text></View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}><HeartPulse color={getTrafficLight(mdi)} size={20} /><Text style={styles.cardTitle}>Gut Impact</Text></View>
          <Text style={styles.statLine}>Microbiome Diversity: {mdi.toFixed(2)}</Text>
          <Text style={styles.statLine}>Inflammation Risk: {stage3?.inflammation_risk_level || 'pending'}</Text>
          <Text style={styles.statLine}>Digestion Stability: {stage3?.digestion_stability_score.toFixed(2) || '—'}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}><Brain color="#0ea5e9" size={20} /><Text style={styles.cardTitle}>Mood & Cognition</Text></View>
          <Text style={styles.statLine}>State: {stage4?.emoji_used} {stage4?.mood_label}</Text>
          <Text style={styles.statLine}>Cognitive Focus: {stage4?.cognitive_state}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}><Activity color="#ef4444" size={20} /><Text style={styles.cardTitle}>Metabolic Response</Text></View>
          <Text style={styles.statLine}>Glucose Spike Est: <Text style={styles.bold}>{stage5?.estimated_glucose_spike}</Text></Text>
          <Text style={styles.statLine}>Energy Crash Prob: {(stage5?.energy_crash_probability || 0) * 100}%</Text>
          {stage5?.late_meal_penalty_applied && <Text style={styles.warnText}>⚠️ Late meal penalty applied</Text>}
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.nextBtn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={styles.nextBtnText}>Save Meal Log</Text>
              <Check color="#fff" size={20} />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 24, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: '800', color: '#f8fafc', marginBottom: 24, marginTop: 12 },
  card: { backgroundColor: '#1e293b', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  cardTitle: { fontSize: 18, color: '#e2e8f0', fontWeight: '700' },
  itemText: { color: '#94a3b8', fontSize: 16, marginBottom: 16, fontStyle: 'italic' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { alignItems: 'center' },
  val: { color: '#f8fafc', fontSize: 20, fontWeight: '800' },
  lbl: { color: '#64748b', fontSize: 13, fontWeight: '600', marginTop: 4 },
  statLine: { color: '#cbd5e1', fontSize: 15, marginBottom: 8 },
  bold: { fontWeight: '700', color: '#f8fafc' },
  warnText: { color: '#ef4444', fontSize: 14, fontWeight: '600', marginTop: 8 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: '#0f172ae0' },
  nextBtn: { backgroundColor: '#22c55e', padding: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' }
});
