import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Button, Card, Badge, EmptyState, BottomModal, Input, SelectPicker, Loader } from '../components';
import { colors, spacing, radius } from '../utils/theme';

const TYPE_OPTS = [
  { label: 'Source',      value: 'source' },
  { label: 'Destination', value: 'destination' },
  { label: 'Both',        value: 'both' },
];

const TYPE_COLORS = {
  source:      '#3b82f6',
  destination: colors.green,
  both:        colors.brand[500],
};

export default function LocationsScreen() {
  const { locations, locationsMeta, fetchLocations, addLocation, deleteLocation } = useStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'source' });
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    try { await fetchLocations({ limit: 200, type: typeFilter }); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, [typeFilter]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const save = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Location name is required'); return; }
    setSaving(true);
    try {
      await addLocation(form);
      setShowModal(false);
      setForm({ name: '', type: 'source' });
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const confirmDelete = (loc) => Alert.alert('Delete Location', `Delete "${loc.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteLocation(loc.id) },
  ]);

  const FILTER_OPTS = [{ label: 'All', value: '' }, ...TYPE_OPTS];

  const filtered = locations.filter(l => {
    const matchType = !typeFilter || l.type === typeFilter || l.type === 'both';
    const matchSearch = !search || l.name?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const renderItem = ({ item: loc }) => {
    const typeColor = TYPE_COLORS[loc.type] || colors.surface[400];
    return (
      <Card style={styles.card}>
        <View style={styles.cardRow}>
          <View style={[styles.iconCircle, { backgroundColor: typeColor + '22' }]}>
            <Ionicons name="location" size={18} color={typeColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.locName}>{loc.name}</Text>
            <Badge label={loc.type} color={typeColor} />
          </View>
          <TouchableOpacity onPress={() => confirmDelete(loc)} style={[styles.iconBtn, { backgroundColor: colors.red + '18' }]}>
            <Ionicons name="trash-outline" size={15} color={colors.red} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  if (loading) return <Loader />;

  return (
    <View style={styles.container}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <Input
          icon="search-outline"
          placeholder="Search locations..."
          value={search}
          onChangeText={setSearch}
          style={{ marginBottom: 0 }}
          inputStyle={{ fontSize: 14 }}
        />
      </View>
      {/* Stats */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>{locationsMeta.total || locations.length} locations</Text>
        <View style={styles.filterRow}>
          {FILTER_OPTS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.filterBtn, typeFilter === opt.value && styles.filterBtnActive]}
              onPress={() => setTypeFilter(opt.value)}
            >
              <Text style={[styles.filterText, typeFilter === opt.value && styles.filterTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={l => l.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />}
        ListEmptyComponent={<EmptyState icon="location-outline" message="No locations found" />}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      <BottomModal visible={showModal} onClose={() => setShowModal(false)} title="Add Location">
        <Input label="Location Name *" icon="location-outline" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Mahe Quarry, Kannur Site..." />
        <SelectPicker label="Type" value={form.type} options={TYPE_OPTS} onChange={v => setForm(f => ({ ...f, type: v }))} />
        <Button title="Add Location" onPress={save} loading={saving} icon="checkmark-circle-outline" />
      </BottomModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface[950] },
  statsBar:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surface[800] },
  statsText: { fontSize: 13, color: colors.surface[400] },
  filterRow: { flexDirection: 'row', gap: spacing.xs },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, borderColor: colors.surface[700] },
  filterBtnActive: { backgroundColor: colors.brand[500] + '22', borderColor: colors.brand[500] + '66' },
  filterText: { fontSize: 11, color: colors.surface[400] },
  filterTextActive: { color: colors.brand[400] },
  list:      { padding: spacing.lg, paddingBottom: 100 },
  card:      { marginBottom: spacing.sm },
  cardRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconCircle:{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  locName:   { fontSize: 14, fontWeight: '600', color: colors.white, marginBottom: 4 },
  iconBtn:   { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  fab:       { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand[500], alignItems: 'center', justifyContent: 'center', elevation: 8 },
});
