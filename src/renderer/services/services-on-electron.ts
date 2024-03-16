import { DocType, Variable } from '../../shared/types';
import { ServicesType } from '../../shared/services-interface';

export const Services: ServicesType = {
  set(key: string, value: unknown) {
    return window.electron.ipcRenderer.set(key, value);
  },
  get(key: string) {
    return window.electron.ipcRenderer.get(key);
  },
  delete(key: string) {
    return window.electron.ipcRenderer.delete(key);
  },
  clear() {
    return window.electron.ipcRenderer.clear();
  },
  has(key: string) {
    return window.electron.ipcRenderer.has(key);
  },
  sendCurl({
    curlRequest,
    variables,
    selectedDirectory,
  }: {
    curlRequest: string;
    variables: Variable[];
    selectedDirectory: string;
  }) {
    return window.electron.ipcRenderer.sendCurl({
      curlRequest,
      variables,
      selectedDirectory,
    });
  },
  selectDirectory() {
    return window.electron.ipcRenderer.selectDirectory();
  },
  exportFile({ base64, name }: { base64: string; name?: string }) {
    return window.electron.ipcRenderer.exportFile({ base64, name });
  },
  importFile() {
    return window.electron.ipcRenderer.importFile();
  },
  getDirectoryInfo(path: string) {
    return window.electron.ipcRenderer.getDirectoryInfo(path);
  },
  createDirectory(path: string) {
    return window.electron.ipcRenderer.createDirectory(path);
  },
  createFile(path: string) {
    return window.electron.ipcRenderer.createFile(path);
  },
  deleteDirectoryOrFile(path: string) {
    return window.electron.ipcRenderer.deleteDirectoryOrFile(path);
  },
  readFile(path: string) {
    return window.electron.ipcRenderer.readFile(path);
  },
  writeFile(path: string, document: DocType) {
    return window.electron.ipcRenderer.writeFile(path, document);
  },
  renameDirectoryOrFile({
    oldPath,
    newPath,
  }: {
    oldPath: string;
    newPath: string;
  }) {
    return window.electron.ipcRenderer.renameDirectoryOrFile({
      oldPath,
      newPath,
    });
  },
  duplicateDirectoryOrFile(filePath: string) {
    return window.electron.ipcRenderer.duplicateDirectoryOrFile(filePath);
  },
  moveDirectoryOrFile({
    oldPath,
    newPath,
  }: {
    oldPath: string;
    newPath: string;
  }) {
    return window.electron.ipcRenderer.moveDirectoryOrFile({
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
  }) {
    return window.electron.ipcRenderer.fixSelectedSubDirectoryOrFile({
      selectedSubDirectoryOrFile,
      selectedDirectory,
      selectedSubType,
    });
  },
  openExternal(url: string) {
    return window.electron.ipcRenderer.openExternal(url);
  },
  checkForUpdates() {
    return window.electron.ipcRenderer.checkForUpdates();
  },
  downloadUpdates() {
    return window.electron.ipcRenderer.downloadUpdates();
  },
  getDownloadUpdatesProgress() {
    return window.electron.ipcRenderer.getDownloadUpdatesProgress();
  },
  quitAndInstall() {
    return window.electron.ipcRenderer.quitAndInstall();
  },
  executeScript(args) {
    return window.electron.ipcRenderer.executeScript(args);
  },
  readFileAsBase64(path: string) {
    return window.electron.ipcRenderer.readFileAsBase64(path);
  },
  checkIfFileExists(path: string) {
    return window.electron.ipcRenderer.checkIfFileExists(path);
  },
  showItemInFolder(path: string) {
    return window.electron.ipcRenderer.showItemInFolder(path);
  },
};
