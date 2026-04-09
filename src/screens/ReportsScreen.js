import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, FlatList, Dimensions, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useStore } from '../store/useStore';
import { GlassCard, Row, SectionHeader, Loader, EmptyState } from '../components';
import { colors, spacing, radius, shadows, gradients } from '../utils/theme';
import { formatCurrency, formatDateShort, getTripProfit, getTripRevenue } from '../utils/helpers';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const PRESETS = [
  { label: 'Today',     startDate: () => dayjs().format('YYYY-MM-DD'),                   endDate: () => dayjs().format('YYYY-MM-DD') },
  { label: 'Yesterday', startDate: () => dayjs().subtract(1,'day').format('YYYY-MM-DD'),  endDate: () => dayjs().subtract(1,'day').format('YYYY-MM-DD') },
  { label: 'This Week', startDate: () => dayjs().startOf('week').format('YYYY-MM-DD'),    endDate: () => dayjs().format('YYYY-MM-DD') },
  { label: 'This Month',startDate: () => dayjs().startOf('month').format('YYYY-MM-DD'),   endDate: () => dayjs().format('YYYY-MM-DD') },
  { label: 'This Year', startDate: () => dayjs().startOf('year').format('YYYY-MM-DD'),    endDate: () => dayjs().format('YYYY-MM-DD') },
];

const REPORT_TABS = ['Daily', 'By Driver', 'By Vehicle', 'By Soil'];

