import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Button, Card, Badge, EmptyState, BottomModal, Input, SelectPicker, Loader } from '../components';
import { colors, spacing, radius } from '../utils/theme';
import { formatDate, getStatusColor } from '../utils/helpers';

const EMPTY = { name: '', phone: '', license: '', licenseExpiry: '', status: 'active' };
const STATUS_OPTS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'On Leave', value: 'on-leave' },
];

export default function DriversScreen() {
  const { drivers, driversMeta, fetchDrivers, addDriver, updateDriver, deleteDriver } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    try { await fetchDrivers({ limit: 100 }); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (d) => {
    setEditing(d);
    setForm({ name: d.name || '', phone: d.phone || '', license: d.license || '', licenseExpiry: d.licenseExpiry || '', status: d.status || 'active' });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name || !form.phone) { Alert.alert('Error', 'Name and phone are required'); return; }
    setSaving(true);
    try {
      if (editing) await updateDriver(editing.id, form);
      else await addDriver(form);
      setShowModal(false);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const confirmDelete = (d) => Alert.alert('Delete Driver', `Delete ${d.name}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteDriver(d.id) },
  ]);

  const filtered = drivers.filter(d =>
    !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.phone?.includes(search)
  );

  const renderItem = ({ item: d }) => {
    const statusColor = getStatusColor(d.status);
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{d.name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{d.name}</Text>
            <View style={styles.phoneLine}>
              <Ionicons name="call-outline" size={12} color={colors.surface[500]} />
              <Text style={styles.phone}>{d.phone}</Text>
            </View>
          </View>
          <Badge label={d.status} color={statusColor} />
        </View>

        {(d.license || d.licenseExpiry) ? (
          <View style={styles.licenseLine}>
            <Ionicons name="card-outline" size={12} color={colors.surface[500]} />
            <Text style={styles.licenseText}>
              {d.license || '—'}{d.licenseExpiry ? ` · Exp: ${formatDate(d.licenseExpiry)}` : ''}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => openEdit(d)} style={styles.iconBtn}>
            <Ionicons name="pencil-outline" size={16} color={colors.surface[400]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDelete(d)} style={[styles.iconBtn, { backgroundColor: colors.red + '18' }]}>
            <Ionicons name="trash-outline" size={16} color={colors.red} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  if (loading) return <Loader />;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Input
          icon="search-outline"
          placeholder="Search drivers..."
          value={search}
          onChangeText={setSearch}
          style={{ marginBottom: 0 }}
          inputStyle={{ fontSize: 14 }}
        />
      </View>
      <Text style={styles.count}>{filtered.length} drivers</Text>

      <FlatList
        data={filtered}
        keyExtractor={d => d.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />}
        ListEmptyComponent={<EmptyState icon="people-outline" message="No drivers found" />}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      <BottomModal visible={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Driver' : 'Add Driver'}>
        <Input label="Full Name *" icon="person-outline" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="John Doe" />
        <Input label="Phone *" icon="call-outline" value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} keyboardType="phone-pad" placeholder="+91 00000 00000" />
        <Input label="License Number" icon="card-outline" value={form.license} onChangeText={v => setForm(f => ({ ...f, license: v }))} placeholder="DL-XXXXXXXXXX" />
        <Input label="License Expiry" icon="calendar-outline" value={form.licenseExpiry} onChangeText={v => setForm(f => ({ ...f, licenseExpiry: v }))} placeholder="YYYY-MM-DD" />
        <SelectPicker label="Status" value={form.status} options={STATUS_OPTS} onChange={v => setForm(f => ({ ...f, status: v }))} />
        <Button title={editing ? 'Update Driver' : 'Add Driver'} onPress={save} loading={saving} icon="checkmark-circle-outline" />
      </BottomModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface[950] },
  searchBar: { padding: spacing.lg, paddingBottom: spacing.sm },
  count: { fontSize: 12, color: colors.surface[500], paddingHorizontal: spacing.lg, marginBottom: 4 },
  list: { padding: spacing.lg, paddingBottom: 100 },

  card: {},
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.brand[500] + '22',
    borderWidth: 1, borderColor: colors.brand[500] + '44',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.brand[400] },
  name: { fontSize: 15, fontWeight: '700', color: colors.white },
  phoneLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  phone: { fontSize: 12, color: colors.surface[400] },
  licenseLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  licenseText: { fontSize: 12, color: colors.surface[500] },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.surface[800] },
  iconBtn: { width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.surface[800], alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.brand[500],
    alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: colors.brand[500], shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
});
