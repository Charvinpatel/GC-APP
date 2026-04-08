import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useStore } from '../store/useStore';
import { EmptyState } from '../components';
import { colors, spacing, radius } from '../utils/theme';

const FILTER_TABS = ['today', 'yesterday', 'custom'];

export default function TripHistoryScreen() {
  const { driverTrips, fetchDriverTrips, vehicles, soilTypes, user, contentLoading } = useStore();

  const myId    = user?.driverProfile || user?.driverId || user?._id || user?.id;
  const today   = dayjs().format('YYYY-MM-DD');
  const yest    = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

  const [filterType, setFilterType] = useState('today');
  const [customDate, setCustomDate] = useState(today);
  const [refreshing, setRefreshing]   = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const activeDate = useMemo(() => {
    if (filterType === 'today')     return today;
    if (filterType === 'yesterday') return yest;
    return customDate;
  }, [filterType, customDate, today, yest]);

  useEffect(() => {
    fetchDriverTrips({ date: activeDate });
  }, [activeDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDriverTrips({ date: activeDate });
    setRefreshing(false);
  };

  const filteredTrips = useMemo(() =>
    driverTrips
      .filter(t => {
        const sameDate = t.date === activeDate;
        const sameDriver = t.driverId === myId || t.driver?._id === myId || t.driver?.id === myId;
        return sameDate && sameDriver;
      })
      .filter(t => {
         if (!searchQuery) return true;
         const q = searchQuery.toLowerCase();
         const v = vehicles.find(veh => veh.id === t.vehicleId);
         const s = soilTypes.find(soil => soil.id === t.soilTypeId);
         return (v?.number || '').toLowerCase().includes(q) ||
                (s?.name || '').toLowerCase().includes(q) ||
                (t.source || '').toLowerCase().includes(q) ||
                (t.destination || '').toLowerCase().includes(q) ||
                (t.status || '').toLowerCase().includes(q) ||
                (t.notes || '').toLowerCase().includes(q);
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  [driverTrips, activeDate, myId, searchQuery, vehicles, soilTypes]);

  const totalTripsCount = filteredTrips.reduce((s, t) => s + (t.trips || 1), 0);

  const shiftCustomDate = (dir) => {
    const newDate = dayjs(customDate).add(dir, 'day').format('YYYY-MM-DD');
    setCustomDate(newDate);
  };

  const renderTrip = (t) => {
    const vehicle    = vehicles.find(v => v.id === t.vehicleId);
    const soil       = soilTypes.find(s => s.id === t.soilTypeId);
    const isVerified = t.status === 'verified';
    const isRejected = t.status === 'rejected';
    const accentColor = isVerified ? colors.green : isRejected ? colors.red : colors.yellow;

    return (
      <View key={t.id} style={styles.tripCard}>
        <View style={[styles.tripAccentBar, { backgroundColor: accentColor }]} />
        <View style={styles.tripContent}>
          <View style={styles.tripHeader}>
            <View style={[styles.statusBadge, { backgroundColor: accentColor + '15' }]}>
               <Text style={[styles.statusBadgeText, { color: accentColor }]}>{t.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.timeText}>{dayjs(t.createdAt).format('hh:mm A')}</Text>
          </View>

          <View style={styles.tripBody}>
             <View style={styles.vehicleSection}>
                <View style={styles.truckIconBox}>
                   <Ionicons name="bus-outline" size={16} color={colors.surface[500]} />
                </View>
                <View>
                   <Text style={styles.vehicleNum}>{vehicle?.number || 'N/A'}</Text>
                   <Text style={styles.tripsLabel}>{t.trips} ROUND TRIPS</Text>
                </View>
             </View>
             <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.materialLabel}>MATERIAL</Text>
                <Text style={styles.materialValue}>{soil?.name || 'GENERIC'}</Text>
             </View>
          </View>

          <View style={styles.routeFooter}>
            <Ionicons name="location" size={13} color={colors.brand[500]} />
            <Text style={styles.routeText}>{t.source || 'MINE'}</Text>
            <Text style={styles.routeArrow}>→</Text>
            <Text style={styles.routeText}>{t.destination || 'SITE'}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        {isSearchActive ? (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <TextInput 
              style={{ flex: 1, height: 44, backgroundColor: colors.surface[900], borderRadius: 12, paddingHorizontal: 16, color: colors.white, fontSize: 13 }}
              placeholder="Search by vehicle, material..."
              placeholderTextColor={colors.surface[500]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity onPress={() => { setIsSearchActive(false); setSearchQuery(''); }} style={{ marginLeft: 12 }}>
              <Ionicons name="close" size={24} color={colors.surface[400]} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View>
              <Text style={styles.pageTitle}>HISTORY</Text>
              <Text style={styles.pageSub}>Detailed Daily Records</Text>
            </View>
            <TouchableOpacity style={styles.headerIconBox} onPress={() => setIsSearchActive(true)}>
              <Ionicons name="search" size={20} color={colors.surface[200]} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.filterSection}>
        <View style={styles.radioGroup}>
          {FILTER_TABS.map(tab => {
            const active = filterType === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setFilterType(tab)}
                style={[styles.radioButton, active && styles.radioButtonActive]}
              >
                <Text style={[styles.radioLabel, active && styles.radioLabelActive]}>
                  {tab === 'today' ? 'TODAY' : tab === 'yesterday' ? 'YESTERDAY' : 'CUSTOM'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {filterType === 'custom' && (
          <View style={styles.dateSelector}>
             <TouchableOpacity onPress={() => shiftCustomDate(-1)} style={styles.shiftBtn}>
                <Ionicons name="chevron-back" size={20} color={colors.surface[400]} />
             </TouchableOpacity>
             <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateDisplay}>{dayjs(customDate).format('DD MMM YYYY').toUpperCase()}</Text>
                <Text style={styles.dateDisplaySub}>{dayjs(customDate).format('dddd').toUpperCase()}</Text>
             </TouchableOpacity>
             <TouchableOpacity onPress={() => shiftCustomDate(1)} style={styles.shiftBtn} disabled={customDate >= today}>
                <Ionicons name="chevron-forward" size={20} color={customDate >= today ? colors.surface[800] : colors.surface[400]} />
             </TouchableOpacity>
          </View>
        )}
        {showDatePicker && (
          <DateTimePicker
            value={new Date(customDate)}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setCustomDate(dayjs(selectedDate).format('YYYY-MM-DD'));
              }
            }}
          />
        )}
      </View>

      <View style={styles.summaryBar}>
        <View style={styles.summaryLeft}>
           <Ionicons name="layers-outline" size={12} color={colors.surface[600]} />
           <Text style={styles.summaryTitle}>
              {filterType.toUpperCase()} {filterType === 'custom' ? 'RECORD' : 'LOGS'}
           </Text>
        </View>
        <View style={styles.totalBadge}>
           <Text style={styles.totalBadgeText}>{totalTripsCount} TRIPS TOTAL</Text>
        </View>
      </View>

      {contentLoading ? (
        <ActivityIndicator color={colors.brand[500]} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={t => t.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="search-outline" size={48} color={colors.surface[700]} />
              <Text style={styles.emptyText}>No records found{'\n'}for this date</Text>
            </View>
          }
          renderItem={({ item }) => renderTrip(item)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface[950] },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingBottom: spacing.md },
  pageTitle: { fontSize: 24, fontWeight: '900', color: colors.white, textTransform: 'uppercase', letterSpacing: -0.5 },
  pageSub: { fontSize: 10, fontWeight: '700', color: colors.surface[500], textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 },
  headerIconBox: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.surface[900], borderWidth: 1, borderColor: colors.surface[800], alignItems: 'center', justifyContent: 'center' },

  filterSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  radioGroup: { flexDirection: 'row', backgroundColor: colors.surface[900], borderRadius: radius.xl, padding: 4, gap: 4, borderWidth: 1, borderColor: colors.surface[800] },
  radioButton: { flex: 1, paddingVertical: 10, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  radioButtonActive: { backgroundColor: colors.brand[500] },
  radioLabel: { fontSize: 10, fontWeight: '900', color: colors.surface[500], textTransform: 'uppercase', letterSpacing: 1 },
  radioLabelActive: { color: colors.white },

  dateSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, backgroundColor: colors.surface[900] + '80', borderRadius: radius.xl, padding: spacing.sm, borderWidth: 1, borderColor: colors.surface[800] },
  shiftBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surface[950], alignItems: 'center', justifyContent: 'center' },
  dateDisplay: { fontSize: 13, fontWeight: '900', color: colors.white },
  dateDisplaySub: { fontSize: 8, fontWeight: '700', color: colors.surface[600], marginTop: 2 },

  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryTitle: { fontSize: 10, fontWeight: '900', color: colors.surface[400], textTransform: 'uppercase', letterSpacing: 2 },
  totalBadge: { backgroundColor: colors.green + '15', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, borderColor: colors.green + '25' },
  totalBadgeText: { fontSize: 9, fontWeight: '900', color: colors.green },

  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  tripCard: { backgroundColor: colors.surface[900], borderRadius: radius.xl, borderWidth: 1, borderColor: colors.surface[800], marginBottom: spacing.sm, overflow: 'hidden', position: 'relative' },
  tripAccentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  tripContent: { padding: spacing.md },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
  timeText: { fontSize: 10, fontFamily: 'monospace', color: colors.surface[600], fontWeight: '700' },

  tripBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  vehicleSection: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  truckIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surface[950], borderWidth: 1, borderColor: colors.surface[800], alignItems: 'center', justifyContent: 'center' },
  vehicleNum: { fontSize: 14, fontWeight: '900', color: colors.white, fontFamily: 'monospace', textTransform: 'uppercase' },
  tripsLabel: { fontSize: 9, fontWeight: '800', color: colors.brand[400], textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  materialLabel: { fontSize: 8, fontWeight: '700', color: colors.surface[500], marginBottom: 2 },
  materialValue: { fontSize: 11, fontWeight: '900', color: colors.white },

  routeFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.surface[800] + '50' },
  routeText: { fontSize: 11, fontWeight: '700', color: colors.white, textTransform: 'uppercase' },
  routeArrow: { fontSize: 11, fontWeight: '900', color: colors.surface[600] },

  emptyCard: { padding: 56, alignItems: 'center', borderRadius: radius.xl, borderWidth: 2, borderColor: colors.surface[800], borderStyle: 'dashed', marginTop: 20 },
  emptyText: { fontSize: 11, fontWeight: '900', color: colors.surface[500], textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', lineHeight: 20, marginTop: 12 },
});
