import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMealWizardStore } from '../../../store/useMealWizardStore';
import { useAppStore } from '../../../store/useAppStore';
import { ApiServices } from '../../../api/services';
import { X, Plus, AlertCircle, Check } from 'lucide-react-native';

export default function MealStep2_FoodReview() {
  const router = useRouter();
  const { imageUri, setStage1And2, stage1 } = useMealWizardStore();
  const { profile } = useAppStore();
  
  const [loading, setLoading] = useState(true);
  const [customItem, setCustomItem] = useState('');
  const [items, setItems] = useState<string[]>([]);
  
  useEffect(() => {
    if (!imageUri) {
       router.replace('/log-meal');
       return;
    }
    if (!stage1) { // Only fetch if not already fetched this session
      processImage();
    } else {
      setItems(stage1.food_items);
      setLoading(false);
    }
  }, []);

  const processImage = async () => {
    try {
      const res = await ApiServices.logMealImage(imageUri!, profile?.user_id || 'guest');
      setStage1And2(res.stage1, res.stage2);
      setItems(res.stage1.food_items);
    } catch (e) {
      console.error(e);
      Alert.alert('Analysis Failed', 'Could not process the image. Please try again or add items manually.');
      // Create fallback dummy data so user can proceed manually if offline
      const fallbackS1 = { food_items: [], en_pred: "unknown", confidence: 0, source: "stub" as any, timestamp: new Date().toISOString() };
      const fallbackS2 = { items: [], totals: { calories_kcal: 0, carbohydrates_g: 0, protein_g: 0, fat_g: 0, fiber_g: 0, glycemic_load: 'unknown' as any, tryptophan_mg: 0, omega3_mg: 0, iron_mg: 0, magnesium_mg: 0, b6_mg: 0, b12_mcg: 0, zinc_mg: 0 }, timestamp: new Date().toISOString() };
      setStage1And2(fallbackS1, fallbackS2);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    if (customItem.trim()) {
      setItems([...items, customItem.trim()]);
      setCustomItem('');
    }
  };

  const removeItem = (i: number) => {
    setItems(items.filter((_, idx) => idx !== i));
  };

  const handleNext = () => {
    // Save modified items back to store
    if (stage1) {
       useMealWizardStore.setState({ stage1: { ...stage1, food_items: items } });
    }
    router.push('/log-meal/step3');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Analyzing meal...</Text>
      </View>
    );
  }

  const confidence = stage1?.confidence || 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {imageUri && <Image source={{ uri: imageUri }} style={styles.previewImage} />}
        
        {confidence < 0.5 && confidence > 0 && (
          <View style={styles.warningBox}>
            <AlertCircle color="#eab308" size={20} />
            <Text style={styles.warningText}>Low AI confidence. Please verify the items below.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Identified Foods</Text>
        
        <View style={styles.chipContainer}>
          {items.map((item, i) => (
            <View key={i} style={styles.chip}>
              <Text style={styles.chipText}>{item}</Text>
              <Pressable onPress={() => removeItem(i)} style={styles.chipClose}>
                <X color="#94a3b8" size={14} />
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Missing something? e.g. Apple"
            placeholderTextColor="#64748b"
            value={customItem}
            onChangeText={setCustomItem}
            onSubmitEditing={addItem}
          />
          <Pressable style={styles.addBtn} onPress={addItem}>
            <Plus color="#fff" size={20} />
          </Pressable>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>Looks Good</Text>
          <Check color="#fff" size={20} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#0ea5e9', marginTop: 16, fontSize: 16, fontWeight: '600' },
  scroll: { padding: 24, paddingBottom: 100 },
  previewImage: { width: '100%', height: 200, borderRadius: 16, marginBottom: 24 },
  warningBox: { flexDirection: 'row', backgroundColor: '#eab30820', padding: 16, borderRadius: 12, marginBottom: 24, alignItems: 'center', gap: 12 },
  warningText: { color: '#eab308', flex: 1, fontWeight: '500' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#f8fafc', marginBottom: 16 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chip: { flexDirection: 'row', backgroundColor: '#1e293b', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#334155' },
  chipText: { color: '#e2e8f0', fontSize: 16, textTransform: 'capitalize' },
  chipClose: { padding: 4, backgroundColor: '#334155', borderRadius: 12 },
  inputRow: { flexDirection: 'row', gap: 12 },
  input: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, color: '#f8fafc', borderWidth: 1, borderColor: '#334155', height: 50 },
  addBtn: { width: 50, height: 50, backgroundColor: '#0ea5e9', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: '#0f172ae0' },
  nextBtn: { backgroundColor: '#0ea5e9', padding: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' }
});
