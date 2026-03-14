import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../../store/useAppStore';
import { CalendarDays, ChevronRight, Moon, Utensils, Smile } from 'lucide-react-native';
import { getLocalTodayString, getLocalYesterdayString } from '../../../utils/date';

export default function HistoryListScreen() {
  const router = useRouter();
  const { dailyLogCache } = useAppStore();

  const days = useMemo(() => {
    return Object.entries(dailyLogCache).sort(([dateA], [dateB]) => {
      return new Date(dateB).getTime() - new Date(dateA).getTime(); 
    }).map(([date, log]) => ({ date, log: log as any }));
  }, [dailyLogCache]);

  const formatDateLabel = (dateString: string) => {
    const d = new Date(dateString);
    const today = getLocalTodayString();
    if (dateString === today) return 'Today';
    
    const yesterday = getLocalYesterdayString();
    if (dateString === yesterday) return 'Yesterday';
    
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <CalendarDays color="#0ea5e9" size={28} />
        <Text style={styles.title}>History Log</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {days.length === 0 ? (
          <View style={styles.emptyBox}>
             <Text style={styles.emptyText}>No logs found. Start logging your meals or sleep to populate your history.</Text>
          </View>
        ) : (
          days.map(({ date, log }) => {
            const mealsCount = log.meals?.length || 0;
            const sleepHrs = log.sleep?.sleep_hours || 0;
            const lastMeal = mealsCount > 0 ? log.meals[mealsCount - 1] : null;
            const mood = lastMeal?.stage4?.emoji_used || <Smile color="#94a3b8" size={16} />;

            return (
              <Pressable key={date} style={styles.dayCard} onPress={() => router.push(`/history/${date}`)}>
                <View style={styles.cardHeader}>
                  <Text style={styles.dateLabel}>{formatDateLabel(date)}</Text>
                  <Text style={styles.dateSub}>{date}</Text>
                </View>
                
                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <Utensils color="#94a3b8" size={16} />
                    <Text style={styles.metricVal}>{mealsCount}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Moon color="#94a3b8" size={16} />
                    <Text style={styles.metricVal}>{sleepHrs}h</Text>
                  </View>
                  <View style={styles.metric}>
                    {typeof mood === 'string' ? <Text style={{ fontSize: 16 }}>{mood}</Text> : mood}
                  </View>
                </View>
                
                <ChevronRight color="#334155" size={20} style={{ position: 'absolute', right: 16, top: 32 }} />
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  title: { fontSize: 24, fontWeight: '800', color: '#f8fafc' },
  scroll: { padding: 16, paddingBottom: 100 },
  emptyBox: { backgroundColor: '#1e293b', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyText: { color: '#94a3b8', textAlign: 'center', lineHeight: 22 },
  dayCard: { backgroundColor: '#1e293b', padding: 20, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', position: 'relative' },
  cardHeader: { flex: 1 },
  dateLabel: { fontSize: 18, color: '#f1f5f9', fontWeight: '700', marginBottom: 4 },
  dateSub: { fontSize: 13, color: '#64748b' },
  metricsRow: { flexDirection: 'row', gap: 16, marginRight: 24 },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  metricVal: { color: '#cbd5e1', fontWeight: 'bold' }
});
