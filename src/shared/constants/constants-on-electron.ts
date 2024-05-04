import {
  ANY_BREAKLINE_ESCAPE_CHAR_REGEX,
  APP_VERSION,
  BREAKLINE_ESCAPE_CHAR,
  COLORS,
  THEME,
  CURLERROO_FILE_EXTENSION,
  ENABLE_TELEMETRY_FEATURE,
  IN_MEMORY_FILE_SYSTEM_DEFAULT_FILE_PATH,
  NOT_ANY_BREAKLINE_ESCAPE_CHAR_REGEX,
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
} from './constants';

export {
  ANY_BREAKLINE_ESCAPE_CHAR_REGEX,
  APP_VERSION,
  BREAKLINE_ESCAPE_CHAR,
  COLORS,
  THEME,
  CURLERROO_FILE_EXTENSION,
  ENABLE_TELEMETRY_FEATURE,
  IN_MEMORY_FILE_SYSTEM_DEFAULT_FILE_PATH,
  NOT_ANY_BREAKLINE_ESCAPE_CHAR_REGEX,
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
};

export const OS = (() => {
  if (global?.process?.platform) {
    return process.platform;
  }

  // @ts-ignore
  const platform = global?.navigator?.userAgentData.platform;
  if (platform === 'macOS') {
    return 'darwin';
  }
  if (platform === 'Linux') {
    return 'linux';
  }
  if (platform === 'Windows') {
    return 'win32';
  }
  throw new Error(`Unsupported platform: ${platform}`);
})();

export const PATH_SEPARATOR = OS === 'win32' ? '\\' : '/';

export const ENABLE_UPDATE_FEATURE = true;
export const USE_IN_MEMORY_FILE_SYSTEM = false;
export const PLATFORM: 'browser' | 'electron' = 'electron';
export const ENABLE_TERMS_OF_SERVICE_FEATURE = true;
