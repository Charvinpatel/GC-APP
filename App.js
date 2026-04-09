import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar as RNStatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import Animated, { 
  FadeIn, FadeOut, 
  useAnimatedStyle, useSharedValue, 
  withRepeat, withSequence, withTiming, withDelay
} from 'react-native-reanimated';
import { useStore } from './src/store/useStore';
import AppNavigator from './src/navigation/AppNavigator';
import { colors, gradients } from './src/utils/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function App() {
  const { checkAuth, loading, hasInitialized, isAuthenticated } = useStore();

  useEffect(() => {
    checkAuth();
  }, []);

  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);

  useEffect(() => {
    if (loading) {
      logoScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1500 }),
          withTiming(0.95, { duration: 1500 })
        ),
        -1,
        true
      );
      logoOpacity.value = withTiming(1, { duration: 1000 });
    }
  }, [loading]);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const showSplash = loading || (isAuthenticated && !hasInitialized);

  if (showSplash) {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <LinearGradient colors={[colors.surface[950], colors.surface[900]]} style={StyleSheet.absoluteFill} />
        
        <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
          <LinearGradient colors={gradients.brand} style={styles.logoBox}>
            <Text style={styles.logoEmoji}>🚛</Text>
          </LinearGradient>
          <View style={styles.logoGlow} />
        </Animated.View>

        <Animated.View entering={FadeIn.delay(800)}>
          <Text style={styles.appName}>GANESH</Text>
          <Text style={styles.appSub}>TRANSPORT PRO</Text>
        </Animated.View>

        <View style={styles.loadingBarContainer}>
           <Animated.View 
             entering={FadeIn.delay(1200)}
             style={styles.loadingBar}
           />
        </View>
        <Text style={styles.loadingText}>Initializing secure connection...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <AppNavigator />
      <Toast />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.surface[950],
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 100, height: 100,
    marginBottom: 24,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    width: 90, height: 90,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  logoEmoji: { fontSize: 44 },
  logoGlow: {
    position: 'absolute',
    width: 110, height: 110,
    backgroundColor: colors.brand[500] + '30',
    borderRadius: 32,
    filter: 'blur(15px)',
    zIndex: 1,
  },
  appName:     { fontSize: 36, fontWeight: '900', color: colors.white, letterSpacing: 8, textAlign: 'center' },
  appSub:      { fontSize: 13, color: colors.brand[400], letterSpacing: 10, marginTop: -4, fontWeight: '700', textAlign: 'center' },
  
  loadingBarContainer: {
    width: 120,
    height: 4,
    backgroundColor: colors.surface[800],
    borderRadius: 2,
    marginTop: 48,
    overflow: 'hidden',
  },
  loadingBar: {
    width: '60%',
    height: '100%',
    backgroundColor: colors.brand[500],
    borderRadius: 2,
  },
  loadingText: { marginTop: 16, fontSize: 12, color: colors.surface[500], fontWeight: '500', letterSpacing: 0.5 },
});
