/**
 * Design Tokens for NestHub Mobile App
 * Art Direction: URBAN LIVING – Premium Mobile Rental Marketplace
 * Contemporary editorial design, clean native mobile experience, minimal luxury.
 */

export const authColors = {
  // Brand Palette: Urban Living
  primary: '#086B62',
  primaryDark: '#064F49',
  forestInk: '#142D29',
  background: '#FAFAF7',
  surface: '#FFFFFF',
  softMint: '#DDECE6',
  textPrimary: '#142D29',
  textSecondary: '#657570',
  textMuted: '#84928D',
  placeholder: '#84928D',
  border: '#E2E8E4',
  borderFocus: '#086B62',
  warmAccent: '#E5BD83',
  error: '#C93636',
  errorLight: '#FDF2F2',
  errorBorder: '#F8B4B4',
  success: '#16834A',
  successLight: '#EDF7F2',

  // Semantic & Backward-compatibility aliases
  primaryLight: '#DDECE6',
  action: '#086B62',
  pressed: '#064F49',
  soft: '#DDECE6',
  ink: '#142D29',
  muted: '#657570',
  line: '#E2E8E4',
  errorBackground: '#FDF2F2',
} as const;

export const authSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const authRadius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 20,
  round: 9999,
} as const;

export const authTypography = {
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800' as const,
    letterSpacing: -0.6,
    color: authColors.forestInk,
  },
  screenHeading: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    color: authColors.forestInk,
  },
  sectionHeading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    color: authColors.forestInk,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
    color: authColors.forestInk,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
    color: authColors.forestInk,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600' as const,
    color: authColors.forestInk,
  },
  labelOptional: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400' as const,
    color: authColors.textSecondary,
  },
  caption: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400' as const,
    color: authColors.textSecondary,
  },
  button: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  error: {
    fontSize: 12,
    lineHeight: 17,
    color: authColors.error,
  },
} as const;
