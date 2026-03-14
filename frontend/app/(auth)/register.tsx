import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ApiServices } from '../../api/services';
import { useAppStore } from '../../store/useAppStore';
import { Picker } from '@react-native-picker/picker';

export default function RegisterScreen() {
  const router = useRouter();
  const setProfile = useAppStore((state) => state.setProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [form, setForm] = useState({
    user_id: '',
    password: '',
    age: '30',
    sex: 'male',
    height_cm: '170',
    weight_kg: '70',
    diet_type: 'omnivore',
    activity_level: 'moderate',
  });

  const updateForm = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleRegister = async () => {
    if (!form.user_id.trim() || !form.password) {
      setError('User ID and Password are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        user_id: form.user_id.trim(),
        password: form.password,
        age: parseInt(form.age) || 30,
        sex: form.sex.toLowerCase() as 'male' | 'female',
        height_cm: parseFloat(form.height_cm) || 170,
        weight_kg: parseFloat(form.weight_kg) || 70,
        diet_type: form.diet_type.toLowerCase() as "vegetarian" | "non-vegetarian" | "vegan" | "omnivore",
        activity_level: form.activity_level.toLowerCase() as "sedentary" | "light" | "moderate" | "heavy",
      };

      const res = await ApiServices.register(payload);
      useAppStore.getState().setAuth(res.user.user_id, res.access_token);
      setProfile(res.user);
      router.replace('/(drawer)');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register. User ID may already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Create Profile</Text>
          <Text style={styles.subtitle}>Set up your baseline metrics for GutSense pipeline analysis.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Choose a User ID</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. balaji_001"
            placeholderTextColor="#666"
            value={form.user_id}
            onChangeText={(t) => updateForm('user_id', t)}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#666"
            value={form.password}
            onChangeText={(t) => updateForm('password', t)}
            secureTextEntry
            autoCapitalize="none"
          />

          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.age}
                onChangeText={(t) => updateForm('age', t)}
              />
            </View>
            <View style={styles.halfCol}>
              <Text style={styles.label}>Sex</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.sex}
                  onValueChange={(v) => updateForm('sex', v)}
                  dropdownIconColor="#FFF"
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  <Picker.Item label="Male" value="male" />
                  <Picker.Item label="Female" value="female" />
                </Picker>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Text style={styles.label}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.height_cm}
                onChangeText={(t) => updateForm('height_cm', t)}
              />
            </View>
            <View style={styles.halfCol}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.weight_kg}
                onChangeText={(t) => updateForm('weight_kg', t)}
              />
            </View>
          </View>

          <Text style={styles.label}>Diet Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form.diet_type}
              onValueChange={(v) => updateForm('diet_type', v)}
              dropdownIconColor="#FFF"
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="Omnivore" value="omnivore" />
              <Picker.Item label="Vegetarian" value="vegetarian" />
              <Picker.Item label="Vegan" value="vegan" />
            </Picker>
          </View>

          <Text style={styles.label}>Activity Level</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form.activity_level}
              onValueChange={(v) => updateForm('activity_level', v)}
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

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.submitButtonText}>Initialize Profile</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    lineHeight: 22,
  },
  form: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  halfCol: {
    flex: 1,
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: -8,
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    height: Platform.OS === 'ios' ? 120 : 54,
  },
  picker: {
    color: '#FFF',
  },
  pickerItem: {
    color: '#FFF',
    fontSize: 16,
    height: 120,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#00E5FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
});
