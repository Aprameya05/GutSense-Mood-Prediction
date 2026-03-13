import { AppStorage as AsyncStorage } from '@/lib/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { API_BASE_URL } from '@/lib/config';

type AuthResponse = {
  user_id: string;
  email: string;
  name: string;
};

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const insets = useSafeAreaInsets();

  // Auto-login check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userId = await AsyncStorage.getItem('user_id');
        if (userId) {
          router.replace('/(drawer)');
          return;
        }
      } catch (e) {
        console.error('Failed to grab auth from storage', e);
      } finally {
        setCheckingAuth(false);
        // Pre-fetch health status in background if desired
        fetch(`${API_BASE_URL}/health`).catch(() => {});
      }
    };
    void checkAuth();
  }, [router]);

  const toggleMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
  };

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing details', 'Email and password are required.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      Alert.alert('Missing name', 'Please add a display name.');
      return;
    }

    try {
      setLoading(true);
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const body =
        mode === 'login'
          ? { email: email.trim(), password }
          : { email: email.trim(), password, name: name.trim() };

      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || `Request failed with status ${res.status}`);
      }

      const json = (await res.json()) as AuthResponse;
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('user_id', json.user_id);
      await AsyncStorage.setItem('user_name', json.name);
      await AsyncStorage.setItem('user_email', email.trim());
      
      router.replace('/(drawer)');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Authentication error', message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <View style={{ flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  // Make card width responsive
  const cardWidth = width > 600 ? 500 : width * 0.9;

  return (
    <LinearGradient colors={['#0f172a', '#020617']} style={styles.container}>
      <View style={[styles.headerGlow, { top: -100, right: -100 }]} />
      <View style={[styles.headerGlow, { bottom: -100, left: -100, backgroundColor: 'rgba(168,85,247,0.2)' }]} />

      <View style={[styles.content, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.titleText}>
            {mode === 'login' ? 'Welcome Back' : 'Join GutSense'}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.subtitleText}>
            {mode === 'login' 
              ? 'Sign in to access your mind-gut pipeline.' 
              : 'Unlock AI-powered insights into your well-being.'}
          </ThemedText>
        </View>

        <View style={[styles.card, { width: cardWidth }]}>
          {mode === 'register' && (
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Name</ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="How should we call you?"
                placeholderTextColor="#64748b"
                style={styles.input}
                selectionColor="#38bdf8"
              />
            </View>
          )}
          
          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#64748b"
              style={styles.input}
              selectionColor="#38bdf8"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Password</ThemedText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              placeholderTextColor="#64748b"
              style={styles.input}
              selectionColor="#38bdf8"
            />
          </View>

          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.8 }]} onPress={submit} disabled={loading}>
            <LinearGradient
              colors={['#38bdf8', '#818cf8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                  {mode === 'login' ? 'Log in' : 'Sign up'}
                </ThemedText>
              )}
            </LinearGradient>
          </Pressable>
          
          <Pressable onPress={toggleMode} style={styles.secondaryButton}>
            <ThemedText style={styles.secondaryButtonText}>
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already registered? Log in'}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    zIndex: 10,
    width: '100%',
  },
  header: {
    gap: 8,
    marginBottom: 32,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  titleText: {
    fontSize: 36,
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(56, 189, 248, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  subtitleText: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 8,
  },
  card: {
    gap: 16,
    padding: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    color: '#ffffff',
    fontSize: 16,
  },
  primaryButton: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#38bdf8',
    shadowOpacity: 0.4,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    marginTop: 4,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  headerGlow: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 200,
    backgroundColor: 'rgba(56,189,248,0.2)',
  },
});

