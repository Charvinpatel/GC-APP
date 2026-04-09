import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Dimensions, StatusBar, Animated, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../store/useStore';
import { 
  StatCard, SectionHeader, Card, Badge, Row, 
  EmptyState, BottomModal, Input, SelectPicker, 
  Button, GlassCard, Loader 
} from '../components';
import { colors, spacing, radius, shadows, gradients } from '../utils/theme';
import { formatCurrency, formatDateShort, getTripProfit, getTripRevenue, getLast7Days } from '../utils/helpers';
import { LinearGradient } from 'expo-linear-gradient';


const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────
// ── DRIVER DASHBOARD ─────────────────────────────
function DriverDashboard({ user }) {
  const {
    driverTrips, vehicles, soilTypes, locations,
    fetchDriverTrips, fetchVehicles, fetchSoilTypes, fetchLocations,
  } = useStore();

  const myId  = user?.driverProfile || user?.driverId || user?._id || user?.id;

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [showPicker, setShowPicker] = useState(false);

  const currentMonthName = dayjs(selectedMonth).format('MMMM YYYY');

  const load = async () => {
    try {
      await Promise.all([
        fetchDriverTrips({ date: selectedMonth }), 
        vehicles.length  === 0 ? fetchVehicles({ limit: 200 })  : Promise.resolve(),
        soilTypes.length === 0 ? fetchSoilTypes()               : Promise.resolve(),
        locations.length === 0 ? fetchLocations({ limit: 500 }) : Promise.resolve(),
      ]);
    } catch {}
    setLoading(false);
  };

  const refreshTrigger = useStore(s => s.refreshTrigger);
  useEffect(() => { load(); }, [selectedMonth]);
  useEffect(() => { if (refreshTrigger > 0) onRefresh(); }, [refreshTrigger]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const monthlyTrips = useMemo(() => 
    driverTrips.filter(t => t.date && t.date.startsWith(selectedMonth) && (t.driverId === myId || t.driver?._id === myId || t.driver?.id === myId))
  , [driverTrips, selectedMonth, myId]);

  const totalTrips = monthlyTrips.reduce((sum, t) => sum + (t.trips || 1), 0);
  const activeDays = new Set(monthlyTrips.map(t => t.date)).size;

  if (loading) return <Loader />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />}
    >
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>WELCOME BACK,</Text>
          <Text style={styles.userName}>{user?.name?.toUpperCase() || 'DRIVER'}</Text>
        </View>
        <View style={styles.monthSelector}>
           <TouchableOpacity onPress={() => setSelectedMonth(dayjs(selectedMonth).subtract(1, 'month').format('YYYY-MM'))} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.white} />
           </TouchableOpacity>
           <TouchableOpacity onPress={() => setShowPicker(true)}>
              <Text style={styles.monthLabel}>{dayjs(selectedMonth).format('MMM YY').toUpperCase()}</Text>
           </TouchableOpacity>
           <TouchableOpacity 
             onPress={() => setSelectedMonth(dayjs(selectedMonth).add(1, 'month').format('YYYY-MM'))} 
             style={[styles.navBtn, selectedMonth >= dayjs().format('YYYY-MM') && { opacity: 0.3 }]} 
             disabled={selectedMonth >= dayjs().format('YYYY-MM')}
           >
              <Ionicons name="chevron-forward" size={20} color={colors.white} />
           </TouchableOpacity>
        </View>
      </View>

      {showPicker && (
         <DateTimePicker
           value={new Date(selectedMonth + '-01')}
           mode="date"
           display="default"
           onChange={(event, date) => {
             setShowPicker(false);
             if (date) setSelectedMonth(dayjs(date).format('YYYY-MM'));
           }}
         />
      )}

      {/* Dashboard Card */}
      <GlassCard glowColor={colors.brand[500]} style={styles.dashboardGlass}>
         <View style={styles.glassHeader}>
            <View style={styles.glassTitleWrap}>
               <Ionicons name="analytics" size={16} color={colors.brand[400]} />
               <Text style={styles.glassTitle}>DASHBOARD SUMMARY</Text>
            </View>
            <Badge label="ACTIVE" color={colors.green} />
         </View>

         <View style={styles.bigStatWrap}>
            <Text style={styles.bigStatLabel}>TOTAL LOGGED ROUNDS</Text>
            <View style={styles.bigStatValueRow}>
               <Text style={styles.bigStatValue}>{totalTrips}</Text>
               <Ionicons name="stats-chart" size={24} color={colors.brand[500]} style={{ marginLeft: 12, opacity: 0.5 }} />
            </View>
         </View>

         <View style={styles.statsGrid}>
            <View style={styles.gridItem}>
               <Text style={styles.gridLabel}>ACTIVE DAYS</Text>
               <Text style={styles.gridValue}>{activeDays}</Text>
            </View>
            <View style={styles.gridItem}>
               <Text style={styles.gridLabel}>DOCUMENTS</Text>
               <Text style={[styles.gridValue, { color: colors.blue }]}>{monthlyTrips.length}</Text>
            </View>
         </View>
      </GlassCard>

      <SectionHeader title="RECENT MOVEMENTS" />

      <FlatList
        data={monthlyTrips.slice(0, 20)}
        keyExtractor={t => t.id}
        renderItem={({ item: t }) => (
          <GlassCard style={styles.movementCard}>
             <View style={styles.moveHeader}>
                <Text style={styles.moveDate}>{dayjs(t.date).format('DD MMM')}</Text>
                <View style={[styles.statusTag, { backgroundColor: (t.status === 'verified' ? colors.green : colors.yellow) + '15' }]}>
                   <Text style={[styles.statusTagText, { color: (t.status === 'verified' ? colors.green : colors.yellow) }]}>
                      {t.status?.toUpperCase() || 'PENDING'}
                   </Text>
                </View>
             </View>
             <View style={styles.moveRoute}>
                <Text style={styles.routePill}>{t.source || 'MINE'}</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.surface[600]} />
                <Text style={styles.routePill}>{t.destination || 'SITE'}</Text>
             </View>
             <View style={styles.moveFooter}>
                <Text style={styles.mMaterial}>{t.soilType?.name || 'MATERIAL'}</Text>
                <Text style={styles.mTrips}>{t.trips} ROUNDS</Text>
             </View>
          </GlassCard>
        )}
        ListEmptyComponent={<EmptyState message={`No activity for ${dayjs(selectedMonth).format('MMMM')}`} />}
        scrollEnabled={false} // Since it's inside a ScrollView
        initialNumToRender={5}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// ── ADMIN DASHBOARD ─────────────────────────────
