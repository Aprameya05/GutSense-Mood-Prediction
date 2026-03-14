import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMealWizardStore } from '../../../store/useMealWizardStore';
import { Camera, Image as ImageIcon } from 'lucide-react-native';

export default function MealStep1_Camera() {
  const router = useRouter();
  const { setImageUri, resetWizard } = useMealWizardStore();

  useEffect(() => {
    resetWizard(); // Reset on fresh entry
    inferMealTime();
  }, []);

  const inferMealTime = () => {
    const hour = new Date().getHours();
    let computed: 'breakfast'|'lunch'|'snack'|'dinner' = 'snack';
    if (hour < 11) computed = 'breakfast';
    else if (hour < 15) computed = 'lunch';
    else if (hour >= 19) computed = 'dinner';
    useMealWizardStore.getState().setMealId(computed);
  };

  const verifyPermissions = async () => {
    const { status: currentCamera } = await ImagePicker.getCameraPermissionsAsync();
    if (currentCamera !== 'granted') await ImagePicker.requestCameraPermissionsAsync();
    
    const { status: currentLibrary } = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (currentLibrary !== 'granted') await ImagePicker.requestMediaLibraryPermissionsAsync();
  };

  const takePhoto = async () => {
    await verifyPermissions();
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      router.push('/log-meal/step2');
    }
  };

  const pickImage = async () => {
    await verifyPermissions();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      router.push('/log-meal/step2');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What are we eating?</Text>
      <Text style={styles.subtitle}>Snap a quick photo to instantly identify foods and nutritional content.</Text>

      <View style={styles.actions}>
        <Pressable style={styles.mainBtn} onPress={takePhoto}>
          <Camera color="#fff" size={48} />
          <Text style={styles.btnText}>Open Camera</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={pickImage}>
          <ImageIcon color="#0ea5e9" size={24} />
          <Text style={styles.secondaryText}>Choose from Gallery</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '800', color: '#f8fafc', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginBottom: 60, paddingHorizontal: 20 },
  actions: { gap: 24 },
  mainBtn: { backgroundColor: '#0ea5e9', height: 200, borderRadius: 24, justifyContent: 'center', alignItems: 'center', gap: 16, elevation: 8 },
  btnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#1e293b', padding: 20, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#334155' },
  secondaryText: { color: '#0ea5e9', fontSize: 18, fontWeight: '600' }
});
