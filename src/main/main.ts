/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import electron, { app, BrowserWindow, shell, ipcMain } from 'electron';
import { ProgressInfo, autoUpdater } from 'electron-updater';
import log from 'electron-log';
import {
  checkIfFileExists,
  createDirectory,
  createFile,
  deleteDirectoryOrFile,
  duplicateDirectoryOrFile,
  fixSelectedSubDirectoryOrFile,
  getDirectoryInfo,
  moveDirectoryOrFile,
  readFile,
  readFileAsBase64,
  renameDirectoryOrFile,
  writeFile,
} from '@file';
import { sendCurl } from '@send-curl';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { DocType, Variable } from '../shared/types';
import { store } from './store';
import { exportFile, importFile, selectDirectory } from './lib/browser-folder';
import { executeScript } from '../shared/execute-script';
import { ExecuteScriptArgs } from '../shared/services-interface';
import { APP_VERSION, CURL_VERSION } from '../shared/constants/constants';

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

let downloadUpdatesProgress: ProgressInfo | undefined;
const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'src/assets')
    : path.join(__dirname, '../../src/assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    minWidth: 960,
    minHeight: 728,
    resizable: true,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.setSize(width, height);
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.setMenuBarVisibility(false);

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  log.transports.file.level = 'info';
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;
  autoUpdater.on('download-progress', (progress) => {
    downloadUpdatesProgress = progress;
  });
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    // Set up About panel options for macOS native About dialog
    app.setAboutPanelOptions({
      applicationName: 'CurlerRoo',
      applicationVersion: `${APP_VERSION}\nCurl ${CURL_VERSION}\n`,
      version: `Electron ${process.versions.electron}`,
    });

    ipcMain.handle('dialog:set', async (_event, key, value) => {
      store.set(key, value);
    });
    ipcMain.handle('dialog:get', async (_event, key) => {
      return store.get(key);
    });
    ipcMain.handle('dialog:delete', async (_event, key) => {
      store.delete(key);
    });
    ipcMain.handle('dialog:clear', async () => {
      store.reset();
    });
    ipcMain.handle('dialog:has', async (_event, key) => {
      return store.has(key);
    });
    ipcMain.handle(
      'dialog:sendCurl',
      async (
        _event,
        {
          curlRequest,
          variables,
          selectedDirectory,
        }: {
          curlRequest: string;
          variables: Variable[];
          selectedDirectory: string;
        },
      ) => {
        return sendCurl({ curlRequest, variables, selectedDirectory });
      },
    );
    ipcMain.handle('dialog:selectDirectory', async () => {
      return selectDirectory();
    });
    ipcMain.handle(
      'dialog:exportFile',
      async (
        _event,
        {
          base64,
          name,
        }: {
          base64: string;
          name?: string;
        },
      ) => {
        return exportFile({
          base64,
          name,
        });
      },
    );
    ipcMain.handle('dialog:importFile', async (_event) => {
      return importFile();
    });
    ipcMain.handle(
      'dialog:getDirectoryInfo',
      async (_event, dirPath: string) => {
        return getDirectoryInfo(dirPath);
      },
    );
    ipcMain.handle(
      'dialog:createDirectory',
      async (_event, dirPath: string) => {
        return createDirectory(dirPath);
      },
    );
    ipcMain.handle('dialog:createFile', async (_event, filePath: string) => {
      return createFile(filePath);
    });
    ipcMain.handle(
      'dialog:deleteDirectoryOrFile',
      async (_event, directoryOrFilePath: string) => {
        return deleteDirectoryOrFile(directoryOrFilePath);
      },
    );
    ipcMain.handle('dialog:readFile', async (_event, filePath: string) => {
      return readFile(filePath);
    });
    ipcMain.handle(
      'dialog:writeFile',
      async (_event, filePath: string, data: DocType) => {
        return writeFile(filePath, data);
      },
    );
    ipcMain.handle(
      'dialog:renameDirectoryOrFile',
      async (
        _event,
        { oldPath, newPath }: { oldPath: string; newPath: string },
      ) => {
        return renameDirectoryOrFile({ oldPath, newPath });
      },
    );
    ipcMain.handle(
      'dialog:duplicateDirectoryOrFile',
      async (_event, filePath: string) => {
        return duplicateDirectoryOrFile(filePath);
      },
    );
    ipcMain.handle(
      'dialog:moveDirectoryOrFile',
      async (
        _event,
        {
          oldPath,
          newPath,
        }: {
          oldPath: string;
          newPath: string;
        },
      ) => {
        return moveDirectoryOrFile({ oldPath, newPath });
      },
    );
    ipcMain.handle(
      'dialog:fixSelectedSubDirectoryOrFile',
      async (
        _event,
        {
          selectedSubDirectoryOrFile,
          selectedDirectory,
          selectedSubType,
        }: {
          selectedDirectory: string;
          selectedSubDirectoryOrFile: string;
          selectedSubType: 'directory' | 'file';
        },
      ) => {
        return fixSelectedSubDirectoryOrFile({
          selectedSubDirectoryOrFile,
          selectedDirectory,
          selectedSubType,
        });
      },
    );
    ipcMain.handle('dialog:openExternal', async (_event, url: string) => {
      return shell.openExternal(url);
    });
    ipcMain.handle('dialog:checkForUpdates', async () => {
      if (process.env.NODE_ENV === 'development') {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              updateInfo: {
                version: '999.0.0',
              },
              isUpdateAvailable: false,
            });
          }, 2000);
        });
      }
      return autoUpdater.checkForUpdates();
    });
    ipcMain.handle('dialog:downloadUpdates', async () => {
      if (process.env.NODE_ENV === 'development') {
        const arr = Array(100).fill(0);
        for (let i = 1; i < arr.length + 1; i += 1) {
          downloadUpdatesProgress = {
            percent: i,
            bytesPerSecond: 1000,
            total: 100,
            transferred: i,
            delta: 1,
          };
          await new Promise<void>((resolve) => {
            setTimeout(() => {
              resolve();
            }, 50);
          });
        }
        return [];
      }
      return autoUpdater.downloadUpdate();
    });
    ipcMain.handle('dialog:getDownloadUpdatesProgress', async () => {
      return downloadUpdatesProgress;
    });
    ipcMain.handle('dialog:quitAndInstall', async () => {
      if (process.env.NODE_ENV === 'development') {
        return Promise.resolve();
      }
      return autoUpdater.quitAndInstall();
    });
    ipcMain.handle(
      'dialog:executeScript',
      async (_event, arg: ExecuteScriptArgs) => {
        return executeScript(arg);
      },
    );
    ipcMain.handle('dialog:readFileAsBase64', async (_event, filePath) => {
      return readFileAsBase64(filePath);
    });
    ipcMain.handle('dialog:checkIfFileExists', async (_event, filePath) => {
      return checkIfFileExists(filePath);
    });
    ipcMain.handle('dialog:showItemInFolder', async (_event, path) => {
      return shell.showItemInFolder(path);
    });
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
