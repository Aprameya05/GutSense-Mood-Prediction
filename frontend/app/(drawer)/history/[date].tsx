import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAppStore } from '../../../store/useAppStore';
import { Moon, Utensils, HeartPulse, Activity } from 'lucide-react-native';

export default function DayDrillDownScreen() {
  const { date } = useLocalSearchParams();
  const { dailyLogCache } = useAppStore();

  const log = dailyLogCache[date as string];

  if (!log) {
    return (
      <View style={styles.container}>
         <Text style={styles.title}>Data not found for {date}</Text>
      </View>
    );
  }

  const getTrafficLight = (v = 0) => v > 0.6 ? '#22c55e' : v >= 0.4 ? '#eab308' : '#ef4444';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{date}</Text>
        
        <View style={styles.totalsBox}>
          <Text style={styles.totalsLabel}>Daily Totals</Text>
          <View style={styles.totalsRow}>
            <View style={styles.col}><Text style={styles.tVal}>{log.daily_totals?.calories_kcal || 0}</Text><Text style={styles.tUnit}>kcal</Text></View>
            <View style={styles.col}><Text style={styles.tVal}>{log.daily_totals?.protein_g || 0}g</Text><Text style={styles.tUnit}>Prot</Text></View>
            <View style={styles.col}><Text style={styles.tVal}>{log.daily_totals?.carbohydrates_g || 0}g</Text><Text style={styles.tUnit}>Carb</Text></View>
            <View style={styles.col}><Text style={styles.tVal}>{log.daily_totals?.fat_g || 0}g</Text><Text style={styles.tUnit}>Fat</Text></View>
            <View style={styles.col}><Text style={styles.tVal}>{log.daily_totals?.fiber_g || 0}g</Text><Text style={styles.tUnit}>Fib</Text></View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Sleep Data</Text>
        <View style={styles.card}>
          <View style={styles.cardHead}><Moon color="#0ea5e9" size={20} /><Text style={styles.cardTitle}>Rest & Recovery</Text></View>
          <Text style={styles.stat}>Duration: <Text style={styles.bold}>{log.sleep?.sleep_hours || 0} hrs</Text></Text>
          <Text style={styles.stat}>Sleep Quality: <Text style={[styles.bold, { textTransform: 'capitalize' }]}>{log.sleep?.sleep_quality || '0'}</Text></Text>
          <Text style={styles.stat}>Sleep Debt: {log.sleep?.sleep_debt || 0} hrs</Text>
          <Text style={styles.stat}>Night Awakenings: {log.sleep?.night_awakenings || 0}</Text>
        </View>

        <Text style={styles.sectionTitle}>Daily Digestion</Text>
        <View style={styles.card}>
          <View style={styles.cardHead}><HeartPulse color={getTrafficLight(log.daily_gut?.microbiome_diversity_index)} size={20} /><Text style={styles.cardTitle}>Gut Status</Text></View>
          <Text style={styles.stat}>Diversity Index proxy: <Text style={styles.bold}>{(log.daily_gut?.microbiome_diversity_index || 0).toFixed(2)}</Text></Text>
          <Text style={styles.stat}>Inflammation Risk: <Text style={[styles.bold, { textTransform: 'capitalize' }]}>{log.daily_gut?.inflammation_risk_level || '0'}</Text></Text>
          <Text style={styles.stat}>Stability Score: <Text style={styles.bold}>{(log.daily_gut?.digestion_stability_score || 0).toFixed(2)}</Text></Text>
          <Text style={styles.stat}>SCFA Production: <Text style={[styles.bold, { textTransform: 'capitalize' }]}>{log.daily_gut?.scfa_production_proxy || '0'}</Text></Text>
        </View>

        <Text style={styles.sectionTitle}>Meals</Text>
        {log.meals?.length === 0 && <Text style={styles.emptyBlock}>0 meals logged.</Text>}
        {log.meals?.map((m: any, i: number) => (
          <View key={i} style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <Utensils color="#94a3b8" size={18} />
              <Text style={styles.mealTitle}>{m.meal_id}</Text>
              <Text style={styles.mealTime}>{m.meal_time}</Text>
            </View>
            <Text style={styles.mealItems}>{m.stage1?.food_items.join(', ')}</Text>
            
            <View style={styles.mealTagRow}>
               <View style={styles.mealTag}><Text style={styles.mealTagText}>{m.stage2?.totals?.calories_kcal || 0} kcal</Text></View>
               <View style={styles.mealTag}><Text style={styles.mealTagText}>{m.stage4?.emoji_used} {m.stage4?.mood_label}</Text></View>
               <View style={[styles.mealTag, { backgroundColor: '#ef444420', borderColor: '#ef444450' }]}><Text style={[styles.mealTagText, { color: '#ef4444' }]}>{m.stage5?.estimated_glucose_spike}</Text></View>
            </View>
          </View>
        ))}

        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#f8fafc', marginBottom: 24 },
  totalsBox: { backgroundColor: '#0ea5e915', padding: 20, borderRadius: 16, marginBottom: 32, borderWidth: 1, borderColor: '#0ea5e940' },
  totalsLabel: { color: '#0ea5e9', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { alignItems: 'center' },
  tVal: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
  tUnit: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#f8fafc', marginBottom: 16 },
  card: { backgroundColor: '#1e293b', padding: 20, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#334155' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  cardTitle: { color: '#e2e8f0', fontSize: 18, fontWeight: '700' },
  stat: { color: '#cbd5e1', fontSize: 15, marginBottom: 8 },
  bold: { color: '#f8fafc', fontWeight: 'bold' },
  empty: { color: '#64748b', fontStyle: 'italic' },
  emptyBlock: { color: '#64748b', fontStyle: 'italic', marginBottom: 24 },
  mealCard: { backgroundColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  mealTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700', textTransform: 'capitalize', flex: 1 },
  mealTime: { color: '#64748b', fontSize: 13 },
  mealItems: { color: '#94a3b8', fontStyle: 'italic', marginBottom: 16, lineHeight: 20 },
  mealTagRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  mealTag: { backgroundColor: '#334155', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#475569' },
  mealTagText: { color: '#cbd5e1', fontSize: 12, fontWeight: '600' }
});
