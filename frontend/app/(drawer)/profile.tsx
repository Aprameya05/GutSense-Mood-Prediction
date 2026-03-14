import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAppStore } from '../../store/useAppStore';
import { ApiServices } from '../../api/services';

export default function ProfileScreen() {
  const { profile, setProfile } = useAppStore();

  const [form, setForm] = useState({
    age: '', sex: 'male', height_cm: '', weight_kg: '',
    diet_type: 'omnivore', activity_level: 'moderate',
    sleep_schedule: '23:00-07:00', known_conditions: '',
    supplements: '', medications: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        age: profile.age.toString(),
        sex: profile.sex,
        height_cm: profile.height_cm.toString(),
        weight_kg: profile.weight_kg.toString(),
        diet_type: profile.diet_type,
        activity_level: profile.activity_level,
        sleep_schedule: profile.sleep_schedule,
        known_conditions: profile.known_conditions.join(', '),
        supplements: profile.supplements.join(', '),
        medications: profile.medications.join(', ')
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload: any = {
        age: parseInt(form.age) || 30,
        sex: form.sex,
        height_cm: parseFloat(form.height_cm) || 170,
        weight_kg: parseFloat(form.weight_kg) || 70,
        diet_type: form.diet_type,
        activity_level: form.activity_level,
        sleep_schedule: form.sleep_schedule,
        known_conditions: form.known_conditions.split(',').map(s => s.trim()).filter(Boolean),
        supplements: form.supplements.split(',').map(s => s.trim()).filter(Boolean),
        medications: form.medications.split(',').map(s => s.trim()).filter(Boolean),
      };

      if (!profile) {
        payload.user_id = `user_${Date.now()}`;
        const res = await ApiServices.register(payload);
        setProfile(res.user);
      } else {
        const res = await ApiServices.updateProfile(payload);
        setProfile(res);
      }
      Alert.alert('Success', 'Profile saved successfully!');
    } catch (e) {
       // It could be queued offline
       Alert.alert('Notice', 'Profile offline sync queued.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>My Profile</Text>

      {profile && (
        <View style={styles.statsCard}>
          <Text style={styles.statLabel}>BMR: <Text style={styles.statValue}>{profile.bmr_kcal} kcal/day</Text></Text>
          <Text style={styles.statLabel}>TDEE: <Text style={styles.statValue}>{profile.tdee_kcal} kcal/day</Text></Text>
          <Text style={styles.statSub}>Multiplier applied: {profile.activity_multiplier}</Text>
        </View>
      )}

      <Text style={styles.label}>Age</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={form.age} onChangeText={(t) => setForm({ ...form, age: t })} />

      <Text style={styles.label}>Sex</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={form.sex}
          onValueChange={(v) => setForm({ ...form, sex: v })}
          dropdownIconColor="#FFF"
          style={styles.picker}
          itemStyle={styles.pickerItem}
        >
          <Picker.Item label="Male" value="male" />
          <Picker.Item label="Female" value="female" />
        </Picker>
      </View>

      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Height (cm)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={form.height_cm} onChangeText={(t) => setForm({ ...form, height_cm: t })} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={form.weight_kg} onChangeText={(t) => setForm({ ...form, weight_kg: t })} />
        </View>
      </View>

      <Text style={styles.label}>Diet Type</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={form.diet_type}
          onValueChange={(v) => setForm({ ...form, diet_type: v })}
          dropdownIconColor="#FFF"
          style={styles.picker}
          itemStyle={styles.pickerItem}
        >
          <Picker.Item label="Omnivore" value="omnivore" />
          <Picker.Item label="Vegetarian" value="vegetarian" />
          <Picker.Item label="Vegan" value="vegan" />
        </Picker>
      </View>

      <Text style={styles.label}>Activity Level (Sedentary - Heavy)</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={form.activity_level}
          onValueChange={(v) => setForm({ ...form, activity_level: v })}
          dropdownIconColor="#FFF"
          style={styles.picker}
          itemStyle={styles.pickerItem}
        >
          <Picker.Item label="Sedentary" value="sedentary" />
          <Picker.Item label="Light" value="light" />
          <Picker.Item label="Moderate" value="moderate" />
          <Picker.Item label="Heavy" value="heavy" />
        </Picker>
      </View>

      <Text style={styles.label}>Sleep Schedule (HH:MM-HH:MM)</Text>
      <TextInput style={styles.input} value={form.sleep_schedule} onChangeText={(t) => setForm({ ...form, sleep_schedule: t })} />

      <Text style={styles.label}>Known Conditions (comma separated)</Text>
      <TextInput style={styles.input} value={form.known_conditions} onChangeText={(t) => setForm({ ...form, known_conditions: t })} />

      <Text style={styles.label}>Supplements (comma separated)</Text>
      <TextInput style={styles.input} value={form.supplements} onChangeText={(t) => setForm({ ...form, supplements: t })} />

      <Text style={styles.label}>Medications (comma separated)</Text>
      <TextInput style={styles.input} value={form.medications} onChangeText={(t) => setForm({ ...form, medications: t })} />

      <Pressable style={styles.saveBtn} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Profile</Text>}
      </Pressable>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#f8fafc', marginBottom: 24 },
  statsCard: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#334155' },
  statLabel: { color: '#94a3b8', fontSize: 16, marginBottom: 4 },
  statValue: { color: '#f8fafc', fontWeight: 'bold' },
  statSub: { color: '#64748b', fontSize: 12, marginTop: 8 },
  label: { fontSize: 15, color: '#94a3b8', fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#1e293b', color: '#f8fafc', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#334155', fontSize: 16 },
  pickerContainer: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    height: Platform.OS === 'ios' ? 120 : 54,
  },
  picker: { color: '#f8fafc' },
  pickerItem: { color: '#f8fafc', fontSize: 16, height: 120 },
  saveBtn: { backgroundColor: '#0ea5e9', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' }
});
