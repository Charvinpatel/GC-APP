import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Button, Card, Badge, EmptyState, BottomModal, Input, SelectPicker, Loader } from '../components';
import { colors, spacing, radius } from '../utils/theme';
import { getStatusColor } from '../utils/helpers';

const EMPTY = { number: '', type: 'truck', status: 'active', owner: '', notes: '' };
const TYPE_OPTS = [
  { label: 'Truck', value: 'truck' },
  { label: 'Tipper', value: 'tipper' },
  { label: 'JCB', value: 'jcb' },
  { label: 'Other', value: 'other' },
];
const STATUS_OPTS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'In Service', value: 'in-service' },
];

export default function VehiclesScreen() {
  const { vehicles, fetchVehicles, addVehicle, updateVehicle, deleteVehicle } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    try { await fetchVehicles({ limit: 100 }); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (v) => {
    setEditing(v);
    setForm({ number: v.number || '', type: v.type || 'truck', status: v.status || 'active', owner: v.owner || '', notes: v.notes || '' });
    setShowModal(true);
  };
  const save = async () => {
    if (!form.number) { Alert.alert('Error', 'Vehicle number is required'); return; }
    setSaving(true);
    try {
      if (editing) await updateVehicle(editing.id, form);
      else await addVehicle(form);
      setShowModal(false);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };
  const confirmDelete = (v) => Alert.alert('Delete Vehicle', `Delete ${v.number}?`, [
    { text: 'Delete', style: 'destructive', onPress: () => deleteVehicle(v.id) },
  ]);

  const filtered = vehicles.filter(v =>
    !search || v.number?.toLowerCase().includes(search.toLowerCase()) || v.owner?.toLowerCase().includes(search.toLowerCase()) || v.notes?.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item: v }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.plateBox}>
          <Text style={styles.plate}>{v.number}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.type}>{v.type?.toUpperCase() || 'VEHICLE'}</Text>
          {v.owner ? <Text style={styles.owner}>{v.owner}</Text> : null}
        </View>
        <Badge label={v.status} color={getStatusColor(v.status)} />
      </View>
      {v.notes ? <Text style={styles.notes}>{v.notes}</Text> : null}
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => openEdit(v)} style={styles.iconBtn}>
          <Ionicons name="pencil-outline" size={16} color={colors.surface[400]} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => confirmDelete(v)} style={[styles.iconBtn, { backgroundColor: colors.red + '18' }]}>
          <Ionicons name="trash-outline" size={16} color={colors.red} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (loading) return <Loader />;

  return (
    <View style={styles.container}>
      <View style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
        <Input
          icon="search-outline"
          placeholder="Search vehicles..."
          value={search}
          onChangeText={setSearch}
          style={{ marginBottom: 0 }}
          inputStyle={{ fontSize: 14 }}
        />
      </View>
      <Text style={styles.count}>{filtered.length} vehicles</Text>
      <FlatList
        data={filtered}
        keyExtractor={v => v.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />}
        ListEmptyComponent={<EmptyState icon="bus-outline" message="No vehicles found" />}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
      />
      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
      <BottomModal visible={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Vehicle' : 'Add Vehicle'}>
        <Input label="Vehicle Number *" icon="car-outline" value={form.number} onChangeText={v => setForm(f => ({ ...f, number: v }))} placeholder="GJ-XX-XXXX" autoCapitalize="characters" />
        <SelectPicker label="Type" value={form.type} options={TYPE_OPTS} onChange={v => setForm(f => ({ ...f, type: v }))} />
        <SelectPicker label="Status" value={form.status} options={STATUS_OPTS} onChange={v => setForm(f => ({ ...f, status: v }))} />
        <Input label="Owner" icon="person-outline" value={form.owner} onChangeText={v => setForm(f => ({ ...f, owner: v }))} placeholder="Owner name" />
        <Input label="Notes" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} placeholder="Optional..." multiline />
        <Button title={editing ? 'Update Vehicle' : 'Add Vehicle'} onPress={save} loading={saving} icon="checkmark-circle-outline" />
      </BottomModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface[950] },
  count: { fontSize: 12, color: colors.surface[500], paddingHorizontal: spacing.lg, marginBottom: 8 },
  list: { padding: spacing.lg, paddingBottom: 100 },
  card: {},
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  plateBox: {
    backgroundColor: colors.surface[800],
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1, borderColor: colors.surface[700],
  },
  plate:   { fontSize: 14, fontWeight: '800', color: colors.white, letterSpacing: 1 },
  type:    { fontSize: 13, fontWeight: '700', color: colors.surface[300] },
  owner:   { fontSize: 12, color: colors.surface[500], marginTop: 2 },
  notes:   { fontSize: 12, color: colors.surface[500], marginBottom: spacing.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.surface[800] },
  iconBtn: { width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.surface[800], alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.brand[500],
    alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: colors.brand[500], shadowOpacity: 0.4, shadowRadius: 12,
  },
});
