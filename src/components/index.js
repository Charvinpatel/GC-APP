import React from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  TextInput, StyleSheet, Modal, ScrollView, Pressable,
  Dimensions, Animated
} from 'react-native';
import { colors, spacing, radius, typography, shadows, gradients } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import dayjs from 'dayjs';

const { width } = Dimensions.get('window');

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon, color = colors.brand[500], trend, trendUp, sub }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <LinearGradient
        colors={gradients.surface}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.statIcon, { backgroundColor: color + '15', borderColor: color + '30', borderWidth: 1 }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        {sub && <Text style={styles.statSub}>{sub}</Text>}
      </View>
      {trend !== undefined && (
        <View style={styles.statTrend}>
          <Ionicons name={trendUp ? 'arrow-up' : 'arrow-down'} size={10} color={trendUp ? colors.green : colors.red} />
          <Text style={[styles.statTrendText, { color: trendUp ? colors.green : colors.red }]}>{trend}</Text>
        </View>
      )}
    </View>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ title, onPress, loading, variant = 'primary', style, icon, small, outline, glow }) {
  const isPrimary = variant === 'primary';
  const isDanger  = variant === 'danger';
  const isGhost   = variant === 'ghost';
  const isSecondary = variant === 'secondary';

  let colorsList = gradients.brand;
  let textColor = '#fff';
  let borderColor = 'transparent';

  if (isDanger) colorsList = gradients.danger;
  if (isSecondary) colorsList = [colors.surface[800], colors.surface[900]];
  
  if (outline || isGhost) {
    textColor = isDanger ? colors.red : isPrimary ? colors.brand[400] : colors.surface[300];
    borderColor = isDanger ? colors.red + '66' : isPrimary ? colors.brand[400] + '66' : colors.surface[700];
    colorsList = ['transparent', 'transparent'];
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
      style={[
        styles.btn, 
        { borderColor, borderWidth: outline || isGhost ? 1 : 0, paddingVertical: small ? 8 : 14 }, 
        glow && isPrimary && shadows.brand,
        glow && isDanger && shadows.danger,
        style
      ]}
    >
      {!outline && !isGhost && (
        <LinearGradient
          colors={colorsList}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          borderRadius={radius.md}
        />
      )}
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon && <Ionicons name={icon} size={small ? 14 : 18} color={textColor} />}
          <Text style={[styles.btnText, { color: textColor, fontSize: small ? 13 : 15 }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, icon, style, inputStyle, rightElement, ...props }) {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <View style={[styles.inputWrap, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputRow, 
        isFocused && { borderColor: colors.brand[500], borderShadow: shadows.sm },
        error && { borderColor: colors.red }
      ]}>
        {icon && <Ionicons name={icon} size={18} color={isFocused ? colors.brand[400] : colors.surface[500]} style={{ marginRight: 10 }} />}
        <TextInput
          style={[styles.input, inputStyle]}
          placeholderTextColor={colors.surface[600]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {rightElement && rightElement}
      </View>
      {error && <Text style={styles.inputError}>{error}</Text>}
    </View>
  );
}

// ── DatePicker ────────────────────────────────────────────────────────────────
export function DatePicker({ label, date, onConfirm, mode = 'date', placeholder = 'Select Date' }) {
  const [show, setShow] = React.useState(false);
  const formattedDate = date ? dayjs(date).format('DD MMM YYYY') : placeholder;

  const onChange = (event, selectedDate) => {
    setShow(false);
    if (selectedDate) onConfirm(selectedDate);
  };

  return (
    <View style={styles.inputWrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity 
        style={styles.inputRow} 
        onPress={() => setShow(true)} 
        activeOpacity={0.8}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.brand[400]} style={{ marginRight: 10 }} />
        <Text style={[styles.input, { color: date ? colors.surface[200] : colors.surface[600] }]}>
          {formattedDate}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.surface[600]} />
      </TouchableOpacity>
      
      {show && (
        <DateTimePicker
          value={date ? new Date(date) : new Date()}
          mode={mode}
          display="default"
          onChange={onChange}
          themeVariant="dark"
          accentColor={colors.brand[500]}
        />
      )}
    </View>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ label, color = colors.surface[500] }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '15', borderColor: color + '30' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
export function SectionHeader({ title, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style, onPress, noPadding }) {
  const Content = (
    <View style={[styles.card, noPadding && { padding: 0 }, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        {Content}
      </TouchableOpacity>
    );
  }
  return Content;
}

// ── SkeletonLoader ────────────────────────────────────────────────────────────
export function SkeletonLoader({ width: w, height: h, borderRadius = radius.md, style }) {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View 
      style={[
        { width: w, height: h, borderRadius, backgroundColor: colors.surface[800], opacity },
        style
      ]} 
    />
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon = 'document-outline', message = 'No entries found' }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name={icon} size={32} color={colors.surface[600]} />
      </View>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

// ── BottomSheet Modal ─────────────────────────────────────────────────────────
export function BottomModal({ visible, onClose, title, children }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <Animated.View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={20} color={colors.surface[400]} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ paddingBottom: 40, paddingTop: 10 }}>
            {children}
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ── SelectPicker (custom dropdown) ───────────────────────────────────────────
export function SelectPicker({ label, value, options = [], onChange, placeholder = 'Choose option...' }) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <View style={styles.inputWrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.inputRow} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={[styles.input, { flex: 1, color: selected ? colors.surface[200] : colors.surface[600] }]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.surface[600]} />
      </TouchableOpacity>
      <BottomModal visible={open} onClose={() => setOpen(false)} title={label || 'Select'}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.optionRow, opt.value === value && styles.optionRowActive]}
            onPress={() => { onChange(opt.value); setOpen(false); }}
          >
            <Text style={[styles.optionText, opt.value === value && { color: colors.brand[400], fontWeight: '600' }]}>
              {opt.label}
            </Text>
            {opt.value === value && <Ionicons name="checkmark-circle" size={20} color={colors.brand[400]} />}
          </TouchableOpacity>
        ))}
      </BottomModal>
    </View>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ style }) {
  return <View style={[{ height: 1, backgroundColor: colors.surface[850], marginVertical: spacing.md }, style]} />;
}

