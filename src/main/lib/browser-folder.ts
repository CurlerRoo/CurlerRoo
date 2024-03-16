import { dialog } from 'electron';
import { readFileAsBase64, writeFileFromBase64 } from '@file';
import { PATH_SEPARATOR } from '@constants';

export const selectDirectory = async (): Promise<string | undefined> => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  return result.filePaths[0];
};

export const exportFile = async ({
  base64,
  name,
}: {
  base64: string;
  name?: string;
}) => {
  const result = await dialog.showSaveDialog({});
  const destinationFilePath = result.filePath;
  if (!destinationFilePath) {
    return {
      destinationFilePath,
      canceled: true,
    };
  }
  await writeFileFromBase64(destinationFilePath, base64);
  return {
    destinationFilePath,
    canceled: false,
  };
};

export const importFile = async (): Promise<{
  base64: string;
  name: string;
}> => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
  });
  const base64 = await readFileAsBase64(result.filePaths[0]);
  return {
    base64,
    name: result.filePaths[0].split(PATH_SEPARATOR).pop() || '',
  };
};
