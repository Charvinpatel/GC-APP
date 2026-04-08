# 🏗️ TransportPro Technical Architecture Analysis

This document provides a deep-dive analysis of the **TransportPro React Native** codebase, explaining its structure, patterns, and implementation details.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Core** | [React Native](https://reactnative.dev/) | Cross-platform mobile framework |
| **Runtime** | [Expo SDK 51](https://expo.dev/) | Development tools and native APIs |
| **Navigation** | [React Navigation 6](https://reactnavigation.org/) | Stack, Tab, and Drawer navigation |
| **State** | [Zustand](https://github.com/pmndrs/zustand) | Lightweight global state management |
| **Data Fetching** | Native `fetch` + React Query | API communication and caching |
| **UI Library** | [React Native Paper](https://reactnativepaper.com/) | Material Design components |
| **Charting** | [Victory Native](https://formidable.com/open-source/victory/) | Data visualization |
| **Persistence** | [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) | Client-side token storage |

---

## 📁 System Architecture

### 1. Root & Navigation (`src/navigation/`)
The app uses a nested navigation architecture to provide a seamless user experience:
- **Root Stack**: Standard switch between `Login` and `MainApp` based on `isAuthenticated` state.
- **App Drawer**: The primary navigation hub containing all administrative and management screens.
- **Bottom Tabs**: Located within the Drawer, providing quick access to high-frequency screens (Analytics, Trips, Diesel, Finance, Profile).

### 2. State Management (`src/store/useStore.js`)
A single, centralized Zustand store handles:
- **Auth State**: Logic for `login`, `logout`, and token validation.
- **Centralized Data**: Single source of truth for `drivers`, `vehicles`, `trips`, etc.
- **Actions**: Async functions that call the API and update the local state.
- **Pagination**: Metadata tracking for paginated lists.

### 3. API Integration (`src/utils/api.js`)
- **Base URL**: `https://ganesh-carting.onrender.com/api` (Render Hosted).
- **Security**: JWT-based authentication using `Authorization: Bearer <token>` headers.
- **Structure**: Modularized endpoints mirroring the backend controller structure.

### 4. UI Design System (`src/utils/theme.js`)
- **Palette**: Dark-mode centric (Surface 950/900/800).
- **Accents**: Vibrant brand colors for primary actions.
- **Consistency**: Centralized `colors`, `spacing`, and `radius` definitions.

---

## 🛰️ Core Modules Analysis

### 🚜 Trip Tracking System
The most complex part of the app. It handles a dual-phase workflow:
1. **Submission**: Drivers/Admins submit "Driver Trips".
2. **Verification**: Admins review, edit, and approve these submissions, which then move to the "Master Trips" table for billing and reporting.

### 📊 Analytics & Reporting
- **Dashboard**: Uses `VictoryBar` and `VictoryAxis` to visualize 7-day performance.
- **Reports**: Implements a tabbed interface in `ReportsScreen.js` to slice data by Date, Driver, Vehicle, or Material.

### 💰 Financial Management (Upad)
- Tracks advances given to drivers and repayments made.
- Maintains a running balance (Debit/Credit) per driver.

---

## 🚀 Performance Optimizations
- **`.lean()` implementation**: Backend queries optimized for speed (as noted in conversation history).
- **Memoization**: Heavy screens like `VerifyTrips` use optimized rendering patterns.
- **Zustand Selectors**: Components subscribe only to the specific slices of state they need.

---

## 🛡️ Security Implementation
- **Tokens**: Stored securely using `AsyncStorage`.
- **Interceptors**: The `request` wrapper automatically injects tokens and handles 401/403 errors by logging the user out.
- **Role Guards**: UI elements (like the "Verify" button) are conditionally rendered based on the user's role.
