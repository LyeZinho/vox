import type { ThemeName } from '../theme.js';

export const appConfig = {
  themeName: 'default' as ThemeName,
  privacyMode: false,
  serverUrl: process.env.VAX_API_URL || process.env.VAX_SERVER || 'https://vox.devscafe.org',
};

export function setTheme(name: ThemeName) {
  appConfig.themeName = name;
}

export function setPrivacyMode(enabled: boolean) {
  appConfig.privacyMode = enabled;
}
