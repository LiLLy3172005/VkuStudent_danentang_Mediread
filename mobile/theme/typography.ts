export const getTypography = (fontScale: number = 1.0) => ({
  titleHero: {
    fontSize: Math.round(26 * fontScale),
    fontWeight: '800' as const,
    color: '#073F46',
    lineHeight: Math.round(34 * fontScale),
  },
  titleLarge: {
    fontSize: Math.round(22 * fontScale),
    fontWeight: '800' as const,
    color: '#073F46',
    lineHeight: Math.round(28 * fontScale),
  },
  titleMedium: {
    fontSize: Math.round(18 * fontScale),
    fontWeight: '700' as const,
    color: '#073F46',
    lineHeight: Math.round(24 * fontScale),
  },
  bodyLarge: {
    fontSize: Math.round(16 * fontScale),
    fontWeight: '600' as const,
    color: '#14283A',
    lineHeight: Math.round(24 * fontScale),
  },
  bodyRegular: {
    fontSize: Math.round(15 * fontScale),
    fontWeight: '400' as const,
    color: '#14283A',
    lineHeight: Math.round(22 * fontScale),
  },
  bodyMuted: {
    fontSize: Math.round(14 * fontScale),
    fontWeight: '500' as const,
    color: '#5B6B77',
    lineHeight: Math.round(20 * fontScale),
  },
  caption: {
    fontSize: Math.round(12 * fontScale),
    fontWeight: '500' as const,
    color: '#5B6B77',
    lineHeight: Math.round(16 * fontScale),
  },
  buttonText: {
    fontSize: Math.round(16 * fontScale),
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
