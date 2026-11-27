import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark';
const C = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'light', toggle: () => {} });

/** Light/dark mode: same token names, re-stepped values (see index.css). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme as Theme) || 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('tn.theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0B1220' : '#1E293B');
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return <C.Provider value={{ theme, toggle }}>{children}</C.Provider>;
}

export const useTheme = () => useContext(C);
