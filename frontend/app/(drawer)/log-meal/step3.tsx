import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useMealWizardStore } from '../../../store/useMealWizardStore';
import { ArrowRight, Flame, Droplet, Beef, Wheat } from 'lucide-react-native';

export default function MealStep3_Nutrition() {
  const router = useRouter();
  const { stage2 } = useMealWizardStore();

  const handleNext = () => {
    router.push('/log-meal/step4');
  };

  const totals = stage2?.totals || {
    calories_kcal: 0, carbohydrates_g: 0, protein_g: 0, fat_g: 0, fiber_g: 0,
    tryptophan_mg: 0, omega3_mg: 0, iron_mg: 0, magnesium_mg: 0, b6_mg: 0, b12_mcg: 0, zinc_mg: 0
  } as any;

  const NutrientCard = ({ label, value, unit, icon: Icon, color }: any) => (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}>
        <Icon color={color} size={24} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardValue}>
          {typeof value === 'number' ? value.toFixed(1) : value}
          <Text style={styles.cardUnit}> {unit}</Text>
        </Text>
        <Text style={styles.cardLabel}>{label}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroBox}>
          <Text style={styles.heroValue}>{totals?.calories_kcal || 0}</Text>
          <Text style={styles.heroUnit}>kcal</Text>
        </View>

        <Text style={styles.sectionTitle}>Macros</Text>
        <View style={styles.grid}>
          <NutrientCard label="Carbs" value={totals.carbohydrates_g} unit="g" icon={Wheat} color="#eab308" />
          <NutrientCard label="Protein" value={totals.protein_g} unit="g" icon={Beef} color="#ef4444" />
          <NutrientCard label="Fat" value={totals.fat_g} unit="g" icon={Droplet} color="#f97316" />
          <NutrientCard label="Fiber" value={totals.fiber_g} unit="g" icon={Flame} color={totals.fiber_g > 8 ? '#22c55e' : '#0ea5e9'} />
        </View>

        <Text style={styles.sectionTitle}>Micronutrients</Text>
        <View style={styles.gridRow}>
          <View style={styles.microBox}><Text style={styles.microLabel}>Tryptophan</Text><Text style={styles.microValue}>{totals.tryptophan_mg} mg</Text></View>
          <View style={styles.microBox}><Text style={styles.microLabel}>Omega-3</Text><Text style={styles.microValue}>{totals.omega3_mg} mg</Text></View>
          <View style={styles.microBox}><Text style={styles.microLabel}>Iron</Text><Text style={styles.microValue}>{totals.iron_mg} mg</Text></View>
        </View>
        <View style={styles.gridRow}>
          <View style={styles.microBox}><Text style={styles.microLabel}>Magnesium</Text><Text style={styles.microValue}>{totals.magnesium_mg} mg</Text></View>
          <View style={styles.microBox}><Text style={styles.microLabel}>Vit B6</Text><Text style={styles.microValue}>{totals.b6_mg} mg</Text></View>
          <View style={styles.microBox}><Text style={styles.microLabel}>Vit B12</Text><Text style={[styles.microValue, totals.b12_mcg === 0 && { color: '#ef4444' }]}>{totals.b12_mcg} µg</Text></View>
        </View>

        {totals.b12_mcg === 0 && (
          <Text style={styles.warningText}>No B12 detected. If you are vegetarian, consider supplementation.</Text>
        )}

      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>Continue</Text>
          <ArrowRight color="#fff" size={20} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 24, paddingBottom: 100 },
  heroBox: { alignItems: 'center', marginBottom: 32, padding: 24, backgroundColor: '#1e293b', borderRadius: 24, borderWidth: 1, borderColor: '#334155' },
  heroValue: { fontSize: 64, fontWeight: '900', color: '#f8fafc' },
  heroUnit: { fontSize: 20, color: '#94a3b8', fontWeight: '600' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#f8fafc', marginBottom: 16, marginTop: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16 },
  card: { flexBasis: '47%', backgroundColor: '#1e293b', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { padding: 10, borderRadius: 12 },
  cardContent: { flex: 1 },
  cardValue: { fontSize: 18, fontWeight: '800', color: '#f8fafc' },
  cardUnit: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  cardLabel: { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 },
  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  microBox: { flex: 1, backgroundColor: '#1e293b', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  microLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  microValue: { fontSize: 14, color: '#e2e8f0', fontWeight: '700' },
  warningText: { color: '#ef4444', fontSize: 14, marginTop: 16, fontStyle: 'italic' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: '#0f172ae0' },
  nextBtn: { backgroundColor: '#0ea5e9', padding: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' }
});
