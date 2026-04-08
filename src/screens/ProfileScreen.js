import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Button, Card, Input, BottomModal, Row } from '../components';
import { colors, spacing, radius } from '../utils/theme';
import api from '../utils/api';

export default function ProfileScreen() {
  const { user, logout } = useStore();
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const handleLogout = () => Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign Out', style: 'destructive', onPress: logout },
  ]);

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      Alert.alert('Error', 'Both current and new passwords are required');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await api.auth.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      Alert.alert('Success', 'Password changed successfully');
      setShowPwModal(false);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const MENU_ITEMS = [
    { icon: 'key-outline', label: 'Change Password', onPress: () => setShowPwModal(true), color: colors.brand[400] },
    { icon: 'information-circle-outline', label: 'About Ganesh Carting', onPress: () => Alert.alert('Ganesh Carting', 'Fleet Management System\nVersion 1.0.0'), color: '#3b82f6' },
    { icon: 'log-out-outline', label: 'Sign Out', onPress: handleLogout, color: colors.red },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'A'}</Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Admin'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role?.toUpperCase() || 'ADMIN'}</Text>
        </View>
      </View>

      {/* Account Info */}
      <Card style={styles.infoCard}>
        <Text style={styles.cardLabel}>ACCOUNT INFORMATION</Text>
        <Row label="Name"  value={user?.name || '—'} />
        <Row label="Email" value={user?.email || '—'} />
        <Row label="Role"  value={user?.role || '—'} />
      </Card>

      {/* Menu */}
      <Card style={styles.menuCard}>
        {MENU_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.menuItem, i < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color + '22' }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <Text style={[styles.menuLabel, item.label === 'Sign Out' && { color: colors.red }]}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.surface[600]} />
          </TouchableOpacity>
        ))}
      </Card>

      {/* Backend Info */}
      <View style={styles.apiInfo}>
        <Ionicons name="server-outline" size={14} color={colors.surface[600]} />
        <Text style={styles.apiText}>Connected to: ganesh-carting.onrender.com</Text>
      </View>

      {/* Change Password Modal */}
      <BottomModal visible={showPwModal} onClose={() => setShowPwModal(false)} title="Change Password">
        <Input
          label="Current Password"
          icon="lock-closed-outline"
          value={pwForm.currentPassword}
          onChangeText={v => setPwForm(f => ({ ...f, currentPassword: v }))}
          secureTextEntry
          placeholder="Enter current password"
        />
        <Input
          label="New Password"
          icon="lock-open-outline"
          value={pwForm.newPassword}
          onChangeText={v => setPwForm(f => ({ ...f, newPassword: v }))}
          secureTextEntry
          placeholder="Minimum 6 characters"
        />
        <Input
          label="Confirm New Password"
          icon="lock-open-outline"
          value={pwForm.confirmPassword}
          onChangeText={v => setPwForm(f => ({ ...f, confirmPassword: v }))}
          secureTextEntry
          placeholder="Re-enter new password"
        />
        <Button title="Update Password" onPress={handleChangePassword} loading={saving} icon="checkmark-circle-outline" />
      </BottomModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.surface[950] },
  content:       { padding: spacing.lg, paddingBottom: 40 },
  profileHeader: { alignItems: 'center', paddingVertical: spacing['3xl'], gap: spacing.sm },
  avatarCircle:  {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: colors.brand[500] + '22',
    borderWidth: 2, borderColor: colors.brand[500] + '44',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText:  { fontSize: 36, fontWeight: '800', color: colors.brand[400] },
  userName:    { fontSize: 22, fontWeight: '700', color: colors.white },
  userEmail:   { fontSize: 14, color: colors.surface[400] },
  roleBadge:   { backgroundColor: colors.brand[500] + '22', borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: colors.brand[500] + '44', marginTop: spacing.xs },
  roleText:    { fontSize: 11, fontWeight: '700', color: colors.brand[400], letterSpacing: 1 },
  infoCard:    { marginBottom: spacing.lg },
  cardLabel:   { fontSize: 11, color: colors.surface[500], fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm },
  menuCard:    { marginBottom: spacing.lg, padding: 0, overflow: 'hidden' },
  menuItem:    { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface[800] },
  menuIcon:    { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  menuLabel:   { flex: 1, fontSize: 15, color: colors.white, fontWeight: '500' },
  apiInfo:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center', paddingVertical: spacing.lg },
  apiText:     { fontSize: 11, color: colors.surface[600] },
});
