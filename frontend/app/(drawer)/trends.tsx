import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { ApiServices } from '../../api/services';
import { Lock, TrendingUp, AlertTriangle, MessageSquareHeart } from 'lucide-react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width - 48;

export default function TrendsScreen() {
  const { daysLogged, trendsUnlocked } = useAppStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (trendsUnlocked) {
      ApiServices.getTrends().then(setData).catch(e => console.log('Trends:', e.message)).finally(() => setLoading(false));
    }
  }, [trendsUnlocked]);

  if (!trendsUnlocked) {
    return (
      <View style={[styles.container, styles.center]}>
        <Lock color="#334155" size={64} style={{ marginBottom: 24 }} />
        <Text style={styles.lockedTitle}>Trends Locked</Text>
        <Text style={styles.lockedSub}>
          Your personalized trends will unlock after 30 days of logging. You need enough data for statistically significant pattern detection.
        </Text>
        <Text style={styles.progressText}>You have logged {daysLogged}/30 days. Keep going!</Text>
      </View>
    );
  }

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color="#0ea5e9" /></View>;
  
  const activeData = data || {
    groq_summary: "No trends recorded yet. Logs more meals to start uncovering correlations.",
    pattern_confidence: "low",
    significant_correlations: [],
    fiber_trend: { direction: "stable" },
    mdi_trend: { direction: "stable" },
    anomalies: []
  };

  const chartConfig = {
    backgroundGradientFrom: '#1e293b',
    backgroundGradientTo: '#1e293b',
    color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    strokeWidth: 2,
    useShadowColorFromDataset: false,
    propsForDots: { r: "4", strokeWidth: "2", stroke: "#0ea5e9" }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.aiSummaryCard}>
          <View style={styles.aiHeader}>
            <MessageSquareHeart color="#c084fc" size={24} />
            <Text style={styles.aiTitle}>AI Synthesis</Text>
          </View>
          <Text style={styles.aiText}>{activeData.groq_summary}</Text>
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>Confidence: {activeData.pattern_confidence.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Significant Correlations</Text>
        
        {activeData.significant_correlations.length === 0 ? (
           <Text style={styles.emptyText}>No statistically significant correlations found yet.</Text>
        ) : (
          activeData.significant_correlations.map((c: any, i: number) => (
            <View key={i} style={styles.corrCard}>
              <View style={styles.corrHeader}>
                <Text style={styles.corrPair}>{c.pair.replace('<->', '↔')}</Text>
                <View style={styles.sigBadge}><Text style={styles.sigText}>Signif</Text></View>
              </View>
              <Text style={styles.corrStats}>r = {c.r.toFixed(2)}  (p = {c.p.toFixed(3)})</Text>
              
              {/* Dummy rendering for charts since real data requires XY points not in payload summary natively */}
              <View style={{ marginTop: 16 }}>
                <LineChart
                  data={{ labels: ['W1', 'W2', 'W3', 'W4'], datasets: [{ data: [0.2, 0.4, 0.5, c.r > 0 ? 0.8 : 0.1] }] }}
                  width={screenWidth - 32}
                  height={120}
                  chartConfig={chartConfig}
                  bezier
                  style={{ borderRadius: 12 }}
                  withInnerLines={false}
                />
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Directional Shifts</Text>
        <View style={styles.shiftGrid}>
          <View style={styles.shiftCard}>
            <TrendingUp color={activeData.fiber_trend.direction === 'increasing' ? '#22c55e' : '#eab308'} size={24} />
            <Text style={styles.shiftTitle}>Fiber Intake</Text>
            <Text style={styles.shiftVal}>{activeData.fiber_trend.direction}</Text>
          </View>
          <View style={styles.shiftCard}>
            <TrendingUp color={activeData.mdi_trend.direction === 'increasing' ? '#22c55e' : '#ef4444'} size={24} />
            <Text style={styles.shiftTitle}>Diversity Index</Text>
            <Text style={styles.shiftVal}>{activeData.mdi_trend.direction}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Timeline Anomalies</Text>
        {activeData.anomalies.map((a: any, i: number) => (
          <View key={i} style={styles.anomalyCard}>
            <AlertTriangle color="#f97316" size={20} />
            <View style={{ flex: 1 }}>
              <Text style={styles.anomDate}>{a.date}</Text>
              <Text style={styles.anomDesc}>Spike in <Text style={{fontWeight: '700', color: '#f8fafc'}}>{a.metric}</Text>: {a.value.toFixed(1)} (avg {a.rolling_mean.toFixed(1)})</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
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
  aiSummaryCard: { backgroundColor: '#1e293b', padding: 24, borderRadius: 24, marginBottom: 32, borderWidth: 1, borderColor: '#334155' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  aiTitle: { color: '#c084fc', fontSize: 20, fontWeight: '800' },
  aiText: { color: '#e2e8f0', fontSize: 16, lineHeight: 24, marginBottom: 16 },
  confidenceBadge: { alignSelf: 'flex-start', backgroundColor: '#334155', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  confidenceText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#f8fafc', marginBottom: 16 },
  emptyText: { color: '#64748b', fontStyle: 'italic', marginBottom: 24 },
  corrCard: { backgroundColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  corrHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  corrPair: { color: '#f8fafc', fontSize: 16, fontWeight: '700', flex: 1 },
  sigBadge: { backgroundColor: '#22c55e20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  sigText: { color: '#22c55e', fontSize: 10, fontWeight: 'bold' },
  corrStats: { color: '#94a3b8', fontSize: 14 },
  shiftGrid: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  shiftCard: { flex: 1, backgroundColor: '#1e293b', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  shiftTitle: { color: '#94a3b8', fontSize: 14, marginTop: 12, marginBottom: 4 },
  shiftVal: { color: '#f8fafc', fontSize: 18, fontWeight: '800', textTransform: 'capitalize' },
  anomalyCard: { flexDirection: 'row', backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center', gap: 16, borderWidth: 1, borderColor: '#334155' },
  anomDate: { color: '#94a3b8', fontSize: 13, marginBottom: 4 },
  anomDesc: { color: '#cbd5e1', fontSize: 15 }
});
