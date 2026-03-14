import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { ApiServices } from '../../api/services';
import { ShieldAlert, AlertTriangle, ShieldCheck, HeartCrack, Flame, Lock } from 'lucide-react-native';

export default function RiskMonitorScreen() {
  const { daysLogged, riskUnlocked } = useAppStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (riskUnlocked) {
      ApiServices.getRisks().then(setData).catch(e => console.log('Risks:', e.message)).finally(() => setLoading(false));
    }
  }, [riskUnlocked]);

  if (!riskUnlocked) {
    return (
      <View style={[styles.container, styles.center]}>
        <Lock color="#334155" size={64} style={{ marginBottom: 24 }} />
        <Text style={styles.lockedTitle}>Risk Monitor Locked</Text>
        <Text style={styles.lockedSub}>
          Accumulating accurate risk patterns requires at least 7 days of continuous data bridging diet, sleep, and mood.
        </Text>
        <Text style={styles.progressText}>You have logged {daysLogged}/7 days.</Text>
      </View>
    );
  }

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color="#0ea5e9" /></View>;

  const activeData = data || {
    neurological_risk_level: "none",
    risk_count: 0,
    active_flags: [],
    recommendation: "Continue logging data to unlock personalized AI wellness guidance.",
    professional_consult_suggested: false
  };

  const getRiskColor = (level: string) => {
    if (level === 'none') return '#22c55e';
    if (level === 'mild') return '#eab308';
    if (level === 'moderate') return '#f97316';
    return '#ef4444';
  };

  const getRiskIcon = (flag: string) => {
    switch(flag) {
      case 'persistent_brain_fog': return <HeartCrack color="#f97316" size={24} />;
      case 'chronic_sleep_debt': return <AlertTriangle color="#ef4444" size={24} />;
      case 'inflammation_persistence': return <Flame color="#ef4444" size={24} />;
      default: return <ShieldAlert color="#eab308" size={24} />;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.headerBox}>
          <Text style={styles.headerLabel}>Overall Risk Level</Text>
          <View style={[styles.levelBadge, { backgroundColor: `${getRiskColor(activeData.neurological_risk_level)}20`, borderColor: getRiskColor(activeData.neurological_risk_level) }]}>
            <Text style={[styles.levelText, { color: getRiskColor(activeData.neurological_risk_level) }]}>{activeData.neurological_risk_level.toUpperCase()}</Text>
          </View>
        </View>

        {activeData.risk_count === 0 ? (
          <View style={styles.allClearBox}>
            <ShieldCheck color="#22c55e" size={48} style={{ marginBottom: 16 }} />
            <Text style={styles.clearTitle}>All Clear</Text>
            <Text style={styles.clearSub}>No major neurological or metabolic risk patterns detected over your trailing data window. Keep up the good work!</Text>
          </View>
        ) : (
          <View style={styles.flagsList}>
            <Text style={styles.sectionTitle}>Active Pattern Flags</Text>
            {activeData.active_flags.map((flag: string) => (
              <View key={flag} style={styles.flagCard}>
                <View style={styles.flagIconBox}>{getRiskIcon(flag)}</View>
                <View style={styles.flagContent}>
                  <Text style={styles.flagTitle}>{flag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                  <Text style={styles.flagDesc}>Detected via Stage 9 pattern matching model.</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.recBox}>
          <Text style={styles.recTitle}>AI Recommendation</Text>
          <Text style={styles.recText}>{activeData.recommendation}</Text>
        </View>

        {activeData.professional_consult_suggested && (
          <View style={styles.consultBox}>
            <Text style={styles.consultText}>Based on your patterns, you may benefit from discussing these observations with a healthcare provider.</Text>
          </View>
        )}

      </ScrollView>

      {/* Mandatory Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          All observations are informational only. This is NOT medical advice and should NOT be used for diagnosis. Always consult a qualified healthcare professional.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { padding: 24, paddingBottom: 100 },
  lockedTitle: { fontSize: 24, fontWeight: '700', color: '#f8fafc', marginBottom: 12 },
  lockedSub: { fontSize: 16, color: '#94a3b8', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  progressText: { fontSize: 18, color: '#0ea5e9', fontWeight: 'bold' },
  headerBox: { alignItems: 'center', marginBottom: 32 },
  headerLabel: { color: '#94a3b8', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  levelBadge: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24, borderWidth: 2 },
  levelText: { fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  allClearBox: { backgroundColor: '#1e293b', padding: 32, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  clearTitle: { fontSize: 24, color: '#22c55e', fontWeight: 'bold', marginBottom: 12 },
  clearSub: { fontSize: 15, color: '#94a3b8', textAlign: 'center', lineHeight: 22 },
  flagsList: { marginBottom: 32 },
  sectionTitle: { fontSize: 20, color: '#f8fafc', fontWeight: '700', marginBottom: 16 },
  flagCard: { flexDirection: 'row', backgroundColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155', alignItems: 'center', gap: 16 },
  flagIconBox: { backgroundColor: '#0f172a', padding: 12, borderRadius: 12 },
  flagContent: { flex: 1 },
  flagTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  flagDesc: { color: '#94a3b8', fontSize: 13 },
  recBox: { backgroundColor: '#0ea5e910', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#0ea5e940', marginBottom: 24 },
  recTitle: { color: '#0ea5e9', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  recText: { color: '#e2e8f0', fontSize: 15, lineHeight: 22 },
  consultBox: { backgroundColor: '#ef444420', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ef444450' },
  consultText: { color: '#ef4444', fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  disclaimer: { backgroundColor: '#000', padding: 16, paddingBottom: 24 },
  disclaimerText: { color: '#64748b', fontSize: 11, textAlign: 'center', lineHeight: 16 }
});
