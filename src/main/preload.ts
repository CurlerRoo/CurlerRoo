// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { ProgressInfo, UpdateCheckResult } from 'electron-updater';
import {
  checkIfFileExists,
  createFile,
  fixSelectedSubDirectoryOrFile,
  readFile,
  readFileAsBase64,
  writeFile,
} from '@file';
import { sendCurl } from '@send-curl';
import { DocType, Variable } from '../shared/types';
import { exportFile, importFile, selectDirectory } from './lib/browser-folder';
import { executeScript } from '../shared/execute-script';
import { GetDirectoryInfoFunction } from '../shared/file-interface';
import { ExecuteScriptArgs } from '../shared/services-interface';

export type Channels = 'ipc-example';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    set(key: string, value: unknown) {
      return ipcRenderer.invoke('dialog:set', key, value);
    },
    get(key: string) {
      return ipcRenderer.invoke('dialog:get', key);
    },
    delete(key: string) {
      return ipcRenderer.invoke('dialog:delete', key);
    },
    clear() {
      return ipcRenderer.invoke('dialog:clear');
    },
    has(key: string) {
      return ipcRenderer.invoke('dialog:has', key);
    },
    sendCurl({
      curlRequest,
      variables,
      selectedDirectory,
    }: {
      curlRequest: string;
      variables: Variable[];
      selectedDirectory: string;
    }): ReturnType<typeof sendCurl> {
      return ipcRenderer.invoke('dialog:sendCurl', {
        curlRequest,
        variables,
        selectedDirectory,
      });
    },
    selectDirectory(): ReturnType<typeof selectDirectory> {
      return ipcRenderer.invoke('dialog:selectDirectory');
    },
    exportFile({
      base64,
      name,
    }: {
      base64: string;
      name?: string;
    }): ReturnType<typeof exportFile> {
      return ipcRenderer.invoke('dialog:exportFile', {
        base64,
        name,
      });
    },
    importFile(): ReturnType<typeof importFile> {
      return ipcRenderer.invoke('dialog:importFile');
    },
    getDirectoryInfo(path: string): ReturnType<GetDirectoryInfoFunction> {
      return ipcRenderer.invoke('dialog:getDirectoryInfo', path);
    },
    createDirectory(path: string) {
      return ipcRenderer.invoke('dialog:createDirectory', path);
    },
    createFile(path: string): ReturnType<typeof createFile> {
      return ipcRenderer.invoke('dialog:createFile', path);
    },
    deleteDirectoryOrFile(path: string) {
      return ipcRenderer.invoke('dialog:deleteDirectoryOrFile', path);
    },
    readFile(path: string): ReturnType<typeof readFile> {
      return ipcRenderer.invoke('dialog:readFile', path);
    },
    writeFile(path: string, document: DocType): ReturnType<typeof writeFile> {
      return ipcRenderer.invoke('dialog:writeFile', path, document);
    },
    renameDirectoryOrFile({
      oldPath,
      newPath,
    }: {
      oldPath: string;
      newPath: string;
    }) {
      return ipcRenderer.invoke('dialog:renameDirectoryOrFile', {
        oldPath,
        newPath,
      });
    },
    duplicateDirectoryOrFile(filePath: string) {
      return ipcRenderer.invoke('dialog:duplicateDirectoryOrFile', filePath);
    },
    moveDirectoryOrFile({
      oldPath,
      newPath,
    }: {
      oldPath: string;
      newPath: string;
    }) {
      return ipcRenderer.invoke('dialog:moveDirectoryOrFile', {
        oldPath,
        newPath,
      });
    },
    fixSelectedSubDirectoryOrFile({
      selectedSubDirectoryOrFile,
      selectedDirectory,
      selectedSubType,
    }: {
      selectedSubDirectoryOrFile: string;
      selectedDirectory: string;
      selectedSubType: 'directory' | 'file';
    }): ReturnType<typeof fixSelectedSubDirectoryOrFile> {
      return ipcRenderer.invoke('dialog:fixSelectedSubDirectoryOrFile', {
        selectedSubDirectoryOrFile,
        selectedDirectory,
        selectedSubType,
      });
    },
    openExternal(url: string) {
      return ipcRenderer.invoke('dialog:openExternal', url);
    },
    checkForUpdates(): Promise<UpdateCheckResult | null> {
      return ipcRenderer.invoke('dialog:checkForUpdates');
    },
    downloadUpdates(): Promise<void> {
      return ipcRenderer.invoke('dialog:downloadUpdates');
    },
    getDownloadUpdatesProgress(): Promise<ProgressInfo | undefined> {
      return ipcRenderer.invoke('dialog:getDownloadUpdatesProgress');
    },
    quitAndInstall(): Promise<void> {
      return ipcRenderer.invoke('dialog:quitAndInstall');
    },
    executeScript(args: ExecuteScriptArgs): ReturnType<typeof executeScript> {
      return ipcRenderer.invoke('dialog:executeScript', args);
    },
    readFileAsBase64(path: string): ReturnType<typeof readFileAsBase64> {
      return ipcRenderer.invoke('dialog:readFileAsBase64', path);
    },
    checkIfFileExists(path: string): ReturnType<typeof checkIfFileExists> {
      return ipcRenderer.invoke('dialog:checkIfFileExists', path);
    },
    showItemInFolder(path: string) {
      return ipcRenderer.invoke('dialog:showItemInFolder', path);
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
