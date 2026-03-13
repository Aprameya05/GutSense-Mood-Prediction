import { AppStorage as AsyncStorage } from '@/lib/storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { API_BASE_URL } from '@/lib/config';

type PipelineResponse = {
  stage1: { food_items?: string[]; confidence?: number; source?: string } & Record<string, unknown>;
  stage2: { totals?: Record<string, unknown> } & Record<string, unknown>;
  stage10: { insights?: string[] } & Record<string, unknown>;
  days_accumulated: number;
};

export default function FoodLogsScreen() {
  const router = useRouter();
  
  const EMOJIS = ['😄', '🙂', '😐', '😟', '😔', '😴', '🤯'];
  const RATINGS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

  const [mood, setMood] = useState({ moodEmoji: '😐', moodRating: '5', cognitiveState: 'clear', energyLevel: 'moderate', anxietyLevel: 'none' });
  const [digestion, setDigestion] = useState({ bloating: 'none', stoolQuality: '4', gasDiscomfort: 'none', fermentedFoodToday: false });
  const [sleep, setSleep] = useState({ sleepOnset: '', wakeTime: '', sleepQuality: 'good' });
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PipelineResponse | null>(null);
  const insets = useSafeAreaInsets();

  const pickImage = async (useCamera: boolean) => {
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant camera access.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!res.canceled) setImage(res.assets[0]);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant photo library access.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (!res.canceled) setImage(res.assets[0]);
    }
  };

  const runPipeline = async () => {
    if (!image) return Alert.alert('Meal image required', 'Please select a meal image first.');
    const uId = await AsyncStorage.getItem('user_id');
    if (!uId) return Alert.alert('Error', 'Not logged in. No user ID found.');

    try {
      setLoading(true);
      setResult(null);

      const requestPayload = {
        user_id: uId,
        mood: { ...mood, mood_rating: Number(mood.moodRating) || 5 },
        digestion: { ...digestion, stool_quality: Number(digestion.stoolQuality) || 4 },
        sleep: { sleep_onset: sleep.sleepOnset || null, wake_time: sleep.wakeTime || null, sleep_quality: sleep.sleepQuality, night_awakenings: 0, caffeine_after_14h: false, screen_before_bed_min: 30, last_meal_to_bed_hours: 3.0 },
        skip_groq: false,
      };

      const formData = new FormData();
      formData.append('request_json', JSON.stringify(requestPayload));
      formData.append('image', { uri: image.uri, name: image.fileName ?? 'meal.jpg', type: image.mimeType ?? 'image/jpeg' } as any);

      const response = await fetch(`${API_BASE_URL}/food-logs`, { method: 'POST', body: formData });
      
      if (!response.ok) {
        const errText = await response.text();
        try {
          const errJson = JSON.parse(errText);
          if (response.status === 400 && errJson.detail?.includes('No profile found')) {
            setLoading(false);
            return Alert.alert('Profile Required', 'Please complete your Baseline Profile settings to analyze logs.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Go to Profile', onPress: () => router.navigate('/(tabs)/profile') }
            ]);
          }
          throw new Error(errJson.detail || errText);
        } catch {
          throw new Error(errText);
        }
      }
      
      setResult(await response.json());
    } catch (error: any) {
      Alert.alert('Pipeline error', error.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0f172a', '#020617']} style={styles.container}>
      <View style={[styles.glow, { top: -100, right: -50 }]} />
      
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 20, 60), marginTop: 10 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Log Your Meal</ThemedText>
          <ThemedText style={styles.subtitle}>Upload a photo to analyze your food & gut proxy.</ThemedText>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>1. Meal Photo</ThemedText>
          <View style={styles.buttonRow}>
            <Pressable style={styles.outlineButton} onPress={() => pickImage(true)}>
              <ThemedText style={styles.outlineBtnText}>Take Photo</ThemedText>
            </Pressable>
            <Pressable style={styles.outlineButton} onPress={() => pickImage(false)}>
              <ThemedText style={styles.outlineBtnText}>Gallery</ThemedText>
            </Pressable>
          </View>
          {image && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: image.uri }} style={styles.imagePreview} />
              <ThemedText style={styles.successText}>✓ {image.fileName ?? 'Image selected'}</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>2. Mood & Gut</ThemedText>
          
          <ThemedText style={styles.label}>Emoji</ThemedText>
          <View style={styles.optionsRow}>
            {EMOJIS.map(e => (
              <Pressable key={e} onPress={() => setMood(x => ({...x, moodEmoji: e}))} style={[styles.optionCircle, mood.moodEmoji === e && styles.optionSelected]}>
                <ThemedText style={styles.emojiDisplay}>{e}</ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText style={[styles.label, { marginTop: 16 }]}>Rating (1-10)</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsRowScroll}>
            {RATINGS.map(r => (
              <Pressable key={r} onPress={() => setMood(x => ({...x, moodRating: r}))} style={[styles.optionCircle, mood.moodRating === r && styles.optionSelected]}>
                <ThemedText style={[styles.ratingDisplay, mood.moodRating === r && { color: '#0f172a' }]}>{r}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          <ThemedText style={[styles.label, { marginTop: 16 }]}>Bloating</ThemedText>
          <TextInput value={digestion.bloating} onChangeText={v => setDigestion(x => ({...x, bloating: v}))} style={styles.input} placeholder="none/mild/moderate" placeholderTextColor="#64748b" />
        </View>

        <Pressable onPress={runPipeline} disabled={loading} style={styles.runButtonContainer}>
          <LinearGradient colors={['#38bdf8', '#818cf8']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.runButton}>
            {loading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.runBtnText}>Analyze & Save Log</ThemedText>}
          </LinearGradient>
        </Pressable>

        {result && (
          <View style={[styles.card, { marginTop: 24 }]}>
            <ThemedText style={styles.cardTitle}>Analysis Results</ThemedText>
            <View style={styles.resultRow}>
              <ThemedText style={styles.label}>Identified:</ThemedText>
              <ThemedText style={styles.value}>{result.stage1?.food_items?.join(', ') || 'Unknown'}</ThemedText>
            </View>
            <View style={styles.resultRow}>
              <ThemedText style={styles.label}>Calories:</ThemedText>
              <ThemedText style={styles.value}>{String(result.stage2?.totals?.calories_kcal ?? 0)} kcal</ThemedText>
            </View>
            <View style={styles.resultRow}>
              <ThemedText style={styles.label}>Insights:</ThemedText>
              <View style={{ flex: 1 }}>
                {result.stage10?.insights?.map((i, idx) => <ThemedText key={idx} style={styles.insightText}>• {i}</ThemedText>)}
              </View>
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
  scrollContent: { padding: 24, paddingTop: 60 },
  header: { marginBottom: 32 },
  title: { fontSize: 32, lineHeight: 40, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 16, color: '#94a3b8', marginTop: 8 },
  card: { padding: 24, borderRadius: 24, backgroundColor: 'rgba(30, 41, 59, 0.4)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginBottom: 16 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  outlineButton: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#38bdf8', alignItems: 'center' },
  outlineBtnText: { color: '#38bdf8', fontWeight: '600' },
  imagePreviewContainer: { marginTop: 16, alignItems: 'center' },
  imagePreview: { width: '100%', height: 200, borderRadius: 12, resizeMode: 'cover' },
  successText: { color: '#4ade80', marginTop: 8, fontSize: 14 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  optionsRowScroll: { gap: 10, marginTop: 4, paddingBottom: 4 },
  optionCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(15,23,42,0.6)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.2)', alignItems: 'center', justifyContent: 'center' },
  optionSelected: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  emojiDisplay: { fontSize: 24 },
  ratingDisplay: { fontSize: 16, color: '#e2e8f0', fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  col: { flex: 1 },
  label: { color: '#94a3b8', fontSize: 14, marginBottom: 8 },
  value: { color: '#ffffff', fontSize: 16, fontWeight: '500', flex: 1, textAlign: 'right' },
  input: { backgroundColor: 'rgba(15, 23, 42, 0.6)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.2)', borderRadius: 12, color: '#fff', padding: 12, fontSize: 16 },
  runButtonContainer: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  runButton: { paddingVertical: 16, alignItems: 'center' },
  runBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
  insightText: { color: '#e2e8f0', fontSize: 14, marginBottom: 4 },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(56,189,248,0.15)' },
});
