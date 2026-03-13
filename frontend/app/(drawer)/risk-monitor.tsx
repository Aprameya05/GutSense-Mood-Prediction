import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';

export default function RiskMonitorScreen() {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={['#0f172a', '#020617']} style={styles.container}>
      <View style={[styles.glow, { top: -100, right: -50, backgroundColor: 'rgba(239, 68, 68, 0.15)' }]} />
      <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
        <ThemedText style={styles.title}>Risk Monitor</ThemedText>
        <ThemedText style={styles.subtitle}>Stage 9 Detection</ThemedText>
        <View style={styles.lockCard}>
          <ThemedText style={styles.lockIcon}>🔒</ThemedText>
          <ThemedText style={styles.lockTitle}>Requires 7 Days of Logs</ThemedText>
          <ThemedText style={styles.cardText}>Neurological Risk Detection begins after collecting exactly one week of consecutive data profiles.</ThemedText>
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
  lockCard: { padding: 32, borderRadius: 24, backgroundColor: 'rgba(15, 23, 42, 0.6)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', alignItems: 'center' },
  lockIcon: { fontSize: 48, marginBottom: 16 },
  lockTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  cardText: { color: '#94a3b8', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
});