function AdminDashboard({ user, navigation }) {
  const {
    trips, diesel, drivers, vehicles, soilTypes, driverTrips,
    fetchTrips, fetchDiesel, fetchDrivers, fetchVehicles, fetchDriverTrips,
  } = useStore();

  const [refreshing, setRefreshing] = useState(false);
  const [chartView, setChartView]   = useState('7d');
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [showPicker, setShowPicker] = useState(false);
  const [perfView, setPerfView] = useState('day');

  const navigateDate = (direction) => {
    let newDate = dayjs(selectedDate);
    if (perfView === 'day') newDate = newDate.add(direction, 'day');
    else if (perfView === 'month') newDate = newDate.add(direction, 'month');
    else if (perfView === 'year') newDate = newDate.add(direction, 'year');
    setSelectedDate(newDate.format('YYYY-MM-DD'));
  };

  const today    = useMemo(() => selectedDate, [selectedDate]);
  const last7    = useMemo(() => {
    const dates = [];
    for (let i = 6; i >= 0; i--) dates.push(dayjs().subtract(i, 'day').format('YYYY-MM-DD'));
    return dates;
  }, []);

  const last30 = useMemo(() => {
    const dates = [];
    for (let i = 29; i >= 0; i--) dates.push(dayjs().subtract(i, 'day').format('YYYY-MM-DD'));
    return dates;
  }, []);

  const last12Months = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) months.push(dayjs().subtract(i, 'month').format('YYYY-MM'));
    return months;
  }, []);

  const load = async () => {
    try {
      await Promise.all([
        fetchTrips({ limit: 1000 }),
        fetchDiesel({ limit: 1000 }),
        fetchDrivers({ limit: 100 }),
        fetchVehicles({ limit: 100 }),
        fetchDriverTrips({}),
      ]);
    } catch {}
  };

  const refreshTrigger = useStore(s => s.refreshTrigger);
  useEffect(() => { load(); }, []);
  useEffect(() => { if (refreshTrigger > 0) onRefresh(); }, [refreshTrigger]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const pendingCount = useMemo(() => driverTrips.filter(dt => dt.status === 'pending').length, [driverTrips]);

  const todayStats = useMemo(() => {
    const t = trips.filter(x  => x.date === today);
    const d = diesel.filter(x => x.date === today);
    return {
      revenue: t.reduce((s, x) => s + getTripRevenue(x), 0),
      profit:  t.reduce((s, x) => s + getTripProfit(x), 0),
      diesel:  d.reduce((s, x) => s + (x.amount || 0), 0),
      count:   t.reduce((s, x) => s + x.trips, 0),
    };
  }, [trips, diesel, today]);

  const monthlyStats = useMemo(() => {
    const month = dayjs(selectedDate).format('YYYY-MM');
    const t = trips.filter(x  => x.date && x.date.startsWith(month));
    const d = diesel.filter(x => x.date && x.date.startsWith(month));
    return {
      revenue: t.reduce((s, x) => s + getTripRevenue(x), 0),
      profit:  t.reduce((s, x) => s + getTripProfit(x), 0),
      diesel:  d.reduce((s, x) => s + (x.amount || 0), 0),
      count:   t.reduce((s, x) => s + x.trips, 0),
    };
  }, [trips, diesel, selectedDate]);

  const yearlyStats = useMemo(() => {
    const year = dayjs(selectedDate).format('YYYY');
    const t = trips.filter(x  => x.date && x.date.startsWith(year));
    const d = diesel.filter(x => x.date && x.date.startsWith(year));
    return {
      revenue: t.reduce((s, x) => s + getTripRevenue(x), 0),
      profit:  t.reduce((s, x) => s + getTripProfit(x), 0),
      diesel:  d.reduce((s, x) => s + (x.amount || 0), 0),
      count:   t.reduce((s, x) => s + x.trips, 0),
    };
  }, [trips, diesel, selectedDate]);

  const displayStats = perfView === 'day' ? todayStats : perfView === 'month' ? monthlyStats : yearlyStats;

  const chartData = useMemo(() => {
    if (chartView === '30d') {
      return last30.map(date => {
        const dt = trips.filter(t => t.date === date);
        const dd = diesel.filter(d => d.date === date);
        return {
          label: dayjs(date).format('DD'),
          profit: dt.reduce((s, t) => s + getTripProfit(t), 0),
          diesel: dd.reduce((s, d) => s + (d.amount || 0), 0),
        };
      });
    }
    if (chartView === '1y') {
      return last12Months.map(month => {
        const dt = trips.filter(t => t.date && t.date.startsWith(month));
        const dd = diesel.filter(d => d.date && d.date.startsWith(month));
        return {
          label: dayjs(month).format('MMM'),
          profit: dt.reduce((s, t) => s + getTripProfit(t), 0),
          diesel: dd.reduce((s, d) => s + (d.amount || 0), 0),
        };
      });
    }
    return last7.map(date => {
      const dt = trips.filter(t => t.date === date);
      const dd = diesel.filter(d => d.date === date);
      return {
        label: dayjs(date).format('ddd'),
        profit: dt.reduce((s, t) => s + getTripProfit(t), 0),
        diesel: dd.reduce((s, d) => s + (d.amount || 0), 0),
      };
    });
  }, [trips, diesel, chartView, last7, last30, last12Months]);

  const maxProfit = Math.max(...chartData.map(d => d.profit), 1000);
  const maxDiesel = Math.max(...chartData.map(d => d.diesel), 1000);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />}
    >
      <StatusBar barStyle="light-content" />

      {/* Admin Header */}
      <View style={{ marginBottom: spacing.xl }}>
        <View>
          <Text style={styles.welcomeText}>OVERVIEW FOR</Text>
          <Text style={styles.userName}>ADMIN CONTROL</Text>
          <Text style={{ fontSize: 11, color: colors.surface[500], fontWeight: '700', marginTop: 2 }}>{dayjs().format('DD MMM YYYY')}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: 12 }}>
           <View style={[styles.rangeSelect, { marginLeft: 0 }]}>
              {['day', 'month', 'year'].map(r => (
                 <TouchableOpacity 
                   key={r} 
                   style={[styles.rangeBtn, perfView === r && styles.rangeBtnActive, { paddingVertical: 4, paddingHorizontal: 10 }]} 
                   onPress={() => setPerfView(r)}
                 >
                    <Text style={[styles.rangeText, perfView === r && styles.rangeTextActive, { fontSize: 10 }]}>{r.toUpperCase()}</Text>
                 </TouchableOpacity>
              ))}
           </View>
           <View style={[styles.monthSelector, { padding: 4, flex: 1, justifyContent: 'space-between' }]}>
              <TouchableOpacity onPress={() => navigateDate(-1)} style={styles.navBtnSmall}>
                 <Ionicons name="chevron-back" size={16} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowPicker(true)} style={{ flex: 1, alignItems: 'center' }}>
                 <Text style={[styles.monthLabel, { marginHorizontal: 2, fontSize: 11 }]}>
                    {perfView === 'day' ? dayjs(selectedDate).format('DD MMM YYYY').toUpperCase() :
                     perfView === 'month' ? dayjs(selectedDate).format('MMM YYYY').toUpperCase() :
                     dayjs(selectedDate).format('YYYY').toUpperCase()}
                 </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateDate(1)} style={styles.navBtnSmall}>
                 <Ionicons name="chevron-forward" size={16} color={colors.white} />
              </TouchableOpacity>
           </View>
        </View>
      </View>

      {showPicker && (
         <DateTimePicker
           value={new Date(selectedDate)}
           mode="date"
           display="default"
           onChange={(event, date) => {
             setShowPicker(false);
             if (date) setSelectedDate(dayjs(date).format('YYYY-MM-DD'));
           }}
         />
      )}

      {/* Pending Alert */}
      {pendingCount > 0 && (
        <GlassCard glowColor={colors.red} style={styles.pendingAlert} onPress={() => navigation.navigate('VerifyTrips')}>
          <View style={styles.alertIconBox}>
             <Ionicons name="shield-half-outline" size={24} color={colors.red} />
          </View>
          <View style={{ flex: 1 }}>
             <Text style={styles.alertTitle}>{pendingCount} PENDING VERIFICATIONS</Text>
             <Text style={styles.alertSubText}>Driver submissions are waiting for your review.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.surface[600]} />
        </GlassCard>
      )}

      <SectionHeader title="FLEET PERFORMANCE" />

      <View style={styles.statsRow}>
        <StatCard label={`${perfView.toUpperCase()} PROFIT`} value={formatCurrency(displayStats.profit)} icon="cash-outline" color={colors.green} />
        <StatCard label="ROUND TRIPS" value={String(displayStats.count)} icon="car-sport-outline" color={colors.blue} />
      </View>
      <View style={[styles.statsRow, { marginTop: spacing.md }]}>
        <StatCard label={`${perfView === 'day' ? 'REVENUE' : perfView === 'month' ? 'MTD REVENUE' : 'YTD REVENUE'}`} value={formatCurrency(displayStats.revenue)} icon="trending-up" color={colors.brand[400]} />
        <StatCard label="DIESEL COST" value={formatCurrency(displayStats.diesel)} icon="flame" color={colors.yellow} />
      </View>

      <View style={{ height: spacing.xl }} />

      <SectionHeader title="PROFIT VS DIESEL ANALYSIS" />
      <GlassCard style={styles.chartGlass}>
         <View style={styles.chartHeader}>
            <View style={styles.legendWrap}>
               <View style={[styles.legendDot, { backgroundColor: colors.brand[500] }]} />
               <Text style={styles.legendText}>PROFIT</Text>
               <View style={[styles.legendDot, { backgroundColor: colors.yellow, marginLeft: 12 }]} />
               <Text style={styles.legendText}>DIESEL</Text>
            </View>
            <View style={styles.rangeSelect}>
               {['7d', '30d', '1y'].map(r => (
                  <TouchableOpacity 
                    key={r} 
                    style={[styles.rangeBtn, chartView === r && styles.rangeBtnActive]} 
                    onPress={() => setChartView(r)}
                  >
                     <Text style={[styles.rangeText, chartView === r && styles.rangeTextActive]}>{r.toUpperCase()}</Text>
                  </TouchableOpacity>
               ))}
            </View>
         </View>
         
         <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.barsContainer, { width: (chartData?.length || 0) * 40 + 40, minWidth: width - spacing.xl * 4 }]}>
               {(chartData || []).map((d, i) => (
                 <View key={i} style={styles.barItem}>
                    <View style={styles.barGroup}>
                       <View style={[styles.bar, { height: (d.profit / maxProfit) * 80, backgroundColor: colors.brand[500] }]}>
                         {d.profit > 0 && <Text style={styles.barPrice}>{(d.profit / 1000).toFixed(1)}k</Text>}
                       </View>
                       <View style={[styles.bar, { height: (d.diesel / maxDiesel) * 80, backgroundColor: colors.yellow }]}>
                         {d.diesel > 0 && <Text style={styles.barPrice}>{(d.diesel / 1000).toFixed(1)}k</Text>}
                       </View>
                    </View>
                    <Text style={styles.barLabel}>{d.label}</Text>
                 </View>
               ))}
            </View>
         </ScrollView>
      </GlassCard>
    </ScrollView>
  );
}

