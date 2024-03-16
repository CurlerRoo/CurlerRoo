import { Volume } from 'memfs';
import _ from 'lodash';
import Bluebird from 'bluebird';
import {
  DocOnDiskType,
  DocType,
  docOnDiskSchema,
  docSchema,
} from '../../shared/types';
import {
  IN_MEMORY_FILE_SYSTEM_DEFAULT_FILE_PATH,
  PATH_SEPARATOR,
} from '@constants';
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
import { debugLog } from '../../shared/utils';
import { getDocFromDocOnDisk } from '../../shared/get-doc-from-doc-on-disk';
import { ServicesOnExt, appReady, extInstalled } from './services-on-ext';
import { simpleExampleDocument } from '../../shared/simple-example-document';

const localStorageMaxSpaceInMB = 5;
const sparedSpaceInMB = 0.2;

const getLocalStorageUsedSpaceInMB = () => {
  let totalSize = 0;

  // Iterate through all keys in localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    const value = localStorage.getItem(key)!;

    // Calculate the size of each key's data and add it to the total size
    totalSize += (key.length + value.length) * 2; // key length + value length (in bytes)
  }

  // Convert total size to MB
  const totalSizeInMB = totalSize / (1024 * 1024);

  return totalSizeInMB;
};

let _volume = null as Awaited<ReturnType<typeof Volume.fromJSON>> | null;
const getVolume = async () => {
  if (_volume) {
    return _volume;
  }

  await appReady;

  const inMemoryFileSystem = await (() => {
    if (extInstalled) {
      return ServicesOnExt.get('inMemoryFileSystem');
    }
    return localStorage.getItem('inMemoryFileSystem');
  })();

  const parsed = JSON.parse(inMemoryFileSystem || '{}');
  if (_.size(parsed)) {
    _volume = Volume.fromJSON(parsed);
  } else {
    _volume = Volume.fromJSON({
      [IN_MEMORY_FILE_SYSTEM_DEFAULT_FILE_PATH]: JSON.stringify(
        simpleExampleDocument,
      ),
    });
  }
  return _volume;
};

const saveAndCheckIfShouldClean = async (volumeJSON: any) => {
  try {
    await appReady;
    if (extInstalled) {
      await ServicesOnExt.set('inMemoryFileSystem', JSON.stringify(volumeJSON));
      return false;
    }
    localStorage.setItem('inMemoryFileSystem', JSON.stringify(volumeJSON));
    const usedSpaceInMB = getLocalStorageUsedSpaceInMB();
    debugLog('usedSpaceInMB', usedSpaceInMB);
    return usedSpaceInMB > localStorageMaxSpaceInMB - sparedSpaceInMB;
  } catch (err: any) {
    if (err?.code === 22) {
      return true;
    }
    throw err;
  }
};

const stripeBodyBase64FromDoc = (doc: DocOnDiskType): DocOnDiskType => {
  return {
    ...doc,
    cells: doc.cells.map((cell) => ({
      ...cell,
      outputs: cell.outputs.map((output) => ({
        ...output,
        bodyBase64: '',
      })),
    })),
  };
};

const saveFileSystemToLocalStorage = async () => {
  const volume = await getVolume();
  const volumeJSON = _(volume.toJSON())
    .mapValues((value) => {
      try {
        if (!value) {
          return value;
        }
        const doc = JSON.parse(value) as DocOnDiskType;
        return JSON.stringify(stripeBodyBase64FromDoc(doc));
      } catch {
        return;
      }
    })
    .value();
  if (await saveAndCheckIfShouldClean(volumeJSON)) {
    const filesToClean = _(volumeJSON)
      .entries()
      .map(([key, value]) => {
        try {
          if (!value) {
            return;
          }
          const doc = JSON.parse(value) as DocOnDiskType;
          const lastResponseDate = _(doc.cells)
            .flatMap((cell) => cell.outputs)
            .map((output) => output.responseDate)
            .max();

          return {
            key,
            lastResponseDate,
            doc,
          };
        } catch {
          return;
        }
      })
      .flatMap((m) => (m ? [m] : []))
      .sortBy('lastResponseDate')
      .reverse()
      .value();

    const filesToDelete = filesToClean.slice();

    while (await saveAndCheckIfShouldClean(volumeJSON)) {
      const fileToClean = filesToClean.pop();
      if (!fileToClean) {
        while (await saveAndCheckIfShouldClean(volumeJSON)) {
          const fileToDelete = filesToDelete.pop();
          if (!fileToDelete) {
            break;
          }
          delete volumeJSON[fileToDelete.key];
        }
        break;
      }
      volumeJSON[fileToClean.key] = JSON.stringify({
        ...fileToClean.doc,
        cells: fileToClean.doc.cells.map((cell) => ({
          ...cell,
          send_status: 'idle',
          sending_id: undefined,
          outputs: [
            {
              protocol: '',
              bodyFilePath: '',
              body: [''],
              headers: {},
              status: 0,
              showSearch: false,
              responseDate: 0,
              formattedBody: '',
            },
          ],
        })),
      });
    }
  }
};

