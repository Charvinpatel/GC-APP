import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ScrollView, Dimensions, StatusBar, Animated, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useStore } from '../store/useStore';
import {
  Button, GlassCard, Badge, EmptyState, BottomModal,
  Input, SelectPicker, Loader, Divider, DatePicker, StatCard
} from '../components';
import { colors, spacing, radius, shadows, gradients } from '../utils/theme';
import { formatCurrency, formatDateShort, getStatusColor } from '../utils/helpers';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const EMPTY_FORM = {
  date: new Date(),
  driverId: '', vehicleId: '', soilTypeId: '',
  source: '', destination: '',
  trips: '1', notes: '',
};

export default function VerifyTripsScreen() {
  const {
    user,
    driverTrips, trips,
    drivers, vehicles, soilTypes, locations,
    fetchDriverTrips, fetchTrips, fetchDrivers, fetchVehicles, fetchSoilTypes, fetchLocations,
    addDriverTrip, verifyDriverTrip, deleteDriverTrip,
  } = useStore();

  const isDriver = user?.role === 'driver';
  const isAdmin  = user?.role === 'admin' || !user?.role;

  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [matchingTripId, setMatchingTripId] = useState('');
  const [verifyNote, setVerifyNote]     = useState('');
  const [activeTab, setActiveTab]       = useState('all');
  const [filters, setFilters]           = useState({
    driverId: '', vehicleId: '', soilTypeId: '', destination: '', date: null
  });

  const hasFilters = filters.driverId || filters.vehicleId || filters.soilTypeId || filters.destination || filters.date;

  const load = useCallback(async () => {
    try {
      await Promise.all([
        fetchDriverTrips({}),
        drivers.length   === 0 ? fetchDrivers({ limit: 500 })   : Promise.resolve(),
        vehicles.length  === 0 ? fetchVehicles({ limit: 500 })  : Promise.resolve(),
        soilTypes.length === 0 ? fetchSoilTypes()               : Promise.resolve(),
        locations.length === 0 ? fetchLocations({ limit: 1000 }) : Promise.resolve(),
        trips.length     === 0 ? fetchTrips({ limit: 2000 })    : Promise.resolve(),
      ]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [fetchDriverTrips, fetchDrivers, fetchVehicles, fetchSoilTypes, fetchLocations, fetchTrips]);

  const refreshTrigger = useStore(s => s.refreshTrigger);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (refreshTrigger > 0) onRefresh(); }, [refreshTrigger]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    let list = [...driverTrips];

    if (isDriver) {
      const myId = user?.driverId || user?._id || user?.id;
      list = list.filter(t => t.driverId === myId || t.driver?._id === myId || t.driver?.id === myId);
    }

    if (activeTab !== 'all') list = list.filter(t => t.status === activeTab);

    if (filters.driverId)    list = list.filter(t => String(t.driverId) === String(filters.driverId));
    if (filters.vehicleId)   list = list.filter(t => String(t.vehicleId) === String(filters.vehicleId));
    if (filters.soilTypeId)  list = list.filter(t => String(t.soilTypeId) === String(filters.soilTypeId));
    if (filters.destination) list = list.filter(t => t.destination?.toLowerCase().includes(filters.destination.toLowerCase()));
    if (filters.date) {
      const fDate = dayjs(filters.date).format('YYYY-MM-DD');
      list = list.filter(t => dayjs(t.date).format('YYYY-MM-DD') === fDate);
    } else {
      // DEFAULT TO TODAY for "Today Trips" view
      const today = dayjs().format('YYYY-MM-DD');
      list = list.filter(t => dayjs(t.date).format('YYYY-MM-DD') === today);
    }

    return list.sort((a, b) => dayjs(b.createdAt || b.date).unix() - dayjs(a.createdAt || a.date).unix());
  }, [driverTrips, activeTab, isDriver, user, filters]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(t => {
      const d = dayjs(t.date).format('YYYY-MM-DD');
      if (!g[d]) g[d] = [];
      g[d].push(t);
    });
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const stats = useMemo(() => ({
    total:    driverTrips.length,
    pending:  driverTrips.filter(t => t.status === 'pending').length,
    verified: driverTrips.filter(t => t.status === 'verified').length,
    rejected: driverTrips.filter(t => t.status === 'rejected').length,
    trips:    driverTrips.reduce((s, t) => s + (t.trips || 0), 0),
  }), [driverTrips]);

  const handleVerify = async (status) => {
    if (!selectedTrip) return;
    setSaving(true);
    try {
      await verifyDriverTrip(selectedTrip.id, {
        status,
        systemTripId: matchingTripId || undefined,
        notes: verifyNote,
      });
      Toast.show({ type: 'success', text1: 'Success', text2: `Round ${status}` });
      setShowVerifyModal(false);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally {
      setSaving(false);
    }
  };

  const saveDriverTrip = async () => {
    const submitData = { ...form };
    submitData.date = dayjs(form.date).format('YYYY-MM-DD');
    
    if (isDriver) {
      submitData.driverId = user?.driverId || user?._id || user?.id;
    }

    if (!submitData.driverId || !form.vehicleId || !form.soilTypeId) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill all required fields' });
      return;
    }

    setSaving(true);
    try {
      await addDriverTrip({ ...submitData, trips: Number(form.trips) || 1 });
      Toast.show({ type: 'success', text1: 'Submitted', text2: 'Trip submission successful' });
      setShowAddModal(false);
      setForm(EMPTY_FORM);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally {
      setSaving(false);
    }
  };

  const driverOpts  = drivers.map(d   => ({ label: d.name,   value: d.id }));
  const vehicleOpts = vehicles.map(v  => ({ label: v.number, value: v.id }));
  const soilOpts    = soilTypes.map(s => ({ label: s.name,   value: s.id }));
  const sourceOpts  = locations.map(l => ({ label: l.name, value: l.name }));
  const destOpts    = locations.map(l => ({ label: l.name, value: l.name }));

  const potentialMatches = useMemo(() => {
    if (!selectedTrip) return [];
    return trips.filter(t =>
      dayjs(t.date).format('YYYY-MM-DD') === dayjs(selectedTrip.date).format('YYYY-MM-DD') &&
      String(t.driverId) === String(selectedTrip.driverId) &&
      String(t.vehicleId) === String(selectedTrip.vehicleId)
    );
  }, [selectedTrip, trips]);

  const TABS = [
    { key: 'all',      label: 'All' },
    { key: 'pending',  label: 'Pending' },
    { key: 'verified', label: 'Verified' },
    { key: 'rejected', label: 'Rejected' },
  ];

  if (loading) return <Loader />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* ── Futuristic Header ──────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>TODAY TRIPS</Text>
            <Text style={styles.headerSub}>{stats.pending} RECORDS WAITING REVIEW</Text>
          </View>
          <TouchableOpacity 
            style={[styles.filterPill, hasFilters && styles.filterPillActive]} 
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="filter-circle-outline" size={22} color={hasFilters ? colors.brand[400] : colors.surface[400]} />
          </TouchableOpacity>
        </View>




      </View>

      {/* ── Main List ───────────────────────── */}
      <FlatList
        data={grouped}
        keyExtractor={([date]) => date}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />}
        ListEmptyComponent={<EmptyState icon="shield-checkmark-outline" message="No verification records found" />}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ item: [date, dayTrips] }) => (
          <View style={styles.dayGroup}>
            <View style={styles.dayHeader}>
              <View style={styles.dayLine} />
              <Text style={styles.dayLabel}>{dayjs(date).format('dddd, DD MMM')}</Text>
              <View style={styles.dayLine} />
            </View>

            {dayTrips.map(t => (
              <GlassCard 
                key={t.id} 
                style={styles.tripCard}
                onPress={() => isAdmin && t.status === 'pending' ? (setSelectedTrip(t), setShowVerifyModal(true)) : null}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.driverSection}>
                    <LinearGradient colors={[colors.brand[500] + '30', 'transparent']} style={styles.avatarGlow} />
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{t.driver?.name?.[0] || 'D'}</Text>
                    </View>
                    <View>
                      <Text style={styles.driverName}>{t.driver?.name || 'Unknown'}</Text>
                      <Text style={styles.vehicleNo}>{t.vehicle?.number || '—'}</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(t.status) + '15', borderColor: getStatusColor(t.status) + '40' }]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(t.status) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(t.status) }]}>{t.status || 'pending'}</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.contentRow}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>ROUNDS</Text>
                      <Text style={[styles.metricValue, { color: colors.brand[400] }]}>{t.trips}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>MATERIAL</Text>
                      <Text style={styles.metricValue}>{t.soilType?.name || '—'}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>TIME</Text>
                      <Text style={styles.metricValue}>{dayjs(t.createdAt).format('hh:mm A')}</Text>
                    </View>
                  </View>

                  <View style={styles.routeBox}>
                    <Ionicons name="location-outline" size={14} color={colors.surface[500]} />
                    <Text style={styles.routeText}>{t.source || 'MINE'}</Text>
                    <Ionicons name="arrow-forward" size={12} color={colors.surface[700]} style={{ marginHorizontal: 6 }} />
                    <Text style={styles.routeText}>{t.destination || 'SITE'}</Text>
                  </View>

                  {t.notes && (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesText} numberOfLines={1}>{t.notes}</Text>
                    </View>
                  )}
                </View>

                {isAdmin && t.status === 'pending' && (
                  <View style={styles.cardFooter}>
                    <Button 
                      title="Verify Record" 
                      variant="primary" 
                      small 
                      icon="shield-checkmark" 
                      onPress={() => (setSelectedTrip(t), setShowVerifyModal(true))}
                      style={styles.verifyBtn}
                      glow
                    />
                  </View>
                )}
              </GlassCard>
            ))}
          </View>
        )}
      />



      {/* ── Modals ─────────────────────────── */}
      
      {/* 1. Filter Modal — Proper Futuristic Filter UI */}
      <BottomModal visible={showFilterModal} onClose={() => setShowFilterModal(false)} title="ADVANCED FILTERS">
        <View style={styles.modalContent}>
          <View style={styles.filterGroup}>
             <SelectPicker label="Driver" value={filters.driverId} options={driverOpts} onChange={v => setFilters(f => ({ ...f, driverId: v }))} />
             <SelectPicker label="Vehicle" value={filters.vehicleId} options={vehicleOpts} onChange={v => setFilters(f => ({ ...f, vehicleId: v }))} />
             <SelectPicker label="Material" value={filters.soilTypeId} options={soilOpts} onChange={v => setFilters(f => ({ ...f, soilTypeId: v }))} />
             <DatePicker label="Filter by Date" date={filters.date} onConfirm={d => setFilters(f => ({ ...f, date: d }))} />
          </View>
          
          <View style={styles.modalActions}>
            <Button 
                title="Apply Filters" 
                onPress={() => setShowFilterModal(false)} 
                icon="checkmark-done"
                style={{ flex: 1 }}
            />
            {hasFilters && (
              <Button 
                title="Clear" 
                variant="secondary" 
                onPress={() => {
                  setFilters({ driverId: '', vehicleId: '', soilTypeId: '', destination: '', date: null });
                  setShowFilterModal(false);
                }}
                style={{ width: 100 }}
              />
            )}
          </View>
        </View>
      </BottomModal>

      {/* 2. Log Entry Modal */}
      <BottomModal visible={showAddModal} onClose={() => setShowAddModal(false)} title="LOG DRIVER TRIP">
        <View style={styles.modalContent}>
          {isAdmin && <SelectPicker label="Driver" value={form.driverId} options={driverOpts} onChange={v => setForm(f => ({ ...f, driverId: v }))} />}
          
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}><SelectPicker label="Vehicle" value={form.vehicleId} options={vehicleOpts} onChange={v => setForm(f => ({ ...f, vehicleId: v }))} /></View>
            <View style={{ flex: 1 }}><SelectPicker label="Material" value={form.soilTypeId} options={soilOpts} onChange={v => setForm(f => ({ ...f, soilTypeId: v }))} /></View>
          </View>

          <DatePicker label="Work Date" date={form.date} onConfirm={d => setForm(f => ({ ...f, date: d }))} />
          
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}><SelectPicker label="Source" value={form.source} options={sourceOpts} onChange={v => setForm(f => ({ ...f, source: v }))} placeholder="Select Source" /></View>
            <View style={{ flex: 1 }}><SelectPicker label="Destination" value={form.destination} options={destOpts} onChange={v => setForm(f => ({ ...f, destination: v }))} placeholder="Select Destination" /></View>
          </View>

          <Input label="Number of Trips" keyboardType="numeric" value={form.trips} onChangeText={v => setForm(f => ({ ...f, trips: v }))} />
          <Input label="Notes" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} placeholder="Optional notes..." multiline />
          
          <Button title="Submit Submission" onPress={saveDriverTrip} loading={saving} icon="cloud-upload" glow style={{ marginTop: 20 }} />
        </View>
      </BottomModal>

      {/* 3. Verification Modal */}
      <BottomModal visible={showVerifyModal} onClose={() => setShowVerifyModal(false)} title="VERIFY TRIP">
        {selectedTrip && (
          <View style={styles.modalContent}>
            <GlassCard style={styles.selectionRecall}>
               <View>
                 <Text style={styles.recallTitle}>{selectedTrip.driver?.name}</Text>
                 <Text style={styles.recallSub}>{selectedTrip.vehicle?.number} · {selectedTrip.trips} Trips</Text>
               </View>
               <Badge label={dayjs(selectedTrip.date).format('DD MMM')} color={colors.brand[400]} />
            </GlassCard>

            <View style={styles.matchingSection}>
              <Text style={styles.matchingLabel}>LINK TO SYSTEM TRIP</Text>
              {potentialMatches.length > 0 ? (
                <View style={{ gap: 8, marginTop: 10 }}>
                  {potentialMatches.map(m => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.matchCard, matchingTripId === m.id && styles.matchCardActive]}
                      onPress={() => setMatchingTripId(prev => prev === m.id ? '' : m.id)}
                    >
                      <Ionicons name={matchingTripId === m.id ? "radio-button-on" : "radio-button-off"} size={18} color={matchingTripId === m.id ? colors.brand[400] : colors.surface[700]} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.matchTitle}>TRIP ID: #{m.id.slice(-6).toUpperCase()}</Text>
                        <Text style={styles.matchSubText}>{m.trips} Trips · {m.destination || 'Site'}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.noMatchBox}>
                   <Text style={styles.noMatchText}>No matching system trips found for this date.</Text>
                </View>
              )}
            </View>

            <Input label="Verification Comments" value={verifyNote} onChangeText={setVerifyNote} placeholder="Add instructions or notes..." multiline />

            <View style={styles.verifyActions}>
              <Button title="Approve" onPress={() => handleVerify('verified')} loading={saving} icon="checkmark-circle" style={{ flex: 1, backgroundColor: colors.green }} glow />
              <Button title="Reject" variant="danger" onPress={() => handleVerify('rejected')} loading={saving} icon="close-circle" style={{ width: 110 }} />
            </View>
          </View>
        )}
      </BottomModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface[950] },
  header: { 
    borderBottomWidth: 1, 
    borderBottomColor: colors.surface[800],
    overflow: 'hidden',
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    marginBottom: spacing.md,
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: colors.white, letterSpacing: -1 },
  headerSub: { fontSize: 10, fontWeight: '800', color: colors.brand[400], letterSpacing: 1.5 },

  filterPill: { 
    width: 44,
    height: 44,
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: colors.surface[900], 
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.surface[800],
  },
  filterPillActive: { borderColor: colors.brand[500], backgroundColor: colors.brand[500] + '10' },
  filterPillText: { fontSize: 12, fontWeight: '700', color: colors.surface[400] },

  quickStats: { paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.lg },
  
  tabsContainer: { flexDirection: 'row', paddingHorizontal: spacing.xl },
  tab: { paddingVertical: 12, marginRight: 24, position: 'relative' },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.surface[500] },
  tabTextActive: { color: colors.white },
  tabIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: colors.brand[500], borderRadius: 2 },

  list: { padding: spacing.xl, paddingBottom: 100 },
  dayGroup: { marginBottom: spacing['2xl'] },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.lg },
  dayLine: { flex: 1, height: 1, backgroundColor: colors.surface[850] },
  dayLabel: { fontSize: 11, fontWeight: '900', color: colors.surface[500], textTransform: 'uppercase', letterSpacing: 1.5 },

  tripCard: { marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  driverSection: { flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative' },
  avatarGlow: { position: 'absolute', width: 44, height: 44, borderRadius: 22, left: -4, top: -4 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface[800], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.surface[700] },
  avatarText: { color: colors.brand[400], fontWeight: '900', fontSize: 14 },
  driverName: { fontSize: 15, fontWeight: '800', color: colors.white },
  vehicleNo:  { fontSize: 11, color: colors.surface[500], marginTop: 2, fontWeight: '700' },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },

  cardContent: { gap: 12 },
  contentRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metricItem: { flex: 1 },
  metricLabel: { fontSize: 9, fontWeight: '800', color: colors.surface[600], letterSpacing: 1 },
  metricValue: { fontSize: 14, fontWeight: '800', color: colors.surface[200], marginTop: 2 },

  routeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface[950] + '40', padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.surface[850] },
  routeText: { fontSize: 12, fontWeight: '700', color: colors.surface[400] },

  notesBox: { backgroundColor: colors.surface[950] + '60', padding: 8, borderRadius: 6, borderLeftWidth: 2, borderLeftColor: colors.brand[500] },
  notesText: { fontSize: 11, color: colors.surface[500], fontStyle: 'italic' },

  cardFooter: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.surface[850] },
  verifyBtn: { width: '100%', paddingVertical: 10 },

  fab: { position: 'absolute', bottom: 30, right: 30, width: 64, height: 64, borderRadius: 32, ...shadows.brand },
  fabGradient: { flex: 1, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },

  modalContent: { gap: 4 },
  filterGroup: { gap: 4 },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: 20 },

  selectionRecall: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.brand[500] + '10', borderColor: colors.brand[500] + '30', marginBottom: 16 },
  recallTitle: { fontSize: 18, fontWeight: '900', color: colors.white },
  recallSub: { fontSize: 13, color: colors.brand[500], fontWeight: '700' },

  matchingSection: { marginBottom: 20 },
  matchingLabel: { fontSize: 10, fontWeight: '900', color: colors.surface[500], letterSpacing: 1.5, marginBottom: 10 },
  matchCard: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: colors.surface[850], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surface[800] },
  matchCardActive: { borderColor: colors.brand[500], backgroundColor: colors.brand[500] + '15' },
  matchTitle: { fontSize: 12, fontWeight: '800', color: colors.white },
  matchSubText: { fontSize: 11, color: colors.surface[500], marginTop: 2 },
  noMatchBox: { padding: 16, backgroundColor: colors.surface[900], borderRadius: radius.lg, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.surface[700], alignItems: 'center' },
  noMatchText: { fontSize: 12, color: colors.surface[500], fontStyle: 'italic' },

  verifyActions: { flexDirection: 'row', gap: spacing.md, marginTop: 20 },
});
