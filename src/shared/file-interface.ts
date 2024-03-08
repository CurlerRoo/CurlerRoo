import { DocType } from './types';

type DirectoryTree = {
  path: string;
  name: string;
  children?: DirectoryTree[];
};

export type GetDirectoryInfoFunction = (
  dirPath: string,
) => Promise<DirectoryTree>;

export type CreateDirectoryFunction = (dirPath: string) => Promise<void>;

export type CreateFileFunction = (filePath: string) => Promise<{
  filePath: string;
}>;

export type DeleteDirectoryOrFileFunction = (dirPath: string) => Promise<void>;

export type ReadFileFunction = (filePath: string) => Promise<{
  parsed: DocType | null;
  type: 'valid' | 'invalid' | 'empty';
}>;

export type WriteFileFunction = (
  filePath: string,
  document: DocType,
) => Promise<void>;

export type WriteFileFromBase64Function = (
  filePath: string,
  base64: string,
) => Promise<void>;

export type RenameDirectoryOrFileFunction = ({
  oldPath,
  newPath,
}: {
  oldPath: string;
  newPath: string;
}) => Promise<void>;

export type DuplicateDirectoryOrFileFunction = (
  filePath: string,
) => Promise<void>;

export type MoveDirectoryOrFileFunction = ({
  oldPath,
  newPath,
}: {
  oldPath: string;
  newPath: string;
}) => Promise<void>;

export type CopyFileFunction = ({
  sourceFilePath,
  destinationFilePath,
}: {
  sourceFilePath: string;
  destinationFilePath: string;
}) => Promise<void>;

export type FixSelectedSubDirectoryOrFileFunction = ({
  selectedDirectory,
  selectedSubDirectoryOrFile,
  selectedSubType,
}: {
  selectedDirectory: string;
  selectedSubDirectoryOrFile: string;
  selectedSubType: 'directory' | 'file';
}) => Promise<{
  selectedSubDirectoryOrFile: string;
  selectedSubType: 'directory' | 'file';
}>;

export type ReadFileAsBase64Function = (filePath: string) => Promise<string>;

export type CheckIfFileExistsFunction = (filePath: string) => Promise<boolean>;
