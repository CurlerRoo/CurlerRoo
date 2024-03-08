import { ProgressInfo, UpdateCheckResult } from 'electron-updater';
import { Variable } from './types';
import {
  CheckIfFileExistsFunction,
  CreateDirectoryFunction,
  CreateFileFunction,
  DeleteDirectoryOrFileFunction,
  DuplicateDirectoryOrFileFunction,
  FixSelectedSubDirectoryOrFileFunction,
  GetDirectoryInfoFunction,
  MoveDirectoryOrFileFunction,
  ReadFileAsBase64Function,
  ReadFileFunction,
  RenameDirectoryOrFileFunction,
  WriteFileFunction,
} from './file-interface';
import { SendCurlFunction } from './send-curl-interface';

export type ExecuteScriptArgs = {
  postScript: string;
  resBody?: string;
  resHeaders?: { [key: string]: string };
  existingVariables?: Variable[];
};

export type ServicesType = {
  set(key: string, value: unknown): Promise<any>;
  get(key: string): Promise<any>;
  delete(key: string): Promise<any>;
  clear(): Promise<any>;
  has(key: string): Promise<any>;
  sendCurl: SendCurlFunction;
  selectDirectory(): Promise<string | undefined>;
  exportFile({
    base64,
    name,
  }: {
    base64: string;
    name?: string;
  }): Promise<void>;
  importFile(): Promise<{ base64: string; name: string }>;
  getDirectoryInfo: GetDirectoryInfoFunction;
  createDirectory: CreateDirectoryFunction;
  createFile: CreateFileFunction;
  deleteDirectoryOrFile: DeleteDirectoryOrFileFunction;
  readFile: ReadFileFunction;
  writeFile: WriteFileFunction;
  renameDirectoryOrFile: RenameDirectoryOrFileFunction;
  duplicateDirectoryOrFile: DuplicateDirectoryOrFileFunction;
  moveDirectoryOrFile: MoveDirectoryOrFileFunction;
  fixSelectedSubDirectoryOrFile: FixSelectedSubDirectoryOrFileFunction;
  openExternal(url: string): Promise<any>;
  checkForUpdates(): Promise<UpdateCheckResult | null>;
  downloadUpdates(): Promise<void>;
  getDownloadUpdatesProgress(): Promise<ProgressInfo | undefined>;
  quitAndInstall(): Promise<void>;
  executeScript(args: ExecuteScriptArgs): Promise<{
    variables: Variable[];
  }>;
  readFileAsBase64: ReadFileAsBase64Function;
  checkIfFileExists: CheckIfFileExistsFunction;
  showItemInFolder(path: string): Promise<void>;
};
