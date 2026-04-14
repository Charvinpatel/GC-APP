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
  Input, SelectPicker, Loader, StatCard, DatePicker, PremiumHeader, Divider 
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
  const { diesel, drivers, vehicles, fetchDiesel, addDiesel, updateDiesel, deleteDiesel, fetchDrivers, fetchVehicles } = useStore();
  
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
      const filters = d === null ? { limit: 1000 } : { date: d || filterDate, limit: 1000 };
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

  const applyPreset = async (preset) => {
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
      Alert.alert('Error', 'Required fields missing'); return; 
    }
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (editing) await updateDiesel(editing.id, payload);
      else await addDiesel(payload);
      setShowModal(false);
      load(activePreset === 'All' ? null : filterDate);
    } catch (e) { Alert.alert('Error', e.message); } 
    finally { setSaving(false); }
  };

  const confirmDelete = (d) => Alert.alert('Delete', 'Delete this entry?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteDiesel(d.id); load(activePreset === 'All' ? null : filterDate); } },
  ]);

  const totalAmount = diesel.reduce((s, d) => s + (d.amount || 0), 0);
  
  const mtdTotal = useMemo(() => {
    const month = dayjs().format('YYYY-MM');
    return diesel.filter(d => d.date && d.date.startsWith(month)).reduce((s, d) => s + (d.amount || 0), 0);
  }, [diesel]);

  const ytdTotal = useMemo(() => {
    const year = dayjs().format('YYYY');
    return diesel.filter(d => d.date && d.date.startsWith(year)).reduce((s, d) => s + (d.amount || 0), 0);
  }, [diesel]);

  const downloadCSV = async () => {
    if (diesel.length === 0) return;
    try {
      const header = 'Date,Vehicle,Driver,Pump,Location,Amount\n';
      const rows = diesel.map(d => `${d.date},${d.vehicle?.number || ''},${d.driver?.name || ''},${d.pumpName || ''},${d.pumpLocation || ''},${d.amount}`).join('\n');
      const fileUri = `${FileSystem.cacheDirectory}Diesel_${dayjs().format('YYYYMMDD')}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, header + rows, { encoding: 'utf8' });
      await Sharing.shareAsync(fileUri);
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const driverOpts  = drivers.map(d => ({ label: d.name, value: d.id }));
  const vehicleOpts = vehicles.map(v => ({ label: v.number, value: v.id }));

  if (loading && !refreshing) return <Loader />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <PremiumHeader 
        title="Diesel Logs"
        subtitle={filterDate ? dayjs(filterDate).format('DD MMMM YYYY') : 'ALL TIME RECORDS'}
        rightAction={
          <TouchableOpacity style={styles.roundAction} onPress={downloadCSV}>
            <Ionicons name="download-outline" size={20} color={colors.white} />
          </TouchableOpacity>
        }
      />

      <View style={styles.topFilter}>
         <View style={styles.presets}>
            {['All', 'Today', 'Custom'].map(p => (
              <TouchableOpacity 
                key={p} 
                style={[styles.preset, activePreset === p && styles.presetActive]}
                onPress={() => p === 'Custom' ? setShowFilterPicker(true) : applyPreset(p)}
              >
                <Text style={[styles.presetText, activePreset === p && styles.presetTextActive]}>{p.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
         </View>

         {showFilterPicker && (
            <DateTimePicker
              value={new Date(filterDate || Date.now())}
              mode="date"
              display="default"
              onChange={(e, d) => {
                setShowFilterPicker(false);
                if (d) {
                  const ds = dayjs(d).format('YYYY-MM-DD');
                  setFilterDate(ds);
                  setActivePreset('Custom');
                  load(ds);
                }
              }}
            />
         )}

         {/* Stats Row based on logic requested: remove MTD/YTD if date filter active */}
         <View style={styles.statCardsRow}>
            <StatCard label={activePreset === 'All' ? 'TOTAL COST' : 'FILTER COST'} value={formatCurrency(totalAmount)} icon="flame" color={colors.brand[400]} />
            {activePreset === 'All' ? (
              <StatCard label="MTD TOTAL" value={formatCurrency(mtdTotal)} icon="calendar" color={colors.blue} />
            ) : (
              <StatCard label="ENTRIES" value={String(diesel.length)} icon="list" color={colors.surface[500]} />
            )}
         </View>
      </View>

      <FlatList
        data={diesel}
        keyExtractor={d => d.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />}
        ListEmptyComponent={<EmptyState icon="water" message="No diesel entries found" />}
        renderItem={({ item: d }) => (
          <GlassCard style={styles.logCard}>
             <View style={styles.logTop}>
                <View style={styles.logVehicle}>
                   <View style={styles.fuelIcon}>
                      <Ionicons name="color-fill" size={16} color={colors.brand[400]} />
                   </View>
                   <View>
                      <Text style={styles.vNum}>{d.vehicle?.number || 'UNKNOWN'}</Text>
                      <Text style={styles.dDate}>{dayjs(d.date).format('DD MMM')} · {d.driver?.name || 'No Driver'}</Text>
                   </View>
                </View>
                <Text style={styles.logAmt}>{formatCurrency(d.amount)}</Text>
             </View>
             
             {(d.pumpName || d.pumpLocation) && (
                <View style={styles.pumpRow}>
                   <Ionicons name="location-outline" size={12} color={colors.surface[500]} />
                   <Text style={styles.pumpTxt}>
                      {d.pumpName}{d.pumpName && d.pumpLocation ? ' · ' : ''}{d.pumpLocation}
                   </Text>
                </View>
             )}

             <View style={styles.logActions}>
                <TouchableOpacity onPress={() => openEdit(d)} style={styles.subBtn}>
                   <Ionicons name="create-outline" size={16} color={colors.surface[400]} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(d)} style={[styles.subBtn, { backgroundColor: colors.red + '10' }]}>
                   <Ionicons name="trash-outline" size={16} color={colors.red} />
                </TouchableOpacity>
             </View>
          </GlassCard>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <LinearGradient colors={gradients.brand} style={styles.fabG} start={{x:0,y:0}} end={{x:1,y:1}}>
          <Ionicons name="add" size={32} color={colors.white} />
        </LinearGradient>
      </TouchableOpacity>

      <BottomModal visible={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Diesel' : 'Add Diesel'}>
        <View style={{ gap: 4 }}>
          <SelectPicker label="Vehicle *" value={form.vehicleId} options={vehicleOpts} onChange={v => setForm(f => ({ ...f, vehicleId: v }))} />
          <SelectPicker label="Driver" value={form.driverId} options={driverOpts} onChange={v => setForm(f => ({ ...f, driverId: v }))} />
          <DatePicker label="Date *" date={form.date} onConfirm={d => setForm(f => ({ ...f, date: dayjs(d).format('YYYY-MM-DD') }))} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
             <View style={{ flex: 1 }}><Input label="Pump" value={form.pumpName} onChangeText={v => setForm(f => ({ ...f, pumpName: v }))} /></View>
             <View style={{ flex: 1 }}><Input label="Location" value={form.pumpLocation} onChangeText={v => setForm(f => ({ ...f, pumpLocation: v }))} /></View>
          </View>
          <Input label="Amount (₹) *" keyboardType="numeric" value={form.amount} onChangeText={v => setForm(f => ({ ...f, amount: v }))} />
          <Button title="Save Entry" loading={saving} onPress={save} style={{ marginTop: 20 }} />
        </View>
      </BottomModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface[950] },
  roundAction: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface[850], alignItems: 'center', justifyContent: 'center' },
  topFilter: { padding: spacing.xl, paddingBottom: 0 },
  presets: { flexDirection: 'row', backgroundColor: colors.surface[900], borderRadius: radius.lg, padding: 4, marginBottom: spacing.xl },
  preset: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.md },
  presetActive: { backgroundColor: colors.surface[800], ...shadows.sm },
  presetText: { fontSize: 10, fontWeight: '900', color: colors.surface[500], letterSpacing: 1 },
  presetTextActive: { color: colors.brand[400] },

  statCardsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },

  list: { padding: spacing.xl, paddingBottom: 120 },
  logCard: { padding: spacing.lg, marginBottom: spacing.md },
  logTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  logVehicle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fuelIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.brand[500] + '15', alignItems: 'center', justifyContent: 'center' },
  vNum: { fontSize: 15, fontWeight: '900', color: colors.white },
  dDate: { fontSize: 11, color: colors.surface[500], fontWeight: '700', marginTop: 2 },
  logAmt: { fontSize: 16, fontWeight: '900', color: colors.brand[400] },
  
  pumpRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  pumpTxt: { fontSize: 10, fontWeight: '700', color: colors.surface[500], textTransform: 'uppercase' },
  
  logActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 10 },
  subBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.surface[850], alignItems: 'center', justifyContent: 'center' },

  fab: { position: 'absolute', bottom: 30, right: 30, width: 64, height: 64, borderRadius: 32, ...shadows.brand },
  fabG: { flex: 1, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
