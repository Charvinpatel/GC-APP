import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  RefreshControl, Alert, Dimensions, StatusBar 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useStore } from '../store/useStore';
import { 
  Button, GlassCard, EmptyState, BottomModal, 
  Input, SelectPicker, Loader, StatCard, DatePicker 
} from '../components';
import { colors, spacing, radius, shadows, gradients } from '../utils/theme';
import { formatCurrency, formatDateShort } from '../utils/helpers';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

const EMPTY = { 
  date: dayjs().format('YYYY-MM-DD'), 
  driverId: '', 
  vehicleId: '', 
  amount: '',
  pumpName: '',
  pumpLocation: ''
};

export default function DieselScreen() {
  const { diesel, dieselMeta, drivers, vehicles, fetchDiesel, addDiesel, updateDiesel, deleteDiesel, fetchDrivers, fetchVehicles } = useStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  
  const [filterDate, setFilterDate] = useState(null);
  const [activePreset, setActivePreset] = useState('All');
  const [showFilterPicker, setShowFilterPicker] = useState(false);

  const load = async (d) => {
    try {
      const filters = d === null ? { limit: 1000 } : { date: d || filterDate, limit: 100 };
      await fetchDiesel(filters);
      if (drivers.length === 0) fetchDrivers({ limit: 100 });
      if (vehicles.length === 0) fetchVehicles({ limit: 100 });
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
    let date = dayjs().format('YYYY-MM-DD');
    if (preset === 'All') date = null;
    
    setFilterDate(date);
    setActivePreset(preset);
    await load(date);
  };

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  
  const openEdit = (d) => {
    setEditing(d);
    setForm({ 
      date: d.date, 
      driverId: d.driverId || '', 
      vehicleId: d.vehicleId || '', 
      amount: String(d.amount || ''),
      pumpName: d.pumpName || '',
      pumpLocation: d.pumpLocation || ''
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.vehicleId || !form.amount) { 
      Alert.alert('Error', 'Vehicle and amount are required'); 
      return; 
    }
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (editing) await updateDiesel(editing.id, payload);
      else await addDiesel(payload);
      setShowModal(false);
    } catch (e) { 
      Alert.alert('Error', e.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const confirmDelete = (d) => Alert.alert('Delete Entry', 'Delete this diesel entry?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteDiesel(d.id) },
  ]);

  const mtdTotal = useMemo(() => {
    const month = dayjs().format('YYYY-MM');
    const allDiesel = useStore.getState().diesel;
    return allDiesel.filter(d => d.date && d.date.startsWith(month)).reduce((s, d) => s + (d.amount || 0), 0);
  }, [diesel]);

  const ytdTotal = useMemo(() => {
    const year = dayjs().format('YYYY');
    const allDiesel = useStore.getState().diesel;
    return allDiesel.filter(d => d.date && d.date.startsWith(year)).reduce((s, d) => s + (d.amount || 0), 0);
  }, [diesel]);

  const downloadCSV = async () => {
    if (diesel.length === 0) {
      Alert.alert('No Data', 'There is no data to export for this date.');
      return;
    }

    try {
      const header = 'Date,Vehicle,Driver,Pump Name,Pump Location,Amount\n';
      const sortedDiesel = [...diesel].sort((a,b) => (a.date || '').localeCompare(b.date || ''));
      
      const rows = sortedDiesel.map(d => 
        `${d.date},${d.vehicle?.number || 'N/A'},${d.driver?.name || 'N/A'},${d.pumpName || 'N/A'},${d.pumpLocation || 'N/A'},${d.amount}`
      ).join('\n');
      
      const total = sortedDiesel.reduce((s, d) => s + (d.amount || 0), 0);
      const csvContent = `${header}${rows}\r\n\r\n,,,,TOTAL: ₹${total},`;
      
      const fileName = `Diesel_Report_${filterDate || 'All_Time'}.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: 'utf8' });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Download Diesel Report',
          UTI: 'public.comma-separated-values-text'
        });
      } else {
        Alert.alert('Success', `CSV saved to: ${fileUri}`);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to generate CSV: ' + e.message);
    }
  };

  const totalAmount = diesel.reduce((s, d) => s + (d.amount || 0), 0);
  const driverOpts  = drivers.map(d => ({ label: d.name, value: d.id }));
  const vehicleOpts = vehicles.map(v => ({ label: v.number, value: v.id }));

  const renderItem = ({ item: d }) => (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconCircle}>
          <LinearGradient colors={['#a855f7', '#7e22ce']} style={StyleSheet.absoluteFill} />
          <Ionicons name="flame" size={20} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardVehicle}>{d.vehicle?.number || 'Vehicle'}</Text>
          <Text style={styles.cardDriver}>{d.driver?.name || 'Driver'} · {formatDateShort(d.date)}</Text>
          {(d.pumpName || d.pumpLocation) && (
            <View style={styles.pumpInfo}>
              <Ionicons name="location-outline" size={10} color={colors.surface[500]} />
              <Text style={styles.pumpText}>{d.pumpName}{d.pumpName && d.pumpLocation ? ', ' : ''}{d.pumpLocation}</Text>
            </View>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.cardAmount}>{formatCurrency(d.amount)}</Text>
        </View>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => openEdit(d)} style={styles.iconBtn}>
          <Ionicons name="create-outline" size={16} color={colors.surface[400]} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => confirmDelete(d)} style={[styles.iconBtn, { backgroundColor: colors.red + '18' }]}>
          <Ionicons name="trash-outline" size={16} color={colors.red} />
        </TouchableOpacity>
      </View>
    </GlassCard>
  );

  if (loading && !refreshing) return <Loader />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* ── Futuristic Header ──────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>DIESEL LOGS</Text>
            <Text style={styles.headerSub}>FUEL CONSUMPTION TRACKING</Text>
          </View>
          <TouchableOpacity style={styles.downloadBtn} onPress={downloadCSV}>
            <Ionicons name="download-outline" size={20} color={colors.brand[400]} />
          </TouchableOpacity>
        </View>

        {/* Date Presets */}
        <View style={styles.presets}>
           <TouchableOpacity 
             style={[styles.presetBtn, activePreset === 'All' && styles.presetBtnActive]} 
             onPress={() => applyFilter('All')}
           >
              <Text style={[styles.presetText, activePreset === 'All' && styles.presetTextActive]}>All</Text>
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
             <DateTimePicker
               value={new Date(filterDate)}
               mode="date"
               display="default"
               onChange={(event, selectedDate) => {
                 setShowFilterPicker(false);
                 if (selectedDate) {
                   const d = dayjs(selectedDate).format('YYYY-MM-DD');
                   setFilterDate(d);
                   setActivePreset('Custom');
                   load(d);
                 }
               }}
             />
           )}

           <View style={styles.dateDisplay}>
              <Ionicons name="calendar-outline" size={12} color={colors.surface[500]} />
              <Text style={styles.dateDisplayText}>{filterDate ? dayjs(filterDate).format('DD MMM') : 'All Time'}</Text>
           </View>
        </View>

        {/* Total Summary Row */}
        <View style={styles.totalBox}>
           <View style={{ flex: 1 }}>
              <Text style={styles.totalLabel}>TOTAL SPENT ({activePreset.toUpperCase()})</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
           </View>
           
           <View style={styles.subStats}>
              <View style={styles.subStatItem}>
                 <Text style={styles.subStatLabel}>MTD TOTAL</Text>
                 <Text style={styles.subStatValue}>{formatCurrency(mtdTotal)}</Text>
              </View>
              <View style={[styles.subStatItem, { borderLeftWidth: 1, borderLeftColor: colors.surface[800] }]}>
                 <Text style={styles.subStatLabel}>YTD TOTAL</Text>
                 <Text style={styles.subStatValue}>{formatCurrency(ytdTotal)}</Text>
              </View>
           </View>
        </View>
      </View>

      <FlatList
        data={diesel}
        keyExtractor={d => d.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />}
        ListEmptyComponent={<EmptyState icon="flame-outline" message={`No entries for ${activePreset}`} />}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <LinearGradient colors={gradients.brand} style={styles.fabGradient}>
          <Ionicons name="add" size={32} color={colors.white} />
        </LinearGradient>
      </TouchableOpacity>

      <BottomModal visible={showModal} onClose={() => setShowModal(false)} title={editing ? 'EDIT DIESEL LOG' : 'NEW DIESEL ENTRY'}>
        <View style={{ gap: 4 }}>
          <SelectPicker label="Select Vehicle *" value={form.vehicleId} options={vehicleOpts} onChange={v => setForm(f => ({ ...f, vehicleId: v }))} placeholder="Choose Truck..." />
          <SelectPicker label="Assigned Driver" value={form.driverId} options={driverOpts} onChange={v => setForm(f => ({ ...f, driverId: v }))} placeholder="Choose Driver (Optional)" />
          
          <DatePicker label="Usage Date *" date={form.date} onConfirm={d => setForm(f => ({ ...f, date: dayjs(d).format('YYYY-MM-DD') }))} />

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Input label="Pump Name" icon="business-outline" value={form.pumpName} onChangeText={v => setForm(f => ({ ...f, pumpName: v }))} placeholder="Pump Station" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Pump Location" icon="location-outline" value={form.pumpLocation} onChangeText={v => setForm(f => ({ ...f, pumpLocation: v }))} placeholder="City/Area" />
            </View>
          </View>
          
          <Input label="Amount (₹) *" icon="cash-outline" keyboardType="numeric" value={form.amount} onChangeText={v => setForm(f => ({ ...f, amount: v }))} placeholder="0" />
          
          <Button title={editing ? 'UPDATE LOG' : 'SAVE DIESEL LOG'} onPress={save} loading={saving} icon="checkmark-circle-outline" glow style={{ marginTop: 20 }} />
        </View>
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
    paddingBottom: spacing.lg
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: colors.white, letterSpacing: -1 },
  headerSub: { fontSize: 10, fontWeight: '800', color: colors.brand[400], letterSpacing: 1.5 },
  
  downloadBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface[900], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.surface[800] },

  presets: { flexDirection: 'row', paddingHorizontal: spacing.xl, gap: 10, alignItems: 'center', marginBottom: spacing.xl },
  presetBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surface[900], borderWidth: 1, borderColor: colors.surface[800] },
  presetBtnActive: { backgroundColor: colors.brand[500] + '15', borderColor: colors.brand[500] + '40' },
  presetText: { fontSize: 11, fontWeight: '700', color: colors.surface[400] },
  presetTextActive: { color: colors.brand[400] },
  
  dateDisplay: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  dateDisplayText: { fontSize: 11, fontWeight: '800', color: colors.surface[500], textTransform: 'uppercase' },

  totalBox: { paddingHorizontal: spacing.xl, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  totalLabel: { fontSize: 8, fontWeight: '900', color: colors.surface[600], letterSpacing: 1.5, textTransform: 'uppercase' },
  totalValue: { fontSize: 24, fontWeight: '900', color: colors.white, marginTop: 4 },

  subStats: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface[900], padding: 10, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surface[800], marginLeft: spacing.lg },
  subStatItem: { paddingHorizontal: 4 },
  subStatLabel: { fontSize: 7, fontWeight: '900', color: colors.brand[400], letterSpacing: 1 },
  subStatValue: { fontSize: 13, fontWeight: '900', color: colors.white, marginTop: 2 },

  list: { padding: spacing.xl, paddingBottom: 100 },
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  iconCircle: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', ...shadows.md },
  cardVehicle: { fontSize: 15, fontWeight: '800', color: colors.white, fontFamily: 'monospace' },
  cardDriver:  { fontSize: 12, color: colors.surface[400], marginTop: 2 },
  cardAmount:  { fontSize: 16, fontWeight: '900', color: colors.brand[400] },

  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.surface[850] },
  iconBtn: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.surface[900], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.surface[800] },
  
  pumpInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  pumpText: { fontSize: 10, fontWeight: '700', color: colors.surface[500] },

  fab: { position: 'absolute', bottom: 30, right: 30, width: 64, height: 64, borderRadius: 32, ...shadows.brand },
  fabGradient: { flex: 1, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
