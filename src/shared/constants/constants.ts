export const BREAKLINE_ESCAPE_CHAR = '\\';
const WINDOWS_ESCAPE_CHAR_REGEX = '`';
const OTHER_ESCAPE_CHAR_REGEX = '\\\\';
export const ANY_BREAKLINE_ESCAPE_CHAR_REGEX = `[${WINDOWS_ESCAPE_CHAR_REGEX}${OTHER_ESCAPE_CHAR_REGEX}]`;
export const NOT_ANY_BREAKLINE_ESCAPE_CHAR_REGEX = `[^${WINDOWS_ESCAPE_CHAR_REGEX}${OTHER_ESCAPE_CHAR_REGEX}]`;

export const THEME: 'LIGHT_MODE' | 'DARK_MODE' = 'LIGHT_MODE';

type THEME_VALUES = {
  BLUE: string;
  GREEN: string;
  RED: string;
  BACKGROUND: string;
  BACKGROUND_HIGHLIGHT: string;
  GREY: string;
  GREY2: string;
  MID_BLUE: string;
  BLACK_EAL: string;
  AZURE: string;
  PASTEL_GREY: string;
  WHITE: string;
};

export const COLORS: {
  [key: string]: THEME_VALUES;
} = {
  LIGHT_MODE: {
    BLUE: '0550ae',
    GREEN: '1f883d',
    RED: 'CF222E',
    BACKGROUND: 'E8E8E8',
    BACKGROUND_HIGHLIGHT: 'D8D8D8',
    GREY: '888888',
    GREY2: 'c8c8c8',
    MID_BLUE: '007bff',
    BLACK_EAL: '444444',
    AZURE: '1890ff',
    PASTEL_GREY: 'cccccc',
    WHITE: 'ffffff',
  },
  DARK_MODE: {
    BLUE: '0550ae',
    GREEN: '1f883d',
    RED: 'CF222E',
    BACKGROUND: 'E8E8E8',
    BACKGROUND_HIGHLIGHT: 'D8D8D8',
    GREY: '888888',
    GREY2: 'c8c8c8',
    MID_BLUE: '007bff',
    BLACK_EAL: '444444',
    AZURE: '1890ff',
    PASTEL_GREY: 'cccccc',
    WHITE: 'ffffff',
  },
};

export const APP_VERSION = '0.1.8';
export const TERMS_OF_SERVICE_VERSION = '0.0.1';
export const PRIVACY_POLICY_VERSION = '0.0.1';
export const CURLERROO_FILE_EXTENSION = 'crr';
export const ENABLE_TELEMETRY_FEATURE = false;
export const IN_MEMORY_FILE_SYSTEM_DEFAULT_FILE_PATH = '/requests/new-file.crr';
