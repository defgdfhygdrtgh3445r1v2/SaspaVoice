import React, { createContext, useContext, useState, useEffect } from 'react';

interface Settings {
  background: string;
  name: string;
  nickname: string;
  noiseSuppression: boolean;
  pushToTalkKey: string | null;
  pushToTalkEnabled: boolean;
  joinMutedMic: boolean;
  joinMutedCam: boolean;
  seeYourself: boolean;
  hideParticipantsVideo: boolean;
  recordMeeting: boolean;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  background: 'bg-[#1e1e1e]',
  name: 'Гость',
  nickname: 'guest',
  noiseSuppression: true,
  pushToTalkKey: null,
  pushToTalkEnabled: false,
  joinMutedMic: false,
  joinMutedCam: false,
  seeYourself: true,
  hideParticipantsVideo: false,
  recordMeeting: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('saspa_settings');
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch (e) {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('saspa_settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
