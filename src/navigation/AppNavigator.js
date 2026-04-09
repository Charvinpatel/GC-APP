import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radius, gradients } from '../utils/theme';
import { useStore } from '../store/useStore';
import { LinearGradient } from 'expo-linear-gradient';

// Screens
import LoginScreen      from '../screens/LoginScreen';
import DashboardScreen  from '../screens/DashboardScreen';
import TripsScreen      from '../screens/TripsScreen';
import DriversScreen    from '../screens/DriversScreen';
import VehiclesScreen   from '../screens/VehiclesScreen';
import DieselScreen     from '../screens/DieselScreen';

import ReportsScreen    from '../screens/ReportsScreen';
import VerifyTripsScreen from '../screens/VerifyTripsScreen';
import SoilScreen       from '../screens/SoilScreen';
import UpadScreen       from '../screens/UpadScreen';
import LocationsScreen  from '../screens/LocationsScreen';
import BillsScreen      from '../screens/BillsScreen';
import ProfileScreen      from '../screens/ProfileScreen';
import MyTripsScreen     from '../screens/MyTripsScreen';
import TripHistoryScreen from '../screens/TripHistoryScreen';

const Stack  = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const Tab    = createBottomTabNavigator();

// ── Shared header options ──────────────────────────────────────────────────────
const screenOptions = (navigation, title) => ({
  title,
  headerStyle: { backgroundColor: colors.surface[950] },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: '700', fontSize: 16 },
  headerShadowVisible: false,
  headerLeft: () => (
    <TouchableOpacity onPress={() => navigation.openDrawer()} style={{ marginLeft: 4, padding: 4 }}>
      <Ionicons name="menu" size={24} color={colors.white} />
    </TouchableOpacity>
  ),
});

