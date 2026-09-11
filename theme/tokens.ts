/**
 * ScanPro — Design System Tokens
 * Conforme especificado em DESIGN_SYSTEM.md
 */

import { Platform } from 'react-native';

export const colors = {
  primary: '#007AFF',
  background: '#F5F5F7',
  surface: '#FFFFFF',
  textPrimary: '#1D1D1F',
  textSecondary: '#86868B',
  success: '#34C759',
  warning: '#FF9F0A',
  error: '#FF3B30',
  separator: '#D2D2D7',
  scannerOverlay: '#000000',
  cardBorder: '#E5E5EA',
  overlayTranslucent: 'rgba(0, 0, 0, 0.65)',
} as const;

export const spacing = {
  micro: 4,
  small: 8,
  compact: 12,
  default: 16,
  section: 24,
  large: 32,
  hero: 40,
  major: 48,
} as const;

export const radii = {
  small: 4,
  standard: 8,
  cards: 12,
  prominentCards: 16,
  sheets: 20,
  capsule: 999,
} as const;

export const typography = {
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700' as const,
  },
  title1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
  },
  title2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as const,
  },
  title3: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600' as const,
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  callout: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400' as const,
  },
  subheadline: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
} as const;

export const touchTarget = {
  minSize: 44,
} as const;

export const shadows = {
  card: Platform.select({
    web: {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
  }),
  floating: Platform.select({
    web: {
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
    },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
  }),
} as const;
