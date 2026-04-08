import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { useStore } from './src/store/useStore';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/utils/theme';

export default function App() {
  const { checkAuth, loading, hasInitialized } = useStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (loading && !hasInitialized) {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>🚛</Text>
        </View>
        <Text style={styles.appName}>GANESH</Text>
        <Text style={styles.appSub}>CARTING</Text>
        <ActivityIndicator
          color={colors.brand[500]}
          size="large"
          style={{ marginTop: 40 }}
        />
        <Text style={styles.loadingText}>Connecting to system...</Text>
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
  logoBox: {
    width: 80, height: 80,
    backgroundColor: colors.brand[500] + '22',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brand[500] + '44',
    marginBottom: 16,
  },
  logoText:    { fontSize: 36 },
  appName:     { fontSize: 32, fontWeight: '900', color: colors.white, letterSpacing: 6 },
  appSub:      { fontSize: 12, color: colors.brand[400], letterSpacing: 8, marginTop: -4, fontWeight: '700' },
  loadingText: { marginTop: 16, fontSize: 13, color: colors.surface[500] },
});