export default function DashboardScreen({ navigation }) {
  const user = useStore(s => s.user);
  if (user?.role === 'driver') return <DriverDashboard user={user} />;
  return <AdminDashboard user={user} navigation={navigation} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface[950] },
  content: { padding: spacing.xl, paddingBottom: 100 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing['2xl'] },
  welcomeText: { fontSize: 11, fontWeight: '900', color: colors.surface[500], letterSpacing: 2 },
  userName: { fontSize: 22, fontWeight: '900', color: colors.white, letterSpacing: -0.5 },

  monthSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface[900], padding: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.surface[800] },
  navBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  navBtnSmall: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 12, fontWeight: '900', color: colors.brand[400], marginHorizontal: 12 },

  dashboardGlass: { padding: spacing['2xl'], marginBottom: spacing.xl },
  glassHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  glassTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  glassTitle: { fontSize: 13, fontWeight: '900', color: colors.surface[200], letterSpacing: 1 },

  bigStatWrap: { marginBottom: spacing.xl },
  bigStatLabel: { fontSize: 10, fontWeight: '800', color: colors.surface[400], letterSpacing: 1.5, marginBottom: 8 },
  bigStatValueRow: { flexDirection: 'row', alignItems: 'center' },
  bigStatValue: { fontSize: 56, fontWeight: '900', color: colors.white, letterSpacing: -2 },

  statsGrid: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: spacing.xl, gap: spacing.lg },
  gridItem: { flex: 1 },
  gridLabel: { fontSize: 10, fontWeight: '800', color: colors.surface[600], letterSpacing: 1 },
  gridValue: { fontSize: 18, fontWeight: '900', color: colors.white, marginTop: 4 },

  movementCard: { padding: spacing.lg, marginBottom: spacing.md },
  moveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  moveDate: { fontSize: 11, fontWeight: '800', color: colors.surface[500], textTransform: 'uppercase' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  statusTagText: { fontSize: 9, fontWeight: '900' },

  moveRoute: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  routePill: { fontSize: 13, fontWeight: '700', color: colors.white, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },

  moveFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 10 },
  mMaterial: { fontSize: 11, color: colors.surface[500], fontWeight: '700' },
  mTrips: { fontSize: 12, color: colors.brand[400], fontWeight: '900' },

  profileBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface[900], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.surface[800], position: 'relative' },
  notifDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red, borderWidth: 2, borderColor: colors.surface[900] },

  pendingAlert: { padding: spacing.lg, marginBottom: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.red + '15', alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: 13, fontWeight: '900', color: colors.white, letterSpacing: 0.5 },
  alertSubText: { fontSize: 11, color: colors.surface[500], marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: spacing.md },
  
  chartGlass: { padding: spacing.xl, marginTop: spacing.md, marginBottom: spacing.xl },
  legendText: { fontSize: 10, fontWeight: '900', color: colors.surface[400], marginLeft: 4, letterSpacing: 1 },
  
  rangeSelect: { flexDirection: 'row', gap: 6, backgroundColor: colors.surface[900], padding: 4, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surface[800], marginLeft: 'auto' },
  rangeBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.md },
  rangeBtnActive: { backgroundColor: colors.brand[500] },
  rangeText: { fontSize: 10, fontWeight: '800', color: colors.surface[500] },
  rangeTextActive: { color: colors.white },
  
  barsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, paddingTop: 10 },
  barItem: { alignItems: 'center', flex: 1 },
  barGroup: { flexDirection: 'row', gap: 3, alignItems: 'flex-end', height: 80 },
  bar: { width: 8, borderRadius: 4, minHeight: 4, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 2 },
  barLabel: { fontSize: 9, color: colors.surface[600], marginTop: 10, fontWeight: '700' },
  barPrice: { fontSize: 7, fontWeight: '900', color: colors.white, transform: [{ rotate: '-90deg' }], marginBottom: 10, width: 40, textAlign: 'center' },

  chartTitle: { fontSize: 11, fontWeight: '800', color: colors.surface[400], letterSpacing: 1, marginBottom: spacing.sm },
  noDataText: { fontSize: 12, color: colors.surface[600], fontWeight: '600', fontStyle: 'italic' },
  
  recentActivityCard: { padding: spacing.md, marginBottom: spacing.sm },
  recentVehicle: { fontSize: 14, fontWeight: '800', color: colors.white },
  recentDriver: { fontSize: 11, color: colors.surface[500], fontWeight: '600' },
  recentTrips: { fontSize: 13, fontWeight: '900', color: colors.brand[400] },
  recentDate: { fontSize: 10, color: colors.surface[600], fontWeight: '700' },
  recentRoute: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)', paddingTop: 8 },
  recentPill: { fontSize: 10, fontWeight: '700', color: colors.surface[400], backgroundColor: colors.surface[850], paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },

});
