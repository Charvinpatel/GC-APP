# TransportPro React Native App
## Complete Setup Guide

---

## 📁 Project Structure

```
TransportProApp/
├── App.js                          ← Root entry point
├── app.json                        ← Expo config
├── babel.config.js                 ← Babel config
├── package.json                    ← Dependencies
└── src/
    ├── navigation/
    │   └── AppNavigator.js         ← Drawer + Tab navigation
    ├── screens/
    │   ├── LoginScreen.js          ← Auth screen
    │   ├── DashboardScreen.js      ← Analytics + charts
    │   ├── TripsScreen.js          ← Trip management (CRUD)
    │   ├── DriversScreen.js        ← Driver management
    │   ├── VehiclesScreen.js       ← Vehicle management
    │   ├── DieselScreen.js         ← Diesel entries
    │   ├── FinanceScreen.js        ← Finance summary
    │   ├── ReportsScreen.js        ← Reports (daily/driver/vehicle/soil)
    │   ├── VerifyTripsScreen.js    ← Driver trip verification
    │   ├── BillsScreen.js          ← Bill generation
    │   ├── SoilScreen.js           ← Soil/material types
    │   ├── UpadScreen.js           ← Advance management
    │   ├── LocationsScreen.js      ← Source/destination mgmt
    │   └── ProfileScreen.js        ← User profile & settings
    ├── components/
    │   └── index.js                ← Shared UI components
    ├── store/
    │   └── useStore.js             ← Zustand global state
    └── utils/
        ├── api.js                  ← Backend API (same as web)
        ├── theme.js                ← Colors, spacing, radius
        └── helpers.js              ← Formatters, mappers
```

---

## 🚀 Step-by-Step Setup

### Step 1 — Install Node.js & Expo CLI

```bash
# Make sure Node.js 18+ is installed
node --version

# Install Expo CLI globally
npm install -g expo-cli eas-cli
```

### Step 2 — Create a new Expo project

```bash
npx create-expo-app TransportProApp --template blank
cd TransportProApp
```

### Step 3 — Replace all files

Copy ALL the files from this zip into your `TransportProApp/` folder, replacing the defaults:
- Replace `App.js`
- Replace `app.json`
- Replace `babel.config.js`
- Replace `package.json`
- Copy entire `src/` folder

### Step 4 — Install all dependencies

```bash
npm install
```

Or if you prefer yarn:
```bash
yarn install
```

This installs:
- `@react-navigation/native` + `@react-navigation/native-stack` + `@react-navigation/bottom-tabs` + `@react-navigation/drawer`
- `react-native-screens` + `react-native-safe-area-context` + `react-native-gesture-handler` + `react-native-reanimated`
- `zustand` — state management
- `dayjs` — date handling
- `@react-native-async-storage/async-storage` — token storage
- `@expo/vector-icons` — Ionicons
- `expo-linear-gradient`
- `react-native-toast-message`

### Step 5 — Start the development server

```bash
npx expo start
```

You'll see a QR code in the terminal.

### Step 6 — Run on your device

**Option A — Expo Go (easiest, no setup needed)**
1. Install "Expo Go" from Play Store / App Store
2. Scan the QR code shown in terminal
3. App loads instantly on your phone

**Option B — Android Emulator**
```bash
npx expo start --android
```
(Requires Android Studio + emulator setup)

**Option C — iOS Simulator (Mac only)**
```bash
npx expo start --ios
```
(Requires Xcode)

---

## 🔧 Configuration

### Backend URL
The app connects to your live backend by default:
```
https://ganesh-carting.onrender.com/api
```

To use a local backend during development, edit `src/utils/api.js`:
```js
const BASE_URL = 'http://YOUR_LOCAL_IP:5000/api';
// e.g. 'http://192.168.1.100:5000/api'
```
⚠️ Use your computer's **local IP address** (not localhost) when testing on a physical device.

---

## 📱 App Features

| Screen | Features |
|--------|----------|
| Login | JWT auth, token persisted in AsyncStorage |
| Dashboard | Today's stats, 7-day bar chart, recent trips |
| Trips | Full CRUD, driver/vehicle/soil filters, summary bar |
| Drivers | CRUD, status badges, license tracking |
| Vehicles | CRUD, type/status, plate number |
| Diesel | Fuel entry tracking, cost summaries |
| Finance | 7D/30D/90D/1Y summary, per-driver/vehicle breakdown |
| Reports | Daily/Driver/Vehicle/Soil tabs, date presets |
| Driver Trips | Add trips as driver, verify/reject as admin |
| Bills | Generate bills, mark paid, destination summary |
| Soil Types | Material CRUD with default prices |
| Upad | DR/CR advance tracking per driver |
| Locations | Source/destination/both type management |
| Profile | User info, change password, logout |

---

## 🏗️ Building for Production

### Android APK (for distribution)
```bash
# Build APK locally
npx expo run:android --variant release

# Or build via EAS (recommended)
eas build -p android --profile preview
```

### Play Store AAB
```bash
eas build -p android --profile production
```

### iOS (requires Apple Developer account)
```bash
eas build -p ios --profile production
```

---

## ⚡ Navigation Structure

```
App
├── Login (if not authenticated)
└── AppDrawer (if authenticated)
    ├── Home (Bottom Tabs)
    │   ├── Analytics (Dashboard)
    │   ├── Trips
    │   ├── Diesel
    │   ├── Finance
    │   └── Profile
    └── Drawer Screens
        ├── All Trips
        ├── Driver Trips (Verify)
        ├── All Diesel
        ├── Upad / Advance
        ├── Drivers
        ├── Vehicles
        ├── Soil Types
        ├── Locations
        ├── Bills
        ├── All Finance
        └── Reports
```

---

## 🐛 Common Issues

**"Network request failed" on device**
→ Use your local IP instead of `localhost` in `api.js`

**Metro bundler cache issues**
```bash
npx expo start --clear
```

**Dependency conflicts**
```bash
npx expo install --fix
```

**AsyncStorage warnings**
→ Already handled — `@react-native-async-storage/async-storage` is installed

---

## 📞 Backend

The app uses the **exact same Express + MongoDB backend** as your web app at:
`https://ganesh-carting.onrender.com`

No backend changes needed. All API endpoints are identical.
