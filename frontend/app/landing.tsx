import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  FlatList,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
// Using lucide-react-native for the mobile application
import { 
  Leaf, 
  Brain, 
  Activity, 
  ShieldCheck, 
  ArrowRight,
  Info
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: <Leaf size={24} color="#4ade80" />,
    title: 'Food-to-Mood Pipeline',
    description: 'Capture a meal photo and let our AI map it to gut proxies and emotional response.',
    accent: '#22c55e',
  },
  {
    id: '2',
    icon: <Brain size={24} color="#60a5fa" />,
    title: 'Gut–Brain Simplified',
    description: 'Track microbiome diversity and digestion stability without invasive wearables.',
    accent: '#3b82f6',
  },
  {
    id: '3',
    icon: <Activity size={24} color="#c084fc" />,
    title: 'Spot 30‑Day Patterns',
    description: 'Correlate fiber, sleep, and stress with energy across weeks, not just hours.',
    accent: '#a855f7',
  },
  {
    id: '4',
    icon: <ShieldCheck size={24} color="#fb923c" />,
    title: 'Actionable Insights',
    description: 'Research-backed suggestions staying firmly on the informational side of wellness.',
    accent: '#f97316',
  }
];

const MicrobiomeBackground = () => {
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[styles.glow, { top: -50, right: -50, backgroundColor: 'rgba(34, 197, 94, 0.15)' }]} />
      <View style={[styles.glow, { bottom: 100, left: -100, backgroundColor: 'rgba(59, 130, 246, 0.1)' }]} />
      {[...Array(15)].map((_, i) => (
        <View
          key={i}
          style={[
            styles.particle,
            {
              top: `${Math.random() * 100}%` as any,
              left: `${Math.random() * 100}%` as any,
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              opacity: Math.random() * 0.4 + 0.1,
            }
          ]}
        />
      ))}
    </View>
  );
};

export default function LandingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList | null>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      router.replace('/auth/login');
    }
  };

  const handleSignIn = () => {
    router.replace('/auth/login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <MicrobiomeBackground />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Activity size={20} color="#020617" strokeWidth={3} />
            </View>
            <Text style={styles.logoText}>GutSense</Text>
          </View>
          <TouchableOpacity style={styles.infoButton}>
            <Info size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroSection}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>BETA ACCESS OPEN</Text>
          </View>
          <Text style={styles.heroTitle}>
            Decoding the{'\n'}
            <Text style={styles.heroTitleHighlight}>Food-Mood Link</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Advanced biology proxies for your mental clarity and resilience.
          </Text>
        </View>

        <View style={styles.sliderContainer}>
          <FlatList
            ref={flatListRef}
            data={SLIDES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.slideWrapper}>
                <View style={styles.card}>
                  <View style={[styles.cardIconContainer, { backgroundColor: `${item.accent}20` }]}>
                    {item.icon}
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDescription}>{item.description}</Text>
                </View>
              </View>
            )}
          />

          <View style={styles.pagination}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  currentIndex === i && { 
                    width: 20, 
                    backgroundColor: SLIDES[i].accent 
                  }
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
            </Text>
            <ArrowRight size={20} color="#020617" strokeWidth={3} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={handleSignIn}>
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  safeArea: {
    flex: 1,
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.6,
  },
  particle: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    backgroundColor: '#22c55e',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  infoButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  heroSection: {
    paddingHorizontal: 24,
    marginTop: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginRight: 8,
  },
  badgeText: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: '#f8fafc',
    lineHeight: 44,
    letterSpacing: -1,
  },
  heroTitleHighlight: {
    color: '#22c55e',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 12,
    lineHeight: 24,
  },
  sliderContainer: {
    marginTop: 32,
    flex: 1,
  },
  slideWrapper: {
    width: width,
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 10,
  },
  cardDescription: {
    fontSize: 15,
    color: '#94a3b8',
    lineHeight: 22,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#334155',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 10 : 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#22c55e',
    height: 64,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: '#020617',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
});
