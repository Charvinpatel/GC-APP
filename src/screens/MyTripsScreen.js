import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useStore } from '../store/useStore';
import { Card, Badge, Row, EmptyState, BottomModal, Input, SelectPicker, Button, DatePicker } from '../components';
import { colors, spacing, radius } from '../utils/theme';

const getToday = () => dayjs().format('YYYY-MM-DD');
const makeEmptyForm = () => ({ date: getToday(), vehicleId: '', soilTypeId: '', source: '', destination: '', trips: '1', notes: '' });

export default function MyTripsScreen() {
  const {
    driverTrips, vehicles, soilTypes, locations,
    addDriverTrip, deleteDriverTrip, fetchDriverTrips, fetchVehicles, fetchSoilTypes, fetchLocations,
    user
  } = useStore();

  const today = getToday();
  const myId  = user?.driverProfile || user?.driverId || user?._id || user?.id;

  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState(() => makeEmptyForm());
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(true);

  const load = async () => {
    try {
      await Promise.all([
        fetchDriverTrips({ date: today }),
        vehicles.length  === 0 ? fetchVehicles({ limit: 200 })  : Promise.resolve(),
        soilTypes.length === 0 ? fetchSoilTypes()               : Promise.resolve(),
        locations.length === 0 ? fetchLocations({ limit: 500 }) : Promise.resolve(),
      ]);
    } catch {}
    setLoading(false);
  };

  const refreshTrigger = useStore(s => s.refreshTrigger);
  useEffect(() => { load(); }, []);
  useEffect(() => { if (refreshTrigger > 0) onRefresh(); }, [refreshTrigger]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Today's trips for this driver — sorted by time desc (matching web TodayTrips.jsx)
  const todayTrips = useMemo(() =>
    driverTrips
      .filter(t => t.date === today && (t.driverId === myId || t.driver?._id === myId || t.driver?.id === myId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  [driverTrips, today, myId]);

  const totalTripsToday = todayTrips.reduce((s, t) => s + (t.trips || 1), 0);

  const vehicleOpts  = vehicles.map(v  => ({ label: `${v.number} (${v.type || 'Truck'})`, value: v.id }));
  const soilOpts     = soilTypes.map(s => ({ label: s.name, value: s.id }));
  const sourceOpts   = locations.filter(l => l.type === 'source').map(l => {
    const cleanName = (l.name || '').split('|PRICE:')[0].trim();
    return { 
      label: cleanName, 
      value: l.name 
    };
  });
  const destOpts     = locations.filter(l => l.type === 'destination').map(l => ({ 
    label: (l.name || '').split('|PRICE:')[0].trim(), 
    value: l.name 
  }));

  const save = async () => {
    if (!form.vehicleId)   { Alert.alert('Error', 'Please select a vehicle'); return; }
    if (!form.soilTypeId)  { Alert.alert('Error', 'Please select soil type'); return; }
    if (!form.source || !form.destination) { Alert.alert('Error', 'Please select source and destination'); return; }
    setSaving(true);
    try {
      await addDriverTrip({ ...form, driverId: myId, trips: Number(form.trips) || 1 });
      setShowModal(false);
      setForm(makeEmptyForm());
      // Refresh list
      fetchDriverTrips({ date: today });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (t) => {
    if (t.status !== 'pending') { Alert.alert('Cannot Delete', 'Only pending trips can be deleted'); return; }
    Alert.alert('Delete Trip', 'Delete this trip record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDriverTrip(t.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />}
      >
        {/* Header — matching web TODAY'S WORK */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>TODAY TRIPS</Text>
            <Text style={styles.headerSub}>{dayjs().format('dddd, DD MMMM')}</Text>
          </View>
          <View style={styles.headerIconBox}>
            <Ionicons name="flash" size={20} color={colors.brand[500]} />
          </View>
        </View>

        {/* Main Action Area — Parity with web DriverDashboard.jsx */}
        <View style={styles.mainActionCard}>
          <View style={styles.infoRow}>
             <View>
                <Text style={styles.infoLabel}>Status</Text>
                <View style={styles.activeTag}>
                   <View style={styles.greenDot} />
                   <Text style={styles.activeText}>ACTIVE SESSION</Text>
                </View>
             </View>
             <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.infoLabel}>Today's Trips</Text>
                <Text style={styles.infoValue}>{totalTripsToday}</Text>
             </View>
          </View>

          <TouchableOpacity style={styles.logBtn} onPress={() => { setForm(makeEmptyForm()); setShowModal(true); }} activeOpacity={0.85}>
            <Ionicons name="add" size={24} color={colors.white} />
            <Text style={styles.logBtnText}>LOG NEW TRIP</Text>
          </TouchableOpacity>
        </View>

        {/* Feed Header */}
        <View style={styles.feedHeader}>
          <Ionicons name="radio-outline" size={14} color={colors.brand[500]} />
          <Text style={styles.feedHeaderText}>LIVE ACTIVITY FEED</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brand[500]} style={{ marginTop: 40 }} />
        ) : todayTrips.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="bus-outline" size={48} color={colors.surface[800]} />
            <Text style={styles.emptyText}>No activity for today yet.{'\n'}Log your first trip now!</Text>
          </View>
        ) : (
          todayTrips.map(t => {
            const vehicle = vehicles.find(v => v.id === t.vehicleId);
            const isVerified = t.status === 'verified';
            const isRejected = t.status === 'rejected';
            const isPending  = !isVerified && !isRejected;
            const accentColor = isVerified ? colors.green : isRejected ? colors.red : colors.yellow;

            return (
              <View key={t.id} style={styles.tripCard}>
                <View style={[styles.tripAccentBar, { backgroundColor: accentColor }]} />
                <View style={styles.tripContent}>
                  <View style={styles.tripStatusRow}>
                    <View style={[styles.statusChip, { backgroundColor: accentColor + '15' }]}>
                       <Text style={[styles.statusText, { color: accentColor }]}>{t.status.toUpperCase()}</Text>
                    </View>
                    <View style={styles.timeGroup}>
                       <Text style={styles.timeLabel}>{dayjs(t.createdAt).format('hh:mm A')}</Text>
                       {isPending && (
                         <TouchableOpacity onPress={() => confirmDelete(t)} style={styles.deleteBtn}>
                           <Ionicons name="trash-outline" size={14} color={colors.surface[600]} />
                         </TouchableOpacity>
                       )}
                    </View>
                  </View>

                  <View style={styles.tripMainRow}>
                    <View style={styles.vehicleDetails}>
                       <View style={styles.truckBox}>
                          <Ionicons name="bus-outline" size={18} color={colors.surface[500]} />
                       </View>
                       <View>
                          <Text style={styles.vehicleNumber}>{vehicle?.number || 'N/A'}</Text>
                          <Text style={styles.tripsCount}>{t.trips} ROUND TRIPS</Text>
                       </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                       <Text style={styles.materialLabel}>Material</Text>
                       <Text style={styles.materialValue}>{soilTypes.find(s => s.id === t.soilTypeId)?.name || 'Generic'}</Text>
                    </View>
                  </View>

                  <View style={styles.routeRow}>
                    <Ionicons name="location" size={13} color={colors.brand[500]} />
                    <Text style={styles.routeText}>{t.source || 'MINE'}</Text>
                    <Text style={styles.routeArrow}>→</Text>
                    <Text style={styles.routeText}>{(t.destination || 'SITE').split('|PRICE:')[0].trim()}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Log Trip Modal */}
      <BottomModal visible={showModal} onClose={() => setShowModal(false)} title="LOG DAILY TRIP">
        <DatePicker
          label="Date of Trip *"
          date={form.date}
          onConfirm={d => setForm(f => ({ ...f, date: dayjs(d).format('YYYY-MM-DD') }))}
        />
        <SelectPicker
          label="Assigned Vehicle *"
          value={form.vehicleId}
          options={vehicleOpts}
          onChange={v => setForm(f => ({ ...f, vehicleId: v }))}
          placeholder="CHOOSE FROM FLEET"
        />

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Trips Count"
              keyboardType="numeric"
              value={form.trips}
              onChangeText={v => setForm(f => ({ ...f, trips: v }))}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SelectPicker
              label="Soil Type *"
              value={form.soilTypeId}
              options={soilOpts}
              onChange={v => setForm(f => ({ ...f, soilTypeId: v }))}
              placeholder="SELECT SOIL"
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <SelectPicker
              label="Loading Source *"
              value={form.source}
              options={[{ label: 'FROM', value: '' }, ...sourceOpts]}
              onChange={v => setForm(f => ({ ...f, source: v }))}
              placeholder="FROM"
            />
          </View>
          <View style={{ flex: 1 }}>
            <SelectPicker
              label="Destination *"
              value={form.destination}
              options={[{ label: 'TO', value: '' }, ...destOpts]}
              onChange={v => setForm(f => ({ ...f, destination: v }))}
              placeholder="TO"
            />
          </View>
        </View>



        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>{saving ? 'UPLOADING...' : 'SAVE TRIP ENTRY'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.discardBtn} onPress={() => setShowModal(false)}>
           <Text style={styles.discardBtnText}>Discard Log</Text>
        </TouchableOpacity>
      </BottomModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface[950] },
  content:   { padding: spacing.lg, paddingBottom: 100 },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  headerTitle: { fontSize: 24, fontWeight: '900', color: colors.white, textTransform: 'uppercase', letterSpacing: -0.5 },
  headerSub:   { fontSize: 10, fontWeight: '700', color: colors.surface[500], textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 },
  headerIconBox: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.brand[500] + '15', borderWidth: 1, borderColor: colors.brand[500] + '30', alignItems: 'center', justifyContent: 'center' },

  mainActionCard: { backgroundColor: colors.brand[500] + '08', borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.brand[500] + '22', marginBottom: spacing.xl },
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  infoLabel: { fontSize: 9, fontWeight: '900', color: colors.surface[500], textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 },
  infoValue: { fontSize: 32, fontWeight: '900', color: colors.white },
  activeTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.green + '15', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  greenDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  activeText: { fontSize: 10, fontWeight: '900', color: colors.green },

  logBtn:     { width: '100%', paddingVertical: 18, backgroundColor: colors.brand[500], borderRadius: radius.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: colors.brand[500], shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  logBtnText: { fontSize: 16, fontWeight: '900', color: colors.white, textTransform: 'uppercase', letterSpacing: 2 },

  feedHeader:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md, paddingHorizontal: 4 },
  feedHeaderText: { fontSize: 10, fontWeight: '900', color: colors.surface[400], textTransform: 'uppercase', letterSpacing: 2.5 },

  emptyCard: { padding: 64, alignItems: 'center', borderRadius: radius.xl, borderWidth: 2, borderColor: colors.surface[800], borderStyle: 'dashed' },
  emptyText: { fontSize: 11, fontWeight: '900', color: colors.surface[500], textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', lineHeight: 20, marginTop: 16 },

  tripCard: { backgroundColor: colors.surface[900], borderRadius: radius.xl, borderWidth: 1, borderColor: colors.surface[800], marginBottom: spacing.sm, overflow: 'hidden', position: 'relative' },
  tripAccentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  tripContent:   { padding: spacing.md },
  tripStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  statusChip:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText:    { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  timeGroup:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeLabel:     { fontSize: 10, fontFamily: 'monospace', color: colors.surface[600], fontWeight: '700' },
  deleteBtn:     { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.surface[950], borderWidth: 1, borderColor: colors.surface[800], alignItems: 'center', justifyContent: 'center' },

  tripMainRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  vehicleDetails: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  truckBox:       { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface[950], borderWidth: 1, borderColor: colors.surface[800], alignItems: 'center', justifyContent: 'center' },
  vehicleNumber:  { fontSize: 15, fontWeight: '900', color: colors.white, fontFamily: 'monospace', textTransform: 'uppercase' },
  tripsCount:     { fontSize: 10, fontWeight: '800', color: colors.brand[400], textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  materialLabel:  { fontSize: 9, fontWeight: '700', color: colors.surface[500], textTransform: 'uppercase', marginBottom: 2 },
  materialValue:  { fontSize: 12, fontWeight: '900', color: colors.white, textTransform: 'uppercase' },

  routeRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.surface[800] + '50' },
  routeText:  { fontSize: 11, fontWeight: '700', color: colors.white, textTransform: 'uppercase' },
  routeArrow: { fontSize: 11, fontWeight: '900', color: colors.surface[600] },

  saveBtn:     { width: '100%', paddingVertical: 18, backgroundColor: colors.brand[500], borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  saveBtnText: { fontSize: 16, fontWeight: '900', color: colors.white, textTransform: 'uppercase', letterSpacing: 2 },
  discardBtn:  { width: '100%', paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  discardBtnText: { fontSize: 10, fontWeight: '700', color: colors.surface[500], textTransform: 'uppercase', letterSpacing: 2 },
});
