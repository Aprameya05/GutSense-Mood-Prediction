import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { ApiServices } from '../../api/services';
import { useRouter } from 'expo-router';
import { HeartPulse, Utensils, Moon, Activity, AlertCircle } from 'lucide-react-native';
import { getLocalTodayString } from '../../utils/date';

export default function DashboardScreen() {
  const router = useRouter();
  const { todayLog, daysLogged, riskUnlocked, setDailyLog, setProfile, profile } = useAppStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [riskCount, setRiskCount] = useState(0);
  const [latestLog, setLatestLog] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      const [logRes, profileRes] = await Promise.all([
        ApiServices.getLatestLog().catch(() => null),
        ApiServices.getProfile().catch(() => null)
      ]);
      
      if (logRes) {
        setLatestLog(logRes);
        setDailyLog(logRes.date, logRes);
      }
      if (profileRes) setProfile(profileRes);

      if (riskUnlocked) {
        const riskRes = await ApiServices.getRisks().catch(() => null);
        if (riskRes) setRiskCount(riskRes.risk_count);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [riskUnlocked, setDailyLog, setProfile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  const log = latestLog || ({ meals: [], daily_totals: { calories_kcal: 0, fiber_g: 0 }, sleep: null, daily_gut: null } as any);
  const mealCount = log.meals?.length || 0;
  
  const lastMeal = mealCount > 0 ? log.meals[mealCount - 1] : null;
  const moodEmoji = lastMeal?.stage4?.emoji_used || '0';
  const moodLabel = lastMeal?.stage4?.mood_label || '0';

  const mdi = log.daily_gut?.microbiome_diversity_index || 0;
  const getTrafficLight = (v: number) => {
    if (v > 0.6) return '#22c55e'; // Green
    if (v >= 0.4) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {profile?.user_id || 'Explorer'}</Text>
        <Text style={styles.subtitle}>Here is your day at a glance.</Text>
      </View>

      {/* Progress & Risks */}
      <View style={styles.topBannerRow}>
        {/* Removed Days Logged Banner as requested by user's prompt */}
        {riskCount > 0 && (
          <Pressable style={styles.alertBanner} onPress={() => router.push('/risk-monitor')}>
            <AlertCircle color="#ef4444" size={20} />
            <Text style={styles.alertText}>{riskCount} Active Flags</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.quickActions}>
        <Pressable style={styles.actionBtnPrimary} onPress={() => router.push('/log-meal')}>
          <Utensils color="#fff" size={20} />
          <Text style={styles.actionBtnTextPrimary}>Log Meal</Text>
        </Pressable>
        <Pressable style={styles.actionBtnSecondary} onPress={() => router.push('/log-sleep')}>
          <Moon color="#0ea5e9" size={20} />
          <Text style={styles.actionBtnTextSecondary}>Log Sleep</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Daily Metrics</Text>
      
      <View style={styles.grid}>
        {/* Meals Card */}
        <View style={styles.cardWrapper}>
          <View style={styles.card}>
            <Utensils color="#94a3b8" size={24} style={styles.cardIcon} />
            <Text style={styles.cardValue}>{mealCount}</Text>
            <Text style={styles.cardLabel}>Meals Logged</Text>
            <Text style={styles.cardSubtext}>{log.daily_totals?.carbohydrates_g || 0}g carbs</Text>
          </View>
        </View>

        {/* Gut Health Card */}
        <View style={styles.cardWrapper}>
          <View style={styles.card}>
            <HeartPulse color={getTrafficLight(mdi)} size={24} style={styles.cardIcon} />
            <Text style={styles.cardValue}>Gut Health</Text>
            <Text style={styles.cardLabel}>Diversity Proxy</Text>
            <Text style={styles.cardSubtext}>{log.daily_totals?.fiber_g || 0}g fiber logged</Text>
          </View>
        </View>

        {/* Latest Mood */}
        <View style={styles.cardWrapper}>
          <View style={styles.card}>
            <Text style={[styles.cardIcon, { fontSize: 24 }]}>{moodEmoji}</Text>
            <Text style={styles.cardValue} numberOfLines={1}>{moodLabel}</Text>
            <Text style={styles.cardLabel}>Latest Mood</Text>
          </View>
        </View>

        {/* Sleep Score */}
        <View style={styles.cardWrapper}>
          <View style={styles.card}>
            <Moon color="#94a3b8" size={24} style={styles.cardIcon} />
            <Text style={styles.cardValue}>{log.sleep?.sleep_hours || 0}h</Text>
            <Text style={styles.cardLabel}>Sleep log</Text>
            <Text style={styles.cardSubtext}>{log.sleep?.sleep_debt || 0}h debt</Text>
          </View>
        </View>
      </View>

      {mealCount === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Start your day! Log your first meal.</Text>
        </View>
      )}

      <View style={{height: 40}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 16 },
  greeting: { fontSize: 28, fontWeight: '800', color: '#f8fafc', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#94a3b8' },
  topBannerRow: { paddingHorizontal: 24, marginBottom: 20, gap: 12 },
  infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0ea5e920', padding: 12, borderRadius: 12, gap: 10 },
  infoText: { color: '#0ea5e9', fontWeight: '600' },
  alertBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef444420', padding: 12, borderRadius: 12, gap: 10 },
  alertText: { color: '#ef4444', fontWeight: '600' },
  quickActions: { flexDirection: 'row', paddingHorizontal: 24, gap: 16, marginBottom: 32 },
  actionBtnPrimary: { flex: 1, backgroundColor: '#0ea5e9', padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, elevation: 4 },
  actionBtnTextPrimary: { color: '#fff', fontWeight: '700', fontSize: 16 },
  actionBtnSecondary: { flex: 1, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  actionBtnTextSecondary: { color: '#0ea5e9', fontWeight: '700', fontSize: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#f8fafc', marginHorizontal: 24, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  cardWrapper: { width: '50%', padding: 8 },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#334155', height: 140 },
  cardIcon: { marginBottom: 12 },
  cardValue: { fontSize: 22, fontWeight: '800', color: '#f1f5f9', marginBottom: 4, textTransform: 'capitalize' },
  cardLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  cardSubtext: { fontSize: 12, color: '#64748b', marginTop: 8 },
  emptyState: { marginHorizontal: 24, marginTop: 24, padding: 24, backgroundColor: '#1e293b', borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyText: { color: '#94a3b8', fontSize: 16, fontWeight: '500' }
});
