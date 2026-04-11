import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Button, GlassCard, Badge, EmptyState, BottomModal, Input, SelectPicker, Loader } from '../components';
import { colors, spacing, radius, gradients } from '../utils/theme';
import { LinearGradient } from 'expo-linear-gradient';

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

const EMPTY_FORM = { name: '', type: 'source' };

export default function LocationsScreen() {
  const { locations, locationsMeta, fetchLocations, addLocation, deleteLocation } = useStore();
  
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [editing, setEditing]     = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch]       = useState('');

  const load = async () => {
    try { await fetchLocations({ limit: 500, type: typeFilter }); } catch {}
    setLoading(false);
  };

  const refreshTrigger = useStore(s => s.refreshTrigger);
  useEffect(() => { load(); }, [typeFilter]);
  useEffect(() => { if (refreshTrigger > 0) onRefresh(); }, [refreshTrigger]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, price: '' });
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (loc) => {
    setEditing(loc);
    setForm({
      name: loc.displayName,
      type: loc.type,
      price: loc.price || ''
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { 
      Alert.alert('Error', 'Location name is required'); 
      return;
    }
    setSaving(true);
    try {
      const locationData = {
        name: form.price ? `${form.name} |PRICE:${form.price}` : form.name,
        type: form.type
      };
      
      if (editing) {
        await deleteLocation(editing.id);
        await addLocation(locationData);
      } else {
        await addLocation(locationData);
      }
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (loc) => Alert.alert('Delete Location', `Delete "${loc.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteLocation(loc.id) },
  ]);

  const FILTER_OPTS = [{ label: 'All', value: '' }, ...TYPE_OPTS];

  const processedLocations = locations.map(l => {
    const parts = l.name.split('|PRICE:');
    return { ...l, displayName: parts[0], price: parts[1] || null };
  });

  const filtered = processedLocations.filter(l => {
    const matchType = !typeFilter || l.type === typeFilter || l.type === 'both';
    const matchSearch = !search || l.displayName?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const renderItem = ({ item: loc }) => {
    const typeColor = TYPE_COLORS[loc.type] || colors.surface[400];
    return (
      <GlassCard style={styles.card}>
        <View style={styles.cardRow}>
          <View style={[styles.iconCircle, { backgroundColor: typeColor + '15' }]}>
            <LinearGradient colors={[typeColor + '30', 'transparent']} style={StyleSheet.absoluteFill} />
            <Ionicons name="location" size={18} color={typeColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.locName}>{loc.displayName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
               <Badge label={loc.type} color={typeColor} />
               {Boolean(loc.price) && (
                 <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.green + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1, borderColor: colors.green + '30', gap: 4 }}>
                   <Ionicons name="cash-outline" size={12} color={colors.green} />
                   <Text style={{ fontSize: 11, fontWeight: '800', color: colors.green }}>₹{loc.price}</Text>
                 </View>
               )}
            </View>
          </View>
          
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => openEdit(loc)} style={[styles.iconBtn, { backgroundColor: colors.brand[500] + '12', marginRight: spacing.sm }]}>
              <Ionicons name="create-outline" size={16} color={colors.brand[400]} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDelete(loc)} style={[styles.iconBtn, { backgroundColor: colors.red + '12' }]}>
              <Ionicons name="trash-outline" size={16} color={colors.red} />
            </TouchableOpacity>
          </View>
        </View>
      </GlassCard>
    );
  };

  if (loading && !refreshing) return <Loader />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* ── Futuristic Header ──────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ width: '100%', marginTop: spacing.xs }}>
            <Input
              icon="search-outline"
              placeholder="Search locations..."
              value={search}
              onChangeText={setSearch}
              style={{ marginBottom: 0 }}
              inputStyle={{ fontSize: 13, height: 42 }}
            />
          </View>
        </View>

        <View style={styles.filterRow}>
          {FILTER_OPTS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.filterBtn, typeFilter === opt.value && styles.filterBtnActive]}
              onPress={() => setTypeFilter(opt.value)}
            >
              <Text style={[styles.filterText, typeFilter === opt.value && styles.filterTextActive]}>
                {opt.label}
              </Text>
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
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <LinearGradient colors={gradients.brand} style={styles.fabGradient}>
          <Ionicons name="add" size={32} color={colors.white} />
        </LinearGradient>
      </TouchableOpacity>

      <BottomModal 
        visible={showModal} 
        onClose={() => setShowModal(false)} 
        title={editing ? "Edit Location" : "Add Location"}
      >
        <Input 
          label="Location Name *" 
          icon="location-outline" 
          value={form.name} 
          onChangeText={v => setForm(f => ({ ...f, name: v }))} 
          placeholder="e.g. Mahe Quarry, Kannur Site..." 
        />
        <SelectPicker 
          label="Type" 
          value={form.type} 
          options={TYPE_OPTS} 
          onChange={v => setForm(f => ({ ...f, type: v }))} 
        />
        
        {(form.type === 'destination' || form.type === 'both') && (
           <Input 
              label="Selling Price (Per Trip) *" 
              icon="cash-outline" 
              keyboardType="numeric"
              placeholder="₹0"
              value={form.price} 
              onChangeText={v => setForm(f => ({ ...f, price: v }))} 
           />
        )}

        <Button 
          title={editing ? "Update Location" : "Add Location"} 
          onPress={save} 
          loading={saving} 
          icon="checkmark-circle-outline" 
          style={{ marginTop: spacing.md }}
        />
      </BottomModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface[950] },
  
  header: { 
    borderBottomWidth: 1, 
    borderBottomColor: colors.surface[800],
    paddingBottom: spacing.sm,
  },
  headerTop: { 
    paddingHorizontal: spacing.xl, 
    paddingTop: 0,
    marginBottom: spacing.md 
  },
  
  filterRow: { 
    flexDirection: 'row', 
    gap: spacing.xs, 
    paddingHorizontal: spacing.xl 
  },
  filterBtn: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: radius.full, 
    borderWidth: 1, 
    borderColor: colors.surface[800],
    backgroundColor: colors.surface[900] 
  },
  filterBtnActive: { 
    backgroundColor: colors.brand[500] + '15', 
    borderColor: colors.brand[500] + '40' 
  },
  filterText: { fontSize: 11, fontWeight: '600', color: colors.surface[400] },
  filterTextActive: { color: colors.brand[400] },

  list:      { padding: spacing.xl, paddingBottom: 100 },
  card:      { marginBottom: spacing.sm },
  cardRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconCircle:{ width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  locName:   { fontSize: 16, fontWeight: '800', color: colors.white, marginBottom: 2 },
  
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: radius.sm, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: colors.surface[900],
    borderWidth: 1,
    borderColor: colors.surface[800]
  },
  
  fab: { 
    position: 'absolute', 
    bottom: 30, 
    right: 25, 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    elevation: 8,
    shadowColor: colors.brand[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  fabGradient: { 
    flex: 1, 
    borderRadius: 30, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
});
