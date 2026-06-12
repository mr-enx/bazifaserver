import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SettingsState = {
  soundVolume: number;
  setSoundVolume: (volume: number) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundVolume: 100,
      setSoundVolume: (volume) => set({ soundVolume: volume }),
    }),
    {
      name: 'bazifa-settings',
    }
  )
);
