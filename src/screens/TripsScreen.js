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
    driverTrips,
    drivers, vehicles, soilTypes, locations,
    fetchDriverTrips, addDriverTrip, updateDriverTrip, deleteDriverTrip,
    fetchDrivers, fetchVehicles, fetchLocations, fetchSoilTypes
  } = useStore();
  const tripsSummary = useMemo(() => {
    return driverTrips.filter(t => t.status === 'verified').reduce((acc, t) => {
        const dBase = (t.destination || '').split('|PRICE:')[0].trim();
        const destLoc = locations.find(l => (l.name || '').split('|PRICE:')[0].trim() === dBase);
        let locSellPrice = 0;
        if (destLoc && destLoc.name && destLoc.name.includes('|PRICE:')) {
           locSellPrice = Number(destLoc.name.split('|PRICE:')[1].trim());
        } else if (destLoc?.price) {
           locSellPrice = Number(destLoc.price);
        }
        const buyP  = Number(t.soilType?.buyPrice) || Number(t.buyPrice) || 0;
        const sellP = locSellPrice || Number(t.sellPrice) || Number(t.soilType?.sellPrice) || 0;
        const numTrips = Number(t.trips) || 1;
        acc.revenue += sellP * numTrips;
        acc.profit += (sellP - buyP) * numTrips;
        acc.trips += numTrips;
        return acc;
    }, { revenue: 0, profit: 0, trips: 0 });
  }, [driverTrips, locations]);
  const [refreshing, setRefreshing]   = useState(false);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [editing, setEditing]         = useState(null);
  const [form, setForm]               = useState(EMPTY_MULTI_TRIP);
  const [saving, setSaving]           = useState(false);
  const [errors, setErrors]           = useState({});
  
  const [filterType, setFilterType]   = useState('today'); // 'all', 'today', 'custom'
  const [customDate, setCustomDate]   = useState(dayjs().format('YYYY-MM-DD'));
  const activeDate = useMemo(() => {
    if (filterType === 'today') return dayjs().format('YYYY-MM-DD');
    if (filterType === 'all') return '';
    return customDate;
  }, [filterType, customDate]);

  const [driverFilter, setDriverFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      await fetchDriverTrips({ date: activeDate, limit: 1000 });
      await Promise.all([
        drivers.length   === 0 || force ? fetchDrivers({ limit: 200 })   : Promise.resolve(),
        vehicles.length  === 0 || force ? fetchVehicles({ limit: 200 })  : Promise.resolve(),
        locations.length === 0 || force ? fetchLocations({ limit: 500 }) : Promise.resolve(),
        soilTypes.length === 0 || force ? fetchSoilTypes()               : Promise.resolve(),
      ]);
    } catch {}
    setLoading(false);
  }, [activeDate, fetchDriverTrips, fetchDrivers, fetchVehicles, fetchLocations, fetchSoilTypes, drivers.length, vehicles.length, locations.length, soilTypes.length]);
  const refreshTrigger = useStore(s => s.refreshTrigger);
  useEffect(() => { load(); }, [activeDate]);
  useEffect(() => { if (refreshTrigger > 0) onRefresh(); }, [refreshTrigger]);
  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };
  const openEdit = (group) => {
    setEditing(group);
    
    // Global fields from the first trip
    const firstTrip = group.allTrips[0] || {};
    
    setForm({
      date:       group.date || dayjs().format('YYYY-MM-DD'),
      driverId:   firstTrip.driverId || '',
      vehicleId:  firstTrip.vehicleId || '',
      routes:     group.summaries.map((s, idx) => ({
        id:          `sum_${idx}`, 
        originalIds: s.ids, 
        soilTypeId:  s.soilTypeId || '',
        source:      s.source || '',
        destination: s.destination || '',
        trips:       String(s.tripsCount || 1),
        buyPrice:    String(s.buyPrice || ''),
        sellPrice:   String(s.sellPrice || ''),
        notes:       s.notes || '',
      }))
    });
    setErrors({});
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
      } : r)
    }));
  };
  const updateRoute = (routeId, field, value) => {
    if (field === 'destination') {
      const cleanValue = (value || '').split('|PRICE:')[0].trim();
      const destLoc = locations.find(l => (l.name || '').split('|PRICE:')[0].trim() === cleanValue);
      setForm(f => ({
        ...f,
        routes: f.routes.map(r => {
          if (r.id === routeId) {
            let extractedPrice = r.sellPrice;
            if (destLoc && destLoc.name && destLoc.name.includes('|PRICE:')) {
              extractedPrice = destLoc.name.split('|PRICE:')[1].trim();
            } else if (destLoc?.price) {
              extractedPrice = String(destLoc.price);
            }
            return {
              ...r,
              destination: cleanValue,
              sellPrice: extractedPrice || String(r.sellPrice || 0),
            };
          }
          return r;
        })
      }));
      return;
    }
    if (field === 'source') {
      const cleanValue = (value || '').split('|PRICE:')[0].trim();
      setForm(f => ({
        ...f,
        routes: f.routes.map(r => r.id === routeId ? { ...r, source: cleanValue } : r)
      }));
      return;
    }
    setForm(f => ({
      ...f,
      routes: f.routes.map(r => r.id === routeId ? { ...r, [field]: value } : r)
    }));
  };
  const addRoute = () => {
    const newId = String(Date.now());
    setForm(f => ({
      ...f,
      routes: [...f.routes, { id: newId, soilTypeId: '', source: '', destination: '', trips: '1', buyPrice: '', sellPrice: '', notes: '' }]
    }));
  };
  const removeRoute = (routeId) => {
    setForm(f => ({
      ...f,
      routes: f.routes.filter(r => r.id !== routeId)
    }));
  };
  const save = async () => {
    const newErrors = {};
    if (!form.driverId) newErrors.driverId = 'Required';
    if (!form.vehicleId) newErrors.vehicleId = 'Required';
    if (!form.date) newErrors.date = 'Required';
    
    form.routes.forEach((r, idx) => {
        if (!r.soilTypeId) newErrors[`route_${r.id}_soil`] = 'Required';
        if (!r.source)     newErrors[`route_${r.id}_source`] = 'Required';
        if (!r.destination) newErrors[`route_${r.id}_destination`] = 'Required';
        if (!r.buyPrice)    newErrors[`route_${r.id}_buy`] = 'Required';
        if (!r.sellPrice)   newErrors[`route_${r.id}_sell`] = 'Required';
    });

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        Alert.alert('Validation Error', 'Please check highlighted fields');
        return;
    }
    setErrors({});
    setSaving(true);
    try {
      // 1. Delete all original trips in this vehicle+date group to ensure clean state
      if (editing?.allTrips) {
        const deletePromises = editing.allTrips.map(t => deleteDriverTrip(t.id));
        await Promise.all(deletePromises);
      }

      // 2. Create new records for each summarized route in the form
      const savePromises = form.routes.map(r => {
        const payload = {
          date: form.date, 
          driverId: form.driverId, 
          vehicleId: form.vehicleId,
          source: r.source, 
          destination: r.destination, 
          soilTypeId: r.soilTypeId,
          trips: Number(r.trips) || 1, 
          buyPrice: Number(r.buyPrice), 
          sellPrice: Number(r.sellPrice),
          notes: r.notes || '',
          status: 'verified'
        };
        return addDriverTrip(payload);
      });
      
      await Promise.all(savePromises);
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
         const promises = group.allTrips.map(t => deleteDriverTrip(t.id));
         await Promise.all(promises);
         load();
      } },
    ]);
  };
  const driverOpts  = drivers.map(d   => ({ label: d.name,   value: d.id }));
  const vehicleOpts = vehicles.map(v  => ({ label: v.number, value: v.id }));
  const soilOpts    = soilTypes.map(s => ({ label: s.name,   value: s.id }));
  const sourceOpts  = locations.map(l => {
    const cleanName = (l.name || '').split('|PRICE:')[0].trim();
    return { 
      label: cleanName, 
      value: cleanName 
    };
  });
  const destOpts    = locations.map(l => {
    const cleanName = (l.name || '').split('|PRICE:')[0].trim();
    return { 
      label: cleanName, 
      value: cleanName 
    };
  });
  const totalTripsAllVehicles = tripsSummary.trips;
  
  const vehicleGroups = useMemo(() => {
    const groups = {};
    driverTrips
      .filter(t => t.status === 'verified')
      .filter(t => !driverFilter  || String(t.driverId) === String(driverFilter))
      .filter(t => !vehicleFilter || String(t.vehicleId) === String(vehicleFilter))
      .forEach(t => {
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
          routeSummaries: {}, // Key: source-dest-material
          totalTrips: 0,
          totalRevenue: 0,
          totalProfit: 0,
        };
      }
      
      const numTrips = (Number(t.trips) || 1);
      groups[groupKey].allTrips.push(t);
      
      const matName = t.soilType?.name || 'Material';
      const sourceBase = (t.source || '').split('|PRICE:')[0].trim();
      const destBase = (t.destination || '').split('|PRICE:')[0].trim();
      const summaryKey = `${sourceBase}-${destBase}-${matName}`;

      const destLoc = locations.find(l => (l.name || '').split('|PRICE:')[0].trim() === destBase);
      const buyP  = Number(t.soilType?.buyPrice) || Number(t.buyPrice) || 0;
      let locSellPrice = 0;
      if (destLoc && destLoc.name && destLoc.name.includes('|PRICE:')) {
         locSellPrice = Number(destLoc.name.split('|PRICE:')[1].trim());
      } else if (destLoc?.price) {
         locSellPrice = Number(destLoc.price);
      }
      const sellP = locSellPrice || Number(t.sellPrice) || Number(t.soilType?.sellPrice) || 0;

      if (!groups[groupKey].routeSummaries[summaryKey]) {
        groups[groupKey].routeSummaries[summaryKey] = {
           source: sourceBase,
           destination: destBase,
           material: matName,
           soilTypeId: t.soilTypeId,
           buyPrice: buyP,
           sellPrice: sellP,
           notes: t.notes,
           tripsCount: 0,
           ids: []
        };
      }
      
      groups[groupKey].routeSummaries[summaryKey].tripsCount += numTrips;
      groups[groupKey].routeSummaries[summaryKey].ids.push(t.id);
      groups[groupKey].totalTrips += numTrips;
      
      groups[groupKey].totalRevenue += sellP * numTrips;
      groups[groupKey].totalProfit += (sellP - buyP) * numTrips;
    });
    return Object.values(groups).map(g => ({
       ...g,
       summaries: Object.values(g.routeSummaries)
    })).sort((a, b) => {
      if (a.date !== b.date) {
         return new Date(b.date || 0) - new Date(a.date || 0);
      }
      return b.totalTrips - a.totalTrips;
    });
  }, [driverTrips, locations, driverFilter, vehicleFilter]);
  const renderGroup = ({ item: g }) => (
    <Card style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
           <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface[800], alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="bus-outline" size={24} color={colors.white} />
           </View>
           <View>
              <Text style={styles.vehicleNo}>{g.vehicle?.number || 'Unknown Vehicle'}</Text>
              <Text style={styles.driverName}>{g.driver?.name || 'Multiple Drivers'}  {formatDateShort(g.date)}</Text>
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
         {g.summaries.map((s, idx) => (
            <View key={idx} style={{ marginBottom: 12, paddingBottom: 8, borderBottomWidth: idx < g.summaries.length - 1 ? 1 : 0, borderBottomColor: colors.surface[800] + '40' }}>
               <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.white, flex: 1 }}>
                     <Ionicons name="location-outline" size={13} color={colors.brand[400]} />  {s.source} → {s.destination}
                  </Text>
                  <View style={{ alignItems: 'flex-end' }}>
                     <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.white }}>{s.tripsCount} Trips</Text>
                     <Text style={{ fontSize: 9, fontWeight: '800', color: colors.surface[500], textTransform: 'uppercase', marginTop: 1 }}>{s.material}</Text>
                  </View>
               </View>
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

        <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.md }}>
          <View style={{ flex: 1 }}>
            <SelectPicker 
              label="Driver Filter" 
              value={driverFilter} 
              options={[{ label: 'ALL DRIVERS', value: '' }, ...driverOpts]} 
              onChange={setDriverFilter} 
              placeholder="All Drivers" 
            />
          </View>
          <View style={{ flex: 1 }}>
            <SelectPicker 
              label="Vehicle Filter" 
              value={vehicleFilter} 
              options={[{ label: 'ALL VEHICLES', value: '' }, ...vehicleOpts]} 
              onChange={setVehicleFilter} 
              placeholder="All Vehicles" 
            />
          </View>
        </View>
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
      {/* Edit Trips Modal */}
      <BottomModal visible={showModal} onClose={() => setShowModal(false)} title="Edit Trip Logs">
        <View>
           <Text style={[styles.sectionTitle, { marginTop: spacing.sm }]}>GLOBAL DETAILS</Text>
           
           <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
             <View style={{ flex: 1 }}>
               <SelectPicker label="Driver *" value={form.driverId} options={driverOpts} onChange={v => setForm(f => ({ ...f, driverId: v }))} placeholder="Select driver" />
               {errors.driverId && <Text style={styles.errorText}>{errors.driverId}</Text>}
             </View>
             <View style={{ flex: 1 }}>
               <SelectPicker label="Vehicle *" value={form.vehicleId} options={vehicleOpts} onChange={v => setForm(f => ({ ...f, vehicleId: v }))} placeholder="Select vehicle" />
               {errors.vehicleId && <Text style={styles.errorText}>{errors.vehicleId}</Text>}
             </View>
           </View>
           
           <View style={{ marginBottom: spacing.md }}>
             <DatePicker label="Date *" date={form.date} onConfirm={(d) => setForm(f => ({ ...f, date: dayjs(d).format('YYYY-MM-DD') }))} />
             {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
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
                         <TouchableOpacity onPress={() => removeRoute(r.id)} style={{ padding: 4 }}>
                           <Text style={{ fontSize: 10, fontWeight: '900', color: colors.red }}>REMOVE</Text>
                         </TouchableOpacity>
                       )}
                    </View>
                    
                    <SelectPicker label="Soil Type *" value={r.soilTypeId} options={soilOpts} onChange={v => handleSoilChange(v, r.id)} placeholder="Select material..." />
                    {errors[`route_${r.id}_soil`] && <Text style={styles.errorText}>{errors[`route_${r.id}_soil`]}</Text>}
                    
                    <View style={{ flexDirection: 'row', gap: spacing.md }}>
                      <View style={{ flex: 1 }}>
                        <SelectPicker label="Source *" value={r.source} options={sourceOpts} onChange={v => updateRoute(r.id, 'source', v)} placeholder="Source" />
                        {errors[`route_${r.id}_source`] && <Text style={styles.errorText}>{errors[`route_${r.id}_source`]}</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <SelectPicker label="Destination *" value={r.destination} options={destOpts} onChange={v => updateRoute(r.id, 'destination', v)} placeholder="Destination" />
                        {errors[`route_${r.id}_destination`] && <Text style={styles.errorText}>{errors[`route_${r.id}_destination`]}</Text>}
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: spacing.md }}>
                      <View style={{ flex: 1 }}>
                        <Input label="Trips *" keyboardType="numeric" value={r.trips} onChangeText={v => updateRoute(r.id, 'trips', v)} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Input label="Buy Price *" icon="arrow-down-circle-outline" keyboardType="numeric" value={r.buyPrice} onChangeText={v => updateRoute(r.id, 'buyPrice', v)} placeholder="₹0" />
                        {errors[`route_${r.id}_buy`] && <Text style={styles.errorText}>{errors[`route_${r.id}_buy`]}</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Input label="Sell Price *" icon="arrow-up-circle-outline" keyboardType="numeric" value={r.sellPrice} onChangeText={v => updateRoute(r.id, 'sellPrice', v)} placeholder="₹0" />
                        {errors[`route_${r.id}_sell`] && <Text style={styles.errorText}>{errors[`route_${r.id}_sell`]}</Text>}
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
            <TouchableOpacity
              onPress={addRoute}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.brand[500] + '60', borderStyle: 'dashed', backgroundColor: colors.brand[500] + '08', marginBottom: spacing.lg }}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.brand[400]} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.brand[400], letterSpacing: 0.5 }}>ADD ANOTHER ROUTE</Text>
            </TouchableOpacity>
           <Button title="Update Trip Data" onPress={save} loading={saving} icon="checkmark-circle-outline" style={{ marginTop: spacing.sm }} />
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
  errorText: {
    fontSize: 9, 
    fontWeight: 'bold', 
    color: colors.red, 
    marginTop: 2, 
    marginLeft: 4
  },
});
