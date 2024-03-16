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
import { DocType, Variable } from '../../shared/types';
import { executeScript } from '../../shared/execute-script';
import { ServicesType } from '../../shared/services-interface';

const setItem = (key: string, value: unknown) => {
  return Promise.resolve(localStorage.setItem(key, JSON.stringify(value)));
};

const getItem = (key: string) => {
  return Promise.resolve(JSON.parse(localStorage.getItem(key) as string));
};

const removeItem = (key: string) => {
  return Promise.resolve(localStorage.removeItem(key));
};

const clear = () => {
  return Promise.resolve(localStorage.clear());
};

const has = (key: string) => {
  return Promise.resolve(localStorage.getItem(key) != null);
};

export const Services: ServicesType = {
  set(key: string, value: unknown) {
    return setItem(key, value);
  },
  get(key: string) {
    return getItem(key);
  },
  delete(key: string) {
    return removeItem(key);
  },
  clear() {
    return clear();
  },
  has(key: string) {
    return has(key);
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
    return sendCurl({ curlRequest, variables, selectedDirectory });
  },
  selectDirectory() {
    throw new Error('Not supported');
  },
  exportFile({ base64, name }: { base64: string; name?: string }) {
    const a = document.createElement('a');
    a.href = 'data:application/octet-stream;base64,' + base64;
    if (name) {
      a.download = name;
    }
    a.click();
    a.remove();
    return Promise.resolve({
      canceled: false,
      destinationFilePath: undefined,
    });
  },
  async importFile() {
    return new Promise<{
      base64: string;
      name: string;
    }>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.crr';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              const base64 = reader.result.split(',')[1];
              resolve({ base64, name: file.name });
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    });
  },
  getDirectoryInfo(path: string) {
    return getDirectoryInfo(path);
  },
  createDirectory(path: string) {
    return createDirectory(path);
  },
  createFile(path: string) {
    return createFile(path);
  },
  deleteDirectoryOrFile(path: string) {
    return deleteDirectoryOrFile(path);
  },
  readFile(path: string) {
    return readFile(path);
  },
  writeFile(path: string, document: DocType) {
    return writeFile(path, document);
  },
  renameDirectoryOrFile({
    oldPath,
    newPath,
  }: {
    oldPath: string;
    newPath: string;
  }) {
    return renameDirectoryOrFile({ oldPath, newPath });
  },
  duplicateDirectoryOrFile(filePath: string) {
    return duplicateDirectoryOrFile(filePath);
  },
  moveDirectoryOrFile({
    oldPath,
    newPath,
  }: {
    oldPath: string;
    newPath: string;
  }) {
    return moveDirectoryOrFile({ oldPath, newPath });
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
    return fixSelectedSubDirectoryOrFile({
      selectedSubDirectoryOrFile,
      selectedDirectory,
      selectedSubType,
    });
  },
  openExternal(url: string) {
    window.open(url, '_blank');
    return Promise.resolve();
  },
  executeScript(args) {
    return executeScript(args);
  },
  readFileAsBase64(path: string) {
    return readFileAsBase64(path);
  },
  checkIfFileExists(path: string) {
    return checkIfFileExists(path);
  },
  checkForUpdates() {
    throw new Error('Not supported');
  },
  downloadUpdates() {
    throw new Error('Not supported');
  },
  getDownloadUpdatesProgress() {
    throw new Error('Not supported');
  },
  quitAndInstall() {
    throw new Error('Not supported');
  },
  showItemInFolder(path: string) {
    throw new Error('Not supported');
  },
};
