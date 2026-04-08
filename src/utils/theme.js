// TransportPro Theme — matches web app dark design with premium orange brand
export const colors = {
  // Brand (vibrant orange)
  brand: {
    400: '#fb923c',
    500: '#f97316',
    600: '#ea6c0a',
    700: '#c2410c',
  },
  // Surface (deep dark grays)
  surface: {
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    850: '#111827',
    900: '#0f172a',
    950: '#020617',
    glass: 'rgba(255, 255, 255, 0.05)',
    glassDark: 'rgba(0, 0, 0, 0.3)',
  },
  // Status colors
  green:  '#22c55e',
  red:    '#ef4444',
  yellow: '#eab308',
  blue:   '#3b82f6',
  white:  '#ffffff',
  black:  '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  full: 9999,
};

export const typography = {
  xs:   { fontSize: 11, fontWeight: '400' },
  sm:   { fontSize: 13, fontWeight: '500' },
  base: { fontSize: 15, fontWeight: '600' },
  lg:   { fontSize: 17, fontWeight: '700' },
  xl:   { fontSize: 20, fontWeight: '800' },
  '2xl':{ fontSize: 24, fontWeight: '800' },
  '3xl':{ fontSize: 30, fontWeight: '900' },
};

export const shadows = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 6 },
  // Futuristic "Glow"
  brand: { 
    shadowColor: colors.brand[500], 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 10, 
    elevation: 8 
  },
  blue: { 
    shadowColor: colors.blue, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 10, 
    elevation: 8 
  }
};

export const gradients = {
  brand: [colors.brand[400], colors.brand[600]],
  surface: [colors.surface[900], colors.surface[950]],
  glass: ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.02)'],
  success: ['#22c55e', '#15803d'],
  danger: ['#ef4444', '#b91c1c'],
};
