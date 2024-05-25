import fs from 'fs-extra';
import _ from 'lodash';
import dirTree from 'directory-tree';
import { DocType, docOnDiskSchema, docSchema } from '../../shared/types';
import { PATH_SEPARATOR } from '@constants';
import {
  GetDirectoryInfoFunction,
  CreateDirectoryFunction,
  CreateFileFunction,
  DeleteDirectoryOrFileFunction,
  ReadFileFunction,
  WriteFileFunction,
  RenameDirectoryOrFileFunction,
  DuplicateDirectoryOrFileFunction,
  MoveDirectoryOrFileFunction,
  CopyFileFunction,
  FixSelectedSubDirectoryOrFileFunction,
  ReadFileAsBase64Function,
  CheckIfFileExistsFunction,
  WriteFileFromBase64Function,
} from '../../shared/file-interface';
import { getDocFromDocOnDisk } from '../../shared/get-doc-from-doc-on-disk';
import { getDocOnDiskFromDoc } from '../../shared/get-doc-on-disk-from-doc';

export const getDirectoryInfo: GetDirectoryInfoFunction = async (
  dirPath: string,
) => {
  const data = dirTree(dirPath, { exclude: /.git/ });
  return data;
};

export const createDirectory: CreateDirectoryFunction = async (
  dirPath: string,
) => {
  const parsedIndex = parseInt(dirPath.split('-').slice(-1)[0]);
  const isIndexed = !Number.isNaN(parsedIndex);
  const index = isIndexed ? parsedIndex : 0;
  await fs.mkdir(dirPath).catch(async (err) => {
    if (err.code === 'EEXIST') {
      if (isIndexed) {
        await createDirectory(
          `${dirPath.split('-').slice(0, -1).join('-')}-${index + 1}`,
        );
      } else {
        await createDirectory(`${dirPath}-${index + 1}`);
      }
    }
  });
};

export const createFile: CreateFileFunction = async (
  filePath: string,
): Promise<{
  filePath: string;
}> => {
  const extension = filePath.split('.').slice(-1)[0];
  const parsedIndex = parseInt(
    filePath
      .split('-')
      .slice(-1)[0]
      .replace(new RegExp(`.${extension}$`), ''),
  );
  const isIndexed = !Number.isNaN(parsedIndex);
  const index = isIndexed ? parsedIndex : 0;
  const fileExisted = await fs.pathExists(filePath);
  if (fileExisted) {
    if (isIndexed) {
      return createFile(
        `${filePath
          .replace(new RegExp(`.${extension}$`), '')
          .split('-')
          .slice(0, -1)
          .join('-')}-${index + 1}.${extension}`,
      );
    }
    return createFile(
      `${filePath.replace(new RegExp(`.${extension}$`), '')}-${
        index + 1
      }.${extension}`,
    );
  }
  await fs.writeFile(filePath, '');
  return { filePath };
};

export const deleteDirectoryOrFile: DeleteDirectoryOrFileFunction = async (
  dirPath: string,
) => {
  await fs.remove(dirPath);
};

export const readFile: ReadFileFunction = async (
  filePath: string,
): Promise<{
  parsed: DocType | null;
  type: 'valid' | 'invalid' | 'empty';
}> => {
  try {
    const text = await fs.readFile(filePath, 'utf-8');
    if (
      !text
        .replaceAll('\n', '')
        .replaceAll(' ', '')
        .replaceAll('\t', '')
        .replaceAll('\r', '')
    ) {
      return { parsed: null, type: 'empty' };
    }
    const parsed = _.flow(
      (_text) => JSON.parse(_text),
      (doc) => docOnDiskSchema.parse(doc),
      getDocFromDocOnDisk,
    )(text);
    return { parsed, type: 'valid' };
  } catch (err) {
    console.error(err);
    return { parsed: null, type: 'invalid' };
  }
};

