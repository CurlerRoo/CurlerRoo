import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  THEME_NAME,
  THEME_PREFERENCE,
  getThemePreference,
  setThemePreference,
  getSystemThemePreference,
  COLORS,
} from '@constants';

const ThemeContext = createContext<{
  theme: THEME_NAME;
  preference: THEME_PREFERENCE;
  setPreference: (preference: THEME_PREFERENCE) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<THEME_PREFERENCE>(() => {
    return getThemePreference() || 'AUTO';
  });

  const getEffectiveTheme = (pref: THEME_PREFERENCE): THEME_NAME => {
    if (pref === 'AUTO') {
      return getSystemThemePreference();
    }
    return pref;
  };

  const [theme, setThemeState] = useState<THEME_NAME>(() => {
    return getEffectiveTheme(preference);
  });

  // Update theme when preference changes
  useEffect(() => {
    const effectiveTheme = getEffectiveTheme(preference);
    setThemeState(effectiveTheme);
  }, [preference]);

  useEffect(() => {
    // Listen for system theme changes (only if preference is AUTO)
    try {
      const mm = window.matchMedia?.('(prefers-color-scheme: dark)');
      if (mm) {
        const handler = (e: MediaQueryListEvent) => {
          // Only update if preference is AUTO
          if (preference === 'AUTO') {
            setThemeState(e.matches ? 'DARK_MODE' : 'LIGHT_MODE');
          }
        };
        mm.addEventListener('change', handler);
        return () => mm.removeEventListener('change', handler);
      }
    } catch {
      // ignore
    }
    return undefined;
  }, [preference]);

  useEffect(() => {
    // Listen for theme changes from other ThemeProvider instances (e.g., modals)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'curlerroo.theme' && e.newValue) {
        if (
          e.newValue === 'LIGHT_MODE' ||
          e.newValue === 'DARK_MODE' ||
          e.newValue === 'AUTO'
        ) {
          setPreferenceState(e.newValue);
        }
      }
    };

    // Also listen for custom event (for same-window updates)
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<THEME_PREFERENCE>;
      if (
        customEvent.detail &&
        (customEvent.detail === 'LIGHT_MODE' ||
          customEvent.detail === 'DARK_MODE' ||
          customEvent.detail === 'AUTO')
      ) {
        setPreferenceState(customEvent.detail);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('themechange', handleThemeChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themechange', handleThemeChange);
    };
  }, []);

  const setPreference = React.useCallback((newPreference: THEME_PREFERENCE) => {
    setThemePreference(newPreference);
    setPreferenceState(newPreference);
    // Dispatch custom event to notify other ThemeProvider instances in the same window
    window.dispatchEvent(
      new CustomEvent('themechange', { detail: newPreference }),
    );
  }, []);

  const value = React.useMemo(
    () => ({ theme, preference, setPreference }),
    [theme, preference, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export function useColors() {
  const { theme } = useTheme();
  return COLORS[theme];
}