export default function ReportsScreen() {
  const { trips, diesel, drivers, vehicles, soilTypes, fetchTrips, fetchDiesel, fetchDrivers, fetchVehicles, fetchSoilTypes } = useStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Daily');
  const [preset, setPreset] = useState('This Month');
  const [dateRange, setDateRange] = useState({
    from: dayjs().startOf('month').format('YYYY-MM-DD'),
    to: dayjs().format('YYYY-MM-DD'),
  });

  const applyPreset = (p) => {
    const found = PRESETS.find(x => x.label === p);
    if (found) {
      const from = found.startDate();
      const to   = found.endDate();
      setDateRange({ from, to });
      setPreset(p);
    }
  };

  const load = async () => {
    try {
      await Promise.all([
        fetchTrips({ from: dateRange.from, to: dateRange.to, limit: 2000 }),
        fetchDiesel({ from: dateRange.from, to: dateRange.to }),
        drivers.length  === 0 ? fetchDrivers({ limit: 200 }) : Promise.resolve(),
        vehicles.length === 0 ? fetchVehicles({ limit: 200 }) : Promise.resolve(),
        soilTypes.length=== 0 ? fetchSoilTypes() : Promise.resolve(),
      ]);
    } catch {}
    setLoading(false);
  };

  const refreshTrigger = useStore(s => s.refreshTrigger);
  useEffect(() => { setLoading(true); load(); }, [dateRange.from, dateRange.to]);
  useEffect(() => { if (refreshTrigger > 0) onRefresh(); }, [refreshTrigger]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // ── Computed ──────────────────────────────────────────────────────────────
  const totals = useMemo(() => ({
    revenue: trips.reduce((s, t) => s + getTripRevenue(t), 0),
    profit:  trips.reduce((s, t) => s + getTripProfit(t), 0),
    trips:   trips.reduce((s, t) => s + t.trips, 0),
    diesel:  diesel.reduce((s, d) => s + (d.amount || 0), 0),
  }), [trips, diesel]);

  const dailyData = useMemo(() => {
    const days = {};
    trips.forEach(t => {
      if (!days[t.date]) days[t.date] = { date: t.date, trips: 0, revenue: 0, profit: 0, diesel: 0 };
      days[t.date].trips   += t.trips;
      days[t.date].revenue += getTripRevenue(t);
      days[t.date].profit  += getTripProfit(t);
    });
    diesel.forEach(d => {
      if (!days[d.date]) days[d.date] = { date: d.date, trips: 0, revenue: 0, profit: 0, diesel: 0 };
      days[d.date].diesel += (d.amount || 0);
    });
    return Object.values(days).sort((a, b) => b.date.localeCompare(a.date));
  }, [trips, diesel]);

  const driverData = useMemo(() => {
    const map = {};
    trips.forEach(t => {
      const id   = t.driverId;
      const name = t.driver?.name || drivers.find(d => d.id === id)?.name || 'Unknown';
      if (!map[id]) map[id] = { id, name, trips: 0, revenue: 0, profit: 0 };
      map[id].trips   += t.trips;
      map[id].revenue += getTripRevenue(t);
      map[id].profit  += getTripProfit(t);
    });
    return Object.values(map).sort((a, b) => b.trips - a.trips);
  }, [trips, drivers]);

  const vehicleData = useMemo(() => {
    const map = {};
    trips.forEach(t => {
      const id     = t.vehicleId;
      const number = t.vehicle?.number || vehicles.find(v => v.id === id)?.number || 'Unknown';
      if (!map[id]) map[id] = { id, number, trips: 0, revenue: 0, profit: 0 };
      map[id].trips   += t.trips;
      map[id].revenue += getTripRevenue(t);
      map[id].profit  += getTripProfit(t);
    });
    return Object.values(map).sort((a, b) => b.trips - a.trips);
  }, [trips, vehicles]);

  const soilData = useMemo(() => {
    const map = {};
    trips.forEach(t => {
      const id   = t.soilTypeId;
      const name = t.soilType?.name || soilTypes.find(s => s.id === id)?.name || 'Unknown';
      if (!map[id]) map[id] = { id, name, trips: 0, revenue: 0, profit: 0 };
      map[id].trips   += t.trips;
      map[id].revenue += getTripRevenue(t);
      map[id].profit  += getTripProfit(t);
    });
    return Object.values(map).sort((a, b) => b.trips - a.trips);
  }, [trips, soilTypes]);

  if (loading) return <Loader />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* ── Header Area ─────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>REPORTS</Text>
            <Text style={styles.headerSub}>PERFORMANCE INSIGHTS</Text>
          </View>
          <View style={styles.periodBar}>
            <Ionicons name="calendar" size={12} color={colors.brand[400]} />
            <Text style={styles.periodText}>{preset}</Text>
          </View>
        </View>

        {/* Date Presets - Pill Style */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll} contentContainerStyle={styles.presets}>
          {PRESETS.map(p => (
            <TouchableOpacity
              key={p.label}
              style={[styles.presetBtn, preset === p.label && styles.presetBtnActive]}
              onPress={() => applyPreset(p.label)}
            >
              <Text style={[styles.presetText, preset === p.label && styles.presetTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Dynamic Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLbl}>REVENUE</Text>
            <Text style={styles.summaryVal}>{formatCurrency(totals.revenue)}</Text>
          </View>
          <View style={styles.summaryDiv} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLbl}>PROFIT</Text>
            <Text style={[styles.summaryVal, { color: colors.green }]}>{formatCurrency(totals.profit)}</Text>
          </View>
          <View style={styles.summaryDiv} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLbl}>DIESEL</Text>
            <Text style={[styles.summaryVal, { color: '#a855f7' }]}>{formatCurrency(totals.diesel)}</Text>
          </View>
        </View>

        {/* Report Type Tabs */}
        <View style={styles.tabsContainer}>
          {REPORT_TABS.map(t => (
            <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.tabActive]} onPress={() => setActiveTab(t)}>
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t.toUpperCase()}</Text>
              {activeTab === t && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Main content Area ─────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />}
      >
        {/* DAILY */}
        {activeTab === 'Daily' && (
          dailyData.length === 0
            ? <EmptyState icon="bar-chart-outline" message="No data for selected period" />
            : dailyData.map(d => (
              <GlassCard key={d.date} style={styles.reportCard}>
                <View style={styles.reportHead}>
                  <Text style={styles.reportTitle}>{dayjs(d.date).format('DD MMM, YYYY')}</Text>
                  <Text style={[styles.reportProfit, { color: colors.green }]}>{formatCurrency(d.profit)}</Text>
                </View>
                <View style={styles.divider} />
                <Row label="Total Rides" value={String(d.trips)} />
                <Row label="Revenue"    value={formatCurrency(d.revenue)} valueColor={colors.brand[400]} />
                <Row label="Diesel Exp" value={formatCurrency(d.diesel)}  valueColor="#a855f7" />
              </GlassCard>
            ))
        )}

        {/* BY DRIVER */}
        {activeTab === 'By Driver' && (
          driverData.length === 0
            ? <EmptyState icon="people-outline" message="No driver data" />
            : driverData.map((d, i) => (
              <GlassCard key={d.id || i} style={styles.reportCard}>
                <View style={styles.reportHead}>
                  <View style={styles.rankCircle}><Text style={styles.rankText}>{i + 1}</Text></View>
                  <Text style={[styles.reportTitle, { flex: 1, marginLeft: 12 }]}>{d.name}</Text>
                  <Text style={[styles.reportProfit, { color: colors.green }]}>{formatCurrency(d.profit)}</Text>
                </View>
                <View style={styles.divider} />
                <Row label="Completed Trips" value={String(d.trips)} />
                <Row label="Total Revenue"  value={formatCurrency(d.revenue)} valueColor={colors.brand[400]} />
              </GlassCard>
            ))
        )}

        {/* BY VEHICLE */}
        {activeTab === 'By Vehicle' && (
          vehicleData.length === 0
            ? <EmptyState icon="bus-outline" message="No vehicle data" />
            : vehicleData.map((v, i) => (
              <GlassCard key={v.id || i} style={styles.reportCard}>
                <View style={styles.reportHead}>
                  <View style={styles.rankCircle}><Text style={styles.rankText}>{i + 1}</Text></View>
                  <Text style={[styles.reportTitle, { flex: 1, marginLeft: 12 }]}>{v.number}</Text>
                  <Text style={[styles.reportProfit, { color: colors.brand[400] }]}>{formatCurrency(v.revenue)}</Text>
                </View>
                <View style={styles.divider} />
                <Row label="Total Trips" value={String(v.trips)} />
                <Row label="Net Profit" value={formatCurrency(v.profit)} valueColor={colors.green} />
              </GlassCard>
            ))
        )}

        {/* BY SOIL */}
        {activeTab === 'By Soil' && (
          soilData.length === 0
            ? <EmptyState icon="layers-outline" message="No soil data" />
            : soilData.map((s, i) => (
              <GlassCard key={s.id || i} style={styles.reportCard}>
                <View style={styles.reportHead}>
                  <View style={styles.rankCircle}><Text style={styles.rankText}>{i + 1}</Text></View>
                  <Text style={[styles.reportTitle, { flex: 1, marginLeft: 12 }]}>{s.name || 'Generic'}</Text>
                  <Text style={[styles.reportProfit, { color: colors.brand[400] }]}>{formatCurrency(s.revenue)}</Text>
                </View>
                <View style={styles.divider} />
                <Row label="Usage Freq" value={String(s.trips)} />
                <Row label="Yield Info" value={formatCurrency(s.profit)} valueColor={colors.green} />
              </GlassCard>
            ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.surface[950] },
  header:        { borderBottomWidth: 1, borderBottomColor: colors.surface[800], overflow: 'hidden' },
  headerTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  headerTitle:   { fontSize: 24, fontWeight: '900', color: colors.white, letterSpacing: -1 },
  headerSub:     { fontSize: 10, fontWeight: '800', color: colors.brand[400], letterSpacing: 1.5 },
  
  periodBar:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface[900], paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.surface[800] },
  periodText:    { fontSize: 10, fontWeight: '700', color: colors.surface[400] },

  presetScroll:  { maxHeight: 44, marginBottom: 16 },
  presets:       { paddingHorizontal: spacing.xl, gap: spacing.xs, alignItems: 'center' },
  presetBtn:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.surface[800], backgroundColor: colors.surface[900] },
  presetBtnActive: { backgroundColor: colors.brand[500] + '15', borderColor: colors.brand[500] + '40' },
  presetText:    { fontSize: 11, fontWeight: '600', color: colors.surface[400] },
  presetTextActive: { color: colors.brand[400] },

  summaryGrid:   { flexDirection: 'row', backgroundColor: colors.surface[900] + '80', paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.surface[850] },
  summaryItem:   { flex: 1, alignItems: 'center' },
  summaryDiv:    { width: 1, backgroundColor: colors.surface[800] },
  summaryVal:    { fontSize: 14, fontWeight: '800', color: colors.white },
  summaryLbl:    { fontSize: 9, fontWeight: '900', color: colors.surface[500], letterSpacing: 1 },

  tabsContainer: { flexDirection: 'row', paddingHorizontal: spacing.xl },
  tab:           { flex: 1, paddingVertical: 14, alignItems: 'center', position: 'relative' },
  tabActive:     {},
  tabText:       { fontSize: 12, fontWeight: '800', color: colors.surface[500] },
  tabTextActive: { color: colors.white },
  tabIndicator:  { position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 3, backgroundColor: colors.brand[500], borderRadius: 2 },

  content:       { padding: spacing.xl, paddingBottom: 40 },
  reportCard:    { marginBottom: spacing.md },
  reportHead:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  reportTitle:   { fontSize: 15, fontWeight: '800', color: colors.white },
  reportProfit:  { fontSize: 15, fontWeight: '800' },
  divider:       { height: 1, backgroundColor: colors.surface[800], marginVertical: 12 },
  rankCircle:    { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.brand[500] + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.brand[500] + '30' },
  rankText:      { fontSize: 12, fontWeight: '900', color: colors.brand[400] },
});