export const writeFile: WriteFileFunction = async (
  filePath: string,
  document: DocType,
) => {
  try {
    const parsedDocOnDisk = getDocOnDiskFromDoc(document);
    const text = JSON.stringify(parsedDocOnDisk, null, 2);
    // check if file exists
    await fs.access(filePath);
    await fs.writeFile(filePath, text);
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const renameDirectoryOrFile: RenameDirectoryOrFileFunction = async ({
  oldPath,
  newPath,
}: {
  oldPath: string;
  newPath: string;
}) => {
  if (await fs.pathExists(newPath)) {
    throw new Error('File or directory already exists');
  }
  await fs.rename(oldPath, newPath);
};

const _duplicateDirectoryOrFile = async (
  filePath: string,
  originalFilePath: string,
) => {
  const extension = filePath.split('.').slice(-1)[0];
  const pathWithoutExtension = filePath.replace(
    new RegExp(`.${extension}$`),
    '',
  );
  const parsedIndex = parseInt(pathWithoutExtension.split('-').slice(-1)[0]);
  const isIndexed = !Number.isNaN(parsedIndex);
  const index = isIndexed ? parsedIndex : 0;
  const fileExisted = await fs.pathExists(
    pathWithoutExtension.concat(`.${extension}`),
  );
  if (fileExisted) {
    if (isIndexed) {
      await _duplicateDirectoryOrFile(
        `${pathWithoutExtension.split('-').slice(0, -1).join('-')}-${
          index + 1
        }`.concat(`.${extension}`),
        originalFilePath || pathWithoutExtension,
      );
    } else {
      await _duplicateDirectoryOrFile(
        `${pathWithoutExtension}-${index + 1}`.concat(`.${extension}`),
        originalFilePath || pathWithoutExtension,
      );
    }
  }
  await fs.copyFile(
    originalFilePath,
    pathWithoutExtension.concat(`.${extension}`),
  );
};

export const duplicateDirectoryOrFile: DuplicateDirectoryOrFileFunction =
  async (filePath: string) => {
    await _duplicateDirectoryOrFile(filePath, filePath);
  };

export const moveDirectoryOrFile: MoveDirectoryOrFileFunction = async ({
  oldPath,
  newPath,
}: {
  oldPath: string;
  newPath: string;
}) => {
  await fs.move(oldPath, newPath);
};

export const copyFile: CopyFileFunction = async ({
  sourceFilePath,
  destinationFilePath,
}: {
  sourceFilePath: string;
  destinationFilePath: string;
}) => {
  await fs.copyFile(sourceFilePath, destinationFilePath);
};

export const fixSelectedSubDirectoryOrFile: FixSelectedSubDirectoryOrFileFunction =
  async ({
    selectedDirectory,
    selectedSubDirectoryOrFile,
    selectedSubType,
  }: {
    selectedDirectory: string;
    selectedSubDirectoryOrFile: string;
    selectedSubType: 'directory' | 'file';
  }): Promise<{
    selectedSubDirectoryOrFile: string;
    selectedSubType: 'directory' | 'file';
  }> => {
    if (!selectedSubDirectoryOrFile.includes(selectedDirectory)) {
      return {
        selectedSubDirectoryOrFile: selectedDirectory,
        selectedSubType: 'directory',
      };
    }

    if (await fs.pathExists(selectedSubDirectoryOrFile)) {
      return {
        selectedSubDirectoryOrFile,
        selectedSubType,
      };
    }
    return fixSelectedSubDirectoryOrFile({
      selectedDirectory,
      selectedSubDirectoryOrFile: `${selectedSubDirectoryOrFile
        .split(PATH_SEPARATOR)
        .slice(0, -1)}`,
      selectedSubType: 'directory',
    });
  };

export const readFileAsBase64: ReadFileAsBase64Function = async (
  filePath: string,
) => {
  return fs
    .readFile(filePath)
    .then((data) => data.toString('base64'))
    .catch(() => '');
};

export const writeFileFromBase64: WriteFileFromBase64Function = async (
  filePath: string,
  base64: string,
) => {
  const buffer = Buffer.from(base64, 'base64');
  await fs.writeFile(filePath, buffer);
};

export const checkIfFileExists: CheckIfFileExistsFunction = async (
  filePath: string,
) => {
  return fs.pathExists(filePath);
};
