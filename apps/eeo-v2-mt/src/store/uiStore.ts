/**
 * Zustand store pro UI state (dark mode, apod.)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isDarkMode: true, // Default dark mode dle mockupů
      
      toggleDarkMode: () => {
        set((state) => {
          const newValue = !state.isDarkMode;
          // Apply to document
          if (newValue) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          return { isDarkMode: newValue };
        });
      },
      
      setDarkMode: (value: boolean) => {
        set({ isDarkMode: value });
        // Apply to document
        if (value) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
    }),
    {
      name: 'eeo-ui-storage',
    }
  )
);