// ── Bottom Tabs (main section — most-used screens) ────────────────────────────
function MainTabs({ navigation }) {
  const { user } = useStore();
  const isAdmin  = user?.role === 'admin' || !user?.role;
  const isDriver = user?.role === 'driver';

  const tabBarScreenOptions = {
    tabBarStyle: {
      backgroundColor: colors.surface[900],
      borderTopColor: colors.surface[800],
      borderTopWidth: 1,
      height: 62,
      paddingBottom: 8,
      paddingTop: 4,
    },
    tabBarActiveTintColor:   colors.brand[400],
    tabBarInactiveTintColor: colors.surface[500],
    tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
    headerStyle: { backgroundColor: colors.surface[950] },
    headerTintColor: colors.white,
    headerTitleStyle: { fontWeight: '700', fontSize: 16 },
    headerTitleAlign: 'center',
    headerShadowVisible: false,
    headerLeft: () => (
      <TouchableOpacity onPress={() => navigation.openDrawer()} style={{ marginLeft: 12, padding: 4 }}>
        <Ionicons name="menu" size={24} color={colors.white} />
      </TouchableOpacity>
    ),
    headerRight: () => (
      <TouchableOpacity onPress={() => useStore.getState().triggerRefresh()} style={{ marginRight: 12, padding: 4 }}>
        <Ionicons name="refresh" size={20} color={colors.brand[400]} />
      </TouchableOpacity>
    ),
  };

  if (isDriver) {
    // ── DRIVER: 3 tabs matching web nav
    return (
      <Tab.Navigator screenOptions={tabBarScreenOptions}>
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }}
        />
        <Tab.Screen
          name="MyTrips"
          component={MyTripsScreen}
          options={{ title: "Today Trips", tabBarIcon: ({ color, size }) => <Ionicons name="today-outline" size={size} color={color} /> }}
        />
        <Tab.Screen
          name="TripHistory"
          component={TripHistoryScreen}
          options={{ title: 'History', tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} /> }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} /> }}
        />
      </Tab.Navigator>
    );
  }

  // ── ADMIN tabs
  return (
    <Tab.Navigator screenOptions={tabBarScreenOptions}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Trips"
        component={VerifyTripsScreen}
        options={{ 
          title: 'Today Trips', 
          tabBarIcon: ({ color, size }) => <Ionicons name="today-outline" size={size} color={color} />,
          tabBarBadge: useStore.getState().driverTrips.filter(t => t.status === 'pending').length || undefined,
          tabBarBadgeStyle: { backgroundColor: colors.brand[500], fontSize: 10 }
        }}
      />
      <Tab.Screen
        name="Diesel"
        component={DieselScreen}
        options={{ title: 'Diesel', tabBarIcon: ({ color, size }) => <Ionicons name="flame-outline" size={size} color={color} /> }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

// ── Custom Drawer Content ──────────────────────────────────────────────────────
function CustomDrawerContent(props) {
  const {
    user, logout,
    driverTrips, bills, trips
  } = useStore();
  const isAdmin = user?.role === 'admin' || !user?.role;
  const isDriver = user?.role === 'driver';

  const counts = {
    pendingTrips: driverTrips.filter(t => t.status === 'pending').length,
    unpaidBills:  bills.filter(b => b.status === 'unpaid').length,
    driverToday:  driverTrips.filter(t => t.date === new Date().toISOString().split('T')[0]).length,
  };

  const ALL_NAV_ITEMS = [
    { label: 'Dashboard',     icon: 'grid-outline',            screen: 'Home' },
    { label: 'Today Trips',   icon: 'today-outline',           screen: 'DriverMyTrips', driverOnly: true, count: counts.driverToday },
    { label: 'Trip History',  icon: 'time-outline',            screen: 'DriverHistory', driverOnly: true },
    { label: 'Today Trips',   icon: 'today-outline',           screen: 'VerifyTrips',   adminOnly: true, count: counts.pendingTrips },
    { label: 'Trips',         icon: 'car-outline',             screen: 'AllTrips',      adminOnly: true },
    { label: 'Diesel',        icon: 'flame-outline',           screen: 'AllDiesel',     adminOnly: true },
    { label: 'Upad / Advance',icon: 'wallet-outline',          screen: 'Upad',          adminOnly: true },
    { label: 'Drivers',       icon: 'people-outline',          screen: 'Drivers',       adminOnly: true },
    { label: 'Vehicles',      icon: 'bus-outline',             screen: 'Vehicles',      adminOnly: true },
    { label: 'Soil Types',    icon: 'layers-outline',          screen: 'Soil',          adminOnly: true },
    { label: 'Locations',     icon: 'location-outline',        screen: 'Locations',     adminOnly: true },
    { label: 'Bills',         icon: 'receipt-outline',         screen: 'Bills',         adminOnly: true, count: counts.unpaidBills },
    { label: 'Reports',       icon: 'document-text-outline',   screen: 'Reports',       adminOnly: true },
  ];

  // Drivers see: Dashboard + their own pages only
  // Admins see: Dashboard + all admin pages (no driver-only items)
  const NAV_ITEMS = ALL_NAV_ITEMS.filter(i => {
    if (isDriver) return !i.adminOnly;   // driver sees non-admin items
    return !i.driverOnly;                // admin sees non-driver items
  });

  const { navigation, state } = props;
  const currentRoute = state.routes[state.index]?.name;

  return (
    <View style={drawerStyles.container}>
      {/* Logo Header */}
      <View style={drawerStyles.header}>
        <View style={drawerStyles.logoBox}>
          <Ionicons name="car-sport" size={24} color={colors.brand[400]} />
        </View>
        <View>
          <Text style={drawerStyles.logoName}>GANESH</Text>
          <Text style={drawerStyles.logoSub}>CARTING</Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {NAV_ITEMS.map(item => {
          // Exclusive highlight logic: Identify correct item when in Home tabs
          let isActive = false;
          if (currentRoute === 'Home') {
            const currentRouteObj = state.routes[state.index];
            const nestedState = currentRouteObj ? currentRouteObj.state : null;
            const activeTab = (nestedState && nestedState.routes && nestedState.index !== undefined) 
              ? nestedState.routes[nestedState.index].name 
              : 'Dashboard';
            
            if (item.screen === 'Home' && activeTab === 'Dashboard') isActive = true;
            else if (item.screen === 'VerifyTrips' && activeTab === 'Trips') isActive = true;
            else if (item.screen === 'AllDiesel' && activeTab === 'Diesel') isActive = true;
            else if (item.screen === 'Home' && activeTab !== 'Dashboard') isActive = false;
          } else {
            isActive = currentRoute === item.screen;
          }

          const onPress = () => {
            if (item.label === 'Dashboard') {
              return navigation.navigate('Home', { screen: 'Dashboard' });
            }
            if (isAdmin) {
              if (item.screen === 'VerifyTrips') return navigation.navigate('Home', { screen: 'Trips' });
              if (item.screen === 'AllDiesel') return navigation.navigate('Home', { screen: 'Diesel' });
            }
            navigation.navigate(item.screen);
          };

          return (
            <TouchableOpacity
              key={item.screen}
              style={[drawerStyles.navItem, isActive && drawerStyles.navItemActive]}
              onPress={onPress}
            >
              <Ionicons
                name={item.icon}
                size={18}
                color={isActive ? colors.brand[400] : colors.surface[400]}
              />
              <Text style={[drawerStyles.navLabel, isActive && drawerStyles.navLabelActive]}>
                {item.label}
              </Text>
              {item.count > 0 && (
                <View style={drawerStyles.badge}>
                  <Text style={drawerStyles.badgeText}>{item.count}</Text>
                </View>
              )}
              {isActive && <Ionicons name="chevron-forward" size={14} color={colors.brand[500]} style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* User Info + Logout */}
      <View style={drawerStyles.footer}>
        <View style={drawerStyles.userRow}>
          <View style={drawerStyles.userAvatar}>
            <Text style={drawerStyles.userAvatarText}>{user?.name?.[0]?.toUpperCase() || 'A'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={drawerStyles.userName}>{user?.name || 'Admin'}</Text>
            <Text style={drawerStyles.userEmail} numberOfLines={1}>{user?.email || ''}</Text>
          </View>
        </View>
        <TouchableOpacity style={drawerStyles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={16} color={colors.red} />
          <Text style={drawerStyles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Full Drawer Navigator ──────────────────────────────────────────────────────
function AppDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerStyle: { backgroundColor: colors.surface[950], width: 280 },
        headerShown: false,
        swipeEdgeWidth: 50,
      }}
    >
      {/* Main tab group */}
      <Drawer.Screen name="Home"        component={MainTabs} />

      {/* Full-screen drawer screens (show header) */}
      <Drawer.Screen name="AllTrips"      component={TripsScreenWithHeader} />
      <Drawer.Screen name="AllDiesel"     component={DieselScreenWithHeader} />
      <Drawer.Screen name="VerifyTrips"   component={VerifyTripsScreenWithHeader} />
      <Drawer.Screen name="DriverMyTrips" component={MyTripsScreenWithHeader} />
      <Drawer.Screen name="DriverHistory" component={TripHistoryScreenWithHeader} />
      <Drawer.Screen name="Drivers"       component={DriversScreenWithHeader} />
      <Drawer.Screen name="Vehicles"      component={VehiclesScreenWithHeader} />
      <Drawer.Screen name="Soil"          component={SoilScreenWithHeader} />
      <Drawer.Screen name="Upad"          component={UpadScreenWithHeader} />
      <Drawer.Screen name="Locations"     component={LocationsScreenWithHeader} />
      <Drawer.Screen name="Bills"         component={BillsScreenWithHeader} />
      <Drawer.Screen name="Reports"       component={ReportsScreenWithHeader} />

    </Drawer.Navigator>
  );
}

// ── Wrapper components that add the header bar ──────────────────────────────
function makeHeaderScreen(Component, title) {
  return function HeaderScreen({ navigation }) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface[950] }}>
        <View style={headerStyles.bar}>
          <LinearGradient colors={gradients.surface} style={StyleSheet.absoluteFill} />
          <TouchableOpacity onPress={() => navigation.openDrawer()} style={headerStyles.menuBtn}>
            <Ionicons name="menu" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={headerStyles.title}>{title}</Text>
          <TouchableOpacity onPress={() => useStore.getState().triggerRefresh()} style={headerStyles.menuBtn}>
            <Ionicons name="refresh" size={20} color={colors.brand[400]} />
          </TouchableOpacity>
        </View>
        <Component navigation={navigation} />
      </View>
    );
  };
}

const TripsScreenWithHeader     = makeHeaderScreen(TripsScreen,     'Trips');
const DieselScreenWithHeader    = makeHeaderScreen(DieselScreen,    'Diesel');
const VerifyTripsScreenWithHeader = makeHeaderScreen(VerifyTripsScreen, 'Today Trips');
const DriversScreenWithHeader   = makeHeaderScreen(DriversScreen,   'Drivers');
const VehiclesScreenWithHeader  = makeHeaderScreen(VehiclesScreen,  'Vehicles');
const SoilScreenWithHeader      = makeHeaderScreen(SoilScreen,      'Soil Types');
const UpadScreenWithHeader      = makeHeaderScreen(UpadScreen,      'Upad / Advance');
const LocationsScreenWithHeader  = makeHeaderScreen(LocationsScreen,  'Locations');
const BillsScreenWithHeader      = makeHeaderScreen(BillsScreen,      'Bills');
const ReportsScreenWithHeader    = makeHeaderScreen(ReportsScreen,    'Reports');
const MyTripsScreenWithHeader    = makeHeaderScreen(MyTripsScreen,    'Today Trips');
const TripHistoryScreenWithHeader= makeHeaderScreen(TripHistoryScreen,'Trip History');

// ── Root Navigator ─────────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { isAuthenticated } = useStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="App" component={AppDrawer} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const drawerStyles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.surface[950] },
  header:          { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing['2xl'], paddingTop: 56, borderBottomWidth: 1, borderBottomColor: colors.surface[800], marginBottom: spacing.sm },
  logoBox:         { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.brand[500] + '22', borderWidth: 1, borderColor: colors.brand[500] + '44', alignItems: 'center', justifyContent: 'center' },
  logoName:        { fontSize: 18, fontWeight: '900', color: colors.white, letterSpacing: 4 },
  logoSub:         { fontSize: 9, color: colors.brand[400], letterSpacing: 6, marginTop: -2, fontWeight: '700' },
  badge:           { backgroundColor: colors.brand[500], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  badgeText:       { color: colors.white, fontSize: 10, fontWeight: '800' },
  navItem:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16, marginHorizontal: 8, borderRadius: radius.md, marginBottom: 2, borderWidth: 1, borderColor: 'transparent' },
  navItemActive:   { backgroundColor: colors.brand[500] + '15', borderColor: colors.brand[500] + '30' },
  navLabel:        { fontSize: 14, color: colors.surface[400], fontWeight: '500' },
  navLabelActive:  { color: colors.brand[400], fontWeight: '600' },
  footer:          { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.surface[800], gap: spacing.md },
  userRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  userAvatar:      { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brand[500] + '22', alignItems: 'center', justifyContent: 'center' },
  userAvatarText:  { fontSize: 15, fontWeight: '700', color: colors.brand[400] },
  userName:        { fontSize: 14, fontWeight: '600', color: colors.white },
  userEmail:       { fontSize: 11, color: colors.surface[500] },
  logoutBtn:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.red + '18', borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.red + '30' },
  logoutText:      { fontSize: 14, color: colors.red, fontWeight: '600' },
});

const headerStyles = StyleSheet.create({
  bar:     { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 12, paddingHorizontal: 12, overflow: 'hidden' },
  menuBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  title:   { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.white, zIndex: 10 },
});
