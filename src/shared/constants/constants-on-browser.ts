import {
  ANY_BREAKLINE_ESCAPE_CHAR_REGEX,
  APP_VERSION,
  BREAKLINE_ESCAPE_CHAR,
  COLORS,
  CURLERROO_FILE_EXTENSION,
  ENABLE_TELEMETRY_FEATURE,
  IN_MEMORY_FILE_SYSTEM_DEFAULT_FILE_PATH,
  NOT_ANY_BREAKLINE_ESCAPE_CHAR_REGEX,
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
  THEME,
} from './constants';

export {
  ANY_BREAKLINE_ESCAPE_CHAR_REGEX,
  APP_VERSION,
  BREAKLINE_ESCAPE_CHAR,
  COLORS,
  CURLERROO_FILE_EXTENSION,
  ENABLE_TELEMETRY_FEATURE,
  IN_MEMORY_FILE_SYSTEM_DEFAULT_FILE_PATH,
  NOT_ANY_BREAKLINE_ESCAPE_CHAR_REGEX,
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
  THEME,
};

const OS = (() => {
  // TODO: Remove this when we have a better way to detect the OS
  const platform =
    // @ts-ignore
    global?.navigator?.userAgentData?.platform || global?.navigator.platform;
  if (platform === 'macOS') {
    return 'darwin';
  }
  if (platform === 'Linux') {
    return 'linux';
  }
  if (platform === 'Windows') {
    return 'win32';
  }
  return 'linux';
})();

export const PATH_SEPARATOR = OS === 'win32' ? '\\' : '/';

export const ENABLE_UPDATE_FEATURE = false;
export const USE_IN_MEMORY_FILE_SYSTEM = true;
export const ENDPOINT0 = 'https://api.curlerroo.com';
export const ENDPOINT1 = 'https://api-asia.curlerroo.com';
export const PLATFORM: 'browser' | 'electron' = 'browser';
export const ENABLE_TERMS_OF_SERVICE_FEATURE = false;
