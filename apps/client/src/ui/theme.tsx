import { createContext, useContext, useState, type ReactNode } from 'react';
import { appConfig, setTheme as updateThemeConfig } from './core/config.js';

export const themes = {
    default: {
        primary: '#5865F2',      // Discord Purple
        secondary: '#4f545c',
        success: '#3ba55d',
        danger: '#ed4245',
        warning: '#faa61a',
        background: '#36393f',
        sidebar: '#2f3136',
        serverRail: '#202225',
        text: '#dcddde',
        textMuted: '#72767d',
        header: '#ffffff',
        moderatedBg: '#40444b',
        accent: '#00aff4',
    },
    dracula: {
        primary: '#bd93f9',      // Purple
        secondary: '#44475a',
        success: '#50fa7b',
        danger: '#ff5555',
        warning: '#f1fa8c',
        background: '#282a36',
        sidebar: '#21222c',
        serverRail: '#191a21',
        text: '#f8f8f2',
        textMuted: '#6272a4',
        header: '#ffffff',
        moderatedBg: '#343746',
        accent: '#8be9fd',       // Cyan
    },
    nord: {
        primary: '#88c0d0',      // Frost Blue
        secondary: '#4c566a',
        success: '#a3be8c',
        danger: '#bf616a',
        warning: '#ebcb8b',
        background: '#2e3440',
        sidebar: '#3b4252',
        serverRail: '#2e3440',
        text: '#eceff4',
        textMuted: '#d8dee9',
        header: '#ffffff',
        moderatedBg: '#434c5e',
        accent: '#81a1c1',
    }
};

export const messageStates = {
    secure: { fg: '#50fa7b', label: '[SECURE]' }, // Green
    system: { fg: '#f1fa8c', label: '[SYSTEM]' }, // Yellow
    error: { fg: '#ff5555', label: '[ALERTA]' },  // Red
};

// Types
export type ThemeName = keyof typeof themes;

interface ThemeContextValue {
  colors: (typeof themes)['default'];
  themeName: ThemeName;
  switchTheme: (name: ThemeName) => void;
}

// Context with placeholder initial values
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(appConfig.themeName);

  const value: ThemeContextValue = {
    colors: themes[themeName],
    themeName,
    switchTheme: (name) => {
      if (themes[name]) {
        updateThemeConfig(name);
        setThemeName(name);
      }
    },
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
