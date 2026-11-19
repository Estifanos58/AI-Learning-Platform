'use client';

import * as React from 'react';

type ThemeColor = 'zinc' | 'red' | 'rose' | 'orange' | 'green' | 'blue' | 'yellow' | 'violet' | 'teal' | 'cyan' | 'indigo' | 'pink' | 'fuchsia' | 'lime';

export const themeColors: { name: ThemeColor; label: string; class: string }[] = [
    { name: 'zinc',    label: 'Zinc',    class: 'bg-zinc-950 dark:bg-zinc-100' },
    { name: 'red',     label: 'Red',     class: 'bg-red-500' },
    { name: 'rose',    label: 'Rose',    class: 'bg-rose-500' },
    { name: 'orange',  label: 'Orange',  class: 'bg-orange-500' },
    { name: 'green',   label: 'Green',   class: 'bg-green-500' },
    { name: 'blue',    label: 'Blue',    class: 'bg-blue-500' },
    { name: 'yellow',  label: 'Yellow',  class: 'bg-yellow-500' },
    { name: 'violet',  label: 'Violet',  class: 'bg-violet-500' },
    { name: 'teal',    label: 'Teal',    class: 'bg-teal-500' },
    { name: 'cyan',    label: 'Cyan',    class: 'bg-cyan-500' },
    { name: 'indigo',  label: 'Indigo',  class: 'bg-indigo-500' },
    { name: 'pink',    label: 'Pink',    class: 'bg-pink-500' },
    { name: 'fuchsia', label: 'Fuchsia', class: 'bg-fuchsia-500' },
    { name: 'lime',    label: 'Lime',    class: 'bg-lime-500' },
];

const THEME_COLOR_STORAGE_KEY = 'theme-color';
const THEME_COLOR_CHANGE_EVENT = 'ai-learning-platform:theme-color-change';

function getStoredThemeColor(): ThemeColor {
  if (typeof window === 'undefined') return 'zinc';
  try {
    const saved = window.localStorage.getItem(THEME_COLOR_STORAGE_KEY) as ThemeColor | null;
    if (saved && themeColors.some((c) => c.name === saved)) {
      return saved;
    }
  } catch {
    // Ignore storage access errors
  }
  return 'zinc';
}

function subscribeThemeColor(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_COLOR_STORAGE_KEY) callback();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(THEME_COLOR_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(THEME_COLOR_CHANGE_EVENT, callback);
  };
}

interface ThemeColorContextType {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
}

const ThemeColorContext = React.createContext<ThemeColorContextType | undefined>(undefined);

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
  const themeColor = React.useSyncExternalStore<ThemeColor>(
    subscribeThemeColor,
    getStoredThemeColor,
    () => 'zinc',
  );

  const setThemeColor = React.useCallback((color: ThemeColor) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(THEME_COLOR_STORAGE_KEY, color);
    } catch {
      // Ignore storage access errors
    }
    window.dispatchEvent(new Event(THEME_COLOR_CHANGE_EVENT));
  }, []);

  React.useEffect(() => {
    const root = document.body;
    root.classList.remove(
      ...themeColors.map(c => `theme-${c.name}`)
    );
    root.classList.add(`theme-${themeColor}`);
  }, [themeColor]);

  return (
    <ThemeColorContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeColorContext.Provider>
  );
}

export { ThemeColorContext }; // Export context if needed, though hook is better

export function useThemeColor() {
  const context = React.useContext(ThemeColorContext);
  if (context === undefined) {
    throw new Error('useThemeColor must be used within a ThemeColorProvider');
  }
  return context;
}
