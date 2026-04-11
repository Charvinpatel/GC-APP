import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Dimensions, View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, ScrollView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useStore } from '../store/useStore';
import { Button, Card, Badge, EmptyState, BottomModal, Input, SelectPicker, Loader, Row, DatePicker } from '../components';
import { colors, spacing, radius, shadows } from '../utils/theme';
import { formatCurrency, formatDateShort, getTripProfit, getTripRevenue } from '../utils/helpers';

const EMPTY_MULTI_TRIP = {
  date: dayjs().format('YYYY-MM-DD'),
  driverId: '', vehicleId: '',
  routes: [{ id: '1', soilTypeId: '', source: '', destination: '', trips: '1', buyPrice: '', sellPrice: '', notes: '' }],
};

export default function TripsScreen() {
  const {
    trips, tripsMeta, tripsSummary,
    drivers, vehicles, soilTypes, locations,
    fetchTrips, addTrip, updateTrip, deleteTrip,
    fetchDrivers, fetchVehicles, fetchLocations,
  } = useStore();

  const [refreshing, setRefreshing]   = useState(false);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [editing, setEditing]         = useState(null);
  const [form, setForm]               = useState(EMPTY_MULTI_TRIP);
  const [saving, setSaving]           = useState(false);
  const [page, setPage]               = useState(1);
  
  const [filterType, setFilterType]   = useState('today'); // 'all', 'today', 'custom'
  const [customDate, setCustomDate]   = useState(dayjs().format('YYYY-MM-DD'));

  const activeDate = useMemo(() => {
    if (filterType === 'today') return dayjs().format('YYYY-MM-DD');
    if (filterType === 'all') return '';
    return customDate;
  }, [filterType, customDate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await fetchTrips({ page: 1, limit: 1000, date: activeDate });
      await Promise.all([
        drivers.length   === 0 ? fetchDrivers({ limit: 200 })   : Promise.resolve(),
        vehicles.length  === 0 ? fetchVehicles({ limit: 200 })  : Promise.resolve(),
        locations.length === 0 ? fetchLocations({ limit: 500 }) : Promise.resolve(),
      ]);
    } catch {}
    setLoading(false);
  }, [activeDate]);

  const refreshTrigger = useStore(s => s.refreshTrigger);
  useEffect(() => { load(); }, [activeDate]);
  useEffect(() => { if (refreshTrigger > 0) onRefresh(); }, [refreshTrigger]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...EMPTY_MULTI_TRIP,
      date: dayjs().format('YYYY-MM-DD'),
      routes: [{ id: Date.now().toString(), soilTypeId: '', source: '', destination: '', trips: '1', buyPrice: '', sellPrice: '', notes: '' }]
    });
    setShowModal(true);
  };

  const openEdit = (group) => {
    setEditing(group);
    
    // We assume the global driver/vehicle is identical across the group, use the first.
    const firstTrip = group.allTrips[0] || {};
    
    setForm({
      date:       group.date || dayjs().format('YYYY-MM-DD'),
      driverId:   firstTrip.driverId || '',
      vehicleId:  firstTrip.vehicleId || '',
      routes:     group.allTrips.map(trip => ({
        id:          trip.id,
        soilTypeId:  trip.soilTypeId || '',
        source:      trip.source || '',
        destination: trip.destination || '',
        trips:       String(trip.trips || 1),
        buyPrice:    String(trip.buyPrice || ''),
        sellPrice:   String(trip.sellPrice || ''),
        notes:       trip.notes || '',
      }))
    });
    setShowModal(true);
  };

  const handleSoilChange = (soilId, routeId) => {
    const soil = soilTypes.find(s => s.id === soilId);
    setForm(f => ({
      ...f,
      routes: f.routes.map(r => r.id === routeId ? {
        ...r,
        soilTypeId: soilId,
        buyPrice:  soil?.buyPrice  ? String(soil.buyPrice)  : r.buyPrice,
        sellPrice: soil?.sellPrice ? String(soil.sellPrice) : r.sellPrice,
      } : r)
    }));
  };

  const updateRoute = (routeId, field, value) => {
    setForm(f => ({
      ...f,
      routes: f.routes.map(r => r.id === routeId ? { ...r, [field]: value } : r)
    }));
  };

  const addRouteRow = () => {
    setForm(f => ({
       ...f,
       routes: [...f.routes, { id: Date.now().toString(), soilTypeId: '', source: '', destination: '', trips: '1', buyPrice: '', sellPrice: '', notes: '' }]
    }));
  };

  const removeRouteRow = (id) => {
    setForm(f => ({ ...f, routes: f.routes.filter(r => r.id !== id) }));
  };

  const save = async () => {
    if (!form.driverId || !form.vehicleId || !form.date) {
      Alert.alert('Error', 'Please fill all required global fields');
      return;
    }
    
    for (let i = 0; i < form.routes.length; i++) {
        const r = form.routes[i];
        if (!r.soilTypeId || !r.source || !r.destination || !r.buyPrice || !r.sellPrice) {
           Alert.alert('Error', `Please fill all required fields in Route #${i+1}`);
           return;
        }
    }

    setSaving(true);
    try {
      if (editing) {
        const originalTripIds = editing.allTrips.map(t => t.id);
        const currentRouteIds = form.routes.map(r => r.id);
        
        const deletedTripIds = originalTripIds.filter(id => !currentRouteIds.includes(id));
        const promises = [];
        
        deletedTripIds.forEach(id => promises.push(deleteTrip(id)));
        
        form.routes.forEach(r => {
          const payload = {
            date: form.date, driverId: form.driverId, vehicleId: form.vehicleId,
            source: r.source, destination: r.destination, soilTypeId: r.soilTypeId,
            trips: Number(r.trips) || 1, buyPrice: Number(r.buyPrice), sellPrice: Number(r.sellPrice),
            notes: r.notes || ''
          };
          if (originalTripIds.includes(r.id)) {
            promises.push(updateTrip(r.id, payload));
          } else {
            promises.push(addTrip(payload));
          }
        });
        await Promise.all(promises);
      } else {
        const promises = form.routes.map(r => {
          const payload = {
            date: form.date, driverId: form.driverId, vehicleId: form.vehicleId,
            source: r.source, destination: r.destination, soilTypeId: r.soilTypeId,
            trips: Number(r.trips) || 1, buyPrice: Number(r.buyPrice), sellPrice: Number(r.sellPrice),
            notes: r.notes || ''
          };
          return addTrip(payload);
        });
        await Promise.all(promises);
      }
      setShowModal(false);
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (group) => {
    Alert.alert('Delete Trip Group', 'Are you sure you want to delete all trip records for this vehicle on this day?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete All', style: 'destructive', onPress: async () => {
         const promises = group.allTrips.map(t => deleteTrip(t.id));
         await Promise.all(promises);
         load();
      } },
    ]);
  };

  const driverOpts  = drivers.map(d   => ({ label: d.name,   value: d.id }));
  const vehicleOpts = vehicles.map(v  => ({ label: v.number, value: v.id }));
  const soilOpts    = soilTypes.map(s => ({ label: s.name,   value: s.id }));
  const sourceOpts  = locations.map(l => ({ label: l.name, value: l.name }));
  const destOpts    = locations.map(l => ({ label: l.name, value: l.name }));

  const totalTripsAllVehicles = useMemo(() => trips.reduce((sum, t) => sum + (Number(t.trips) || 1), 0), [trips]);

  const vehicleGroups = useMemo(() => {
    const groups = {};
    trips.forEach(t => {
      const vId = t.vehicleId || 'unknown';
      const dateKey = t.date || 'unknown_date';
      const groupKey = `${vId}_${dateKey}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: groupKey,
          allTrips: [],
          vehicle: t.vehicle,
          driver: t.driver, // latest driver
          date: t.date,
          locations: {},
          totalTrips: 0,
          totalRevenue: 0,
          totalProfit: 0,
        };
      }
      
      const rev = getTripRevenue(t);
      const prof = getTripProfit(t);
      
      groups[groupKey].allTrips.push(t);
      const locKey = `${t.source || 'Mine'} → ${t.destination || 'Site'}`;
      if (!groups[groupKey].locations[locKey]) {
        groups[groupKey].locations[locKey] = 0;
      }
      const numTrips = (Number(t.trips) || 1);
      groups[groupKey].locations[locKey] += numTrips;
      groups[groupKey].totalTrips += numTrips;
      groups[groupKey].totalRevenue += rev;
      groups[groupKey].totalProfit += prof;
    });
    return Object.values(groups).sort((a, b) => {
      if (a.date !== b.date) {
         return new Date(b.date || 0) - new Date(a.date || 0);
      }
      return b.totalTrips - a.totalTrips;
    });
  }, [trips]);

  const renderGroup = ({ item: g }) => (
    <Card style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
           <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface[800], alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="bus-outline" size={24} color={colors.white} />
           </View>
           <View>
              <Text style={styles.vehicleNo}>{g.vehicle?.number || 'Unknown Vehicle'}</Text>
              <Text style={styles.driverName}>{g.driver?.name || 'Multiple Drivers'}  •  {formatDateShort(g.date)}</Text>
           </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity onPress={() => openEdit(g)} style={styles.iconBtn}>
            <Ionicons name="create-outline" size={16} color={colors.surface[400]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDelete(g)} style={[styles.iconBtn, { backgroundColor: colors.red + '18' }]}>
            <Ionicons name="trash-outline" size={16} color={colors.red} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.surface[800] }}>
         {Object.entries(g.locations).map(([loc, count], idx) => (
            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
               <Text style={{ fontSize: 12, color: colors.surface[400], flex: 1 }}>
                  <Ionicons name="location-outline" size={12} color={colors.surface[500]} />  {loc}
               </Text>
               <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.white }}>{count} Trips</Text>
            </View>
         ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.surface[800] }}>
         <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: colors.surface[500], textTransform: 'uppercase', letterSpacing: 1 }}>Metrics</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 12 }}>
               <Text style={{ fontSize: 12, fontWeight: '800', color: colors.surface[200] }}>
                  Rev: <Text style={{ color: colors.brand[400] }}>{formatCurrency(g.totalRevenue)}</Text>
               </Text>
               <Text style={{ fontSize: 12, fontWeight: '800', color: colors.surface[200] }}>
                  Prof: <Text style={{ color: colors.green }}>{formatCurrency(g.totalProfit)}</Text>
               </Text>
            </View>
         </View>
         <View style={{ alignItems: 'flex-end', paddingLeft: spacing.md, borderLeftWidth: 1, borderLeftColor: colors.surface[800] }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: colors.surface[500], textTransform: 'uppercase', letterSpacing: 1 }}>Total</Text>
            <View style={{ backgroundColor: colors.brand[500] + '20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginTop: 4 }}>
               <Text style={{ fontSize: 14, fontWeight: '900', color: colors.brand[400] }}>{g.totalTrips} Trips</Text>
            </View>
         </View>
      </View>
    </Card>
  );

  if (loading) return <Loader />;

  return (
    <View style={styles.container}>
      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{formatCurrency(tripsSummary?.revenue || 0)}</Text>
          <Text style={styles.summaryLabel}>Revenue</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: colors.green }]}>{formatCurrency(tripsSummary?.profit || 0)}</Text>
          <Text style={styles.summaryLabel}>Profit</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{totalTripsAllVehicles}</Text>
          <Text style={styles.summaryLabel}>Trips</Text>
        </View>
      </View>

      <View style={styles.headerControls}>
        <View style={styles.radioGroup}>
          {[
            { id: 'all', label: 'All Trips' },
            { id: 'today', label: 'Today' },
            { id: 'custom', label: 'Custom Date' }
          ].map(tab => {
            const isActive = filterType === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.radioTab, isActive && styles.radioTabActive]}
                onPress={() => setFilterType(tab.id)}
              >
                <Text style={[styles.radioTabText, isActive && styles.radioTabActiveText]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {filterType === 'custom' && (
          <View style={styles.dateSelector}>
            <TouchableOpacity onPress={() => setCustomDate(dayjs(customDate).subtract(1, 'day').format('YYYY-MM-DD'))} style={styles.dateBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.white} />
            </TouchableOpacity>
            
            <View style={{ flex: 1, marginHorizontal: spacing.md, marginTop: spacing.md }}>
               <DatePicker 
                  date={customDate} 
                  onConfirm={(d) => setCustomDate(dayjs(d).format('YYYY-MM-DD'))} 
               />
            </View>

            <TouchableOpacity onPress={() => setCustomDate(dayjs(customDate).add(1, 'day').format('YYYY-MM-DD'))} style={styles.dateBtn}>
              <Ionicons name="chevron-forward" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={vehicleGroups}
        keyExtractor={g => g.id}
        renderItem={renderGroup}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />}
        ListEmptyComponent={<EmptyState icon="car-outline" message="No trips found" />}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* Add/Edit Trips Modal */}
      <BottomModal visible={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Trip Logs' : 'Add Multiple Trip Logs'}>
        <View>
           <Text style={[styles.sectionTitle, { marginTop: spacing.sm }]}>GLOBAL DETAILS</Text>
           
           <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
             <View style={{ flex: 1 }}>
               <SelectPicker label="Driver *" value={form.driverId} options={driverOpts} onChange={v => setForm(f => ({ ...f, driverId: v }))} placeholder="Select driver" />
             </View>
             <View style={{ flex: 1 }}>
               <SelectPicker label="Vehicle *" value={form.vehicleId} options={vehicleOpts} onChange={v => setForm(f => ({ ...f, vehicleId: v }))} placeholder="Select vehicle" />
             </View>
           </View>
           
           <View style={{ marginBottom: spacing.md }}>
             <DatePicker label="Date *" date={form.date} onConfirm={(d) => setForm(f => ({ ...f, date: dayjs(d).format('YYYY-MM-DD') }))} />
           </View>

           <View style={{ marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.surface[800], paddingTop: spacing.md }}>
             <Text style={styles.sectionTitle}>ROUTE ENTRIES</Text>
             
             {form.routes.map((r, index) => {
               const rMargin = (Number(r.sellPrice) - Number(r.buyPrice)) * Number(r.trips);
               return (
                 <View key={r.id} style={styles.routeBlock}>
                    <View style={styles.routeHeader}>
                       <Text style={styles.routeTitle}>ROUTE #{index + 1}</Text>
                       {form.routes.length > 1 && (
                         <TouchableOpacity onPress={() => removeRouteRow(r.id)} style={{ padding: 4 }}>
                            <Ionicons name="trash-outline" size={16} color={colors.red} />
                         </TouchableOpacity>
                       )}
                    </View>
                    
                    <SelectPicker label="Soil Type *" value={r.soilTypeId} options={soilOpts} onChange={v => handleSoilChange(v, r.id)} placeholder="Select material..." />
                    
                    <View style={{ flexDirection: 'row', gap: spacing.md }}>
                      <View style={{ flex: 1 }}>
                        <SelectPicker label="Source *" value={r.source} options={sourceOpts} onChange={v => updateRoute(r.id, 'source', v)} placeholder="Source" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <SelectPicker label="Destination *" value={r.destination} options={destOpts} onChange={v => updateRoute(r.id, 'destination', v)} placeholder="Destination" />
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: spacing.md }}>
                      <View style={{ flex: 1 }}>
                        <Input label="Trips *" keyboardType="numeric" value={r.trips} onChangeText={v => updateRoute(r.id, 'trips', v)} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Input label="Buy Price *" icon="arrow-down-circle-outline" keyboardType="numeric" value={r.buyPrice} onChangeText={v => updateRoute(r.id, 'buyPrice', v)} placeholder="₹0" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Input label="Sell Price *" icon="arrow-up-circle-outline" keyboardType="numeric" value={r.sellPrice} onChangeText={v => updateRoute(r.id, 'sellPrice', v)} placeholder="₹0" />
                      </View>
                    </View>

                    {Number(r.trips) > 0 && Number(r.buyPrice) > 0 && (
                      <View style={[styles.marginPreview, { borderColor: rMargin >= 0 ? colors.green + '40' : colors.red + '40', backgroundColor: rMargin >= 0 ? colors.green + '10' : colors.red + '10' }]}>
                        <Text style={styles.marginLabel}>Margin</Text>
                        <Text style={[styles.marginValue, { color: rMargin >= 0 ? colors.green : colors.red }]}>{formatCurrency(rMargin || 0)}</Text>
                      </View>
                    )}
                 </View>
               );
             })}
           </View>

           <TouchableOpacity style={styles.addRouteBtn} onPress={addRouteRow}>
              <Ionicons name="add-circle-outline" size={20} color={colors.brand[400]} />
              <Text style={styles.addRouteText}>ADD ANOTHER ROUTE</Text>
           </TouchableOpacity>

           <Button title={editing ? 'Update Trip Data' : 'Save All Trips to Log'} onPress={save} loading={saving} icon="checkmark-circle-outline" style={{ marginTop: spacing.md }} />
        </View>
      </BottomModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface[950] },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface[900],
    borderBottomWidth: 1, borderBottomColor: colors.surface[800],
    paddingVertical: spacing.md,
  },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: colors.surface[800] },
  summaryVal:     { fontSize: 16, fontWeight: '700', color: colors.white },
  summaryLabel:   { fontSize: 11, color: colors.surface[500], marginTop: 2 },

  headerControls: { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.surface[800], backgroundColor: colors.surface[900] },
  radioGroup: { flexDirection: 'row', backgroundColor: colors.surface[850], borderRadius: radius.lg, padding: 4 },
  radioTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.md },
  radioTabActive: { backgroundColor: colors.surface[700], ...shadows.sm },
  radioTabText: { fontSize: 13, fontWeight: '700', color: colors.surface[400] },
  radioTabActiveText: { color: colors.white },
  
  dateSelector: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  dateBtn: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.surface[800], alignItems: 'center', justifyContent: 'center' },

  list: { padding: spacing.lg, paddingBottom: 100 },
  tripCard: {},
  tripHeader:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  vehicleNo:    { fontSize: 15, fontWeight: '700', color: colors.white },
  driverName:   { fontSize: 12, color: colors.surface[400], marginTop: 2 },
  profit:       { fontSize: 16, fontWeight: '700', color: colors.green },
  date:         { fontSize: 11, color: colors.surface[500], marginTop: 2 },
  route:        { fontSize: 12, color: colors.brand[400], marginBottom: 2 },
  tripMeta:     { marginBottom: spacing.sm },
  metaText:     { fontSize: 12, color: colors.surface[400] },
  tripActions:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.surface[800] },
  revenue:      {},
  revenueLabel: { fontSize: 11, color: colors.surface[500] },
  revenueValue: { fontSize: 13, fontWeight: '600', color: colors.brand[400] },
  actBtns:      { flexDirection: 'row', gap: spacing.sm },
  iconBtn:      { width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.surface[800], alignItems: 'center', justifyContent: 'center' },

  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, paddingVertical: spacing.lg },
  pageBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface[800], alignItems: 'center', justifyContent: 'center' },
  pageText:      { fontSize: 12, color: colors.surface[400], fontWeight: '600' },

  marginPreview: { padding: spacing.md, borderRadius: radius.xl, borderWidth: 1, marginBottom: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  marginLabel:   { fontSize: 11, fontWeight: '700', color: colors.surface[400], textTransform: 'uppercase', letterSpacing: 0.5 },
  marginValue:      { fontSize: 18, fontWeight: '900' },
  routeText:        { fontSize: 11, fontWeight: '700', color: colors.white, textTransform: 'uppercase' },
  routeArrow:       { fontSize: 11, fontWeight: '900', color: colors.surface[600] },
  emptyCard:        { padding: 56, alignItems: 'center', borderRadius: radius.xl, borderWidth: 2, borderColor: colors.surface[800], borderStyle: 'dashed', marginTop: 20 },
  emptyText:        { fontSize: 11, fontWeight: '900', color: colors.surface[500], textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', lineHeight: 20, marginTop: 12 },
  sectionTitle:     { fontSize: 10, fontWeight: '900', color: colors.surface[500], letterSpacing: 2, marginBottom: spacing.md },
  routeBlock:       { backgroundColor: colors.surface[900], padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surface[800], marginBottom: spacing.md },
  routeHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  routeTitle:       { fontSize: 11, fontWeight: '800', color: colors.surface[400] },
  addRouteBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.brand[500] + '50', backgroundColor: colors.brand[500] + '10', marginBottom: spacing.sm },
  addRouteText:     { fontSize: 12, fontWeight: '800', color: colors.brand[400], letterSpacing: 1 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.brand[500],
    alignItems: 'center', justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.brand[500], shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
});