window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    saveFileSystemToLocalStorage();
  }
});

window.addEventListener('beforeunload', saveFileSystemToLocalStorage);

export const getDirectoryInfo: GetDirectoryInfoFunction = async (
  dirPath: string,
) => {
  const volume = await getVolume();
  const fs = volume.promises;
  const info = await fs.readdir(dirPath, { withFileTypes: true });
  const name = dirPath.split('/').slice(-1)[0];
  const data = {
    name,
    path: dirPath,
    children: await Bluebird.map(info, async (m: any) => ({
      ...m,
      ...(!m.mode.toString(8).startsWith('4')
        ? undefined
        : await getDirectoryInfo(`${dirPath}/${m.name}`.replace('//', '/'))),
    })),
  } as any;
  return data;
};

export const createDirectory: CreateDirectoryFunction = async (
  dirPath: string,
) => {
  const volume = await getVolume();
  const fs = volume.promises;
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
  const volume = await getVolume();
  const fs = volume.promises;
  const extension = filePath.split('.').slice(-1)[0];
  const parsedIndex = parseInt(
    filePath
      .split('-')
      .slice(-1)[0]
      .replace(new RegExp(`.${extension}$`), ''),
  );
  const isIndexed = !Number.isNaN(parsedIndex);
  const index = isIndexed ? parsedIndex : 0;
  const fileExisted = await fs
    .access(filePath)
    .then(() => true)
    .catch(() => false);
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
  const volume = await getVolume();
  const fs = volume.promises;
  await fs.rm(dirPath, { recursive: true, force: true });
};

export const readFile: ReadFileFunction = async (
  filePath: string,
): Promise<{
  parsed: DocType | null;
  type: 'valid' | 'invalid' | 'empty';
}> => {
  try {
    const volume = await getVolume();
    const fs = volume.promises;
    const text = await fs.readFile(filePath, 'utf-8').then((m) => m.toString());
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
    const volume = await getVolume();
    const fs = volume.promises;
    const parsedDocOnDisk = _.flow(
      (doc) => docSchema.parse(doc),
      (doc) => ({
        ...doc,
        cells: doc.cells.map((cell) => ({
          ...cell,
          send_status:
            cell.send_status === 'sending' ? 'idle' : cell.send_status,
          sending_id: undefined,
        })),
      }),
      (doc) => docOnDiskSchema.parse(doc),
    )(document);
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
  const volume = await getVolume();
  const fs = volume.promises;
  if (
    await fs
      .access(newPath)
      .then(() => true)
      .catch(() => false)
  ) {
    throw new Error('File or directory already exists');
  }
  await fs.rename(oldPath, newPath);
};

const _duplicateDirectoryOrFile = async (
  filePath: string,
  originalFilePath: string,
) => {
  const volume = await getVolume();
  const fs = volume.promises;
  const extension = filePath.split('.').slice(-1)[0];
  const pathWithoutExtension = filePath.replace(
    new RegExp(`.${extension}$`),
    '',
  );
  const parsedIndex = parseInt(pathWithoutExtension.split('-').slice(-1)[0]);
  const isIndexed = !Number.isNaN(parsedIndex);
  const index = isIndexed ? parsedIndex : 0;
  const fileExisted = await fs
    .access(pathWithoutExtension.concat(`.${extension}`))
    .then(() => true)
    .catch(() => false);
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
  const volume = await getVolume();
  const fs = volume.promises;
  if (
    await fs
      .access(newPath)
      .then(() => true)
      .catch(() => false)
  ) {
    throw new Error('File or directory already exists');
  }
  await fs.rename(oldPath, newPath);
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
    const volume = await getVolume();
    const fs = volume.promises;
    if (!selectedSubDirectoryOrFile.includes(selectedDirectory)) {
      return {
        selectedSubDirectoryOrFile: selectedDirectory,
        selectedSubType: 'directory',
      };
    }

    if (
      await fs
        .access(selectedSubDirectoryOrFile)
        .then(() => true)
        .catch(() => false)
    ) {
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
  const volume = await getVolume();
  const fs = volume.promises;
  return fs
    .readFile(filePath)
    .then((data) => data.toString('base64'))
    .catch(() => '');
};

export const writeFileFromBase64: WriteFileFromBase64Function = async (
  filePath: string,
  base64: string,
) => {
  const volume = await getVolume();
  const fs = volume.promises;
  const buffer = Buffer.from(base64, 'base64');
  await fs.writeFile(filePath, buffer);
};

export const checkIfFileExists: CheckIfFileExistsFunction = async (
  filePath: string,
) => {
  const volume = await getVolume();
  const fs = volume.promises;
  // because if pathPath is empty, it will return true
  if (!filePath) {
    return false;
  }
  return fs
    .access(filePath)
    .then(() => true)
    .catch(() => false);
};

export const copyFile: CopyFileFunction = async ({
  sourceFilePath,
  destinationFilePath,
}: {
  sourceFilePath: string;
  destinationFilePath: string;
}) => {
  const volume = await getVolume();
  const fs = volume.promises;
  await fs.copyFile(sourceFilePath, destinationFilePath);
};
