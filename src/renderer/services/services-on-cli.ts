import { DocType, Variable } from '../../shared/types';
import { ServicesType } from '../../shared/services-interface';
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
import { sendCurl } from '../../main/lib/send-curl-on-cli';
import { executeScript } from '../../shared/execute-script';

const keyValuePair = {} as Record<string, unknown>;

export const Services: ServicesType = {
  set(key: string, value: unknown) {
    keyValuePair[key] = value;
    return Promise.resolve();
  },
  get(key: string) {
    return Promise.resolve(keyValuePair[key]);
  },
  delete(key: string) {
    delete keyValuePair[key];
    return Promise.resolve();
  },
  clear() {
    Object.keys(keyValuePair).forEach((key) => {
      delete keyValuePair[key];
    });
    return Promise.resolve();
  },
  has(key: string) {
    return Promise.resolve(keyValuePair[key] !== undefined);
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
    throw new Error('Not supported');
  },
  importFile() {
    throw new Error('Not supported');
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
    return renameDirectoryOrFile({
      oldPath,
      newPath,
    });
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
    return moveDirectoryOrFile({
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
    return fixSelectedSubDirectoryOrFile({
      selectedSubDirectoryOrFile,
      selectedDirectory,
      selectedSubType,
    });
  },
  openExternal(url: string) {
    throw new Error('Not supported');
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
  executeScript(args) {
    return executeScript(args);
  },
  readFileAsBase64(path: string) {
    return readFileAsBase64(path);
  },
  checkIfFileExists(path: string) {
    return checkIfFileExists(path);
  },
  showItemInFolder(path: string) {
    throw new Error('Not supported');
  },
};