// ── Row (Simple Label/Value Row) ─────────────────────────────────────────────
export function Row({ label, value, sub, valueColor = colors.surface[200], style }) {
  return (
    <View style={[styles.row, style]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Text style={[styles.rowValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

// ── GlassCard (Premium Futuristic Card) ──────────────────────────────────────
export function GlassCard({ children, style, onPress, glowColor }) {
  const Content = (
    <View style={[styles.glassCard, style, glowColor && { borderColor: glowColor + '40', ...shadows.sm }]}>
      <LinearGradient
        colors={gradients.glass}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        {Content}
      </TouchableOpacity>
    );
  }
  return Content;
}


// ── Loader ────────────────────────────────────────────────────────────────────
export function Loader() {
  return (
    <View style={styles.loaderWrap}>
      <ActivityIndicator color={colors.brand[500]} size="large" />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surface[800],
    overflow: 'hidden',
    position: 'relative',
    ...shadows.sm,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: 24, fontWeight: '900', color: colors.white, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: colors.surface[500], marginTop: 2, fontWeight: '700', textTransform: 'uppercase' },
  statSub:   { fontSize: 10, color: colors.surface[600], marginTop: 1 },
  statTrend: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  statTrendText: { fontSize: 11, fontWeight: '600' },

  btn: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, overflow: 'hidden' },
  btnText: { fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  inputWrap: { marginBottom: spacing.lg },
  label: { fontSize: 12, color: colors.surface[500], marginBottom: 8, fontWeight: '800', marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface[900] + '80',
    borderWidth: 1,
    borderColor: colors.surface[800],
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  input: { flex: 1, color: colors.surface[200], fontSize: 15, padding: 0, fontWeight: '600' },
  inputError: { fontSize: 12, color: colors.red, marginTop: 6, marginLeft: 4 },

  badge: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: colors.white, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionAction: { fontSize: 13, color: colors.brand[400], fontWeight: '800', textTransform: 'uppercase' },

  card: {
    backgroundColor: colors.surface[900],
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.surface[800],
    marginBottom: spacing.md,
    ...shadows.sm,
  },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surface[850] },
  rowLabel: { fontSize: 14, color: colors.surface[400], fontWeight: '600' },
  rowSub: { fontSize: 11, color: colors.surface[600], marginTop: 2 },
  rowValue: { fontSize: 14, fontWeight: '800' },

  glassCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: spacing.md,
    overflow: 'hidden',
    backgroundColor: colors.surface[950] + '40',
  },

  emptyState: { alignItems: 'center', paddingVertical: 80, gap: 16 },
  emptyIconCircle: { 
    width: 64, height: 64, 
    borderRadius: 32, 
    backgroundColor: colors.surface[850], 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surface[800]
  },
  emptyText: { fontSize: 15, color: colors.surface[500], fontWeight: '500' },

  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface[950] },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)' },
  modalSheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface[900],
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    maxHeight: '90%',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: 20,
    borderTopWidth: 1,
    borderColor: colors.surface[800],
    ...shadows.lg,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.surface[700],
    borderRadius: radius.full,
    alignSelf: 'center',
    marginTop: 12,
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: 20,
    paddingBottom: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.white },
  modalCloseBtn: { 
    width: 32, height: 32, 
    borderRadius: 16, 
    backgroundColor: colors.surface[800], 
    alignItems: 'center', 
    justifyContent: 'center' 
  },

  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface[850],
  },
  optionRowActive: { backgroundColor: colors.brand[500] + '08' },
  optionText: { fontSize: 15, color: colors.surface[300] },
});
