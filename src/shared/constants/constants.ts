export const BREAKLINE_ESCAPE_CHAR = '\\';
const WINDOWS_ESCAPE_CHAR_REGEX = '`';
const OTHER_ESCAPE_CHAR_REGEX = '\\\\';
export const ANY_BREAKLINE_ESCAPE_CHAR_REGEX = `[${WINDOWS_ESCAPE_CHAR_REGEX}${OTHER_ESCAPE_CHAR_REGEX}]`;
export const NOT_ANY_BREAKLINE_ESCAPE_CHAR_REGEX = `[^${WINDOWS_ESCAPE_CHAR_REGEX}${OTHER_ESCAPE_CHAR_REGEX}]`;

export type THEME_NAME = 'LIGHT_MODE' | 'DARK_MODE';
export type THEME_PREFERENCE = 'LIGHT_MODE' | 'DARK_MODE' | 'AUTO';
export const THEME_STORAGE_KEY = 'curlerroo.theme';

export const getThemePreference = (): THEME_PREFERENCE | null => {
  try {
    const value = (globalThis as any)?.localStorage?.getItem?.(
      THEME_STORAGE_KEY,
    );
    if (value === 'LIGHT_MODE' || value === 'DARK_MODE' || value === 'AUTO') {
      return value;
    }
    return null;
  } catch {
    return null;
  }
};

export const setThemePreference = (preference: THEME_PREFERENCE) => {
  try {
    (globalThis as any)?.localStorage?.setItem?.(THEME_STORAGE_KEY, preference);
  } catch {
    // ignore
  }
};

export const getSystemThemePreference = (): THEME_NAME => {
  try {
    const mm = (globalThis as any)?.matchMedia?.(
      '(prefers-color-scheme: dark)',
    );
    if (mm?.matches) {
      return 'DARK_MODE';
    }
  } catch {
    // ignore
  }
  return 'LIGHT_MODE';
};

type THEME_VALUES = {
  PRIMARY: string; // BLUE - primary actions, links, syntax keywords
  SUCCESS: string; // GREEN - success states, syntax comments
  ERROR: string; // RED - errors
  SYNTAX_STRING: string; // RED/ORANGE - syntax highlighting for strings and numbers
  SURFACE_PRIMARY: string; // BACKGROUND - main background
  SURFACE_SECONDARY: string; // BACKGROUND_HIGHLIGHT - highlighted/selected backgrounds
  SURFACE_TERTIARY: string; // GREY0 - tertiary surface
  TEXT_SECONDARY: string; // GREY - secondary text, borders
  TEXT_TERTIARY: string; // GREY1 - tertiary text (line numbers)
  BORDER: string; // GREY2 - borders, dividers
  SELECTION: string; // GREY3 - selections, active states
  LINK: string; // MID_BLUE - clickable links
  TEXT_PRIMARY: string; // BLACK_EAL - main text color
  INFO: string; // AZURE - info/feedback states
  DISABLED: string; // PASTEL_GREY - disabled/placeholder states
  SURFACE_BRIGHT: string; // WHITE - bright/contrasting surface (editors, content areas)
  WARNING: string; // YELLOW - warnings, highlights
};

export const COLORS: {
  [key: string]: THEME_VALUES;
} = {
  LIGHT_MODE: {
    PRIMARY: '0550ae', // BLUE
    SUCCESS: '1f883d', // GREEN
    ERROR: 'CF222E', // RED
    SYNTAX_STRING: 'CF222E', // RED - same as ERROR for light mode
    SURFACE_PRIMARY: 'FFFFFF', // BACKGROUND
    SURFACE_SECONDARY: 'E8E8E8', // BACKGROUND_HIGHLIGHT
    SURFACE_TERTIARY: '666666', // GREY0
    TEXT_SECONDARY: '888888', // GREY
    TEXT_TERTIARY: 'aaaaaa', // GREY1
    BORDER: 'c8c8c8', // GREY2
    SELECTION: 'e8e8e8', // GREY3
    LINK: '007bff', // MID_BLUE
    TEXT_PRIMARY: '444444', // BLACK_EAL
    INFO: '1890ff', // AZURE
    DISABLED: 'cccccc', // PASTEL_GREY
    SURFACE_BRIGHT: 'ffffff', // WHITE
    WARNING: 'FFEA00', // YELLOW
  },
  DARK_MODE: {
    // Dark palette tuned for contrast on near-black surfaces
    PRIMARY: '58a6ff', // BLUE
    SUCCESS: '3fb950', // GREEN
    ERROR: 'f85149', // RED
    SYNTAX_STRING: 'ffa657', // ORANGE - better contrast for strings/numbers on dark background
    SURFACE_PRIMARY: '161b22', // BACKGROUND
    SURFACE_SECONDARY: '0d1117', // BACKGROUND_HIGHLIGHT
    SURFACE_TERTIARY: '0d1117', // GREY0
    TEXT_SECONDARY: '8b949e', // GREY
    TEXT_TERTIARY: '484f58', // GREY1
    BORDER: '21262d', // GREY2
    SELECTION: '30363d', // GREY3
    LINK: '1f6feb', // MID_BLUE
    TEXT_PRIMARY: 'e6edf3', // BLACK_EAL
    INFO: '79c0ff', // AZURE
    DISABLED: '161b22', // PASTEL_GREY
    SURFACE_BRIGHT: 'ffffff', // WHITE
    WARNING: 'ffd33d', // YELLOW
  },
};

export const CURL_VERSION = '8.16.0';
export const APP_VERSION = '0.2.3';
export const TERMS_OF_SERVICE_VERSION = '0.0.1';
export const PRIVACY_POLICY_VERSION = '0.0.1';
export const CURLERROO_FILE_EXTENSION = 'crr';
export const ENABLE_TELEMETRY_FEATURE = false;
export const IN_MEMORY_FILE_SYSTEM_DEFAULT_FILE_PATH = '/requests/new-file.crr';
export const ENDPOINT0 = 'https://api.curlerroo.com';
export const ENDPOINT1 = 'https://api-asia.curlerroo.com';
export const WEB_APP_URL = 'https://app.curlerroo.com';
