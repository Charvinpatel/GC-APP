import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useStore } from '../store/useStore';
import { Button, Card, Badge, EmptyState, BottomModal, Input, SelectPicker, Loader, Row } from '../components';
import { colors, spacing, radius } from '../utils/theme';
import { formatCurrency, formatDateShort, getTripProfit, getTripRevenue } from '../utils/helpers';

const EMPTY_TRIP = {
  date: dayjs().format('YYYY-MM-DD'),
  driverId: '', vehicleId: '', soilTypeId: '',
  source: '', destination: '',
  trips: '1', buyPrice: '', sellPrice: '', notes: '',
};

export default function TripsScreen() {
  const {
    trips, tripsMeta, tripsSummary,
    drivers, vehicles, soilTypes, locations,
    fetchTrips, addTrip, updateTrip, deleteTrip,
    fetchDrivers, fetchVehicles, fetchLocations,
  } = useStore();

  const [refreshing, setRefreshing]   = useState(false);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editing, setEditing]         = useState(null);
  const [form, setForm]               = useState(EMPTY_TRIP);
  const [saving, setSaving]           = useState(false);
  const [page, setPage]               = useState(1);
  const [filters, setFilters]         = useState({
    date: '', driverId: '', vehicleId: '', soilTypeId: '',
  });

  const hasFilters = filters.date || filters.driverId || filters.vehicleId || filters.soilTypeId;

  const load = useCallback(async (p = 1) => {
    try {
      await fetchTrips({ page: p, limit: 20, ...filters });
      await Promise.all([
        drivers.length   === 0 ? fetchDrivers({ limit: 200 })   : Promise.resolve(),
        vehicles.length  === 0 ? fetchVehicles({ limit: 200 })  : Promise.resolve(),
        locations.length === 0 ? fetchLocations({ limit: 500 }) : Promise.resolve(),
      ]);
    } catch {}
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [filters]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const resetFilters = () => setFilters({ date: '', driverId: '', vehicleId: '', soilTypeId: '' });

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_TRIP);
    setShowModal(true);
  };

  const openEdit = (trip) => {
    setEditing(trip);
    setForm({
      date:       trip.date || dayjs().format('YYYY-MM-DD'),
      driverId:   trip.driverId || '',
      vehicleId:  trip.vehicleId || '',
      soilTypeId: trip.soilTypeId || '',
      source:     trip.source || '',
      destination:trip.destination || '',
      trips:      String(trip.trips || 1),
      buyPrice:   String(trip.buyPrice || ''),
      sellPrice:  String(trip.sellPrice || ''),
      notes:      trip.notes || '',
    });
    setShowModal(true);
  };

  // Auto-fill buy/sell prices when soil type is selected (matching web)
  const handleSoilChange = (soilId) => {
    const soil = soilTypes.find(s => s.id === soilId);
    setForm(f => ({
      ...f,
      soilTypeId: soilId,
      buyPrice:  soil?.buyPrice  ? String(soil.buyPrice)  : f.buyPrice,
      sellPrice: soil?.sellPrice ? String(soil.sellPrice) : f.sellPrice,
    }));
  };

  const save = async () => {
    if (!form.driverId || !form.vehicleId || !form.soilTypeId || !form.buyPrice || !form.sellPrice) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        trips:     Number(form.trips)    || 1,
        buyPrice:  Number(form.buyPrice),
        sellPrice: Number(form.sellPrice),
      };
      if (editing) {
        await updateTrip(editing.id, payload);
      } else {
        await addTrip(payload);
      }
      setShowModal(false);
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (trip) => {
    Alert.alert('Delete Trip', 'Are you sure you want to delete this trip?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTrip(trip.id) },
    ]);
  };

  const driverOpts  = drivers.map(d   => ({ label: d.name,   value: d.id }));
  const vehicleOpts = vehicles.map(v  => ({ label: v.number, value: v.id }));
  const soilOpts    = soilTypes.map(s => ({ label: s.name,   value: s.id }));
  const sourceOpts  = locations.map(l => ({ label: l.name, value: l.name }));
  const destOpts    = locations.map(l => ({ label: l.name, value: l.name }));

  // Calculated margin preview (matching web)
  const margin = useMemo(() => {
    const buy  = Number(form.buyPrice)  || 0;
    const sell = Number(form.sellPrice) || 0;
    const t    = Number(form.trips)     || 1;
    return (sell - buy) * t;
  }, [form.buyPrice, form.sellPrice, form.trips]);

  const renderItem = ({ item: t }) => (
    <Card style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.vehicleNo}>{t.vehicle?.number || 'Vehicle'}</Text>
          <Text style={styles.driverName}>{t.driver?.name || 'Driver'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.profit}>{formatCurrency(getTripProfit(t))}</Text>
          <Text style={styles.date}>{formatDateShort(t.date)}</Text>
        </View>
      </View>

      <View style={styles.tripMeta}>
        {(t.source || t.destination) ? (
          <Text style={styles.route}>{t.source || '—'} → {t.destination || '—'}</Text>
        ) : null}
        <Text style={styles.metaText}>
          {t.soilType?.name || 'Soil'} · {t.trips} trips · Buy: {formatCurrency(t.buyPrice)} · Sell: {formatCurrency(t.sellPrice)}
        </Text>
      </View>

      <View style={styles.tripActions}>
        <View style={styles.revenue}>
          <Text style={styles.revenueLabel}>Revenue</Text>
          <Text style={styles.revenueValue}>{formatCurrency(getTripRevenue(t))}</Text>
        </View>
        <View style={styles.actBtns}>
          <TouchableOpacity onPress={() => openEdit(t)} style={styles.iconBtn}>
            <Ionicons name="pencil-outline" size={16} color={colors.surface[400]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDelete(t)} style={[styles.iconBtn, { backgroundColor: colors.red + '18' }]}>
            <Ionicons name="trash-outline" size={16} color={colors.red} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  if (loading) return <Loader />;

  return (
    <View style={styles.container}>
      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{formatCurrency(tripsSummary?.revenue || 0)}</Text>
          <Text style={styles.summaryLabel}>Revenue</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: colors.green }]}>{formatCurrency(tripsSummary?.profit || 0)}</Text>
          <Text style={styles.summaryLabel}>Profit</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{tripsMeta.total}</Text>
          <Text style={styles.summaryLabel}>Records</Text>
        </View>
      </View>

      {/* Filter Toggle Bar */}
      <View style={styles.filterToggleRow}>
        <TouchableOpacity
          style={[styles.filterToggleBtn, showFilters && styles.filterToggleBtnActive]}
          onPress={() => setShowFilters(v => !v)}
        >
          <Ionicons name="options-outline" size={15} color={showFilters ? colors.brand[400] : colors.surface[500]} />
          <Text style={[styles.filterToggleText, showFilters && { color: colors.brand[400] }]}>
            Filters {hasFilters ? '●' : ''}
          </Text>
        </TouchableOpacity>
        {hasFilters && (
          <TouchableOpacity onPress={resetFilters} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Pickers — collapsible */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <SelectPicker
            label="Driver" value={filters.driverId}
            options={[{ label: 'All Drivers', value: '' }, ...driverOpts]}
            onChange={v => setFilters(f => ({ ...f, driverId: v }))}
            placeholder="All Drivers"
          />
          <SelectPicker
            label="Vehicle" value={filters.vehicleId}
            options={[{ label: 'All Vehicles', value: '' }, ...vehicleOpts]}
            onChange={v => setFilters(f => ({ ...f, vehicleId: v }))}
            placeholder="All Vehicles"
          />
          <SelectPicker
            label="Soil Type" value={filters.soilTypeId}
            options={[{ label: 'All Types', value: '' }, ...soilOpts]}
            onChange={v => setFilters(f => ({ ...f, soilTypeId: v }))}
            placeholder="All Types"
          />
          <Input
            label="Date (YYYY-MM-DD)"
            icon="calendar-outline"
            value={filters.date}
            onChangeText={v => setFilters(f => ({ ...f, date: v }))}
            placeholder="e.g. 2024-04-01"
          />
        </View>
      )}

      <FlatList
        data={trips}
        keyExtractor={t => t.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />}
        ListEmptyComponent={<EmptyState icon="car-outline" message="No trips found" />}
        ListFooterComponent={
          tripsMeta.totalPages > 1 ? (
            <View style={styles.paginationRow}>
              <TouchableOpacity
                style={[styles.pageBtn, page === 1 && { opacity: 0.3 }]}
                onPress={() => { if (page > 1) { setPage(p => p - 1); load(page - 1); } }}
                disabled={page === 1}
              >
                <Ionicons name="chevron-back" size={18} color={colors.white} />
              </TouchableOpacity>
              <Text style={styles.pageText}>Page {page} / {tripsMeta.totalPages}</Text>
              <TouchableOpacity
                style={[styles.pageBtn, page >= tripsMeta.totalPages && { opacity: 0.3 }]}
                onPress={() => { if (page < tripsMeta.totalPages) { setPage(p => p + 1); load(page + 1); } }}
                disabled={page >= tripsMeta.totalPages}
              >
                <Ionicons name="chevron-forward" size={18} color={colors.white} />
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <BottomModal visible={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Trip' : 'Add Trip'}>
        <SelectPicker label="Driver *"       value={form.driverId}   options={driverOpts}  onChange={v => setForm(f => ({ ...f, driverId: v }))}   placeholder="Select driver..." />
        <SelectPicker label="Vehicle *"      value={form.vehicleId}  options={vehicleOpts} onChange={v => setForm(f => ({ ...f, vehicleId: v }))}  placeholder="Select vehicle..." />
        <SelectPicker label="Material Type *" value={form.soilTypeId} options={soilOpts}    onChange={handleSoilChange}                              placeholder="Select material..." />

        <Input label="Date" icon="calendar-outline" value={form.date} onChangeText={v => setForm(f => ({ ...f, date: v }))} placeholder="YYYY-MM-DD" />

        {/* Source / Destination from locations */}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <SelectPicker
              label="Source"
              value={form.source}
              options={sourceOpts}
              onChange={v => setForm(f => ({ ...f, source: v }))}
              placeholder="Select Source"
            />
          </View>
          <View style={{ flex: 1 }}>
            <SelectPicker
              label="Destination"
              value={form.destination}
              options={destOpts}
              onChange={v => setForm(f => ({ ...f, destination: v }))}
              placeholder="Select Destination"
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input label="Trips *"      keyboardType="numeric" value={form.trips}     onChangeText={v => setForm(f => ({ ...f, trips: v }))} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Buy Price *"  icon="arrow-down-circle-outline" keyboardType="numeric" value={form.buyPrice}  onChangeText={v => setForm(f => ({ ...f, buyPrice: v }))}  placeholder="₹0" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Sell Price *" icon="arrow-up-circle-outline"   keyboardType="numeric" value={form.sellPrice} onChangeText={v => setForm(f => ({ ...f, sellPrice: v }))} placeholder="₹0" />
          </View>
        </View>

        {/* Margin Preview */}
        {Number(form.trips) > 0 && Number(form.buyPrice) > 0 && (
          <View style={[styles.marginPreview, { borderColor: margin >= 0 ? colors.green + '40' : colors.red + '40', backgroundColor: margin >= 0 ? colors.green + '10' : colors.red + '10' }]}>
            <Text style={styles.marginLabel}>Calculated Trip Margin</Text>
            <Text style={[styles.marginValue, { color: margin >= 0 ? colors.green : colors.red }]}>
              {formatCurrency(margin)}
            </Text>
          </View>
        )}

        <Input label="Notes" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} placeholder="Optional notes..." multiline />

        <Button title={editing ? 'Update Trip' : 'Add Trip'} onPress={save} loading={saving} icon="checkmark-circle-outline" />
      </BottomModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface[950] },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface[900],
    borderBottomWidth: 1, borderBottomColor: colors.surface[800],
    paddingVertical: spacing.md,
  },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: colors.surface[800] },
  summaryVal:     { fontSize: 16, fontWeight: '700', color: colors.white },
  summaryLabel:   { fontSize: 11, color: colors.surface[500], marginTop: 2 },

  filterToggleRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surface[800] },
  filterToggleBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full, borderWidth: 1, borderColor: colors.surface[800] },
  filterToggleBtnActive: { borderColor: colors.brand[500] + '60', backgroundColor: colors.brand[500] + '12' },
  filterToggleText:   { fontSize: 11, fontWeight: '700', color: colors.surface[500] },
  resetBtn:           { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4 },
  resetBtnText:       { fontSize: 11, fontWeight: '700', color: colors.red },

  filterPanel:  { backgroundColor: colors.surface[900], padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.surface[800] },

  list: { padding: spacing.lg, paddingBottom: 100 },
  tripCard: {},
  tripHeader:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  vehicleNo:    { fontSize: 15, fontWeight: '700', color: colors.white },
  driverName:   { fontSize: 12, color: colors.surface[400], marginTop: 2 },
  profit:       { fontSize: 16, fontWeight: '700', color: colors.green },
  date:         { fontSize: 11, color: colors.surface[500], marginTop: 2 },
  route:        { fontSize: 12, color: colors.brand[400], marginBottom: 2 },
  tripMeta:     { marginBottom: spacing.sm },
  metaText:     { fontSize: 12, color: colors.surface[400] },
  tripActions:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.surface[800] },
  revenue:      {},
  revenueLabel: { fontSize: 11, color: colors.surface[500] },
  revenueValue: { fontSize: 13, fontWeight: '600', color: colors.brand[400] },
  actBtns:      { flexDirection: 'row', gap: spacing.sm },
  iconBtn:      { width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.surface[800], alignItems: 'center', justifyContent: 'center' },

  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, paddingVertical: spacing.lg },
  pageBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface[800], alignItems: 'center', justifyContent: 'center' },
  pageText:      { fontSize: 12, color: colors.surface[400], fontWeight: '600' },

  marginPreview: { padding: spacing.md, borderRadius: radius.xl, borderWidth: 1, marginBottom: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  marginLabel:   { fontSize: 11, fontWeight: '700', color: colors.surface[400], textTransform: 'uppercase', letterSpacing: 0.5 },
  marginValue:   { fontSize: 18, fontWeight: '900' },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.brand[500],
    alignItems: 'center', justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.brand[500], shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
});
