import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, ScrollView
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useStore } from '../store/useStore';
import { Button, Card, EmptyState, BottomModal, Input, SelectPicker, Loader, Row, DatePicker, Badge } from '../components';
import { colors, spacing, radius } from '../utils/theme';
import { formatCurrency, formatDateShort } from '../utils/helpers';

export default function UpadScreen() {
  const { upad, drivers, addUpad, deleteUpad, fetchDrivers, fetchUpad } = useStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Filter State
  const [filterDriverId, setFilterDriverId] = useState(null);
  const [filterDate, setFilterDate] = useState(null);

  const [form, setForm] = useState({
    driver: '',
    amount: '',
    date: dayjs().format('YYYY-MM-DD'),
    type: 'DR',
    notes: '',
  });

  const load = async () => {
    try {
      await Promise.all([
        fetchUpad({ limit: 1000 }),
        drivers.length === 0 ? fetchDrivers({ limit: 200 }) : Promise.resolve()
      ]);
    } catch (e) {
      console.error('Failed to load Upad data:', e);
    } finally {
      setLoading(false);
    }
  };

  const refreshTrigger = useStore(s => s.refreshTrigger);
  useEffect(() => { load(); }, []);
  useEffect(() => { if (refreshTrigger > 0) onRefresh(); }, [refreshTrigger]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const driverOpts  = drivers.map(d => ({ label: d.name, value: d.id }));
  const typeOpts    = [
    { label: 'Advance Given', value: 'DR' },
    { label: 'Amount Returned', value: 'CR' },
  ];

  // Per-driver summary
  const driverSummary = useMemo(() => {
    const map = {};
    (upad || []).forEach(rec => {
      const dId   = rec.driverId || rec.driver?._id;
      const dName = rec.driver?.name || drivers.find(d => d.id === dId)?.name || 'Unknown';
      if (!map[dId]) map[dId] = { id: dId, name: dName, total: 0 };
      map[dId].total += (rec.amount || 0);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [upad, drivers]);

  const filteredUpad = useMemo(() => {
    let list = upad || [];
    if (filterDriverId) {
      list = list.filter(u => (u.driverId === filterDriverId || u.driver?._id === filterDriverId || u.driver?.id === filterDriverId));
    }
    if (filterDate) {
      list = list.filter(u => u.date === filterDate);
    }
    return list;
  }, [upad, filterDriverId, filterDate]);

  const totalAdvance = driverSummary.reduce((s, d) => s + d.total, 0);
  const filteredTotal = filteredUpad.reduce((s, u) => s + (u.amount || 0), 0);

  const saveAdvance = async () => {
    if (!form.driver || !form.amount) {
      Alert.alert('Error', 'Driver and amount are required');
      return;
    }
    setSaving(true);
    try {
      const finalAmount = form.type === 'CR'
        ? -Math.abs(Number(form.amount))
        : Math.abs(Number(form.amount));
      await addUpad({ ...form, amount: finalAmount });
      setShowModal(false);
      setForm({ driver: '', amount: '', date: dayjs().format('YYYY-MM-DD'), type: 'DR', notes: '' });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (item) => Alert.alert('Delete', 'Delete this advance entry?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteUpad(item.id) },
  ]);

  if (loading) return <Loader />;

  return (
    <View style={styles.container}>
      {/* Total Banner */}
      <View style={styles.totalBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.totalLabel}>Total Outstanding Advance</Text>
          <Text style={styles.totalVal}>{formatCurrency(totalAdvance)}</Text>
        </View>
        <View style={{ width: 140 }}>
          <DatePicker 
             date={filterDate} 
             placeholder="Filter Date" 
             onConfirm={d => setFilterDate(dayjs(d).format('YYYY-MM-DD'))} 
          />
        </View>
      </View>

      <FlatList
        data={filteredUpad}
        keyExtractor={u => u.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />}
        ListEmptyComponent={<EmptyState icon="wallet-outline" message="No advance records" />}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
        ListHeaderComponent={() =>
          driverSummary.length > 0 ? (
            <View style={styles.summarySection}>
              <View style={styles.summaryHeader}>
                <Text style={styles.sectionLabel}>Driver Summary</Text>
                {(filterDriverId || filterDate) && (
                  <TouchableOpacity onPress={() => { setFilterDriverId(null); setFilterDate(null); }}>
                    <Text style={styles.clearFilters}>CLEAR ALL</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.summaryContent}>
                {driverSummary.map(d => (
                  <TouchableOpacity 
                    key={d.id} 
                    style={[styles.summaryCard, filterDriverId === d.id && styles.summaryCardActive]}
                    onPress={() => setFilterDriverId(filterDriverId === d.id ? null : d.id)}
                  >
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryName} numberOfLines={1}>{d.name}</Text>
                      <Text style={[styles.summaryAmt, { color: d.total > 0 ? colors.brand[400] : colors.green }]}>
                        {formatCurrency(d.total)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.summaryHeader}>
                <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>Transactions</Text>
                {(filterDriverId || filterDate) && (
                   <Text style={styles.filteredTotalText}>VIEWING: {formatCurrency(filteredTotal)}</Text>
                )}
              </View>
            </View>
          ) : null
        }
        renderItem={({ item: u }) => {
          const dName = u.driver?.name || drivers.find(d => d.id === u.driverId)?.name || 'Driver';
          const isCredit = u.amount < 0;
          return (
            <Card style={styles.entryCard}>
              <View style={styles.entryRow}>
                <View style={[styles.typeChip, { backgroundColor: isCredit ? colors.green + '22' : colors.brand[500] + '22' }]}>
                  <Text style={[styles.typeText, { color: isCredit ? colors.green : colors.brand[400] }]}>
                    {isCredit ? 'CR' : 'DR'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryDriver}>{dName}</Text>
                  <Text style={styles.entryDate}>{formatDateShort(u.date)}</Text>
                </View>
                <Text style={[styles.entryAmount, { color: isCredit ? colors.green : colors.brand[400] }]}>
                  {isCredit ? '-' : '+'}{formatCurrency(Math.abs(u.amount))}
                </Text>
                <TouchableOpacity onPress={() => confirmDelete(u)} style={styles.delBtn}>
                  <Ionicons name="trash-outline" size={15} color={colors.red} />
                </TouchableOpacity>
              </View>
              {u.notes ? <Text style={styles.entryNotes}>{u.notes}</Text> : null}
            </Card>
          );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      <BottomModal visible={showModal} onClose={() => setShowModal(false)} title="Add Advance Entry">
        <SelectPicker label="Driver *" value={form.driver} options={driverOpts} onChange={v => setForm(f => ({ ...f, driver: v }))} placeholder="Select driver..." />
        
        {form.driver ? (
          <View style={styles.balanceInfo}>
            <View>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={[styles.balanceVal, { color: (driverSummary.find(d => d.id === form.driver)?.total || 0) > 0 ? colors.brand[400] : colors.green }]}>
                {formatCurrency(driverSummary.find(d => d.id === form.driver)?.total || 0)}
              </Text>
            </View>
            <View style={styles.balanceBadge}>
              <Text style={styles.balanceBadgeText}>
                {(driverSummary.find(d => d.id === form.driver)?.total || 0) > 0 ? 'Outstanding' : 'Clear'}
              </Text>
            </View>
          </View>
        ) : null}

        <SelectPicker label="Type *" value={form.type} options={typeOpts} onChange={v => setForm(f => ({ ...f, type: v }))} />
        <Input label="Amount (₹) *" icon="cash-outline" keyboardType="numeric" value={form.amount} onChangeText={v => setForm(f => ({ ...f, amount: v }))} placeholder="₹0" />
        <DatePicker label="Date" date={form.date} onConfirm={d => setForm(f => ({ ...f, date: dayjs(d).format('YYYY-MM-DD') }))} />
        <Input label="Notes" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} placeholder="Optional..." multiline />
        <Button title={form.type === 'CR' ? 'Record Return' : 'Add Advance'} onPress={saveAdvance} loading={saving} icon="checkmark-circle-outline" />
      </BottomModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.surface[950] },
  totalBanner:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.brand[500] + '18', borderBottomWidth: 1, borderBottomColor: colors.brand[500] + '33', padding: spacing.lg, paddingRight: spacing.xl },
  filterBtn:       { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface[900], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.surface[800] },
  totalLabel:      { fontSize: 10, color: colors.brand[400], fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  totalVal:        { fontSize: 24, fontWeight: '900', color: colors.white, marginTop: 2 },
  
  summaryHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: spacing.sm },
  clearFilters:    { fontSize: 10, fontWeight: '800', color: colors.brand[400], letterSpacing: 1 },
  filteredTotalText: { fontSize: 10, fontWeight: '800', color: colors.surface[500], marginTop: spacing.lg },

  list:            { padding: spacing.lg, paddingBottom: 100 },
  summarySection:  { marginBottom: spacing.lg },
  summaryContent:  { gap: spacing.xs },
  summaryCard:     { backgroundColor: colors.surface[900], padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surface[800] },
  summaryCardActive: { borderColor: colors.brand[500], backgroundColor: colors.brand[500] + '11' },
  summaryRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryName:     { fontSize: 11, fontWeight: '700', color: colors.surface[400], textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  summaryAmt:      { fontSize: 16, fontWeight: '800' },

  sectionLabel:    { fontSize: 11, color: colors.surface[500], fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm },
  entryCard:       { marginBottom: spacing.sm },
  entryRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  typeChip:        { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  typeText:        { fontSize: 12, fontWeight: '800' },
  entryDriver:     { fontSize: 14, fontWeight: '600', color: colors.white },
  entryDate:       { fontSize: 12, color: colors.surface[500], marginTop: 2 },
  entryAmount:     { fontSize: 16, fontWeight: '700' },
  delBtn:          { width: 30, height: 30, borderRadius: radius.sm, backgroundColor: colors.red + '18', alignItems: 'center', justifyContent: 'center' },
  entryNotes:      { fontSize: 12, color: colors.surface[500], marginTop: spacing.xs, paddingLeft: 52, fontStyle: 'italic' },
  fab:             { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand[500], alignItems: 'center', justifyContent: 'center', elevation: 8 },

  balanceInfo:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface[800], padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  balanceLabel:    { fontSize: 10, color: colors.surface[400], fontWeight: '700', textTransform: 'uppercase' },
  balanceVal:      { fontSize: 16, fontWeight: '800', marginTop: 2 },
  balanceBadge:    { backgroundColor: colors.brand[500] + '22', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  balanceBadgeText: { fontSize: 9, fontWeight: '900', color: colors.brand[400], textTransform: 'uppercase' },
});
