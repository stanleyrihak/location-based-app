import { type Theme } from 'expo-router';
import type { TextStyle } from 'react-native';

export const Palette = {
  orange: '#D06224',
  rust: '#AE431E',
  olive: '#8A8635',
  sand: '#E9C891',
  cream: '#F1E3C6',
  brown: '#4A2C1E',
  white: '#FFFFFF',
  brownSoft: '#6B5040',
  brownFaint: '#7A604F',
  brownRaised: '#5E3D2C',
  creamSoft: '#C9B49A',
} as const;

/** Semantic roles from tokens.css.
 * color-mix() values are precomputed as hex.
 */
export const Colors = {
  bg: Palette.cream,
  surface: Palette.white,
  surface2: Palette.sand,
  surfaceMuted: 'rgba(233, 200, 145, 0.55)', // sand at 55%
  surfaceSearch: '#F8EEDE', // white 70% + sand
  surfaceHeader: '#F9F2E5', // cream 45% + white
  surfaceTabbar: '#FDFCF8', // white 88% + cream
  surfaceBlur: 'rgba(241, 227, 198, 0.92)', // cream 92% + transparent

  ink: Palette.brown,
  ink2: Palette.brownSoft,
  inkPlaceholder: Palette.brownFaint,
  inkInverse: Palette.cream,

  line: 'rgba(74, 44, 30, 0.14)',
  lineStrong: 'rgba(74, 44, 30, 0.32)',
  tintPress: 'rgba(74, 44, 30, 0.12)',
  tintCode: 'rgba(74, 44, 30, 0.07)',
  scrim: 'rgba(74, 44, 30, 0.42)',

  primary: Palette.rust,
  primaryPressed: '#9C3F1E', // rust 82% + brown
  onPrimary: Palette.white,
  accent: Palette.orange,
  onAccent: Palette.white, // icons and bold text 19pt or larger only
  success: Palette.olive,
  onSuccess: Palette.white,
  error: Palette.rust,
  warning: Palette.orange,
  infoBg: Palette.sand,
  focus: Palette.orange,
  focusGlow: 'rgba(208, 98, 36, 0.28)',
} as const;

export type ThemeColor = keyof typeof Colors;

/**
 * Kept apart from `Colors` so these don't appear as options on normal screens.
 */
export const CameraColors = {
  bg: Palette.brown,
  raised: Palette.brownRaised,
  ink: Palette.cream,
  ink2: Palette.creamSoft,
  primary: Palette.cream,
  onPrimary: Palette.brown,
  primaryPressed: Palette.sand,
  dim: 'rgba(74, 44, 30, 0.5)', // camera view outside the QR frame
  hintBg: 'rgba(74, 44, 30, 0.78)', // brown 78% + transparent
} as const;

export const FontFamily = {
  display: 'Shrikhand',
  ui: 'Inter',
} as const;

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const Typography = {
  display: {
    fontFamily: FontFamily.display,
    fontWeight: FontWeight.regular,
    fontSize: 34,
    lineHeight: 40,
  },
  headlineLarge: {
    fontFamily: FontFamily.ui,
    fontWeight: FontWeight.bold,
    fontSize: 34,
    lineHeight: 39,
    letterSpacing: -0.68,
  },
  headline: {
    fontFamily: FontFamily.ui,
    fontWeight: FontWeight.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.42,
  },
  title: {
    fontFamily: FontFamily.ui,
    fontWeight: FontWeight.semibold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.22,
  },
  body: { fontFamily: FontFamily.ui, fontWeight: FontWeight.regular, fontSize: 17, lineHeight: 25 },
  button: {
    fontFamily: FontFamily.ui,
    fontWeight: FontWeight.semibold,
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: -0.09,
  },
  subhead: {
    fontFamily: FontFamily.ui,
    fontWeight: FontWeight.regular,
    fontSize: 15,
    lineHeight: 21,
  },
  label: {
    fontFamily: FontFamily.ui,
    fontWeight: FontWeight.semibold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.78,
    textTransform: 'uppercase',
  },
  caption: {
    fontFamily: FontFamily.ui,
    fontWeight: FontWeight.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  micro: { fontFamily: FontFamily.ui, fontWeight: FontWeight.medium, fontSize: 12, lineHeight: 14 },
} as const satisfies Record<string, TextStyle>;

export const Radius = {
  xs: 6,
  sm: 8,
  bar: 3,
  thumbSm: 12,
  thumb: 14,
  otp: 14,
  input: 16,
  card: 20,
  frame: 24,
  sheet: 28,
  pill: 999,
} as const;

export const IconSize = {
  xs: 16,
  sm: 18,
  md: 20,
  base: 22,
  lg: 24,
  xl: 26,
} as const;

export const NavigationTheme: Theme = {
  dark: false,
  colors: {
    primary: Colors.primary, // back button, header buttons
    background: Colors.bg, // behind every screen
    card: Colors.surfaceHeader, // header bar
    text: Colors.ink, // header title
    border: Colors.line, // line under the header
    notification: Colors.accent, // badges
  },
  fonts: {
    regular: { fontFamily: FontFamily.ui, fontWeight: FontWeight.regular },
    medium: { fontFamily: FontFamily.ui, fontWeight: FontWeight.medium },
    bold: { fontFamily: FontFamily.ui, fontWeight: FontWeight.bold },
    heavy: { fontFamily: FontFamily.ui, fontWeight: FontWeight.bold },
  },
};
