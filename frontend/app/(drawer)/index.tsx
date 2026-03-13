import { AppStorage as AsyncStorage } from '@/lib/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Moon } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { API_BASE_URL } from '@/lib/config';

type AnalyticsData = {
  user_id: string;
  total_logs: number;
  avg_mood_rating: number;
  mood_trends: { date: string; mood: number }[];
  recent_insights: string[];
};

export default function DashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [userName, setUserName] = useState<string>('User');
  const insets = useSafeAreaInsets();

  const fetchAnalytics = async () => {
    try {
      const uId = await AsyncStorage.getItem('user_id');
      const uName = await AsyncStorage.getItem('user_name');
      if (uName) setUserName(uName);

      if (!uId) return;

      const res = await fetch(`${API_BASE_URL}/analytics/${uId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#0f172a', '#020617']} style={styles.container}>
      <View style={[styles.glow, { top: -150, right: -50 }]} />
      <View style={[styles.glow, { bottom: 100, left: -100, backgroundColor: 'rgba(168,85,247,0.15)' }]} />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 20, 60) }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.greeting}>Hello, {userName}</ThemedText>
          <ThemedText style={styles.title}>Your Wellness Overview</ThemedText>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={() => router.navigate('/(drawer)/food-logs')}>
            <LinearGradient colors={['#22c55e', '#16a34a']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.actionGradient}>
              <View style={styles.actionIconArea}><Camera size={24} color="#ffffff" /></View>
              <ThemedText style={styles.actionText}>Log Meal</ThemedText>
            </LinearGradient>
          </Pressable>
          
          <Pressable style={styles.actionBtn} onPress={() => router.navigate('/(drawer)/log-sleep')}>
            <LinearGradient colors={['#3b82f6', '#2563eb']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.actionGradient}>
              <View style={styles.actionIconArea}><Moon size={24} color="#ffffff" /></View>
              <ThemedText style={styles.actionText}>Log Sleep</ThemedText>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <LinearGradient colors={['rgba(56,189,248,0.1)', 'transparent']} style={StyleSheet.absoluteFill} />
            <ThemedText style={styles.statValue}>{data?.total_logs ?? 0}</ThemedText>
            <ThemedText style={styles.statLabel}>Total Meals Logged</ThemedText>
          </View>
          <View style={styles.statCard}>
            <LinearGradient colors={['rgba(168,85,247,0.1)', 'transparent']} style={StyleSheet.absoluteFill} />
            <ThemedText style={styles.statValue}>{data?.avg_mood_rating ? data.avg_mood_rating.toFixed(1) : '-'}</ThemedText>
            <ThemedText style={styles.statLabel}>Avg Mood Rating</ThemedText>
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Recent Insights</ThemedText>
          {data?.recent_insights && data.recent_insights.length > 0 ? (
            <View style={styles.insightsList}>
              {data.recent_insights.map((insight, idx) => (
                <View key={idx} style={styles.insightItem}>
                  <View style={styles.insightDot} />
                  <ThemedText style={styles.insightText}>{insight}</ThemedText>
                </View>
              ))}
            </View>
          ) : (
            <ThemedText style={styles.emptyText}>No insights generated yet. Log more meals to let GutSense analyze your patterns.</ThemedText>
          )}
        </View>

        {data?.mood_trends && data.mood_trends.length > 0 && (
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Recent Mood History</ThemedText>
            <View style={styles.trendsContainer}>
              {data.mood_trends.slice(-5).map((t, i) => (
                <View key={i} style={styles.trendRow}>
                  <ThemedText style={styles.trendDate}>{new Date(t.date).toLocaleDateString()}</ThemedText>
                  <View style={styles.moodBarBg}>
                    <LinearGradient 
                      colors={['#38bdf8', '#818cf8']} 
                      start={{x:0, y:0}} end={{x:1, y:0}}
                      style={[styles.moodBarFill, { width: `${(t.mood / 10) * 100}%` }]} 
                    />
                  </View>
                  <ThemedText style={styles.trendValue}>{t.mood}/10</ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingTop: 60 },
  header: { marginBottom: 32 },
  greeting: { color: '#94a3b8', fontSize: 18 },
  title: { fontSize: 32, lineHeight: 40, fontWeight: 'bold', color: '#ffffff', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  actionBtn: { flex: 1, height: 110, borderRadius: 24, overflow: 'hidden' },
  actionGradient: { flex: 1, padding: 20, justifyContent: 'space-between' },
  actionIconArea: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  actionText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statCard: {
    flex: 1,
    padding: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
    alignItems: 'center',
  },
  statValue: { fontSize: 42, lineHeight: 52, fontWeight: 'bold', color: '#ffffff' },
  statLabel: { fontSize: 14, color: '#94a3b8', marginTop: 4, textAlign: 'center' },
  card: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 24,
  },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 16 },
  insightsList: { gap: 16 },
  insightItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  insightDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#38bdf8', marginTop: 6 },
  insightText: { flex: 1, fontSize: 16, color: '#e2e8f0', lineHeight: 24 },
  emptyText: { color: '#64748b', fontSize: 16, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  trendsContainer: { gap: 16 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trendDate: { width: 60, color: '#94a3b8', fontSize: 12 },
  moodBarBg: { flex: 1, height: 8, backgroundColor: 'rgba(15,23,42,0.8)', borderRadius: 4, overflow: 'hidden' },
  moodBarFill: { height: '100%', borderRadius: 4 },
  trendValue: { width: 40, color: '#ffffff', fontSize: 14, fontWeight: '600', textAlign: 'right' },
  glow: { position: 'absolute', width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(56,189,248,0.15)' },
});

