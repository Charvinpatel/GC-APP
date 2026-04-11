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
  const [selectedGroup, setSelectedGroup] = useState(null);
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

  const groupedByDateAndVehicle = useMemo(() => {
    const dates = {};
    filtered.forEach(t => {
      const d = dayjs(t.date).format('YYYY-MM-DD');
      if (!dates[d]) dates[d] = {};

      const vId = t.vehicleId || 'unknown';
      const status = t.status;
      const groupKey = `${vId}_${status}`; 

      if (!dates[d][groupKey]) {
        dates[d][groupKey] = {
           id: groupKey,
           vehicleId: vId,
           vehicle: t.vehicle,
           driver: t.driver,
           status: t.status,
           date: t.date,
           totalRounds: 0,
           createdAt: t.createdAt,
           allTrips: [],
           routeSummary: {}
        };
      }
      
      const g = dates[d][groupKey];
      g.allTrips.push(t);
      g.totalRounds += (Number(t.trips) || 1);
      
      const rKey = `${t.source || 'Mine'} → ${t.destination || 'Site'}`;
      if (!g.routeSummary[rKey]) {
        g.routeSummary[rKey] = { source: t.source, destination: t.destination, trips: 0, soilType: t.soilType?.name };
      }
      g.routeSummary[rKey].trips += (Number(t.trips) || 1);
    });

    return Object.entries(dates).map(([date, groups]) => ({
      date,
      groups: Object.values(groups).sort((a,b) => dayjs(b.createdAt).unix() - dayjs(a.createdAt).unix())
    })).sort((a, b) => b.date.localeCompare(a.date));
  }, [filtered]);

  const dynamicVerifiedTrips = useMemo(() => {
     return filtered.filter(t => t.status === 'verified').reduce((s,t) => s + (Number(t.trips) || 1), 0);
  }, [filtered]);

  const stats = useMemo(() => ({
    total:    driverTrips.length,
    pending:  driverTrips.filter(t => t.status === 'pending').length,
    verified: driverTrips.filter(t => t.status === 'verified').length,
    rejected: driverTrips.filter(t => t.status === 'rejected').length,
    trips:    driverTrips.reduce((s, t) => s + (t.trips || 0), 0),
  }), [driverTrips]);

  const handleVerify = async (status) => {
    if (!selectedGroup) return;
    setSaving(true);
    try {
      const promises = selectedGroup.allTrips.map(t => 
        verifyDriverTrip(t.id, {
          status,
          systemTripId: matchingTripId || undefined,
          notes: verifyNote,
        })
      );
      await Promise.all(promises);
      Toast.show({ type: 'success', text1: 'Success', text2: `Verified ${selectedGroup.allTrips.length} records as ${status}` });
      setShowVerifyModal(false);
      load();
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
    if (!selectedGroup) return [];
    return trips.filter(t =>
      dayjs(t.date).format('YYYY-MM-DD') === dayjs(selectedGroup.date).format('YYYY-MM-DD') &&
      String(t.driverId) === String(selectedGroup.driver?.id || selectedGroup.driverId) && // using driver from group
      String(t.vehicleId) === String(selectedGroup.vehicle?.id || selectedGroup.vehicleId)
    );
  }, [selectedGroup, trips]);

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
            <Text style={styles.headerSub}>{dynamicVerifiedTrips} VERIFIED TRIPS</Text>
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
        data={groupedByDateAndVehicle}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />}
        ListEmptyComponent={<EmptyState icon="shield-checkmark-outline" message="No verification records found" />}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ item: { date, groups } }) => (
          <View style={styles.dayGroup}>
            <View style={styles.dayHeader}>
              <View style={styles.dayLine} />
              <Text style={styles.dayLabel}>{dayjs(date).format('dddd, DD MMM')}</Text>
              <View style={styles.dayLine} />
            </View>

            {groups.map(g => (
              <GlassCard 
                key={g.id} 
                style={styles.tripCard}
                onPress={() => { setSelectedGroup(g); setShowVerifyModal(true); }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.driverSection}>
                    <LinearGradient colors={[colors.brand[500] + '30', 'transparent']} style={styles.avatarGlow} />
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{g.vehicle?.number?.[0] || 'V'}</Text>
                    </View>
                    <View>
                      <Text style={styles.driverName}>{g.vehicle?.number || 'Unknown Vehicle'}</Text>
                      <Text style={styles.vehicleNo}>{g.driver?.name || 'Multiple Drivers'}</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(g.status) + '15', borderColor: getStatusColor(g.status) + '40' }]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(g.status) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(g.status) }]}>{g.status || 'pending'}</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                   <View style={styles.routeSummaryList}>
                      {Object.entries(g.routeSummary).map(([key, r], idx) => (
                        <View key={idx} style={styles.routeSummaryItem}>
                           <View style={styles.routeHeader}>
                              <Ionicons name="location-outline" size={12} color={colors.brand[400]} />
                              <Text style={styles.routeSummaryText}>{r.source || 'MINE'} → {r.destination || 'SITE'}</Text>
                           </View>
                           <View style={styles.routeBadge}>
                              <Text style={styles.routeBadgeText}>{r.trips} trips</Text>
                           </View>
                        </View>
                      ))}
                   </View>

                   <View style={styles.cardFooterStats}>
                      <View style={styles.mainTripMetric}>
                        <Text style={styles.mainMetricLabel}>TOTAL ROUNDS FOR DAY</Text>
                        <Text style={styles.mainMetricValue}>{g.totalRounds}</Text>
                      </View>
                      <View style={styles.subMetricItem}>
                        <Text style={styles.subMetricLabel}>ENTRIES</Text>
                        <Text style={styles.subMetricValue}>{g.allTrips.length}</Text>
                      </View>
                   </View>
                </View>

                {isAdmin && g.status === 'pending' && (
                  <View style={styles.cardFooter}>
                    <Button 
                      title="Verify Group Records" 
                      variant="primary" 
                      small 
                      icon="shield-checkmark" 
                      onPress={() => (setSelectedGroup(g), setShowVerifyModal(true))}
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

      {/* 3. Group Details / Verification Modal */}
      <BottomModal 
        visible={showVerifyModal} 
        onClose={() => setShowVerifyModal(false)} 
        title={isAdmin && selectedGroup?.status === 'pending' ? "VERIFY GROUP RECORDS" : "GROUP DETAILS"}
      >
        {selectedGroup && (
          <View style={styles.modalContent}>
            <GlassCard style={styles.selectionRecall}>
               <View>
                 <Text style={styles.recallTitle}>{selectedGroup.vehicle?.number}</Text>
                 <Text style={styles.recallSub}>{selectedGroup.totalRounds} Trips Total</Text>
               </View>
               <Badge label={dayjs(selectedGroup.date).format('DD MMM')} color={colors.brand[400]} />
            </GlassCard>

            <View style={styles.historySection}>
               <Text style={styles.sectionLabel}>ENTRY HISTORY</Text>
               <ScrollView style={styles.historyScroll} nestedScrollEnabled>
                  {selectedGroup.allTrips.map((t, i) => (
                    <View key={i} style={styles.historyItem}>
                       <View style={styles.historyHeader}>
                          <Text style={styles.historyTime}>{dayjs(t.createdAt).format('hh:mm A')}</Text>
                          <Text style={styles.historyTrips}>{t.trips} Trips</Text>
                       </View>
                       <Text style={styles.historyRoute}>{t.source} → {t.destination}</Text>
                       {t.notes ? <Text style={styles.historyNotes}>"{t.notes}"</Text> : null}
                    </View>
                  ))}
               </ScrollView>
            </View>

            {isAdmin && selectedGroup.status === 'pending' && (
              <>
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
              </>
            )}
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

  cardContent: { gap: 16 },
  routeSummaryList: { gap: 8 },
  routeSummaryItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: colors.surface[950] + '33', 
    padding: 10, 
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface[850]
  },
  routeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  routeSummaryText: { fontSize: 13, fontWeight: '700', color: colors.surface[200] },
  routeBadge: { backgroundColor: colors.brand[500] + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  routeBadgeText: { fontSize: 10, fontWeight: '900', color: colors.brand[400], textTransform: 'uppercase' },

  cardFooterStats: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end', 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: colors.surface[850] 
  },
  mainTripMetric: { flex: 1 },
  mainMetricLabel: { fontSize: 9, fontWeight: '800', color: colors.brand[400], letterSpacing: 1, marginBottom: 4 },
  mainMetricValue: { fontSize: 24, fontWeight: '900', color: colors.white },
  subMetricItem: { alignItems: 'flex-end' },
  subMetricLabel: { fontSize: 9, fontWeight: '800', color: colors.surface[500], letterSpacing: 1, marginBottom: 2 },
  subMetricValue: { fontSize: 14, fontWeight: '800', color: colors.surface[300] },

  historySection: { marginBottom: 20, maxHeight: 200 },
  sectionLabel: { fontSize: 11, color: colors.surface[500], fontWeight: '900', letterSpacing: 1.5, marginBottom: 12 },
  historyScroll: { backgroundColor: colors.surface[950] + '30', borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.surface[850] },
  historyItem: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.surface[850] },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  historyTime: { fontSize: 11, fontWeight: '700', color: colors.brand[400] },
  historyTrips: { fontSize: 12, fontWeight: '900', color: colors.white },
  historyRoute: { fontSize: 13, fontWeight: '600', color: colors.surface[300] },
  historyNotes: { fontSize: 11, fontStyle: 'italic', color: colors.surface[500], marginTop: 4 },

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
