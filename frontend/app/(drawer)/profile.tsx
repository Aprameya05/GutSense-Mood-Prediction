import { AppStorage as AsyncStorage } from '@/lib/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { API_BASE_URL } from '@/lib/config';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Baseline Profile Fields
  const [profile, setProfile] = useState({
    age: '', sex: 'male', height_cm: '', weight_kg: '',
    activity_level: 'moderate', diet_type: 'non-vegetarian',
    sleep_schedule: '23:00-07:00'
  });

  useFocusEffect(
    useCallback(() => {
      const loadUser = async () => {
        try {
          const uName = await AsyncStorage.getItem('user_name');
          const uEmail = await AsyncStorage.getItem('user_email');
          const uId = await AsyncStorage.getItem('user_id');
          if (uName) setName(uName);
          if (uEmail) setEmail(uEmail);

          if (uId) {
            const res = await fetch(`${API_BASE_URL}/profile/${uId}`);
            if (res.ok) {
              const data = await res.json();
              setProfile({
                age: data.age?.toString() || '',
                sex: data.sex || 'male',
                height_cm: data.height_cm?.toString() || '',
                weight_kg: data.weight_kg?.toString() || '',
                activity_level: data.activity_level || 'moderate',
                diet_type: data.diet_type || 'non-vegetarian',
                sleep_schedule: data.sleep_schedule || '23:00-07:00'
              });
            }
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      loadUser();
    }, [])
  );

  const saveProfileData = async () => {
    if (!name.trim()) return Alert.alert('Invalid Name', 'Display name cannot be empty.');
    if (!profile.age || !profile.height_cm || !profile.weight_kg) {
      return Alert.alert('Missing Fields', 'Please fill in Age, Height, and Weight.');
    }
    
    try {
      setSaving(true);
      const uId = await AsyncStorage.getItem('user_id');
      if (!uId) throw new Error('No user ID found');

      await AsyncStorage.setItem('user_name', name.trim());
      
      const res = await fetch(`${API_BASE_URL}/profile/${uId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: parseInt(profile.age, 10),
          sex: profile.sex,
          height_cm: parseFloat(profile.height_cm),
          weight_kg: parseFloat(profile.weight_kg),
          activity_level: profile.activity_level,
          diet_type: profile.diet_type,
          sleep_schedule: profile.sleep_schedule
        })
      });

      if (!res.ok) throw new Error('Failed to save baseline profile to server');
      
      Alert.alert('Success', 'Profile and Baseline Info updated successfully.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to securely log out?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Log Out', 
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('user_id');
          await AsyncStorage.removeItem('user_name');
          await AsyncStorage.removeItem('user_email');
          router.replace('/auth/login');
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#0f172a', '#020617']} style={styles.container}>
      <View style={[styles.glow, { top: -100, right: -50 }]} />
      
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 20, 60) }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Profile Settings</ThemedText>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Account Identity</ThemedText>
          
          <ThemedText style={styles.label}>Display Name</ThemedText>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor="#64748b" selectionColor="#38bdf8" />

          <ThemedText style={[styles.label, { marginTop: 20 }]}>Email Address</ThemedText>
          <TextInput style={[styles.input, styles.inputDisabled]} value={email || 'Not provided'} editable={false} />
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Baseline Metrics (For Pipeline)</ThemedText>
          
          <View style={styles.row}>
            <View style={styles.col}>
              <ThemedText style={styles.label}>Age (years)</ThemedText>
              <TextInput style={styles.input} value={profile.age} onChangeText={v => setProfile(p => ({...p, age: v}))} keyboardType="numeric" placeholderTextColor="#64748b" />
            </View>
            <View style={styles.col}>
              <ThemedText style={styles.label}>Sex</ThemedText>
              <View style={styles.buttonRow}>
                {['male', 'female'].map(s => (
                  <Pressable key={s} onPress={() => setProfile(p => ({...p, sex: s}))} style={[styles.optionBtn, profile.sex === s && styles.optionBtnSelected]}>
                    <ThemedText style={[styles.optionText, profile.sex === s && styles.optionTextSelected]}>{s}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <ThemedText style={styles.label}>Height (cm)</ThemedText>
              <TextInput style={styles.input} value={profile.height_cm} onChangeText={v => setProfile(p => ({...p, height_cm: v}))} keyboardType="numeric" placeholderTextColor="#64748b" />
            </View>
            <View style={styles.col}>
              <ThemedText style={styles.label}>Weight (kg)</ThemedText>
              <TextInput style={styles.input} value={profile.weight_kg} onChangeText={v => setProfile(p => ({...p, weight_kg: v}))} keyboardType="numeric" placeholderTextColor="#64748b" />
            </View>
          </View>

          <ThemedText style={styles.label}>Activity Level</ThemedText>
          <View style={styles.buttonRowWrap}>
            {['sedentary', 'light', 'moderate', 'heavy'].map(a => (
              <Pressable key={a} onPress={() => setProfile(p => ({...p, activity_level: a}))} style={[styles.optionBtn, profile.activity_level === a && styles.optionBtnSelected]}>
                <ThemedText style={[styles.optionText, profile.activity_level === a && styles.optionTextSelected]}>{a}</ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText style={[styles.label, { marginTop: 16 }]}>Diet Type</ThemedText>
          <View style={styles.buttonRowWrap}>
            {['vegetarian', 'non-vegetarian', 'vegan'].map(d => (
              <Pressable key={d} onPress={() => setProfile(p => ({...p, diet_type: d}))} style={[styles.optionBtn, profile.diet_type === d && styles.optionBtnSelected]}>
                <ThemedText style={[styles.optionText, profile.diet_type === d && styles.optionTextSelected]}>{d}</ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText style={[styles.label, { marginTop: 16 }]}>Sleep Schedule (e.g. 23:00-07:00)</ThemedText>
          <TextInput style={styles.input} value={profile.sleep_schedule} onChangeText={v => setProfile(p => ({...p, sleep_schedule: v}))} placeholderTextColor="#64748b" />
          
          <Pressable style={styles.saveBigButton} onPress={saveProfileData} disabled={saving}>
            {saving ? <ActivityIndicator color="#0f172a" size="small" /> : <ThemedText style={styles.saveBigText}>Save Profile Info</ThemedText>}
          </Pressable>
        </View>

        <Pressable style={styles.logoutButton} onPress={logout}>
          <LinearGradient colors={['#ef4444', '#b91c1c']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.logoutGradient}>
            <ThemedText style={styles.logoutText}>Log Out securely</ThemedText>
          </LinearGradient>
        </Pressable>
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
  title: { fontSize: 32, lineHeight: 40, fontWeight: 'bold', color: '#ffffff' },
  card: { padding: 24, borderRadius: 24, backgroundColor: 'rgba(30, 41, 59, 0.4)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)', marginBottom: 24 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginBottom: 20 },
  label: { color: '#94a3b8', fontSize: 14, marginBottom: 8, fontWeight: '500' },
  input: { backgroundColor: 'rgba(15, 23, 42, 0.6)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.3)', borderRadius: 12, color: '#fff', padding: 14, fontSize: 16 },
  inputDisabled: { opacity: 0.6, backgroundColor: 'rgba(15, 23, 42, 0.2)' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  col: { flex: 1 },
  buttonRow: { flexDirection: 'row', gap: 8 },
  buttonRowWrap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(148,163,184,0.3)', backgroundColor: 'rgba(15, 23, 42, 0.6)' },
  optionBtnSelected: { borderColor: '#38bdf8', backgroundColor: '#38bdf8' },
  optionText: { color: '#94a3b8', fontSize: 14, textTransform: 'capitalize' },
  optionTextSelected: { color: '#0f172a', fontWeight: 'bold' },
  saveBigButton: { backgroundColor: '#38bdf8', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 24 },
  saveBigText: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
  logoutButton: { borderRadius: 16, overflow: 'hidden' },
  logoutGradient: { paddingVertical: 16, alignItems: 'center' },
  logoutText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(56,189,248,0.15)' },
});
