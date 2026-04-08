import { create } from 'zustand';
import api, { setToken, clearToken, getToken } from '../utils/api';
import { mapId, mapTrip, mapDiesel, mapVehicle, mapDriverTrip } from '../utils/helpers';

export const useStore = create((set, get) => ({
  // ── Auth State ──────────────────────────────────────────────────────────────
  isAuthenticated: false,
  user: null,
  loading: true,
  hasInitialized: false,
  contentLoading: false,
  error: null,

  // ── Data ────────────────────────────────────────────────────────────────────
  drivers:     [],
  vehicles:    [],
  soilTypes:   [],
  trips:       [],
  diesel:      [],
  vendors:     [],
  bills:       [],
  driverTrips: [],
  upad:        [],
  locations:   [],

  // ── Pagination Metadata ─────────────────────────────────────────────────────
  tripsMeta:    { total: 0, page: 1, totalPages: 1 },
  driversMeta:  { total: 0, page: 1, totalPages: 1 },
  vehiclesMeta: { total: 0, page: 1, totalPages: 1 },
  dieselMeta:   { total: 0, page: 1, totalPages: 1 },
  locationsMeta:{ total: 0, page: 1, totalPages: 1 },
  tripsSummary: { revenue: 0, profit: 0, trips: 0 },

  // ── Auth ────────────────────────────────────────────────────────────────────
  checkAuth: async () => {
    const token = await getToken();
    if (!token) {
      set({ isAuthenticated: false, user: null, loading: false });
      return;
    }
    try {
      set({ loading: true });
      const res = await api.auth.me();
      set({ isAuthenticated: true, user: res.user, loading: false });
      get().init();
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        await clearToken();
        set({ isAuthenticated: false, user: null });
      }
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    const res = await api.auth.login(email, password);
    await setToken(res.token);
    set({ isAuthenticated: true, user: res.user, error: null });
    await get().init();
    return res;
  },

  logout: async () => {
    await clearToken();
    set({
      isAuthenticated: false, user: null, hasInitialized: false,
      drivers: [], vehicles: [], soilTypes: [], trips: [], diesel: [],
      driverTrips: [], upad: [], locations: [], vendors: [], bills: [],
    });
  },

  // ── Init ────────────────────────────────────────────────────────────────────
  init: async () => {
    if (get().hasInitialized) return;
    try {
      const { user } = get();
      const isDriver = user?.role === 'driver';
      const upadFilters = isDriver && user.driverProfile ? { driverId: user.driverProfile } : {};

      const [soils, locs, ups] = await Promise.all([
        api.soilTypes.getAll(),
        api.locations.getAll({ limit: 100 }),
        api.upad.getAll(upadFilters),
      ]);

      set({
        soilTypes: soils.map(mapId),
        locations: (locs.data || locs).map(mapId),
        locationsMeta: { total: locs.total || locs.length, page: locs.page || 1, totalPages: locs.totalPages || 1 },
        upad: (ups.data || ups).map(mapId),
        hasInitialized: true,
      });
    } catch {}
  },

  // ── Drivers ─────────────────────────────────────────────────────────────────
  fetchDrivers: async (params) => {
    set({ contentLoading: true });
    try {
      const res = await api.drivers.getAll(params);
      set({ drivers: res.data.map(mapId), driversMeta: { total: res.total, page: res.page, totalPages: res.totalPages }, contentLoading: false });
    } catch (e) { set({ contentLoading: false }); throw e; }
  },
  addDriver: async (driver) => {
    const res = await api.drivers.create(driver);
    set(s => ({ drivers: [mapId(res), ...s.drivers] }));
    return res;
  },
  updateDriver: async (id, data) => {
    const res = await api.drivers.update(id, data);
    set(s => ({ drivers: s.drivers.map(d => d.id === id ? mapId(res) : d) }));
    return res;
  },
  deleteDriver: async (id) => {
    await api.drivers.remove(id);
    set(s => ({ drivers: s.drivers.filter(d => d.id !== id) }));
  },

  // ── Vehicles ────────────────────────────────────────────────────────────────
  fetchVehicles: async (params) => {
    set({ contentLoading: true });
    try {
      const res = await api.vehicles.getAll(params);
      set({ vehicles: res.data.map(mapVehicle), vehiclesMeta: { total: res.total, page: res.page, totalPages: res.totalPages }, contentLoading: false });
    } catch (e) { set({ contentLoading: false }); throw e; }
  },
  addVehicle: async (v) => {
    const res = await api.vehicles.create(v);
    set(s => ({ vehicles: [mapVehicle(res), ...s.vehicles] }));
    return res;
  },
  updateVehicle: async (id, data) => {
    const res = await api.vehicles.update(id, data);
    set(s => ({ vehicles: s.vehicles.map(v => v.id === id ? mapVehicle(res) : v) }));
    return res;
  },
  deleteVehicle: async (id) => {
    await api.vehicles.remove(id);
    set(s => ({ vehicles: s.vehicles.filter(v => v.id !== id) }));
  },

  // ── Soil Types ──────────────────────────────────────────────────────────────
  fetchSoilTypes: async () => {
    const res = await api.soilTypes.getAll();
    set({ soilTypes: res.map(mapId) });
  },
  addSoilType: async (data) => {
    const res = await api.soilTypes.create(data);
    set(s => ({ soilTypes: [mapId(res), ...s.soilTypes] }));
    return res;
  },
  updateSoilType: async (id, data) => {
    const res = await api.soilTypes.update(id, data);
    set(s => ({ soilTypes: s.soilTypes.map(st => st.id === id ? mapId(res) : st) }));
    return res;
  },
  deleteSoilType: async (id) => {
    await api.soilTypes.remove(id);
    set(s => ({ soilTypes: s.soilTypes.filter(st => st.id !== id) }));
  },

  // ── Trips ───────────────────────────────────────────────────────────────────
  fetchTrips: async (filters) => {
    set({ contentLoading: true });
    try {
      const res = await api.trips.getAll(filters);
      set({ trips: res.data.map(mapTrip), tripsMeta: { total: res.total, page: res.page, totalPages: res.totalPages }, tripsSummary: res.summary, contentLoading: false });
    } catch (e) { set({ contentLoading: false }); throw e; }
  },
  addTrip: async (trip) => {
    const payload = { ...trip, driver: trip.driverId, vehicle: trip.vehicleId, soilType: trip.soilTypeId, vendor: trip.vendorId };
    const res = await api.trips.create(payload);
    set(s => ({ trips: [mapTrip(res), ...s.trips] }));
    return res;
  },
  updateTrip: async (id, data) => {
    const payload = { ...data, driver: data.driverId || data.driver, vehicle: data.vehicleId || data.vehicle, soilType: data.soilTypeId || data.soilType, vendor: data.vendorId || data.vendor };
    const res = await api.trips.update(id, payload);
    set(s => ({ trips: s.trips.map(t => t.id === id ? mapTrip(res) : t) }));
    return res;
  },
  deleteTrip: async (id) => {
    await api.trips.remove(id);
    set(s => ({ trips: s.trips.filter(t => t.id !== id) }));
  },

  // ── Diesel ──────────────────────────────────────────────────────────────────
  fetchDiesel: async (filters) => {
    set({ contentLoading: true });
    try {
      const res = await api.diesel.getAll(filters);
      set({ diesel: res.data.map(mapDiesel), dieselMeta: { total: res.total, page: res.page, totalPages: res.totalPages }, contentLoading: false });
    } catch (e) { set({ contentLoading: false }); throw e; }
  },
  addDiesel: async (entry) => {
    const payload = { ...entry, driver: entry.driverId, vehicle: entry.vehicleId };
    const res = await api.diesel.create(payload);
    set(s => ({ diesel: [mapDiesel(res), ...s.diesel] }));
    return res;
  },
  updateDiesel: async (id, data) => {
    const payload = { ...data, driver: data.driverId || data.driver, vehicle: data.vehicleId || data.vehicle };
    const res = await api.diesel.update(id, payload);
    set(s => ({ diesel: s.diesel.map(d => d.id === id ? mapDiesel(res) : d) }));
    return res;
  },
  deleteDiesel: async (id) => {
    await api.diesel.remove(id);
    set(s => ({ diesel: s.diesel.filter(d => d.id !== id) }));
  },

  // ── Driver Trips ─────────────────────────────────────────────────────────────
  fetchDriverTrips: async (filters = {}) => {
    set({ contentLoading: true });
    try {
      const res = await api.driverTrips.getAll(filters);
      set({ driverTrips: [...res.map(mapDriverTrip)], contentLoading: false });
    } catch (e) { set({ contentLoading: false }); throw e; }
  },
  addDriverTrip: async (trip) => {
    const { user } = get();
    const driverId = trip.driverId || user?.driverProfile || user?._id || user?.id;
    const payload = { ...trip, driver: driverId, vehicle: trip.vehicleId, soilType: trip.soilTypeId };
    const res = await api.driverTrips.create(payload);
    set(s => ({ driverTrips: [mapDriverTrip(res), ...s.driverTrips] }));
    return res;
  },
  verifyDriverTrip: async (id, data) => {
    const res = await api.driverTrips.verify(id, data);
    set(s => ({ driverTrips: s.driverTrips.map(dt => dt.id === id ? mapDriverTrip(res) : dt) }));
    await get().fetchTrips({ limit: 1000 });
    return res;
  },
  deleteDriverTrip: async (id) => {
    await api.driverTrips.remove(id);
    set(s => ({ driverTrips: s.driverTrips.filter(dt => dt.id !== id) }));
  },

  // ── Bills ────────────────────────────────────────────────────────────────────
  fetchBills: async () => {
    const res = await api.bills.getAll();
    set({ bills: res.map(mapId) });
  },
  addBill: async (data) => {
    const res = await api.bills.create(data);
    set(s => ({ bills: [mapId(res), ...s.bills] }));
    return res;
  },
  updateBillStatus: async (id, status) => {
    const res = await api.bills.updateStatus(id, status);
    set(s => ({ bills: s.bills.map(b => b.id === id ? mapId(res) : b) }));
    return res;
  },
  deleteBill: async (id) => {
    await api.bills.remove(id);
    set(s => ({ bills: s.bills.filter(b => b.id !== id) }));
  },

  // ── Upad ─────────────────────────────────────────────────────────────────────
  addUpad: async (data) => {
    const res = await api.upad.create(data);
    set(s => ({ upad: [mapId(res), ...s.upad] }));
    return res;
  },
  deleteUpad: async (id) => {
    await api.upad.remove(id);
    set(s => ({ upad: s.upad.filter(u => u.id !== id) }));
  },

  // ── Locations ────────────────────────────────────────────────────────────────
  fetchLocations: async (params) => {
    const res = await api.locations.getAll(params);
    set({ locations: (res.data || res).map(mapId), locationsMeta: { total: res.total || res.length, page: res.page || 1, totalPages: res.totalPages || 1 } });
  },
  addLocation: async (data) => {
    const res = await api.locations.create(data);
    set(s => ({ locations: [mapId(res), ...s.locations] }));
    return res;
  },
  deleteLocation: async (id) => {
    await api.locations.remove(id);
    set(s => ({ locations: s.locations.filter(l => l.id !== id) }));
  },
}));
