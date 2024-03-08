import { debugLog } from './utils';

export const passthroughLogger = (name: string) => (value: any) => {
  debugLog(`[${name}] Passthrough logger:`, JSON.stringify(value, null, 2));
  return value;
};
