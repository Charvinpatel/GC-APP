const fs = require('fs');

// ── 1. Fix TripsScreen.js ──────────────────────────────────────────────────
let trips = fs.readFileSync('src/screens/TripsScreen.js', 'utf8');

// Fix corrupted arrow → in locKey line
trips = trips.replace(
  /locKey = `\$\{t\.source \|\| 'Mine'\} .{1,6} \$\{t\.destination \|\| 'Site'\}`/,
  "locKey = `${t.source || 'Mine'} -> ${(t.destination || 'Site').split('|PRICE:')[0].trim()}`"
);

// Also strip |PRICE: from destination when it's already stored in the trip
// Fix the corrupted bullet • in driverName line
trips = trips.replace(
  /\{g\.driver\?\.name \|\| 'Multiple Drivers'\}  .{1,6}  \{formatDateShort/,
  "{g.driver?.name || 'Multiple Drivers'}  {formatDateShort"
);

fs.writeFileSync('src/screens/TripsScreen.js', trips, 'utf8');
console.log('TripsScreen.js patched');

// ── 2. Fix updateDriverTrip in useStore.js ─────────────────────────────────
let store = fs.readFileSync('src/store/useStore.js', 'utf8');
store = store.replace(
  `  updateDriverTrip: async (id, data) => {
    const res = await api.driverTrips.update(id, data);`,
  `  updateDriverTrip: async (id, data) => {
    const payload = {
      ...data,
      driver:    data.driverId   || data.driver,
      vehicle:   data.vehicleId  || data.vehicle,
      soilType:  data.soilTypeId || data.soilType,
    };
    const res = await api.driverTrips.update(id, payload);`
);
fs.writeFileSync('src/store/useStore.js', store, 'utf8');
console.log('useStore.js patched');

// ── 3. Fix MyTripsScreen.js – strip |PRICE: from destination display  ──────
let myTrips = fs.readFileSync('src/screens/MyTripsScreen.js', 'utf8');
// Handle any encoded arrow chars in route display
myTrips = myTrips.replace(/\.destination \|\| 'Site'\}/g, ".destination?.split('|PRICE:')[0].trim() || 'Site'}");
myTrips = myTrips.replace(/t\.destination \|\| ''/g, "(t.destination || '').split('|PRICE:')[0].trim()");
fs.writeFileSync('src/screens/MyTripsScreen.js', myTrips, 'utf8');
console.log('MyTripsScreen.js patched');

// ── 4. Fix VerifyTripsScreen.js – strip |PRICE: in route summary  ──────────
let verify = fs.readFileSync('src/screens/VerifyTripsScreen.js', 'utf8');
verify = verify.replace(
  /`\$\{t\.source \|\| 'Mine'\} .{1,6} \$\{t\.destination \|\| 'Site'\}`/g,
  "`${t.source || 'Mine'} -> ${(t.destination || 'Site').split('|PRICE:')[0].trim()}`"
);
fs.writeFileSync('src/screens/VerifyTripsScreen.js', verify, 'utf8');
console.log('VerifyTripsScreen.js patched');

console.log('\nAll done!');
