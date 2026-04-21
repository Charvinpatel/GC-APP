import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  RefreshControl, Alert, Dimensions, StatusBar 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useStore } from '../store/useStore';
import { 
  Button, GlassCard, EmptyState, BottomModal, 
  Input, SelectPicker, Loader, StatCard, DatePicker, Badge
} from '../components';
import { colors, spacing, radius, shadows, gradients } from '../utils/theme';
import { formatCurrency, formatDateShort } from '../utils/helpers';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const EMPTY = { 
  date: dayjs().format('YYYY-MM-DD'), 
  vehicleId: '', 
  amount: '',
  serviceType: '',
  notes: '',
  paymentMethod: 'Cash'
};

export default function MaintenanceScreen() {
  const { 
    maintenance, maintenanceMeta, vehicles, 
    fetchMaintenance, addMaintenance, updateMaintenance, deleteMaintenance, fetchVehicles 
  } = useStore();
  
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
      await fetchMaintenance(filters);
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
  
  const openEdit = (m) => {
    setEditing(m);
    setForm({ 
      date: m.date, 
      vehicleId: m.vehicle?._id || m.vehicleId || '', 
      amount: String(m.amount || ''),
      serviceType: m.serviceType || '',
      notes: m.notes || '',
      paymentMethod: m.paymentMethod || 'Cash'
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
      if (editing) await updateMaintenance(editing.id, payload);
      else await addMaintenance(payload);
      setShowModal(false);
      load(activePreset === 'All' ? null : filterDate);
    } catch (e) { 
      Alert.alert('Error', e.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const confirmDelete = (m) => Alert.alert('Delete Entry', 'Delete this maintenance entry?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteMaintenance(m.id) },
  ]);

  const totalAmount = maintenance.reduce((s, m) => s + (m.amount || 0), 0);
  const vehicleOpts = vehicles.map(v => ({ label: v.number, value: v.id }));
  const serviceOpts = [
    { label: 'Oil Change', value: 'Oil Change' },
    { label: 'Tyre Work', value: 'Tyre Work' },
    { label: 'Engine Repair', value: 'Engine Repair' },
    { label: 'Body Work', value: 'Body Work' },
    { label: 'Electrical', value: 'Electrical' },
    { label: 'Other', value: 'Other' }
  ];

  const renderItem = ({ item: m }) => {
    // Resolve vehicle name: locally-stored records have vehicleNumber, backend-populated have vehicle.number
    const vehicleNum = m.vehicle?.number || m.vehicleNumber || vehicles.find(v => v.id === (m.vehicleId || m.vehicle))?.number || 'Vehicle';
    return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconCircle}>
          <LinearGradient colors={['#3b82f6', '#1e40af']} style={StyleSheet.absoluteFill} />
          <Ionicons name="construct" size={20} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardVehicle}>{vehicleNum}</Text>
          <Text style={styles.cardInfo}>{m.serviceType || 'Service'} · {formatDateShort(m.date)}</Text>
          {m.notes ? <Text style={styles.notesText}>{m.notes}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.cardAmount}>{formatCurrency(m.amount)}</Text>
          <Badge label={m.paymentMethod || 'Cash'} color={colors.surface[500]} />
        </View>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => openEdit(m)} style={styles.iconBtn}>
          <Ionicons name="create-outline" size={16} color={colors.surface[400]} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => confirmDelete(m)} style={[styles.iconBtn, { backgroundColor: colors.red + '18' }]}>
          <Ionicons name="trash-outline" size={16} color={colors.red} />
        </TouchableOpacity>
      </View>
    </GlassCard>
    );
  };


  if (loading && !refreshing) return <Loader />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>MAINTENANCE</Text>
            <Text style={styles.headerSub}>VEHICLE REPAIRS & SERVICE</Text>
          </View>
        </View>

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
              <DatePicker 
                date={filterDate || new Date()} 
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
              <Text style={styles.totalLabel}>TOTAL SPENT ({activePreset.toUpperCase()})</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
           </View>
        </View>
      </View>

      <FlatList
        data={maintenance}
        keyExtractor={m => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />}
        ListEmptyComponent={<EmptyState icon="construct-outline" message={`No records for ${activePreset}`} />}
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <LinearGradient colors={['#3b82f6', '#1e40af']} style={styles.fabGradient}>
          <Ionicons name="add" size={32} color={colors.white} />
        </LinearGradient>
      </TouchableOpacity>

      <BottomModal visible={showModal} onClose={() => setShowModal(false)} title={editing ? 'EDIT MAINTENANCE' : 'NEW MAINTENANCE ENTRY'}>
        <View style={{ gap: 4 }}>
          <SelectPicker label="Select Vehicle *" value={form.vehicleId} options={vehicleOpts} onChange={v => setForm(f => ({ ...f, vehicleId: v }))} placeholder="Choose Vehicle..." />
          <SelectPicker label="Service Type" value={form.serviceType} options={serviceOpts} onChange={v => setForm(f => ({ ...f, serviceType: v }))} placeholder="Choose Type" />
          <DatePicker label="Service Date *" date={form.date} onConfirm={d => setForm(f => ({ ...f, date: dayjs(d).format('YYYY-MM-DD') }))} />
          
          <Input label="Amount (₹) *" icon="cash-outline" keyboardType="numeric" value={form.amount} onChangeText={v => setForm(f => ({ ...f, amount: v }))} placeholder="0" />
          <Input label="Notes / Description" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} placeholder="Optional detail..." multiline />
          
          <SelectPicker label="Payment Method" value={form.paymentMethod} options={[{label:'Cash',value:'Cash'},{label:'UPI',value:'UPI'},{label:'Credit',value:'Credit'}]} onChange={v => setForm(f => ({ ...f, paymentMethod: v }))} />

          <Button title={editing ? 'UPDATE' : 'SAVE'} onPress={save} loading={saving} icon="checkmark-circle-outline" glow style={{ marginTop: 20 }} />
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
  headerSub: { fontSize: 10, fontWeight: '800', color: colors.blue, letterSpacing: 1.5 },
  
  presets: { flexDirection: 'row', paddingHorizontal: spacing.xl, gap: 10, alignItems: 'center', marginBottom: spacing.xl },
  presetBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surface[900], borderWidth: 1, borderColor: colors.surface[800] },
  presetBtnActive: { backgroundColor: colors.blue + '15', borderColor: colors.blue + '40' },
  presetText: { fontSize: 11, fontWeight: '700', color: colors.surface[400] },
  presetTextActive: { color: colors.blue },

  dateDisplay: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  dateDisplayText: { fontSize: 11, fontWeight: '800', color: colors.surface[500], textTransform: 'uppercase' },
  totalBox: { paddingHorizontal: spacing.xl, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  totalLabel: { fontSize: 8, fontWeight: '900', color: colors.surface[600], letterSpacing: 1.5, textTransform: 'uppercase' },
  totalValue: { fontSize: 24, fontWeight: '900', color: colors.white, marginTop: 4 },

  list: { padding: spacing.xl, paddingBottom: 100 },
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  iconCircle: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  cardVehicle: { fontSize: 15, fontWeight: '800', color: colors.white, fontFamily: 'monospace' },
  cardInfo:  { fontSize: 12, color: colors.surface[400], marginTop: 2 },
  cardAmount:  { fontSize: 16, fontWeight: '900', color: colors.blue },
  notesText: { fontSize: 10, color: colors.surface[500], marginTop: 4, fontStyle: 'italic' },

  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.surface[850] },
  iconBtn: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.surface[900], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.surface[800] },
  
  fab: { position: 'absolute', bottom: 30, right: 30, width: 64, height: 64, borderRadius: 32, elevation: 5 },
  fabGradient: { flex: 1, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
