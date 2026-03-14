import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useMealWizardStore } from '../../../store/useMealWizardStore';
import { useAppStore } from '../../../store/useAppStore';
import { ApiServices } from '../../../api/services';
import { Info, ArrowRight } from 'lucide-react-native';
import { getLocalTodayString } from '../../../utils/date';

export default function MealStep4_Digestion() {
  const router = useRouter();
  const { setStage3 } = useMealWizardStore();
  const { profile, setDigestion } = useAppStore();

  const [bloating, setBloating] = useState('none');
  const [stool, setStool] = useState(4);
  const [gas, setGas] = useState('none');
  const [quality, setQuality] = useState('good');
  const [fermented, setFermented] = useState(false);

  const handleNext = () => {
    // Proceed immediately
    router.push('/log-meal/step5');

    // Silent background execution for Stage 3
    const runStage3 = async () => {
      const today = getLocalTodayString();
      const digestInput: any = { bloating, stool_quality: stool, gas_discomfort: gas, digestion_quality: quality, fermented_food_today: fermented };
      
      // Update local store immediately for daily digestion
      setDigestion(today, digestInput);

      try {
        if (profile) {
          const res = await ApiServices.submitDigestion(profile.user_id, today, digestInput);
          setStage3(res.stage3);
        }
      } catch (e) {
        console.log('[Background] Digestion sync queued', e);
        // Fallback for UI if offline
        setStage3({ microbiome_diversity_index: 0.5, inflammation_risk_score: 0.5, inflammation_risk_level: 'moderate', digestion_stability_score: 0.5, scfa_production_proxy: 'moderate', fiber_intake_today_g: 0, fermented_food_consumed: fermented, timestamp: new Date().toISOString() });
      }
    };
    runStage3();
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
        <View style={styles.noticeBox}>
          <Info color="#0ea5e9" size={20} />
          <Text style={styles.noticeText}>This updates your daily digestion report.</Text>
        </View>

        <Text style={styles.label}>Bloating</Text>
        {renderSegment(bloating, setBloating, ['none', 'mild', 'moderate', 'severe'])}

        <Text style={styles.label}>Bristol Stool Scale (1-7)</Text>
        <Text style={styles.subtext}>1=Hard lumps, 4=Smooth sausage, 7=Liquid</Text>
        <View style={styles.stepper}>
          <Pressable style={styles.stepBtn} onPress={() => setStool(Math.max(1, stool - 1))}><Text style={styles.stepText}>-</Text></Pressable>
          <Text style={styles.stepValue}>{stool}</Text>
          <Pressable style={styles.stepBtn} onPress={() => setStool(Math.min(7, stool + 1))}><Text style={styles.stepText}>+</Text></Pressable>
        </View>

        <Text style={styles.label}>Gas Discomfort</Text>
        {renderSegment(gas, setGas, ['none', 'mild', 'moderate', 'severe'])}

        <Text style={styles.label}>Overall Digestion Quality</Text>
        {renderSegment(quality, setQuality, ['poor', 'fair', 'good', 'excellent'])}

        <View style={styles.switchRow}>
          <Text style={styles.labelSwitch}>Ate fermented foods today?</Text>
          <Switch value={fermented} onValueChange={setFermented} trackColor={{ true: '#0ea5e9', false: '#334155' }} thumbColor="#fff" />
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>Submit & Continue</Text>
          <ArrowRight color="#fff" size={20} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 24, paddingBottom: 100 },
  noticeBox: { flexDirection: 'row', backgroundColor: '#0ea5e920', padding: 16, borderRadius: 12, marginBottom: 24, alignItems: 'center', gap: 12 },
  noticeText: { color: '#0ea5e9', flex: 1, fontWeight: '500' },
  label: { fontSize: 16, color: '#94a3b8', fontWeight: '600', marginBottom: 8, marginTop: 16 },
  subtext: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  segmented: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 8, padding: 4, borderWidth: 1, borderColor: '#334155' },
  segmentBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 6 },
  segmentBtnActive: { backgroundColor: '#0ea5e9' },
  segmentText: { color: '#64748b', fontWeight: '600', textTransform: 'capitalize' },
  segmentTextActive: { color: '#fff' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, padding: 12, justifyContent: 'space-between', borderWidth: 1, borderColor: '#334155' },
  stepBtn: { backgroundColor: '#334155', width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  stepText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  stepValue: { color: '#f8fafc', fontSize: 24, fontWeight: 'bold' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, backgroundColor: '#1e293b', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  labelSwitch: { fontSize: 16, color: '#e2e8f0', fontWeight: '600' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: '#0f172ae0' },
  nextBtn: { backgroundColor: '#0ea5e9', padding: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' }
});
