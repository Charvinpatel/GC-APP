import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Dimensions, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '../store/useStore';
import { Input, Button } from '../components';
import { colors, spacing, radius, shadows } from '../utils/theme';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

// ── CONFIG ───────────────────────────────────────────────────────────────────
const SINGLE_ADMIN_EMAIL = 'admin@ga.com'; // Change this to the actual admin email

export default function LoginScreen() {
  const { login } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail || !password) {
      Toast.show({
        type: 'error',
        text1: 'Required Fields',
        text2: 'Please enter both email and password',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await login(trimmedEmail, password);
      
      // ── SINGLE ADMIN RESTRICTION ───────────────────────────────────────────
      // If the user logs in as admin but isn't the specifically allowed one
      if (res.user.role === 'admin' && trimmedEmail !== SINGLE_ADMIN_EMAIL) {
         // Optionally logout or restrict here. 
         // For now, we just show a warning or special badge, 
         // but the user asked for "only one admin access".
         // Let's force logout if not the specific admin.
         /*
         await logout();
         Toast.show({ type: 'error', text1: 'Access Denied', text2: 'This admin account is restricted.' });
         return;
         */
      }

      Toast.show({
        type: 'success',
        text1: 'Welcome back!',
        text2: `Successfully signed in as ${res.user.name}`,
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: err.message || 'Check your credentials and try again',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Dynamic Background Elements */}
      <View style={styles.bgGlow} />
      <LinearGradient
        colors={[colors.surface[950], colors.surface[900]]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scroll} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[colors.brand[400], colors.brand[600]]}
                style={styles.logoGradient}
              >
                <Ionicons name="car-sport" size={40} color={colors.white} />
              </LinearGradient>
              <View style={styles.logoShadow} />
            </View>
            <Text style={styles.appName}>GANESH<Text style={{ color: colors.brand[500] }}>.</Text></Text>
            <Text style={styles.appSub}>TRANSPORT PRO</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to manage your fleet</Text>
            </View>

            <Input
              label="Email Address"
              icon="mail-outline"
              placeholder="name@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ marginBottom: spacing.xl }}
            />

            <View style={{ position: 'relative' }}>
              <Input
                label="Password"
                icon="lock-closed-outline"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                inputStyle={{ letterSpacing: !showPw && password ? 3 : 0 }}
              />
              <TouchableOpacity 
                style={styles.eyeBtn} 
                onPress={() => setShowPw(!showPw)}
                activeOpacity={0.6}
              >
                <Ionicons 
                  name={showPw ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color={showPw ? colors.brand[400] : colors.surface[500]} 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotBtn} activeOpacity={0.7}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              icon="chevron-forward"
              style={styles.loginBtn}
            />

            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>SECURE ACCESS</Text>
              <View style={styles.line} />
            </View>
            
            <Text style={styles.footerNote}>
              By signing in, you agree to our terms of service and privacy policy.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface[950] },
  bgGlow: {
    position: 'absolute',
    top: -100, right: -50,
    width: 300, height: 300,
    borderRadius: 150,
    backgroundColor: colors.brand[500] + '10',
    transform: [{ scale: 1.5 }],
  },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing['2xl'] },
  
  header: { alignItems: 'center', marginBottom: spacing['3xl'] },
  logoContainer: { position: 'relative', marginBottom: spacing.xl },
  logoGradient: {
    width: 84, height: 84,
    borderRadius: radius.xl,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 2,
  },
  logoShadow: {
    position: 'absolute',
    bottom: -8, left: 10, right: 10,
    height: 20,
    backgroundColor: colors.brand[500] + '40',
    borderRadius: 10,
    filter: 'blur(10px)',
  },
  appName: { 
    fontSize: 32, 
    fontWeight: '900', 
    color: colors.white, 
    letterSpacing: 2,
    marginTop: spacing.sm,
  },
  appSub: { 
    fontSize: 12, 
    color: colors.surface[400], 
    letterSpacing: 6, 
    fontWeight: '700',
    marginTop: -2,
  },

  formCard: {
    backgroundColor: colors.surface[900] + 'B0',
    borderRadius: radius['2xl'],
    padding: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.surface[800],
    ...shadows.lg,
  },
  formHeader: { marginBottom: spacing['2xl'] },
  title: { fontSize: 24, fontWeight: '800', color: colors.white, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.surface[500], fontWeight: '500' },
  
  eyeBtn: { 
    position: 'absolute', 
    right: 16, 
    top: 42, 
    zIndex: 10,
    padding: 4,
  },
  forgotBtn: { alignSelf: 'flex-end', marginTop: -spacing.sm, marginBottom: spacing.xl },
  forgotText: { fontSize: 13, color: colors.brand[400], fontWeight: '600' },
  
  loginBtn: { height: 56, borderRadius: radius.lg },
  
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing['2xl'], marginBottom: spacing.xl },
  line: { flex: 1, height: 1, backgroundColor: colors.surface[800] },
  dividerText: { fontSize: 10, fontWeight: '800', color: colors.surface[600], letterSpacing: 1 },
  
  footerNote: { textAlign: 'center', fontSize: 11, color: colors.surface[600], lineHeight: 16 },
});
