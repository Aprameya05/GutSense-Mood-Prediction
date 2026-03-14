import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { ApiServices } from '../../api/services';
import { Lock, Navigation } from 'lucide-react-native';

const screenWidth = Dimensions.get('window').width - 48;

export default function BaselinesScreen() {
  const { daysLogged, baselinesUnlocked } = useAppStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (baselinesUnlocked) {
      ApiServices.getBaselines().then(setData).catch(e => console.log('Baselines:', e.message)).finally(() => setLoading(false));
    }
  }, [baselinesUnlocked]);

  if (!baselinesUnlocked) {
    return (
      <View style={[styles.container, styles.center]}>
        <Lock color="#334155" size={64} style={{ marginBottom: 24 }} />
        <Text style={styles.lockedTitle}>Baselines Locked</Text>
        <Text style={styles.lockedSub}>
          It takes 30 days to establish your personal biological baselines for accurate deviations.
        </Text>
        <Text style={styles.progressText}>You have logged {daysLogged}/30 days.</Text>
      </View>
    );
  }

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color="#0ea5e9" /></View>;

  const activeData = data || {
    all_baselines_stable: false,
    baseline_glucose_spike: 0,
    baseline_MDI: 0,
    baseline_inflammation_risk: 0,
    baseline_digestion_stability: 0,
    baseline_mood: 0,
    baseline_sleep_hours: 0,
    baseline_cognitive_score: 0,
    baseline_neuro_stress: 0,
    stability_details: {}
  };

  const getStabilityColor = (stable: boolean) => stable ? '#22c55e' : '#eab308';

  const BaselineBox = ({ label, value, unit, detailRef }: any) => {
    const detail = activeData.stability_details[detailRef];
    return (
      <View style={styles.bCard}>
        <Text style={styles.bLabel}>{label}</Text>
        <Text style={styles.bValue}>{typeof value === 'number' ? value.toFixed(2) : value} <Text style={styles.bUnit}>{unit}</Text></Text>
        {detail && (
          <View style={[styles.stableBadge, { backgroundColor: getStabilityColor(detail.stable) + '20' }]}>
            <Text style={{ color: getStabilityColor(detail.stable), fontSize: 12, fontWeight: '700' }}>
              {detail.stable ? 'Stable' : `Collecting (CV ${detail.cv_percent.toFixed(0)}%)`}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.heroBanner}>
          <Navigation color="#0ea5e9" size={32} />
          <View style={{ flex: 1 }}>
             <Text style={styles.heroTitle}>Your 30-Day Blueprint</Text>
             <Text style={styles.heroSub}>{activeData.all_baselines_stable ? 'All core metrics have reached statistical stability.' : 'Some metrics are still stabilizing.'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Metabolic & Gut</Text>
        <View style={styles.grid}>
          <BaselineBox label="Glucose Spike" value={activeData.baseline_glucose_spike} unit="" detailRef="inflammation" />
          <BaselineBox label="Diversity Proxy" value={activeData.baseline_MDI} unit="idx" detailRef="MDI" />
          <BaselineBox label="Inflammation Risk" value={activeData.baseline_inflammation_risk} unit="idx" detailRef="inflammation" />
          <BaselineBox label="Digestion Stability" value={activeData.baseline_digestion_stability} unit="score" detailRef="digestion_stability" />
        </View>

        <Text style={styles.sectionTitle}>Neuro & Routine</Text>
        <View style={styles.grid}>
          <BaselineBox label="Mood Average" value={activeData.baseline_mood} unit="/ 10" detailRef="mood" />
          <BaselineBox label="Sleep Duration" value={activeData.baseline_sleep_hours} unit="hrs" detailRef="sleep_hours" />
          <BaselineBox label="Cognitive Score" value={activeData.baseline_cognitive_score} unit="pts" detailRef="cognitive_score" />
          <BaselineBox label="Neuro Stress" value={activeData.baseline_neuro_stress} unit="idx" detailRef="neuro_stress" />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { padding: 24 },
  lockedTitle: { fontSize: 24, fontWeight: '700', color: '#f8fafc', marginBottom: 12 },
  lockedSub: { fontSize: 16, color: '#94a3b8', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  progressText: { fontSize: 18, color: '#0ea5e9', fontWeight: 'bold' },
  heroBanner: { flexDirection: 'row', backgroundColor: '#0ea5e915', padding: 24, borderRadius: 24, marginBottom: 32, alignItems: 'center', gap: 16, borderWidth: 1, borderColor: '#0ea5e940' },
  heroTitle: { color: '#0ea5e9', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  heroSub: { color: '#e2e8f0', fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#f8fafc', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  bCard: { width: '48%', backgroundColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  bLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  bValue: { color: '#f8fafc', fontSize: 22, fontWeight: '800', marginBottom: 12, textTransform: 'capitalize' },
  bUnit: { fontSize: 14, color: '#64748b' },
  stableBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }
});
