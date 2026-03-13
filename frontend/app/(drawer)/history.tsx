import { AppStorage as AsyncStorage } from '@/lib/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { API_BASE_URL } from '@/lib/config';

type FoodLog = {
  _id: string;
  timestamp: string;
  stage1: { food_items?: string[] };
  stage2: { totals?: { calories_kcal?: number } };
  stage4: { mood_emoji?: string, mood_rating?: number };
};

export default function HistoryScreen() {
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();

  const fetchLogs = async (search = '') => {
    try {
      setLoading(true);
      const uId = await AsyncStorage.getItem('user_id');
      if (!uId) return;
      const res = await fetch(`${API_BASE_URL}/food-logs/${uId}?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLogs(searchQuery);
    }, [searchQuery])
  );

  const renderItem = ({ item }: { item: FoodLog }) => (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <ThemedText style={styles.foodText}>{item.stage1?.food_items?.join(', ') || 'Unknown Meal'}</ThemedText>
        <ThemedText style={styles.emojiText}>{item.stage4?.mood_emoji || '😐'} {item.stage4?.mood_rating || 5}/10</ThemedText>
      </View>
      <View style={styles.logFooter}>
        <ThemedText style={styles.dateText}>{new Date(item.timestamp).toLocaleString()}</ThemedText>
        <ThemedText style={styles.calText}>{item.stage2?.totals?.calories_kcal ? `${Math.round(item.stage2.totals.calories_kcal)} kcal` : ''}</ThemedText>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={['#0f172a', '#020617']} style={styles.container}>
      <View style={[styles.glow, { top: -100, left: -50 }]} />

      <View style={[styles.header, { paddingTop: Math.max(insets.top + 20, 60) }]}>
        <ThemedText style={styles.title}>History</ThemedText>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by food name..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading && logs.length === 0 ? (
        <View style={styles.center}><ActivityIndicator color="#38bdf8" size="large" /></View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <ThemedText style={styles.emptyText}>No food logs found.</ThemedText>
            </View>
          }
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  header: { padding: 24, paddingTop: 60, zIndex: 10 },
  title: { fontSize: 32, lineHeight: 40, fontWeight: 'bold', color: '#ffffff', marginBottom: 16 },
  searchInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    borderRadius: 12,
    color: '#fff',
    padding: 16,
    fontSize: 16,
  },
  listContent: { padding: 24, paddingBottom: 100 },
  logCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 16,
  },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  foodText: { fontSize: 18, fontWeight: '600', color: '#f8fafc', flex: 1, marginRight: 12 },
  emojiText: { fontSize: 20 },
  logFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 12, color: '#94a3b8' },
  calText: { fontSize: 14, color: '#38bdf8', fontWeight: '500' },
  emptyText: { color: '#64748b', fontSize: 16 },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(56,189,248,0.15)' },
});
