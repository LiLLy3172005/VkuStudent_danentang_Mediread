import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const FONT_SCALE_KEY = 'mediread_font_scale';
const TTS_RATE_KEY = 'mediread_tts_rate';

interface PreferencesContextType {
  fontScale: number; // 1.0 (chuẩn - 100%), 1.30 (lớn - 130%), 1.45 (rất lớn - 145%)
  ttsRate: number;   // 0.75, 0.85, 1.0
  setFontScale: (scale: number) => void;
  setTtsRate: (rate: number) => void;
  fs: (baseSize: number) => number;
}

const computeScaledSize = (baseSize: number, scale: number): number => {
  // Yêu cầu người dùng: Cỡ chữ 100% to bằng 130% trước đây (~1.25x),
  // mức 130% tăng lên ~1.45x, và mức 145% tăng lên ~1.65x
  let multiplier = 1.25;
  if (scale >= 1.40) {
    multiplier = 1.65;
  } else if (scale >= 1.20) {
    multiplier = 1.45;
  } else {
    multiplier = 1.25;
  }
  return Math.round(baseSize * multiplier * 10) / 10;
};

const PreferencesContext = createContext<PreferencesContextType>({
  fontScale: 1.0,
  ttsRate: 0.85,
  setFontScale: () => {},
  setTtsRate: () => {},
  fs: (size: number) => size,
});

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [fontScale, setFontScaleState] = useState<number>(1.0);
  const [ttsRate, setTtsRateState] = useState<number>(0.85);

  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS !== 'web') {
          const [savedScale, savedRate] = await Promise.all([
            SecureStore.getItemAsync(FONT_SCALE_KEY),
            SecureStore.getItemAsync(TTS_RATE_KEY),
          ]);
          if (savedScale) {
            const parsed = parseFloat(savedScale);
            if ([1.0, 1.25, 1.3, 1.30, 1.45].includes(parsed)) {
              setFontScaleState(parsed === 1.25 ? 1.30 : parsed);
            }
          }
          if (savedRate) {
            const parsedRate = parseFloat(savedRate);
            if (!isNaN(parsedRate) && parsedRate >= 0.5 && parsedRate <= 1.5) {
              setTtsRateState(parsedRate);
            }
          }
        }
      } catch {
        // ignore storage error
      }
    })();
  }, []);

  const setFontScale = useCallback((scale: number) => {
    setFontScaleState(scale);
    try {
      if (Platform.OS !== 'web') {
        SecureStore.setItemAsync(FONT_SCALE_KEY, String(scale));
      }
    } catch {}
  }, []);

  const setTtsRate = useCallback((rate: number) => {
    setTtsRateState(rate);
    try {
      if (Platform.OS !== 'web') {
        SecureStore.setItemAsync(TTS_RATE_KEY, String(rate));
      }
    } catch {}
  }, []);

  const fs = useCallback(
    (baseSize: number) => computeScaledSize(baseSize, fontScale),
    [fontScale]
  );

  return (
    <PreferencesContext.Provider value={{ fontScale, ttsRate, setFontScale, setTtsRate, fs }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => useContext(PreferencesContext);
