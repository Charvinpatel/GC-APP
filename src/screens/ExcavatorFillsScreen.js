import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  RefreshControl, Dimensions, StatusBar, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useStore } from '../store/useStore';
import { 
  GlassCard, EmptyState, Loader, BottomModal, 
  Input, SelectPicker, Button, DatePicker, Badge
} from '../components';
import { colors, spacing, radius, shadows, gradients } from '../utils/theme';
import { formatDateShort } from '../utils/helpers';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const EMPTY_FORM = {
  date: dayjs().format('YYYY-MM-DD'),
  excavatorId: '',
  truckName: '',
  totalFills: '',
  operatorName: '',
};

export default function ExcavatorFillsScreen() {
  const { 
    driverTrips, vehicles, excavatorFills,
    fetchDriverTrips, fetchVehicles, fetchExcavatorFills, addExcavatorFill, deleteExcavatorFill
  } = useStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  
  const [filterDate, setFilterDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [activePreset, setActivePreset] = useState('Today');
  const [showFilterPicker, setShowFilterPicker] = useState(false);

  const load = async (d) => {
    try {
      const filters = d === 'All' ? { limit: 1000 } : { date: d || filterDate, limit: 1000 };
      await Promise.all([
        fetchDriverTrips(filters),
        fetchExcavatorFills(filters),
        vehicles.length === 0 ? fetchVehicles({ limit: 100 }) : Promise.resolve(),
      ]);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(filterDate); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(activePreset === 'All' ? 'All' : filterDate);
    setRefreshing(false);
  };

  const applyFilter = async (preset) => {
    setLoading(true);
    let date = dayjs().format('YYYY-MM-DD');
    if (preset === 'All') date = 'All';
    setFilterDate(date === 'All' ? null : date);
    setActivePreset(preset);
    await load(date);
  };

  const saveManualFill = async () => {
    if (!form.excavatorId || !form.truckName || !form.totalFills) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      await addExcavatorFill({ ...form, totalFills: Number(form.totalFills) });
      setShowModal(false);
      setForm(EMPTY_FORM);
      load(activePreset === 'All' ? 'All' : filterDate);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const excavatorStats = useMemo(() => {
    const stats = {};
    
    // Initialize stats for all excavator vehicles
    vehicles.filter(v => v.type === 'excavator').forEach(v => {
      stats[v.id] = {
        id: v.id,
        name: v.number,
        totalFills: 0,
        trips: [], // auto-recorded trips
        manualFills: [] // manual entries
      };
    });

    // Aggregate from driverTrips (Auto)
    driverTrips.forEach(t => {
      const eId = t.excavatorId || t.excavator?._id || t.excavator?.id;
      if (eId && stats[eId]) {
        stats[eId].totalFills += (Number(t.trips) || 1);
        stats[eId].trips.push(t);
      }
    });

    // Aggregate from manual excavatorFills
    excavatorFills.forEach(f => {
      const eId = f.excavatorId || f.excavator?._id || f.excavator?.id;
      if (eId && stats[eId]) {
        stats[eId].totalFills += (Number(f.totalFills) || 0);
        stats[eId].manualFills.push(f);
      }
    });

    return Object.values(stats).sort((a, b) => b.totalFills - a.totalFills);
  }, [driverTrips, vehicles, excavatorFills]);

  const totalFills = excavatorStats.reduce((s, x) => s + x.totalFills, 0);
  const excavatorOpts = vehicles.filter(v => v.type === 'excavator').map(v => ({ label: v.number, value: v.id }));

  const renderItem = ({ item: x }) => (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconCircle}>
          <LinearGradient colors={['#eab308', '#854d0e']} style={StyleSheet.absoluteFill} />
          <Ionicons name="construct-outline" size={20} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{x.name || 'Unknown Excavator'}</Text>
          <Text style={styles.cardInfo}>{x.trips.length + x.manualFills.length} entries recorded</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.cardFills}>{x.totalFills}</Text>
          <Text style={styles.cardFillsLabel}>TOTAL TRUCKS</Text>
        </View>
      </View>
      
      {/* Auto Trips */}
      {x.trips.length > 0 && (
         <View style={styles.miniList}>
            <Text style={styles.miniHeader}>AUTO LOGGED TRIPS</Text>
            {x.trips.slice(0, 3).map((t, index) => (
              <View key={index} style={styles.miniItem}>
                 <Text style={styles.miniText}>{t.vehicle?.number || 'Truck'} · {t.trips} rounds</Text>
                 <Text style={styles.miniDate}>{formatDateShort(t.date)}</Text>
              </View>
            ))}
         </View>
      )}

      {/* Manual Fills */}
      {x.manualFills.length > 0 && (
         <View style={[styles.miniList, { marginTop: spacing.sm, borderTopWidth: 0 }]}>
            <Text style={styles.miniHeader}>MANUAL LOG ENTRIES</Text>
            {x.manualFills.map((f, index) => (
              <View key={index} style={styles.miniItem}>
                 <View style={{ flex: 1 }}>
                    <Text style={styles.miniText}>{f.truckName} · {f.totalFills} fills</Text>
                    {f.operatorName ? <Text style={styles.operatorText}>Op: {f.operatorName}</Text> : null}
                 </View>
                 <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.miniDate}>{formatDateShort(f.date)}</Text>
                    <TouchableOpacity onPress={() => deleteExcavatorFill(f.id)}>
                       <Ionicons name="trash-outline" size={12} color={colors.red} style={{ marginTop: 2 }} />
                    </TouchableOpacity>
                 </View>
              </View>
            ))}
         </View>
      )}
    </GlassCard>
  );

  if (loading && !refreshing) return <Loader />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>EXCAVATOR FILLS</Text>
            <Text style={styles.headerSub}>UTILIZATION & LOGS</Text>
          </View>
        </View>

        <View style={styles.presets}>
           <TouchableOpacity 
             style={[styles.presetBtn, activePreset === 'All' && styles.presetBtnActive]} 
             onPress={() => applyFilter('All')}
           >
              <Text style={[styles.presetText, activePreset === 'All' && styles.presetTextActive]}>All Time</Text>
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.presetBtn, activePreset === 'Today' && styles.presetBtnActive]} 
             onPress={() => applyFilter('Today')}
           >
              <Text style={[styles.presetText, activePreset === 'Today' && styles.presetTextActive]}>Today</Text>
           </TouchableOpacity>
           
           <TouchableOpacity 
             style={[styles.presetBtn, activePreset === 'Custom' && styles.presetBtnActive]} 
             onPress={() => setShowFilterPicker(true)}
           >
              <Ionicons name="calendar-outline" size={16} color={activePreset === 'Custom' ? colors.brand[400] : colors.surface[500]} />
           </TouchableOpacity>

           {showFilterPicker && (
              <DatePicker 
                date={filterDate ? new Date(filterDate) : new Date()} 
                onConfirm={(d) => {
                  const ds = dayjs(d).format('YYYY-MM-DD');
                  setFilterDate(ds);
                  setActivePreset('Custom');
                  load(ds);
                  setShowFilterPicker(false);
                }}
              />
           )}
           <View style={styles.dateDisplay}>
              <Ionicons name="calendar-outline" size={12} color={colors.surface[500]} />
              <Text style={styles.dateDisplayText}>{filterDate ? dayjs(filterDate).format('DD MMM') : 'All Time'}</Text>
           </View>
        </View>

        <View style={styles.totalBox}>
           <View style={{ flex: 1 }}>
              <Text style={styles.totalLabel}>TOTAL TRUCKS FILLED ({activePreset.toUpperCase()})</Text>
              <Text style={styles.totalValue}>{totalFills} <Text style={{ fontSize: 14, color: colors.surface[500] }}>Rounds</Text></Text>
           </View>
        </View>
      </View>

      <FlatList
        data={excavatorStats}
        keyExtractor={x => x.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />}
        ListEmptyComponent={<EmptyState icon="stats-chart-outline" message={`No fill records for ${activePreset}`} />}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <LinearGradient colors={['#eab308', '#854d0e']} style={styles.fabGradient}>
          <Ionicons name="add" size={32} color={colors.white} />
        </LinearGradient>
      </TouchableOpacity>

      <BottomModal visible={showModal} onClose={() => setShowModal(false)} title="MANUAL TRUCK FILL LOG">
        <View style={{ gap: 4 }}>
          <SelectPicker 
            label="Select Excavator *" 
            value={form.excavatorId} 
            options={excavatorOpts} 
            onChange={v => setForm(f => ({ ...f, excavatorId: v }))} 
            placeholder="Choose Excavator" 
          />
          <DatePicker 
            label="Date *" 
            date={form.date} 
            onConfirm={d => setForm(f => ({ ...f, date: dayjs(d).format('YYYY-MM-DD') }))} 
          />
          <Input 
            label="Truck Name/Number *" 
            icon="car-outline" 
            value={form.truckName} 
            onChangeText={v => setForm(f => ({ ...f, truckName: v }))} 
            placeholder="e.g. GJ-01-XXXX" 
          />
          <Input 
            label="Total Fills (Rounds) *" 
            icon="repeat-outline" 
            keyboardType="numeric" 
            value={form.totalFills} 
            onChangeText={v => setForm(f => ({ ...f, totalFills: v }))} 
            placeholder="0" 
          />
          <Input 
            label="Operator Name" 
            icon="person-outline" 
            value={form.operatorName} 
            onChangeText={v => setForm(f => ({ ...f, operatorName: v }))} 
            placeholder="Enter Name" 
          />
          
          <Button title="SAVE LOG" onPress={saveManualFill} loading={saving} icon="checkmark-circle-outline" glow style={{ marginTop: 20 }} />
        </View>
      </BottomModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface[950] },
  header: { borderBottomWidth: 1, borderBottomColor: colors.surface[800], paddingBottom: spacing.lg },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.lg, paddingTop: spacing.md },
  headerTitle: { fontSize: 24, fontWeight: '900', color: colors.white, letterSpacing: -1 },
  headerSub: { fontSize: 10, fontWeight: '800', color: colors.brand[400], letterSpacing: 1.5 },
  
  presets: { flexDirection: 'row', paddingHorizontal: spacing.xl, gap: 10, alignItems: 'center', marginBottom: spacing.xl },
  presetBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surface[900], borderWidth: 1, borderColor: colors.surface[800] },
  presetBtnActive: { backgroundColor: colors.brand[500] + '15', borderColor: colors.brand[500] + '40' },
  presetText: { fontSize: 11, fontWeight: '700', color: colors.surface[400] },
  presetTextActive: { color: colors.brand[400] },

  dateDisplay: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  dateDisplayText: { fontSize: 11, fontWeight: '800', color: colors.surface[500], textTransform: 'uppercase' },
  totalBox: { paddingHorizontal: spacing.xl, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  totalLabel: { fontSize: 8, fontWeight: '900', color: colors.surface[600], letterSpacing: 1.5, textTransform: 'uppercase' },
  totalValue: { fontSize: 28, fontWeight: '900', color: colors.white, marginTop: 4 },

  list: { padding: spacing.xl, paddingBottom: 100 },
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  iconCircle: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 15, fontWeight: '800', color: colors.white, fontFamily: 'monospace' },
  cardInfo:  { fontSize: 12, color: colors.surface[500], marginTop: 2 },
  cardFills:  { fontSize: 20, fontWeight: '900', color: colors.brand[400] },
  cardFillsLabel: { fontSize: 8, fontWeight: '900', color: colors.surface[600] },

  miniList: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.surface[850] },
  miniHeader: { fontSize: 8, fontWeight: '900', color: colors.surface[600], marginBottom: 8, letterSpacing: 1 },
  miniItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  miniText: { fontSize: 11, color: colors.surface[300], fontWeight: '600' },
  miniDate: { fontSize: 10, color: colors.surface[500] },
  operatorText: { fontSize: 9, color: colors.brand[500], fontWeight: '700', marginTop: 1 },
  moreText: { fontSize: 9, color: colors.surface[600], fontStyle: 'italic', marginTop: 2 },

  fab: { position: 'absolute', bottom: 30, right: 30, width: 64, height: 64, borderRadius: 32, elevation: 5 },
  fabGradient: { flex: 1, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
