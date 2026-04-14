import dayjs from 'dayjs';
export const formatCurrency = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN')}`;
};
export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return dayjs(dateStr).format('DD MMM YYYY');
};
export const formatDateShort = (dateStr) => {
  if (!dateStr) return '-';
  return dayjs(dateStr).format('DD MMM');
};
export const getTodayISO = () => dayjs().format('YYYY-MM-DD');
export const getTripRevenue = (trip) => (trip.sellPrice || 0) * (trip.trips || 1);
export const getTripCost    = (trip) => (trip.buyPrice  || 0) * (trip.trips || 1);
export const getTripProfit  = (trip) => getTripRevenue(trip) - getTripCost(trip);
export const getLast7Days = () => {
  return Array.from({ length: 7 }, (_, i) =>
    dayjs().subtract(6 - i, 'day').format('YYYY-MM-DD')
  );
};
export const mapId         = (item) => ({ ...item, id: item._id || item.id });
export const mapTrip = (t) => ({
  ...t,
  id: t._id,
  driverId:   typeof t.driver   === 'object' && t.driver   ? t.driver._id   : t.driver,
  vehicleId:  typeof t.vehicle  === 'object' && t.vehicle  ? t.vehicle._id  : t.vehicle,
  soilTypeId: typeof t.soilType === 'object' && t.soilType ? t.soilType._id : t.soilType,
  vendorId:   typeof t.vendor   === 'object' && t.vendor   ? t.vendor._id   : t.vendor,
});
export const mapDiesel = (d) => ({
  ...d,
  id: d._id,
  driverId:  typeof d.driver  === 'object' && d.driver  ? d.driver._id  : d.driver,
  vehicleId: typeof d.vehicle === 'object' && d.vehicle ? d.vehicle._id : d.vehicle,
});
export const mapVehicle = (v) => ({
  ...v,
  id: v._id,
  assignedDriver: typeof v.assignedDriver === 'object' && v.assignedDriver ? v.assignedDriver._id : v.assignedDriver
});
export const mapDriverTrip = (t) => ({
  ...t,
  id: t._id,
  driverId:   t.driver   && typeof t.driver   === 'object' ? t.driver._id   : t.driver,
  vehicleId:  t.vehicle  && typeof t.vehicle  === 'object' ? t.vehicle._id  : t.vehicle,
  soilTypeId: t.soilType && typeof t.soilType === 'object' ? t.soilType._id : t.soilType,
});
export const mapUpad = (u) => ({
  ...u,
  id: u._id || u.id,
  driverId: typeof u.driver === 'object' && u.driver ? u.driver._id : u.driver,
});
export const getStatusColor = (status) => {
  switch (status) {
    case 'active':   return '#22c55e';
    case 'inactive': return '#ef4444';
    case 'on-leave': return '#eab308';
    case 'paid':     return '#22c55e';
    case 'pending':  return '#eab308';
    case 'overdue':  return '#ef4444';
    default:         return '#64748b';
  }
};

export const mapLocation = (l) => {
  const item = mapId(l);
  const parts = (item.name || '').split('|PRICE:');
  return {
    ...item,
    displayName: parts[0].trim(),
    price: parts[1] ? Number(parts[1]) : 0
  };
};
