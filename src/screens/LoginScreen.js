import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Dimensions, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeInDown, FadeInUp, Layout, 
  useAnimatedStyle, useSharedValue, withSpring, withTiming 
} from 'react-native-reanimated';
import { useStore } from '../store/useStore';
import { Input, Button } from '../components';
import { colors, spacing, radius, shadows, gradients } from '../utils/theme';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function LoginScreen() {
  const { login, register } = useStore();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole]       = useState('driver'); // Default to driver for signup
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  // Animation values
  const cardOpacity = useSharedValue(0);
  const cardY       = useSharedValue(50);

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 800 });
    cardY.value       = withSpring(0);
  }, []);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }));

  const handleAuth = async () => {
    const trimmedEmail = form.email.trim().toLowerCase();
    
    if (!trimmedEmail || !form.password) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'Please fill in all fields' });
      return;
    }

    if (!isLogin && !form.name.trim()) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'Please enter your name' });
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(trimmedEmail, form.password);
        Toast.show({ type: 'success', text1: 'Welcome!', text2: 'Logged in successfully' });
      } else {
        const payload = {
          name: form.name.trim(),
          email: trimmedEmail,
          password: form.password,
          role: role // 'driver' or 'admin'
        };
        await register(payload);
        Toast.show({ type: 'success', text1: 'Account Created', text2: `Welcome to Transport Pro, ${form.name.trim()}!` });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Authentication Failed', text2: err.message });
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* ── Futuristic Background ──────────────── */}
      <LinearGradient colors={[colors.surface[950], colors.surface[900]]} style={StyleSheet.absoluteFill} />
      <View style={styles.glowCircle1} />
      <View style={styles.glowCircle2} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          {/* ── Logo Section ────────────── */}
          <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.heroSection}>
            <View style={styles.logoBadge}>
               <LinearGradient colors={gradients.brand} style={styles.logoGradient}>
                 <Ionicons name="car-sport" size={42} color={colors.white} />
               </LinearGradient>
               <View style={styles.logoGlow} />
            </View>
            <Text style={styles.brandName}>GANESH<Text style={{ color: colors.brand[500] }}>.</Text></Text>
            <Text style={styles.brandSub}>TRANSPORT PRO</Text>
          </Animated.View>

          {/* ── Role Toggle ──────────────── */}
          {!isLogin && (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.roleToggle}>
              <TouchableOpacity 
                style={[styles.roleBtn, role === 'driver' && styles.roleBtnActive]} 
                onPress={() => setRole('driver')}
              >
                <Text style={[styles.roleText, role === 'driver' && styles.roleTextActive]}>DRIVER</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.roleBtn, role === 'admin' && styles.roleBtnActive]} 
                onPress={() => setRole('admin')}
              >
                <Text style={[styles.roleText, role === 'admin' && styles.roleTextActive]}>ADMIN</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ── Form Card ────────────────── */}
          <Animated.View style={[styles.card, animatedCardStyle]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
              <Text style={styles.cardSubtitle}>
                {isLogin ? 'Sign in to access your dashboard' : 'Join our transport network today'}
              </Text>
            </View>

            {!isLogin && (
              <Animated.View entering={FadeInDown.duration(300)}>
                <Input
                  label="Full Name"
                  icon="person-outline"
                  placeholder="John Doe"
                  value={form.name}
                  onChangeText={v => setForm({...form, name: v})}
                  style={styles.input}
                />
              </Animated.View>
            )}

            <Input
              label="Email Address"
              icon="mail-outline"
              placeholder="name@transport.com"
              value={form.email}
              onChangeText={v => setForm({...form, email: v})}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />

            <View style={{ position: 'relative' }}>
              <Input
                label="Password"
                icon="lock-closed-outline"
                placeholder="••••••••"
                value={form.password}
                onChangeText={v => setForm({...form, password: v})}
                secureTextEntry={!showPw}
                inputStyle={!showPw && form.password ? { letterSpacing: 4 } : {}}
              />
              <TouchableOpacity style={styles.pwToggle} onPress={() => setShowPw(!showPw)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.surface[500]} />
              </TouchableOpacity>
            </View>

            {isLogin && (
              <TouchableOpacity style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            <Button
              title={isLogin ? "Sign In" : "Register"}
              onPress={handleAuth}
              loading={loading}
              icon={isLogin ? "chevron-forward" : "person-add-outline"}
              style={styles.mainBtn}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {isLogin ? "Don't have an account?" : "Already have an account?"}
              </Text>
              <TouchableOpacity onPress={toggleMode}>
                <Text style={styles.toggleText}>{isLogin ? ' Sign Up' : ' Sign In'}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* App Version / Brand Footer */}
          <Text style={styles.versionInfo}>Powered by Ganesh Carting Logic v2.0</Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface[950] },
  
  glowCircle1: { 
    position: 'absolute', top: -100, right: -50, width: 300, height: 300, 
    borderRadius: 150, backgroundColor: colors.brand[500] + '12', zIndex: 0 
  },
  glowCircle2: { 
    position: 'absolute', bottom: -50, left: -50, width: 250, height: 250, 
    borderRadius: 125, backgroundColor: colors.brand[500] + '08', zIndex: 0 
  },

  scroll: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center' },
  
  heroSection: { alignItems: 'center', marginBottom: spacing['3xl'] },
  logoBadge: { width: 90, height: 90, marginBottom: spacing.lg, position: 'relative' },
  logoGradient: { flex: 1, borderRadius: 24, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  logoGlow: { position: 'absolute', inset: -8, backgroundColor: colors.brand[500] + '30', borderRadius: 32, filter: 'blur(10px)' },
  
  brandName: { fontSize: 36, fontWeight: '900', color: colors.white, letterSpacing: 2 },
  brandSub:  { fontSize: 12, fontWeight: '700', color: colors.brand[400], letterSpacing: 6, marginTop: -4 },

  roleToggle: { 
    flexDirection: 'row', 
    backgroundColor: colors.surface[900], 
    padding: 6, 
    borderRadius: radius.lg, 
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.surface[800]
  },
  roleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.md },
  roleBtnActive: { backgroundColor: colors.surface[800], ...shadows.sm },
  roleText: { fontSize: 13, fontWeight: '700', color: colors.surface[500] },
  roleTextActive: { color: colors.white },

  card: { 
    backgroundColor: colors.surface[900] + 'B0', 
    borderRadius: radius['3xl'], 
    padding: spacing.xl, 
    borderWidth: 1, 
    borderColor: colors.surface[800],
    ...shadows.xl 
  },
  cardHeader: { marginBottom: spacing.xl },
  cardTitle: { fontSize: 26, fontWeight: '800', color: colors.white, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: colors.surface[400], lineHeight: 20 },

  input: { marginBottom: spacing.lg },
  pwToggle: { position: 'absolute', right: 16, bottom: 18, padding: 4 },
  
  forgotBtn: { alignSelf: 'flex-end', marginTop: -spacing.sm, marginBottom: spacing.lg },
  forgotText: { fontSize: 13, color: colors.brand[400], fontWeight: '600' },
  
  mainBtn: { height: 58, borderRadius: radius.xl },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { fontSize: 14, color: colors.surface[400] },
  toggleText: { fontSize: 14, fontWeight: '700', color: colors.brand[400] },
  
  versionInfo: { textAlign: 'center', marginTop: spacing['2xl'], color: colors.surface[600], fontSize: 11, letterSpacing: 1 },
});
