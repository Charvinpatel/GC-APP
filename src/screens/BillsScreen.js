import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useStore } from '../store/useStore';
import { Button, Card, Badge, EmptyState, BottomModal, Input, Loader, Row, DatePicker } from '../components';
import { colors, spacing, radius } from '../utils/theme';
import { formatCurrency, formatDateShort } from '../utils/helpers';

const STATUS_TABS = ['all', 'unpaid', 'paid'];

export default function BillsScreen() {
  const {
    bills, trips,
    fetchBills, fetchTrips,
    addBill, updateBillStatus, deleteBill,
  } = useStore();

  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [statusTab, setStatusTab]           = useState('all');
  const [search, setSearch]                 = useState('');
  const [showModal, setShowModal]           = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [selectedDestination, setSelectedDestination] = useState('');
  const [selectedTripIds, setSelectedTripIds]         = useState([]);

  const [form, setForm] = useState({
    vendorName: '',
    billNumber: `BILL-${Date.now().toString().slice(-6)}`,
    date: dayjs().format('YYYY-MM-DD'),
    notes: '',
  });

  const load = async () => {
    try {
      await Promise.all([
        fetchBills(),
        fetchTrips({ limit: 2000 }),
      ]);
    } catch {}
    setLoading(false);
  };

  const refreshTrigger = useStore(s => s.refreshTrigger);
  useEffect(() => { load(); }, []);
  useEffect(() => { if (refreshTrigger > 0) onRefresh(); }, [refreshTrigger]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  /* ── Stats ── */
  const billStats = useMemo(() => ({
    total:       bills.length,
    unpaid:      bills.filter(b => b.status === 'unpaid').length,
    paid:        bills.filter(b => b.status === 'paid').length,
    outstanding: bills.filter(b => b.status === 'unpaid').reduce((s, b) => s + (b.totalAmount || 0), 0),
  }), [bills]);

  /* ── Destination summaries ── */
  const destSummaries = useMemo(() => {
    const map = {};
    trips.forEach(t => {
      const dest = (t.destination || '').trim().toUpperCase() || 'UNSPECIFIED';
      if (!map[dest]) map[dest] = { name: dest, total: 0 };
      map[dest].total += (t.trips || 1);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [trips]);

  const filteredDestSummaries = useMemo(() => {
    if (!search) return destSummaries;
    const q = search.toLowerCase();
    return destSummaries.filter(d => d.name.toLowerCase().includes(q));
  }, [destSummaries, search]);

  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      const matchStatus = statusTab === 'all' || b.status === statusTab;
      const matchSearch = !search ||
        b.billNumber?.toLowerCase().includes(search.toLowerCase()) ||
        b.vendorName?.toLowerCase().includes(search.toLowerCase()) ||
        b.destination?.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [bills, statusTab, search]);

  /* ── Available trips for selected destination ── */
  const availableTrips = useMemo(() => {
    if (!selectedDestination) return [];
    const billedT = new Set(bills.flatMap(b => b.trips || []));
    return trips.filter(t =>
      (t.destination || '').trim().toUpperCase() === selectedDestination && !billedT.has(t.id));
  }, [trips, bills, selectedDestination]);

  const selectedCount = useMemo(() =>
    availableTrips.filter(t => selectedTripIds.includes(t.id)).reduce((s, t) => s + (t.trips || 1), 0),
  [availableTrips, selectedTripIds]);

  const selectedAmount = useMemo(() =>
    availableTrips.filter(t => selectedTripIds.includes(t.id)).reduce((s, t) => s + (t.sellPrice || 0) * (t.trips || 1), 0),
  [availableTrips, selectedTripIds]);

  const openCreateModal = (dest) => {
    setSelectedDestination(dest);
    setSelectedTripIds([]);
    setForm({
      vendorName: '',
      billNumber: `BILL-${Date.now().toString().slice(-6)}`,
      date: dayjs().format('YYYY-MM-DD'),
      notes: '',
    });
    setShowModal(true);
  };

  const saveBill = async () => {
    if (!form.vendorName || !selectedDestination) {
      Alert.alert('Error', 'Vendor name is required');
      return;
    }
    if (selectedTripIds.length === 0) {
      Alert.alert('Error', 'Select at least one trip');
      return;
    }
    setSaving(true);
    try {
      await addBill({
        ...form,
        destination: selectedDestination,
        tripIds: selectedTripIds,
      });
      setShowModal(false);
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = (bill) => {
    const newStatus = bill.status === 'paid' ? 'unpaid' : 'paid';
    Alert.alert(
      newStatus === 'paid' ? 'Mark as Paid' : 'Mark as Unpaid',
      `Mark bill ${bill.billNumber} as ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => updateBillStatus(bill.id, newStatus) },
      ]
    );
  };

  const confirmDelete = (bill) => Alert.alert('Delete Bill', 'Delete this bill?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteBill(bill.id) },
  ]);

  if (loading) return <Loader />;

  return (
    <View style={styles.container}>
      <View style={{ padding: spacing.lg, paddingBottom: spacing.md }}>
        <Input
          icon="search-outline"
          placeholder="Search bills..."
          value={search}
          onChangeText={setSearch}
          style={{ marginBottom: 0 }}
          inputStyle={{ fontSize: 14 }}
        />
      </View>
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{billStats.total}</Text>
          <Text style={styles.statLbl}>Total</Text>
        </View>
        <View style={styles.statDiv} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: colors.yellow }]}>{billStats.unpaid}</Text>
          <Text style={styles.statLbl}>Unpaid</Text>
        </View>
        <View style={styles.statDiv} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: colors.green }]}>{billStats.paid}</Text>
          <Text style={styles.statLbl}>Paid</Text>
        </View>
        <View style={styles.statDiv} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: colors.red, fontSize: 12 }]}>{formatCurrency(billStats.outstanding)}</Text>
          <Text style={styles.statLbl}>Outstanding</Text>
        </View>
      </View>

      {/* Status Filter */}
      <View style={styles.filterStrip}>
        {STATUS_TABS.map(t => (
          <TouchableOpacity
            key={t}
            style={[
              styles.filterBtn,
              statusTab === t && styles.filterBtnActive,
              statusTab === t && t === 'paid'   && { borderColor: colors.green  + '80', backgroundColor: colors.green  + '15' },
              statusTab === t && t === 'unpaid' && { borderColor: colors.yellow + '80', backgroundColor: colors.yellow + '15' },
            ]}
            onPress={() => setStatusTab(t)}
          >
            <Text style={[
              styles.filterBtnText,
              statusTab === t && { color: t === 'paid' ? colors.green : t === 'unpaid' ? colors.yellow : colors.brand[400] },
            ]}>
              {t.toUpperCase()} ({t === 'all' ? billStats.total : t === 'paid' ? billStats.paid : billStats.unpaid})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredBills}
        keyExtractor={b => b.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />}
        ListEmptyComponent={<EmptyState icon="receipt-outline" message="No bills found" />}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}

        ListHeaderComponent={() =>
          filteredDestSummaries.length > 0 && statusTab === 'all' ? (
            <View style={styles.destList}>
              {/* Destinations section */}
              <View style={styles.sectionHeader}>
                <Ionicons name="map-outline" size={16} color={colors.brand[400]} />
                <Text style={styles.sectionTitle}>DESTINATIONS</Text>
              </View>
              <View style={styles.destGrid}>
                {filteredDestSummaries.map((dest, idx) => (
                  <TouchableOpacity key={idx} style={styles.destCard} onPress={() => openCreateModal(dest.name)}>
                    {/* Top accent bar */}
                    <View style={styles.destCardAccentBar} />
                    <View style={styles.destCardInner}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.destCardLabel}>DESTINATION SITE</Text>
                        <Text style={styles.destCardName}>{dest.name}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.destCardCount}>{dest.total}</Text>
                        <Text style={styles.destCardSub}>TRIPS</Text>
                      </View>
                    </View>
                    {/* Footer action */}
                    <View style={styles.destCardFooter}>
                      <Text style={styles.destCardAction}>GENERATE INVOICE</Text>
                      <Ionicons name="add-circle" size={16} color={colors.brand[400]} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.sectionHeader, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>
                <Ionicons name="receipt" size={16} color={colors.brand[400]} />
                <Text style={styles.sectionTitle}>ALL INVOICES</Text>
              </View>
            </View>
          ) : null
        }

        renderItem={({ item: bill }) => (
          <View style={[
            styles.billCard,
            { borderColor: bill.status === 'paid' ? colors.green + '20' : colors.surface[800] }
          ]}>
            {/* Top gradient accent bar */}
            <View style={[styles.billAccentBar, {
              backgroundColor: bill.status === 'paid' ? colors.green : colors.yellow
            }]} />

            <View style={styles.billCardPadding}>
              {/* Header row: Bill # + status toggle */}
              <View style={styles.billHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.billNumberText}>{bill.billNumber || 'BILL'}</Text>
                  <Text style={styles.billVendorName}>{bill.vendorName || 'Vendor'}</Text>
                </View>
                {/* Inline Pay/Unpay toggle — matching web */}
                <TouchableOpacity
                  onPress={() => toggleStatus(bill)}
                  style={[
                    styles.statusToggleBtn,
                    bill.status === 'paid'
                      ? { backgroundColor: colors.green + '18', borderColor: colors.green + '40' }
                      : { backgroundColor: colors.yellow + '18', borderColor: colors.yellow + '40' },
                  ]}
                >
                  <Ionicons
                    name={bill.status === 'paid' ? 'checkmark-circle' : 'time-outline'}
                    size={13}
                    color={bill.status === 'paid' ? colors.green : colors.yellow}
                  />
                  <Text style={[
                    styles.statusToggleText,
                    { color: bill.status === 'paid' ? colors.green : colors.yellow },
                  ]}>
                    {bill.status === 'paid' ? 'PAID' : 'UNPAID'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Destination + Amount */}
              <View style={styles.billMain}>
                <View style={styles.billInfoCol}>
                  <Text style={styles.billInfoLbl}>SITE / DESTINATION</Text>
                  <Text style={styles.billInfoVal}>{bill.destination || '—'}</Text>
                </View>
                <View style={[styles.billInfoCol, { alignItems: 'flex-end' }]}>
                  <Text style={styles.billInfoLbl}>TOTAL TRIPS</Text>
                  <Text style={[styles.billInfoVal, { color: colors.white }]}>{bill.totalTripsCount || 0}</Text>
                </View>
              </View>

              {/* Amount chip */}
              <View style={styles.amountChip}>
                <Text style={styles.amountChipLabel}>TOTAL AMOUNT</Text>
                <Text style={styles.amountChipValue}>{formatCurrency(bill.totalAmount || 0)}</Text>
              </View>

              {/* Footer */}
              <View style={styles.billFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="calendar-outline" size={12} color={colors.surface[500]} />
                  <Text style={styles.billDateText}>{formatDateShort(bill.date)}</Text>
                </View>
                {/* Delete button — inline */}
                <TouchableOpacity
                  onPress={() => confirmDelete(bill)}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={13} color={colors.red} />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      {/* Billing Modal */}
      <BottomModal visible={showModal} onClose={() => setShowModal(false)} title="GENERATE INVOICE">
        <View style={styles.modalContent}>
          {/* Destination highlight */}
          <View style={styles.modalDestHeader}>
            <Ionicons name="location" size={16} color={colors.brand[400]} />
            <Text style={styles.modalDestTitle}>{selectedDestination}</Text>
          </View>

          {/* Form fields */}
          <View style={{ marginBottom: spacing.md }}>
             <Input label="Vendor / Client Name *" value={form.vendorName} onChangeText={v => setForm(f => ({ ...f, vendorName: v }))} placeholder="e.g. ABC Suppliers" />
          </View>
          
          <View style={styles.modalGrid}>
            <View style={{ flex: 1 }}>
              <Input label="Bill Number" value={form.billNumber} onChangeText={v => setForm(f => ({ ...f, billNumber: v }))} />
            </View>
            <View style={{ flex: 1 }}>
              <DatePicker label="Date" date={form.date} onConfirm={d => setForm(f => ({ ...f, date: dayjs(d).format('YYYY-MM-DD') }))} />
            </View>
          </View>

          {/* Trip selection */}
          <View style={styles.selectionListContainer}>
            <View style={styles.selectionHeader}>
              <Text style={styles.selectionCount}>Available ({availableTrips.length})</Text>
              <TouchableOpacity onPress={() => {
                const allSelected = selectedTripIds.length === availableTrips.length;
                if (allSelected) {
                  setSelectedTripIds([]);
                } else {
                  setSelectedTripIds(availableTrips.map(t => t.id));
                }
              }}>
                <Text style={styles.selectAllText}>
                  {selectedTripIds.length === availableTrips.length && availableTrips.length > 0 ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.selectionScroll} nestedScrollEnabled>
              {availableTrips.map(t => {
                const isSel = selectedTripIds.includes(t.id);
                return (
                  <TouchableOpacity key={t.id} style={[styles.selItem, isSel && styles.selItemActive]} onPress={() => setSelectedTripIds(p => isSel ? p.filter(id => id !== t.id) : [...p, t.id])}>
                    <View style={[styles.selCheckbox, isSel && styles.selCheckboxActive]}>
                      {isSel && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selText}>{formatDateShort(t.date)}</Text>
                      <Text style={styles.selSub}>{t.vehicle?.number} · {t.trips} trips</Text>
                    </View>
                    <Text style={styles.selPrice}>{formatCurrency((t.sellPrice || 0) * (t.trips || 1))}</Text>
                  </TouchableOpacity>
                );
              })}
              {availableTrips.length === 0 && (
                <View style={styles.selEmpty}>
                  <Ionicons name="alert-circle-outline" size={28} color={colors.yellow} style={{ marginBottom: 8 }} />
                  <Text style={styles.selEmptyText}>No unbilled trips for this destination</Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Summary footer */}
          <View style={styles.modalSummary}>
            <View>
              <Text style={styles.summaryLabel}>SELECTED TRIPS</Text>
              <Text style={styles.summaryValue}>{selectedCount}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.summaryLabel}>TOTAL REVENUE</Text>
              <Text style={[styles.summaryValue, { color: colors.brand[400] }]}>{formatCurrency(selectedAmount)}</Text>
            </View>
          </View>

          <Button title="FINALIZE INVOICE" onPress={saveBill} loading={saving} icon="receipt-outline" />
        </View>
      </BottomModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.surface[950] },
  statsBar:     { flexDirection: 'row', backgroundColor: colors.surface[900], borderBottomWidth: 1, borderBottomColor: colors.surface[800], paddingVertical: spacing.md },
  statItem:     { flex: 1, alignItems: 'center' },
  statDiv:      { width: 1, backgroundColor: colors.surface[800] },
  statVal:      { fontSize: 14, fontWeight: '700', color: colors.white },
  statLbl:      { fontSize: 10, color: colors.surface[500], marginTop: 2 },

  filterStrip:  { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingVertical: 12, backgroundColor: colors.surface[950] },
  filterBtn:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.surface[800], backgroundColor: 'transparent' },
  filterBtnActive: { borderColor: colors.brand[500] + '80', backgroundColor: colors.brand[500] + '15' },
  filterBtnText:   { fontSize: 10, fontWeight: '800', color: colors.surface[500] },

  list:         { paddingBottom: 100 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: colors.surface[400], letterSpacing: 1.5 },

  destList:     { paddingVertical: spacing.lg },
  destGrid:     { paddingHorizontal: spacing.lg, gap: spacing.sm },
  destCard:     { backgroundColor: colors.surface[900], borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.surface[800], marginBottom: spacing.sm },
  destCardAccentBar: { height: 4, backgroundColor: colors.brand[500] },
  destCardInner:{ flexDirection: 'row', padding: spacing.lg, alignItems: 'center' },
  destCardLabel:{ fontSize: 9, fontWeight: '800', color: colors.brand[500], letterSpacing: 1, marginBottom: 2 },
  destCardName: { fontSize: 16, fontWeight: '900', color: colors.white, textTransform: 'uppercase' },
  destCardCount:{ fontSize: 32, fontWeight: '900', color: colors.brand[400], lineHeight: 34 },
  destCardSub:  { fontSize: 9, fontWeight: '700', color: colors.surface[500], textTransform: 'uppercase' },
  destCardFooter:{ backgroundColor: colors.surface[800] + '80', paddingHorizontal: spacing.lg, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  destCardAction:{ fontSize: 10, fontWeight: '900', color: colors.white, letterSpacing: 0.5 },

  billCard:     { marginHorizontal: spacing.lg, padding: 0, overflow: 'hidden', marginBottom: spacing.sm, backgroundColor: colors.surface[900], borderRadius: radius.xl, borderWidth: 1 },
  billAccentBar:{ height: 4, width: '100%' },
  billCardPadding: { padding: spacing.lg },
  billHead:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  billNumberText:{ fontSize: 10, color: colors.surface[500], fontWeight: 'bold', fontFamily: 'monospace' },
  billVendorName:{ fontSize: 15, fontWeight: '900', color: colors.white, marginTop: 2, textTransform: 'uppercase' },

  statusToggleBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  statusToggleText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },

  billMain:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  billInfoCol:  { flex: 1 },
  billInfoLbl:  { fontSize: 8, fontWeight: '800', color: colors.surface[500], letterSpacing: 0.5, marginBottom: 3 },
  billInfoVal:  { fontSize: 13, fontWeight: '900', color: colors.white, textTransform: 'uppercase' },

  amountChip:   { backgroundColor: colors.surface[800] + '60', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountChipLabel: { fontSize: 9, fontWeight: '800', color: colors.surface[500], letterSpacing: 1 },
  amountChipValue: { fontSize: 20, fontWeight: '900', color: colors.green },

  billFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.surface[800] },
  billDateText: { fontSize: 10, color: colors.surface[400], fontWeight: '600' },
  deleteBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: radius.md, backgroundColor: colors.red + '12' },
  deleteBtnText:{ fontSize: 10, fontWeight: '700', color: colors.red },

  modalContent: { paddingBottom: 20 },
  modalDestHeader:{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brand[500] + '20', padding: 12, borderRadius: radius.md, marginBottom: spacing.lg },
  modalDestTitle: { fontSize: 14, fontWeight: '900', color: colors.white, textTransform: 'uppercase', flex: 1 },
  modalGrid:    { flexDirection: 'row', gap: spacing.md },

  selectionListContainer: { marginBottom: spacing.lg },
  selectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  selectionCount: { fontSize: 9, fontWeight: '800', color: colors.surface[500], textTransform: 'uppercase' },
  selectAllText:  { fontSize: 9, fontWeight: '900', color: colors.brand[500], textTransform: 'uppercase' },
  selectionScroll:{ maxHeight: 200, backgroundColor: colors.surface[950], borderRadius: radius.md, borderWidth: 1, borderColor: colors.surface[800], padding: 4 },
  selItem:        { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 4, gap: 10 },
  selItemActive:  { backgroundColor: colors.brand[500] + '11', borderColor: colors.brand[500] + '40', borderWidth: 1 },
  selCheckbox:    { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: colors.surface[700], alignItems: 'center', justifyContent: 'center' },
  selCheckboxActive: { backgroundColor: colors.brand[500], borderColor: colors.brand[500] },
  selText:        { fontSize: 11, fontWeight: 'bold', color: colors.surface[300] },
  selSub:         { fontSize: 9, color: colors.surface[500], marginTop: 1 },
  selPrice:       { fontSize: 11, fontWeight: '900', color: colors.white },
  selEmpty:       { padding: 24, alignItems: 'center' },
  selEmptyText:   { fontSize: 12, color: colors.yellow, fontWeight: '600', textAlign: 'center' },

  modalSummary:   { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface[900], padding: 16, borderRadius: radius.md, marginBottom: spacing.lg, borderLeftWidth: 4, borderLeftColor: colors.brand[500] },
  summaryLabel:   { fontSize: 8, fontWeight: '900', color: colors.surface[500], marginBottom: 4 },
  summaryValue:   { fontSize: 20, fontWeight: '900', color: colors.white },
});
