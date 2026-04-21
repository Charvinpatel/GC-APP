/**
 * api.js  —  Ganesh Carting React Native API Service
 * Mirrors the web app's api.js — same backend, same endpoints.
 * Uses AsyncStorage instead of localStorage for token persistence.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://ganesh-carting.onrender.com/api';
// For local dev, change to: 'http://localhost:5000/api'

const TOKEN_KEY = 'tms_token';

// ── Token helpers ─────────────────────────────────────────────────────────────
export const getToken = async () => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = async (t) => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, t);
  } catch {}
};

export const clearToken = async () => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {}
};

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = await getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = res.status;
    throw error;
  }
  return data;
}

const get    = (path)       => request('GET',    path);
const post   = (path, body) => request('POST',   path, body);
const put    = (path, body) => request('PUT',    path, body);
const del    = (path)       => request('DELETE', path);
const patch  = (path, body) => request('PATCH',  path, body);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  login:          (email, password) => post('/auth/login',    { email, password }),
  register:       (data)            => post('/auth/register', data),
  me:             ()                => get('/auth/me'),
  changePassword: (data)            => patch('/auth/change-password', data),
};

// ── Drivers ───────────────────────────────────────────────────────────────────
export const drivers = {
  getAll:  (params = {}) => get('/drivers?' + new URLSearchParams(params)),
  getOne:  (id)          => get(`/drivers/${id}`),
  create:  (data)        => post('/drivers', data),
  update:  (id, data)    => put(`/drivers/${id}`, data),
  remove:  (id)          => del(`/drivers/${id}`),
};

// ── Vehicles ──────────────────────────────────────────────────────────────────
export const vehicles = {
  getAll:  (params = {}) => get('/vehicles?' + new URLSearchParams(params)),
  getOne:  (id)          => get(`/vehicles/${id}`),
  create:  (data)        => post('/vehicles', data),
  update:  (id, data)    => put(`/vehicles/${id}`, data),
  remove:  (id)          => del(`/vehicles/${id}`),
};

// ── Soil Types ────────────────────────────────────────────────────────────────
export const soilTypes = {
  getAll:  ()         => get('/soil-types'),
  create:  (data)     => post('/soil-types', data),
  update:  (id, data) => put(`/soil-types/${id}`, data),
  remove:  (id)       => del(`/soil-types/${id}`),
};

// ── Trips ─────────────────────────────────────────────────────────────────────
export const trips = {
  getAll:  (filters = {}) => {
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined));
    return get('/trips?' + new URLSearchParams(clean));
  },
  getOne:  (id)           => get(`/trips/${id}`),
  create:  (data)         => post('/trips', data),
  update:  (id, data)     => put(`/trips/${id}`, data),
  remove:  (id)           => del(`/trips/${id}`),
};

// ── Diesel ────────────────────────────────────────────────────────────────────
export const diesel = {
  getAll:  (filters = {}) => get('/diesel?' + new URLSearchParams(filters)),
  getOne:  (id)           => get(`/diesel/${id}`),
  create:  (data)         => post('/diesel', data),
  update:  (id, data)     => put(`/diesel/${id}`, data),
  remove:  (id)           => del(`/diesel/${id}`),
};

// ── Maintenance ───────────────────────────────────────────────────────────────
export const maintenance = {
  getAll:  (filters = {}) => get('/maintenance?' + new URLSearchParams(filters)),
  create:  (data)         => post('/maintenance', data),
  update:  (id, data)     => put(`/maintenance/${id}`, data),
  remove:  (id)          => del(`/maintenance/${id}`),
};

// ── Other Debits ──────────────────────────────────────────────────────────────
export const otherDebits = {
  getAll:  (filters = {}) => get('/other-debits?' + new URLSearchParams(filters)),
  create:  (data)         => post('/other-debits', data),
  update:  (id, data)     => put(`/other-debits/${id}`, data),
  remove:  (id)          => del(`/other-debits/${id}`),
};

// ── Excavator Fills ──────────────────────────────────────────────────────────
export const excavatorFills = {
  getAll:  (filters = {}) => get('/excavator-fills?' + new URLSearchParams(filters)),
  create:  (data)         => post('/excavator-fills', data),
  update:  (id, data)     => put(`/excavator-fills/${id}`, data),
  remove:  (id)          => del(`/excavator-fills/${id}`),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboard = {
  get: () => get('/dashboard'),
};

// ── Finance ───────────────────────────────────────────────────────────────────
export const finance = {
  summary: (days = 30) => get(`/finance/summary?days=${days}`),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reports = {
  daily:   (date)     => get(`/reports/daily?date=${date}`),
  driver:  (from, to) => get(`/reports/driver?from=${from}&to=${to}`),
  vehicle: (from, to) => get(`/reports/vehicle?from=${from}&to=${to}`),
  summary: (from, to) => get(`/reports/summary?from=${from}&to=${to}`),
};

// ── Driver Trips ──────────────────────────────────────────────────────────────
export const driverTrips = {
  getAll: (filters = {}) => {
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined));
    return get('/driver-trips?' + new URLSearchParams(clean));
  },
  create: (data) => post('/driver-trips', data),
  verify: (id, data) => put(`/driver-trips/${id}/verify`, data),
  remove: (id) => del(`/driver-trips/${id}`),
};

// ── Upad ─────────────────────────────────────────────────────────────────────
export const upad = {
  getAll: (filters = {}) => get('/upad?' + new URLSearchParams(filters)),
  create: (data) => post('/upad', data),
  remove: (id) => del(`/upad/${id}`),
};

// ── Bills ────────────────────────────────────────────────────────────────────
export const bills = {
  getAll:       ()           => get('/bills'),
  create:       (data)       => post('/bills', data),
  updateStatus: (id, status) => patch(`/bills/${id}/status`, { status }),
  remove:       (id)         => del(`/bills/${id}`),
};

// ── Locations ────────────────────────────────────────────────────────────────
export const locations = {
  getAll: (filters = {}) => get('/locations?' + new URLSearchParams(filters)),
  create: (data) => post('/locations', data),
  update: (id, data) => put(`/location/${id}`, data),
  remove: (id) => del(`/locations/${id}`),
};

// ── Vendors ──────────────────────────────────────────────────────────────────
export const vendors = {
  getAll: () => get('/vendors'),
  create: (data) => post('/vendors', data),
  update: (id, data) => put(`/vendors/${id}`, data),
  remove: (id) => del(`/vendors/${id}`),
};

const api = { auth, drivers, vehicles, soilTypes, trips, diesel, maintenance, otherDebits, excavatorFills, dashboard, finance, reports, driverTrips, upad, locations, bills, vendors };
export default api;
