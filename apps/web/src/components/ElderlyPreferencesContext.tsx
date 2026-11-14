'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ElderlyPreferences } from '../lib/types';

interface ContextType extends ElderlyPreferences {
  setFontScale: (scale: number) => void;
  setTtsRate: (rate: number) => void;
  setTtsEnabled: (enabled: boolean) => void;
  speak: (text: string) => void;
  stopSpeech: () => void;
  isSpeaking: boolean;
}

const defaultPrefs: ElderlyPreferences = {
  fontScale: 1.15,
  ttsRate: 0.85,
  ttsEnabled: true,
  highContrast: false,
};

const ElderlyContext = createContext<ContextType>({
  ...defaultPrefs,
  setFontScale: () => {},
  setTtsRate: () => {},
  setTtsEnabled: () => {},
  speak: () => {},
  stopSpeech: () => {},
  isSpeaking: false,
});

export function ElderlyPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<ElderlyPreferences>(defaultPrefs);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('mediread_elderly_prefs');
    if (saved) {
      try {
        setPrefs(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const updatePrefs = (newPrefs: Partial<ElderlyPreferences>) => {
    setPrefs((prev) => {
      const updated = { ...prev, ...newPrefs };
      localStorage.setItem('mediread_elderly_prefs', JSON.stringify(updated));
      return updated;
    });
  };

  const speak = (text: string) => {
    if (!prefs.ttsEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    // Clean text
    const clean = text.replace(/[*#]/g, '').trim();
    if (!clean) return;

    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = 'vi-VN';
    utter.rate = prefs.ttsRate;

    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utter);
  };

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <ElderlyContext.Provider
      value={{
        ...prefs,
        setFontScale: (fontScale) => updatePrefs({ fontScale }),
        setTtsRate: (ttsRate) => updatePrefs({ ttsRate }),
        setTtsEnabled: (ttsEnabled) => updatePrefs({ ttsEnabled }),
        speak,
        stopSpeech,
        isSpeaking,
      }}
    >
      <div style={{ ['--font-scale' as any]: prefs.fontScale }}>
        {children}
      </div>
    </ElderlyContext.Provider>
  );
}

export const useElderlyPreferences = () => useContext(ElderlyContext);
