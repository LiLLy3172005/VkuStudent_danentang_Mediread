import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PreferencesContextType {
  fontScale: number; // 1.0 (chuẩn), 1.25 (lớn), 1.45 (rất lớn cho người già)
  ttsRate: number;   // 0.8 (chậm, dễ nghe)
  setFontScale: (scale: number) => void;
  setTtsRate: (rate: number) => void;
}

const PreferencesContext = createContext<PreferencesContextType>({
  fontScale: 1.15,
  ttsRate: 0.85,
  setFontScale: () => {},
  setTtsRate: () => {},
});

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [fontScale, setFontScale] = useState<number>(1.15);
  const [ttsRate, setTtsRate] = useState<number>(0.85);

  return (
    <PreferencesContext.Provider value={{ fontScale, ttsRate, setFontScale, setTtsRate }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => useContext(PreferencesContext);
