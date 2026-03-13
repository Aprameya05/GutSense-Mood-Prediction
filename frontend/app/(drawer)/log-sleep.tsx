import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';

export default function LogSleepScreen() {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={['#0f172a', '#020617']} style={styles.container}>
      <View style={[styles.glow, { top: -100, right: -50 }]} />
      <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
        <ThemedText style={styles.title}>Log Sleep</ThemedText>
        <ThemedText style={styles.subtitle}>Stage 6 (Nightly Check-in)</ThemedText>
        <View style={styles.card}>
          <ThemedText style={styles.cardText}>Sleep metrics and Neuro-Stress Proxy (Stage 6) will go here.</ThemedText>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, flex: 1 },
  title: { fontSize: 32, lineHeight: 40, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 16, color: '#94a3b8', marginTop: 8, marginBottom: 32 },
  card: { padding: 24, borderRadius: 24, backgroundColor: 'rgba(30, 41, 59, 0.4)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  cardText: { color: '#94a3b8', fontSize: 16, lineHeight: 24 },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(56,189,248,0.15)' },
});
