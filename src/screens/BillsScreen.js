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
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const STATUS_TABS = ['all', 'unpaid', 'paid'];

export default function BillsScreen() {
  const {
    bills, driverTrips, locations,
    fetchBills, fetchDriverTrips, fetchLocations,
    addBill, updateBillStatus, deleteBill,
  } = useStore();

  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [activeView, setActiveView]         = useState('destinations');
  const [statusTab, setStatusTab]           = useState('all');
  const [search, setSearch]                 = useState('');
  const [showModal, setShowModal]           = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [selectedDestination, setSelectedDestination] = useState('');
  const [selectedTripIds, setSelectedTripIds]         = useState([]);

  const [form, setForm]                     = useState({
    vendorName: '',
    billNumber: `BILL-${Date.now().toString().slice(-6)}`,
    date: dayjs().format('YYYY-MM-DD'),
    notes: '',
    tax: '0',
    discount: '0',
  });

  const load = async (force = false) => {
    try {
      await Promise.all([
        fetchBills(),
        fetchDriverTrips({ limit: 1000 }),
        locations.length === 0 || force ? fetchLocations({ limit: 500 }) : Promise.resolve(),
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
  const verifiedTrips = useMemo(() => driverTrips.filter(t => t.status === 'verified'), [driverTrips]);

  const destSummaries = useMemo(() => {
    const map = {};
    verifiedTrips.forEach(t => {
      const dest = (t.destination || '').split('|PRICE:')[0].trim().toUpperCase() || 'UNSPECIFIED';
      if (!map[dest]) map[dest] = { name: dest, total: 0 };
      map[dest].total += (t.trips || 1);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [verifiedTrips]);

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
    const billedT = new Set(bills.flatMap(b => b.tripIds || b.trips || []));
    return verifiedTrips.filter(t =>
      (t.destination || '').split('|PRICE:')[0].trim().toUpperCase() === selectedDestination && !billedT.has(t.id));
  }, [verifiedTrips, bills, selectedDestination]);

  const selectedCount = useMemo(() =>
    availableTrips.filter(t => selectedTripIds.includes(t.id)).reduce((s, t) => s + (t.trips || 1), 0),
  [availableTrips, selectedTripIds]);

  const groupedTrips = useMemo(() => {
    const groups = {};
    availableTrips.forEach(t => {
      const dLabel = dayjs(t.date).format('YYYY-MM-DD');
      if (!groups[dLabel]) {
        groups[dLabel] = {
          id: dLabel,
          date: t.date,
          tripIds: [],
          totalTrips: 0,
          totalPrice: 0,
          vehicles: new Set()
        };
      }
      
      const destBase = (t.destination || '').split('|PRICE:')[0].trim();
      const destLoc = locations.find(l => (l.name || '').split('|PRICE:')[0].trim() === destBase);
      let locSellP = 0;
      if (destLoc && destLoc.name && destLoc.name.includes('|PRICE:')) {
         locSellP = Number(destLoc.name.split('|PRICE:')[1].trim());
      } else if (destLoc?.price) {
         locSellP = Number(destLoc.price);
      }
      const finalP = locSellP || Number(t.sellPrice) || Number(t.soilType?.sellPrice) || 0;

      groups[dLabel].tripIds.push(t.id);
      groups[dLabel].totalTrips += Number(t.trips) || 1;
      groups[dLabel].totalPrice += finalP * (Number(t.trips) || 1);
      if (t.vehicle?.number) groups[dLabel].vehicles.add(t.vehicle.number);
    });

    return Object.values(groups).map(g => ({
       ...g,
       vehicleText: g.vehicles.size === 1 ? Array.from(g.vehicles)[0] : `${g.vehicles.size} Vehicles`
    })).sort((a,b) => dayjs(b.date).unix() - dayjs(a.date).unix());
  }, [availableTrips, locations]);
  
  const selectedAmount = useMemo(() => {
    return selectedTripIds.reduce((sum, tid) => {
      const t = availableTrips.find(x => x.id === tid);
      if (!t) return sum;
      
      const destBase = (t.destination || '').split('|PRICE:')[0].trim();
      const destLoc = locations.find(l => (l.name || '').split('|PRICE:')[0].trim() === destBase);
      let locSellP = 0;
      if (destLoc && destLoc.name && destLoc.name.includes('|PRICE:')) {
         locSellP = Number(destLoc.name.split('|PRICE:')[1].trim());
      } else if (destLoc?.price) {
         locSellP = Number(destLoc.price);
      }
      const finalP = locSellP || Number(t.sellPrice) || Number(t.soilType?.sellPrice) || 0;
      return sum + (finalP * (Number(t.trips) || 1));
    }, 0);
  }, [availableTrips, selectedTripIds, locations]);

  const finalTotal = useMemo(() => {
    const tax = Number(form.tax) || 0;
    const discount = Number(form.discount) || 0;
    const taxAmt = (selectedAmount * tax) / 100;
    return selectedAmount + taxAmt - discount;
  }, [selectedAmount, form.tax, form.discount]);

  const openCreateModal = (dest) => {
    setSelectedDestination(dest);
    setSelectedTripIds([]);
    setForm({
      vendorName: '',
      billNumber: `BILL-${Date.now().toString().slice(-6)}`,
      date: dayjs().format('YYYY-MM-DD'),
      notes: '',
      tax: '0',
      discount: '0',
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
        tax: Number(form.tax) || 0,
        discount: Number(form.discount) || 0,
        totalAmount: finalTotal,
      });
      setShowModal(false);
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const exportInvoicePDF = async (bill) => {
    // If bill is not provided, this is a preview or during creation? 
    // Actually the request said implement Generate PDF button in invoice creation/bills screen.
    // I'll implement it for existing bills first, and maybe a "Preview" for new ones.
    
    const targetBill = bill || {
       ...form,
       destination: selectedDestination,
       totalAmount: finalTotal,
       tripsCount: selectedCount
    };

    const html = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .company { font-size: 28px; font-weight: bold; color: #d97706; }
            .invoice-title { font-size: 24px; font-weight: bold; text-align: right; }
            .details { display: flex; justify-content: space-between; margin-top: 30px; }
            .bill-to { flex: 1; }
            .invoice-info { text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-top: 40px; }
            th { text-align: left; background: #eee; padding: 12px; font-size: 14px; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
            .summary { margin-top: 30px; margin-left: auto; width: 250px; }
            .summary-item { display: flex; justify-content: space-between; padding: 8px 0; }
            .summary-total { font-weight: bold; font-size: 18px; border-top: 2px solid #333; margin-top: 10px; padding-top: 10px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">GANESH CARTING</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">Premium Transport Solutions</div>
            </div>
            <div class="invoice-info">
              <div class="invoice-title">INVOICE</div>
              <div style="margin-top: 4px;"># ${targetBill.billNumber}</div>
              <div>Date: ${dayjs(targetBill.date).format('DD MMM YYYY')}</div>
            </div>
          </div>
          
          <div class="details">
            <div class="bill-to">
              <div style="font-size: 10px; color: #888; text-transform: uppercase;">Bill To:</div>
              <div style="font-size: 18px; font-weight: bold; margin-top: 4px;">${targetBill.vendorName}</div>
              <div style="margin-top: 4px;">Site: ${targetBill.destination}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Trips</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Transportation services for ${targetBill.destination}</td>
                <td style="text-align: right;">${targetBill.totalTripsCount || targetBill.tripsCount || targetBill.trips || 0}</td>
                <td style="text-align: right;">${formatCurrency(selectedAmount)}</td>
              </tr>
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-item">
              <span>Subtotal</span>
              <span>${formatCurrency(selectedAmount)}</span>
            </div>
            ${Number(targetBill.tax) > 0 ? `
            <div class="summary-item">
              <span>Tax (${targetBill.tax}%)</span>
              <span>+ ${formatCurrency((selectedAmount * Number(targetBill.tax)) / 100)}</span>
            </div>` : ''}
            ${Number(targetBill.discount) > 0 ? `
            <div class="summary-item">
              <span>Discount</span>
              <span>- ${formatCurrency(Number(targetBill.discount))}</span>
            </div>` : ''}
            <div class="summary-item summary-total">
              <span>Total Amount</span>
              <span>${formatCurrency(targetBill.totalAmount)}</span>
            </div>
          </div>

          <div class="footer">
            Thank you for your business! Generated by TransportPro App.
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) {
      Alert.alert('Error', 'Failed to generate PDF');
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

      {/* Main Top-Level Toggle */}
      <View style={styles.mainToggleContainer}>
        <TouchableOpacity 
           style={[styles.mainToggleBtn, activeView === 'destinations' && styles.mainToggleBtnActive]} 
           onPress={() => setActiveView('destinations')}
        >
           <Ionicons name="map" size={14} color={activeView === 'destinations' ? colors.white : colors.surface[500]} />
           <Text style={[styles.mainToggleText, activeView === 'destinations' && styles.mainToggleTextActive]}>DESTINATIONS</Text>
        </TouchableOpacity>
        <TouchableOpacity 
           style={[styles.mainToggleBtn, activeView === 'invoices' && styles.mainToggleBtnActive]} 
           onPress={() => setActiveView('invoices')}
        >
           <Ionicons name="receipt" size={14} color={activeView === 'invoices' ? colors.white : colors.surface[500]} />
           <Text style={[styles.mainToggleText, activeView === 'invoices' && styles.mainToggleTextActive]}>INVOICES</Text>
        </TouchableOpacity>
      </View>

      {activeView === 'destinations' ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />}>
          {filteredDestSummaries.length === 0 ? (
            <EmptyState icon="map-outline" message="No pending destinations available for invoicing" />
          ) : (
            <View style={styles.destGrid}>
              {filteredDestSummaries.map((dest, idx) => (
                <TouchableOpacity key={idx} style={styles.destCard} onPress={() => openCreateModal(dest.name)}>
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
                  <View style={styles.destCardFooter}>
                    <Text style={styles.destCardAction}>GENERATE INVOICE</Text>
                    <Ionicons name="add-circle" size={16} color={colors.brand[400]} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <>
          {/* Status Filter for Invoices */}
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
                  <Text style={styles.billDateText}>{formatDateShort(bill.date)}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => exportInvoicePDF(bill)} style={[styles.deleteBtn, { backgroundColor: colors.brand[500] + '12' }]}>
                    <Ionicons name="share-outline" size={13} color={colors.brand[400]} />
                    <Text style={[styles.deleteBtnText, { color: colors.brand[400] }]}>PDF</Text>
                  </TouchableOpacity>
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
        </>
      )}

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

          <View style={styles.modalGrid}>
            <View style={{ flex: 1 }}>
              <Input label="Tax (GST %)" keyboardType="numeric" value={form.tax} onChangeText={v => setForm(f => ({ ...f, tax: v }))} placeholder="0" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Discount (₹)" keyboardType="numeric" value={form.discount} onChangeText={v => setForm(f => ({ ...f, discount: v }))} placeholder="0" />
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
              {groupedTrips.map(g => {
                // To be selected, all trips in the group must be selected
                const isSel = g.tripIds.every(id => selectedTripIds.includes(id));

                const toggleGroup = () => {
                  setSelectedTripIds(prev => {
                    if (isSel) {
                      // Remove all current group's tripIds from selected list
                      return prev.filter(id => !g.tripIds.includes(id));
                    } else {
                      // Add all current group's tripIds (avoiding duplicates)
                      return Array.from(new Set([...prev, ...g.tripIds]));
                    }
                  });
                };

                return (
                  <TouchableOpacity key={g.id} style={[styles.selItem, isSel && styles.selItemActive]} onPress={toggleGroup}>
                    <View style={[styles.selCheckbox, isSel && styles.selCheckboxActive]}>
                      {isSel && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selText}>{formatDateShort(g.date)} <Text style={{ color: colors.brand[400], fontWeight: '900', fontSize: 10, marginLeft: 6 }}>DAILY LOG</Text></Text>
                      <Text style={styles.selSub}>{g.vehicleText} · {g.totalTrips} total trips</Text>
                    </View>
                    <Text style={styles.selPrice}>{formatCurrency(g.totalPrice)}</Text>
                  </TouchableOpacity>
                );
              })}
              {groupedTrips.length === 0 && (
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
              <Text style={styles.summaryLabel}>TOTAL AMOUNT</Text>
              <Text style={[styles.summaryValue, { color: colors.brand[400] }]}>{formatCurrency(finalTotal)}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="SHARE PDF" onPress={() => exportInvoicePDF()} variant="outline" icon="share-outline" style={{ flex: 1 }} />
            <Button title="FINALIZE INVOICE" onPress={saveBill} loading={saving} icon="receipt-outline" style={{ flex: 2 }} />
          </View>
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

  mainToggleContainer: { flexDirection: 'row', backgroundColor: colors.surface[900], padding: 6, marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.lg },
  mainToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.md },
  mainToggleBtnActive: { backgroundColor: colors.brand[500] },
  mainToggleText: { fontSize: 11, fontWeight: '800', color: colors.surface[500], textTransform: 'uppercase', letterSpacing: 1 },
  mainToggleTextActive: { color: colors.white },

  filterStrip:  { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingVertical: 12, backgroundColor: colors.surface[950] },
  filterBtn:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.surface[800], backgroundColor: 'transparent' },
  filterBtnActive: { borderColor: colors.brand[500] + '80', backgroundColor: colors.brand[500] + '15' },
  filterBtnText:   { fontSize: 10, fontWeight: '800', color: colors.surface[500] },

  list:         { paddingBottom: 100 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: colors.surface[400], letterSpacing: 1.5 },

  destList:     { paddingVertical: spacing.lg },
  destGrid:     { gap: spacing.sm },
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
