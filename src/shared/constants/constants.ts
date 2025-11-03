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
  GREY0: string;
  GREY: string;
  GREY1: string;
  GREY2: string;
  GREY3: string;
  MID_BLUE: string;
  BLACK_EAL: string;
  AZURE: string;
  PASTEL_GREY: string;
  WHITE: string;
  YELLOW: string;
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
    GREY0: '666666',
    GREY: '888888',
    GREY1: 'aaaaaa',
    GREY2: 'c8c8c8',
    GREY3: 'e8e8e8',
    MID_BLUE: '007bff',
    BLACK_EAL: '444444',
    AZURE: '1890ff',
    PASTEL_GREY: 'cccccc',
    WHITE: 'ffffff',
    YELLOW: 'FFEA00',
  },
  DARK_MODE: {
    BLUE: '0550ae',
    GREEN: '1f883d',
    RED: 'CF222E',
    BACKGROUND: 'E8E8E8',
    BACKGROUND_HIGHLIGHT: 'D8D8D8',
    GREY0: '666666',
    GREY: '888888',
    GREY1: 'aaaaaa',
    GREY2: 'c8c8c8',
    GREY3: 'e8e8e8',
    MID_BLUE: '007bff',
    BLACK_EAL: '444444',
    AZURE: '1890ff',
    PASTEL_GREY: 'cccccc',
    WHITE: 'ffffff',
    YELLOW: 'FFEA00',
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
