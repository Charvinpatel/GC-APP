import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, Dimensions, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useStore } from '../store/useStore';
import {
  Button, GlassCard, EmptyState, BottomModal,
  Input, SelectPicker, Loader, DatePicker, Badge
} from '../components';
import { colors, spacing, radius, gradients } from '../utils/theme';
import { formatCurrency, formatDateShort } from '../utils/helpers';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const EMPTY = {
  date:        dayjs().format('YYYY-MM-DD'),
  driverId:    '',
  vehicleId:   '',
  soilTypeId:  '',
  source:      '',
  destination: '',
  buyPrice:    '',
  sellPrice:   '',
  trips:       '1',
  notes:       '',
};

export default function NightTripsScreen() {
  const {
    nightTrips,
    drivers, vehicles, soilTypes, locations,
    fetchNightTrips, addNightTrip, updateNightTrip, deleteNightTrip,
    fetchDrivers, fetchVehicles, fetchSoilTypes, fetchLocations,
  } = useStore();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [saving, setSaving]         = useState(false);

  const [filterDate, setFilterDate]   = useState(null);
  const [activePreset, setActivePreset] = useState('All');
  const [showFilterPicker, setShowFilterPicker] = useState(false);

  const load = async (dateFilter) => {
    try {
      const params = dateFilter ? { date: dateFilter, limit: 1000 } : { limit: 1000 };
      await fetchNightTrips(params);
      await Promise.all([
        drivers.length   === 0 ? fetchDrivers({ limit: 200 })   : Promise.resolve(),
        vehicles.length  === 0 ? fetchVehicles({ limit: 200 })  : Promise.resolve(),
        soilTypes.length === 0 ? fetchSoilTypes()               : Promise.resolve(),
        locations.length === 0 ? fetchLocations({ limit: 500 }) : Promise.resolve(),
      ]);
    } catch {}
    setLoading(false);
  };

  const refreshTrigger = useStore(s => s.refreshTrigger);
  useEffect(() => { load(null); }, []);
  useEffect(() => { if (refreshTrigger > 0) onRefresh(); }, [refreshTrigger]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(activePreset === 'All' ? null : filterDate);
    setRefreshing(false);
  };

  const applyFilter = async (preset) => {
    setLoading(true);
    const date = preset === 'All' ? null : dayjs().format('YYYY-MM-DD');
    setFilterDate(date);
    setActivePreset(preset);
    await load(date);
  };

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (t) => {
    setEditing(t);
    setForm({
      date:        t.date,
      driverId:    t.driverId    || '',
      vehicleId:   t.vehicleId   || '',
      soilTypeId:  t.soilTypeId  || '',
      source:      t.source      || '',
      destination: t.destination || '',
      buyPrice:    String(t.buyPrice  || ''),
      sellPrice:   String(t.sellPrice || ''),
      trips:       String(t.trips     || 1),
      notes:       t.notes || '',
    });
    setShowModal(true);
  };

  // Auto-fill sell price from location
  const handleDestChange = (val) => {
    const clean = (val || '').split('|PRICE:')[0].trim();
    const loc   = locations.find(l => (l.name || '').split('|PRICE:')[0].trim() === clean);
    let sp = form.sellPrice;
    if (loc?.name?.includes('|PRICE:')) sp = loc.name.split('|PRICE:')[1].trim();
    else if (loc?.price)                sp = String(loc.price);
    setForm(f => ({ ...f, destination: clean, sellPrice: sp }));
  };

  // Auto-fill buy price from soil type
  const handleSoilChange = (id) => {
    const soil = soilTypes.find(s => s.id === id);
    setForm(f => ({ ...f, soilTypeId: id, buyPrice: soil?.buyPrice ? String(soil.buyPrice) : f.buyPrice }));
  };

  const save = async () => {
    if (!form.driverId || !form.vehicleId || !form.soilTypeId || !form.source || !form.destination || !form.buyPrice || !form.sellPrice) {
      Alert.alert('Validation', 'Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        buyPrice:  Number(form.buyPrice),
        sellPrice: Number(form.sellPrice),
        trips:     Number(form.trips) || 1,
      };
      if (editing) await updateNightTrip(editing.id, payload);
      else         await addNightTrip(payload);
      setShowModal(false);
      load(activePreset === 'All' ? null : filterDate);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const confirmDelete = (t) => Alert.alert('Delete Night Trip', 'Delete this entry?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteNightTrip(t.id) },
  ]);

  // Summary
  const totalRevenue = nightTrips.reduce((s, t) => s + (Number(t.sellPrice) * Number(t.trips || 1)), 0);
  const totalProfit  = nightTrips.reduce((s, t) => s + ((Number(t.sellPrice) - Number(t.buyPrice)) * Number(t.trips || 1)), 0);
  const totalRounds  = nightTrips.reduce((s, t) => s + (Number(t.trips) || 1), 0);

  // Picker options
  const driverOpts  = drivers.map(d  => ({ label: d.name,   value: d.id }));
  const vehicleOpts = vehicles.filter(v => v.type !== 'excavator').map(v => ({ label: v.number, value: v.id }));
  const soilOpts    = soilTypes.map(s  => ({ label: s.name,   value: s.id }));
  const sourceOpts  = locations.map(l  => { const n = (l.name||'').split('|PRICE:')[0].trim(); return { label: n, value: n }; });
  const destOpts    = locations.map(l  => { const n = (l.name||'').split('|PRICE:')[0].trim(); return { label: n, value: n }; });

  const margin = (Number(form.sellPrice) - Number(form.buyPrice)) * (Number(form.trips) || 1);

  const renderItem = ({ item: t }) => {
    const rev = Number(t.sellPrice) * Number(t.trips || 1);
    const pro = (Number(t.sellPrice) - Number(t.buyPrice)) * Number(t.trips || 1);
    return (
      <GlassCard style={styles.card}>
        {/* Night badge */}
        <View style={styles.nightBadgeRow}>
          <View style={styles.nightBadge}>
            <Ionicons name="moon" size={10} color="#818cf8" />
            <Text style={styles.nightBadgeText}>NIGHT TRIP</Text>
          </View>
          <Text style={styles.cardDate}>{formatDateShort(t.date)}</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.iconCircle}>
            <LinearGradient colors={['#6366f1','#312e81']} style={StyleSheet.absoluteFill} />
            <Ionicons name="moon-outline" size={20} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardVehicle}>{t.vehicleNumber || 'Vehicle'}</Text>
            <Text style={styles.cardDriver}>{t.driverName || 'Driver'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.cardRounds}>{t.trips || 1} <Text style={styles.roundsLabel}>RDS</Text></Text>
            <Badge label={t.soilTypeName || 'Material'} color={colors.surface[500]} />
          </View>
        </View>

        <View style={styles.routeRow}>
          <Ionicons name="location-outline" size={13} color="#818cf8" />
          <Text style={styles.routeText}>{t.source}</Text>
          <Text style={styles.routeArrow}>→</Text>
          <Text style={styles.routeText}>{t.destination}</Text>
        </View>

        <View style={styles.financialRow}>
          <View style={styles.finItem}>
            <Text style={styles.finLabel}>REVENUE</Text>
            <Text style={styles.finValue}>{formatCurrency(rev)}</Text>
          </View>
          <View style={styles.finDivider} />
          <View style={styles.finItem}>
            <Text style={styles.finLabel}>PROFIT</Text>
            <Text style={[styles.finValue, { color: pro >= 0 ? colors.green : colors.red }]}>{formatCurrency(pro)}</Text>
          </View>
          <View style={styles.finDivider} />
          <View style={styles.finItem}>
            <Text style={styles.finLabel}>BUY/SELL</Text>
            <Text style={styles.finValue}>₹{t.buyPrice} / ₹{t.sellPrice}</Text>
          </View>
        </View>

        {t.notes ? <Text style={styles.notesText}>{t.notes}</Text> : null}

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => openEdit(t)} style={styles.iconBtn}>
            <Ionicons name="create-outline" size={16} color={colors.surface[400]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDelete(t)} style={[styles.iconBtn, { backgroundColor: colors.red + '18' }]}>
            <Ionicons name="trash-outline" size={16} color={colors.red} />
          </TouchableOpacity>
        </View>
      </GlassCard>
    );
  };

  if (loading && !refreshing) return <Loader />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>NIGHT TRIPS</Text>
            <Text style={styles.headerSub}>MANUAL ADMIN ENTRIES</Text>
          </View>
        </View>

        {/* Filter tabs */}
        <View style={styles.presets}>
          {['All','Today'].map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.presetBtn, activePreset === p && styles.presetBtnActive]}
              onPress={() => applyFilter(p)}
            >
              <Text style={[styles.presetText, activePreset === p && styles.presetTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.presetBtn, activePreset === 'Custom' && styles.presetBtnActive]}
            onPress={() => setShowFilterPicker(true)}
          >
            <Ionicons name="calendar-outline" size={16} color={activePreset === 'Custom' ? '#818cf8' : colors.surface[500]} />
          </TouchableOpacity>
          {showFilterPicker && (
            <DatePicker date={filterDate || new Date()} onConfirm={(d) => {
              const ds = dayjs(d).format('YYYY-MM-DD');
              setFilterDate(ds); setActivePreset('Custom'); load(ds); setShowFilterPicker(false);
            }} />
          )}
          <View style={styles.dateDisplay}>
            <Ionicons name="calendar-outline" size={12} color={colors.surface[500]} />
            <Text style={styles.dateDisplayText}>{filterDate ? dayjs(filterDate).format('DD MMM') : 'All Time'}</Text>
          </View>
        </View>

        {/* Summary bar */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>REVENUE</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalRevenue)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>PROFIT</Text>
            <Text style={[styles.summaryValue, { color: totalProfit >= 0 ? colors.green : colors.red }]}>{formatCurrency(totalProfit)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>ROUNDS</Text>
            <Text style={styles.summaryValue}>{totalRounds}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={nightTrips}
        keyExtractor={t => t.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818cf8" />}
        ListEmptyComponent={<EmptyState icon="moon-outline" message="No night trips yet" />}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <LinearGradient colors={['#6366f1','#312e81']} style={styles.fabGradient}>
          <Ionicons name="add" size={32} color={colors.white} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Add / Edit Modal */}
      <BottomModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'EDIT NIGHT TRIP' : 'ADD NIGHT TRIP'}
      >
        <View style={{ gap: 4 }}>
          <DatePicker label="Date *" date={form.date} onConfirm={d => setForm(f => ({ ...f, date: dayjs(d).format('YYYY-MM-DD') }))} />

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <SelectPicker label="Driver *" value={form.driverId} options={driverOpts} onChange={v => setForm(f => ({...f, driverId: v}))} placeholder="Select Driver" />
            </View>
            <View style={{ flex: 1 }}>
              <SelectPicker label="Vehicle *" value={form.vehicleId} options={vehicleOpts} onChange={v => setForm(f => ({...f, vehicleId: v}))} placeholder="Select Vehicle" />
            </View>
          </View>

          <SelectPicker label="Material (Soil) *" value={form.soilTypeId} options={soilOpts} onChange={handleSoilChange} placeholder="Select Material" />

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <SelectPicker label="Source *" value={form.source} options={sourceOpts} onChange={v => setForm(f => ({...f, source: (v||'').split('|PRICE:')[0].trim()}))} placeholder="From" />
            </View>
            <View style={{ flex: 1 }}>
              <SelectPicker label="Destination *" value={form.destination} options={destOpts} onChange={handleDestChange} placeholder="To" />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Input label="Rounds *" icon="repeat-outline" keyboardType="numeric" value={form.trips} onChangeText={v => setForm(f => ({...f, trips: v}))} placeholder="1" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Buy Price ₹ *" icon="arrow-down-circle-outline" keyboardType="numeric" value={form.buyPrice} onChangeText={v => setForm(f => ({...f, buyPrice: v}))} placeholder="0" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Sell Price ₹ *" icon="arrow-up-circle-outline" keyboardType="numeric" value={form.sellPrice} onChangeText={v => setForm(f => ({...f, sellPrice: v}))} placeholder="0" />
            </View>
          </View>

          {/* Live margin preview */}
          {Number(form.trips) > 0 && Number(form.buyPrice) > 0 && (
            <View style={[styles.marginPreview, { borderColor: (margin >= 0 ? colors.green : colors.red) + '40', backgroundColor: (margin >= 0 ? colors.green : colors.red) + '10' }]}>
              <Text style={styles.marginLabel}>MARGIN PREVIEW</Text>
              <Text style={[styles.marginValue, { color: margin >= 0 ? colors.green : colors.red }]}>{formatCurrency(margin)}</Text>
            </View>
          )}

          <Input label="Notes" value={form.notes} onChangeText={v => setForm(f => ({...f, notes: v}))} placeholder="Optional notes..." multiline />

          <Button title={editing ? 'UPDATE TRIP' : 'SAVE NIGHT TRIP'} onPress={save} loading={saving} icon="checkmark-circle-outline" glow style={{ marginTop: 20 }} />
        </View>
      </BottomModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface[950] },

  header: { borderBottomWidth: 1, borderBottomColor: colors.surface[800] },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.lg, paddingTop: spacing.md },
  headerTitle: { fontSize: 24, fontWeight: '900', color: colors.white, letterSpacing: -1 },
  headerSub: { fontSize: 10, fontWeight: '800', color: '#818cf8', letterSpacing: 1.5 },

  presets: { flexDirection: 'row', paddingHorizontal: spacing.xl, gap: 10, alignItems: 'center', marginBottom: spacing.md },
  presetBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surface[900], borderWidth: 1, borderColor: colors.surface[800] },
  presetBtnActive: { backgroundColor: '#6366f1' + '20', borderColor: '#6366f1' + '60' },
  presetText: { fontSize: 11, fontWeight: '700', color: colors.surface[400] },
  presetTextActive: { color: '#818cf8' },
  dateDisplay: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  dateDisplayText: { fontSize: 11, fontWeight: '800', color: colors.surface[500] },

  summaryRow: { flexDirection: 'row', paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 8, fontWeight: '900', color: colors.surface[600], letterSpacing: 1.5 },
  summaryValue: { fontSize: 16, fontWeight: '900', color: colors.white, marginTop: 4 },
  summaryDivider: { width: 1, backgroundColor: colors.surface[800], marginVertical: 4 },

  list: { padding: spacing.xl, paddingBottom: 110 },
  card: { marginBottom: spacing.md },

  nightBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  nightBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6366f1' + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, borderWidth: 1, borderColor: '#6366f1' + '40' },
  nightBadgeText: { fontSize: 9, fontWeight: '900', color: '#818cf8', letterSpacing: 1 },
  cardDate: { fontSize: 11, color: colors.surface[500], fontWeight: '700' },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  iconCircle: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  cardVehicle: { fontSize: 15, fontWeight: '800', color: colors.white, fontFamily: 'monospace' },
  cardDriver: { fontSize: 12, color: colors.surface[400], marginTop: 2 },
  cardRounds: { fontSize: 18, fontWeight: '900', color: '#818cf8' },
  roundsLabel: { fontSize: 10, color: colors.surface[500] },

  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.surface[850] },
  routeText: { fontSize: 11, fontWeight: '700', color: colors.white },
  routeArrow: { fontSize: 11, color: colors.surface[600] },

  financialRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface[900], borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  finItem: { flex: 1, alignItems: 'center' },
  finLabel: { fontSize: 8, fontWeight: '900', color: colors.surface[600], letterSpacing: 1 },
  finValue: { fontSize: 12, fontWeight: '800', color: colors.white, marginTop: 2 },
  finDivider: { width: 1, height: 28, backgroundColor: colors.surface[800] },

  notesText: { fontSize: 10, color: colors.surface[500], fontStyle: 'italic', marginBottom: spacing.sm },

  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.surface[850] },
  iconBtn: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.surface[900], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.surface[800] },

  fab: { position: 'absolute', bottom: 30, right: 30, width: 64, height: 64, borderRadius: 32, elevation: 8 },
  fabGradient: { flex: 1, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },

  marginPreview: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  marginLabel: { fontSize: 10, fontWeight: '700', color: colors.surface[400] },
  marginValue: { fontSize: 16, fontWeight: '900' },
});
