import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Button, Card, EmptyState, BottomModal, Input, Loader } from '../components';
import { colors, spacing, radius } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

const EMPTY = { name: '', buyPrice: '', sellPrice: '' };

export default function SoilScreen() {
  const { soilTypes, trips, addSoilType, updateSoilType, deleteSoilType } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name || '', buyPrice: String(s.buyPrice || ''), sellPrice: String(s.sellPrice || '') });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name) { Alert.alert('Error', 'Soil name is required'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name, buyPrice: Number(form.buyPrice) || 0, sellPrice: Number(form.sellPrice) || 0 };
      if (editing) await updateSoilType(editing.id, payload);
      else await addSoilType(payload);
      setShowModal(false);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const confirmDelete = (s) => Alert.alert('Delete Soil Type', `Delete "${s.name}"? This may affect existing trips.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteSoilType(s.id) },
  ]);

  const filtered = soilTypes.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item: s }) => {
    const tripCount = trips.filter(t => t.soilTypeId === s.id).reduce((acc, t) => acc + t.trips, 0);
    return (
      <Card style={styles.card}>
        <View style={styles.cardHead}>
          <View style={styles.iconBox}>
            <Ionicons name="layers" size={20} color={colors.brand[400]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{s.name}</Text>
            <Text style={styles.trips}>{tripCount} trips recorded</Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => openEdit(s)} style={styles.iconBtn}>
              <Ionicons name="pencil-outline" size={15} color={colors.surface[400]} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDelete(s)} style={[styles.iconBtn, { backgroundColor: colors.red + '18' }]}>
              <Ionicons name="trash-outline" size={15} color={colors.red} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.priceRow}>
          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>Buy Price</Text>
            <Text style={styles.priceVal}>{formatCurrency(s.buyPrice || 0)}</Text>
          </View>
          {s.sellPrice > 0 && (
            <View style={[styles.priceBox, { borderColor: colors.green + '33', backgroundColor: colors.green + '0D' }]}>
              <Text style={[styles.priceLabel, { color: colors.green + 'AA' }]}>Sell Price</Text>
              <Text style={[styles.priceVal, { color: colors.green }]}>{formatCurrency(s.sellPrice)}</Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
        <Input
          icon="search-outline"
          placeholder="Search materials..."
          value={search}
          onChangeText={setSearch}
          style={{ marginBottom: 0 }}
          inputStyle={{ fontSize: 14 }}
        />
      </View>
      <Text style={styles.count}>{filtered.length} materials</Text>
      <FlatList
        data={filtered}
        keyExtractor={s => s.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="layers-outline" message="No soil types found" />}
        numColumns={1}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      <BottomModal visible={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Soil Type' : 'Add Soil Type'}>
        <Input label="Soil / Material Name *" icon="layers-outline" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Black Soil, Murram..." />
        <Input label="Default Buy Price (₹)" icon="arrow-down-circle-outline" keyboardType="numeric" value={form.buyPrice} onChangeText={v => setForm(f => ({ ...f, buyPrice: v }))} placeholder="₹0" />
        <Input label="Default Sell Price (₹)" icon="arrow-up-circle-outline" keyboardType="numeric" value={form.sellPrice} onChangeText={v => setForm(f => ({ ...f, sellPrice: v }))} placeholder="₹0" />
        <Button title={editing ? 'Update Soil Type' : 'Add Soil Type'} onPress={save} loading={saving} icon="checkmark-circle-outline" />
      </BottomModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface[950] },
  count:     { fontSize: 12, color: colors.surface[500], paddingHorizontal: spacing.lg, marginBottom: 8 },
  list:      { padding: spacing.lg, paddingBottom: 100 },
  card:      {},
  cardHead:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  iconBox:   { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.brand[500] + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.brand[500] + '33' },
  name:      { fontSize: 15, fontWeight: '700', color: colors.white },
  trips:     { fontSize: 12, color: colors.surface[500], marginTop: 2 },
  actions:   { flexDirection: 'row', gap: spacing.sm },
  iconBtn:   { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.surface[800], alignItems: 'center', justifyContent: 'center' },
  priceRow:  { flexDirection: 'row', gap: spacing.sm },
  priceBox:  { flex: 1, backgroundColor: colors.brand[500] + '0D', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.brand[500] + '22' },
  priceLabel:{ fontSize: 10, color: colors.surface[500], textTransform: 'uppercase', letterSpacing: 1 },
  priceVal:  { fontSize: 16, fontWeight: '700', color: colors.white, marginTop: 2 },
  fab:       { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand[500], alignItems: 'center', justifyContent: 'center', elevation: 8 },
});
