import { app } from 'electron';
import path from 'path';

const appPath = app.getAppPath();

export const ASSETS_PATH = (
  app.isPackaged
    ? path.join(appPath.replace(/app\.asar$/, ''), 'src/assets')
    : path.join(appPath, 'src/assets')
)
  .replace(/\\/g, '/')
  .replace(/^([A-Za-z]):/, (match, driveLetter) => {
    return `/mnt/${driveLetter.toLowerCase()}`;
  });
