export const Colors = {
  primary: '#1B4F8A',
  primaryDark: '#0E2F55',
  primaryLight: '#2E6DB4',
  gold: '#C9A84C',
  goldLight: '#E8C96A',
  background: '#F5F6FA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  textInverse: '#FFFFFF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  shadow: 'rgba(0, 0, 0, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  tabBarBg: '#FFFFFF',
  inputBg: '#F9FAFB',
  badge: '#EF4444',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  h4: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodySmall: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 11, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '500' as const },
} as const;
