/**
 * localDb.js — Local AsyncStorage CRUD database
 * Used for features not yet available in the backend:
 *  - Maintenance records
 *  - Other Debits
 *  - Excavator Fills
 *  - Excavator vehicle ID tracking (maps 'other' type → 'excavator')
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  maintenance:    'local_maintenance_v1',
  otherDebits:    'local_other_debits_v1',
  excavatorFills: 'local_excavator_fills_v1',
  nightTrips:     'local_night_trips_v1',
  excavatorIds:   'local_excavator_ids_v1',
};

const genId = () =>
  '_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

async function readList(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeList(key, items) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(items));
  } catch {}
}

// ── Generic CRUD factory ──────────────────────────────────────────────────────
function makeStore(key) {
  return {
    getAll: async (filters = {}) => {
      let items = await readList(key);
      // Date filter
      if (filters.date) {
        items = items.filter(i => i.date === filters.date);
      }
      // Sort newest first
      items = [...items].sort((a, b) =>
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
      return { data: items, total: items.length, page: 1, totalPages: 1 };
    },

    create: async (data) => {
      const items = await readList(key);
      const id = genId();
      const item = {
        ...data,
        _id: id,
        id:  id,
        createdAt: new Date().toISOString(),
      };
      items.unshift(item);
      await writeList(key, items);
      return item;
    },

    update: async (id, data) => {
      const items = await readList(key);
      const idx = items.findIndex(i => i._id === id || i.id === id);
      if (idx < 0) throw new Error('Record not found');
      items[idx] = { ...items[idx], ...data, _id: items[idx]._id, id: items[idx].id };
      await writeList(key, items);
      return items[idx];
    },

    remove: async (id) => {
      const items = await readList(key);
      await writeList(key, items.filter(i => i._id !== id && i.id !== id));
    },
  };
}

// ── Excavator vehicle ID set (so we can restore type: 'excavator' after fetch) ─
export const excavatorIds = {
  add: async (id) => {
    const existing = await readList(KEYS.excavatorIds);
    if (!existing.includes(id)) {
      await writeList(KEYS.excavatorIds, [...existing, id]);
    }
  },
  remove: async (id) => {
    const existing = await readList(KEYS.excavatorIds);
    await writeList(KEYS.excavatorIds, existing.filter(i => i !== id));
  },
  getAll: async () => readList(KEYS.excavatorIds),
};

export const maintenance    = makeStore(KEYS.maintenance);
export const otherDebits    = makeStore(KEYS.otherDebits);
export const excavatorFills = makeStore(KEYS.excavatorFills);
export const nightTrips     = makeStore(KEYS.nightTrips);

export default { maintenance, otherDebits, excavatorFills, nightTrips, excavatorIds };
