import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Services } from '@services';
import {
  CURLERROO_FILE_EXTENSION,
  IN_MEMORY_FILE_SYSTEM_DEFAULT_FILE_PATH,
  PATH_SEPARATOR,
  USE_IN_MEMORY_FILE_SYSTEM,
} from '@constants';
import { DocType } from '../../../../shared/types';
import { GetDirectoryInfoFunction } from '../../../../shared/file-interface';

export type SelectedDirectoryState = {
  selectedDirectory?: string;
  selectedSubDirectoryOrFile?: string;
  selectedSubType?: 'directory' | 'file';
  selectedDirectoryInfo?: Awaited<ReturnType<GetDirectoryInfoFunction>>;
};

export const loadDirectoryInfo = createAsyncThunk<
  Awaited<ReturnType<typeof Services.getDirectoryInfo>>,
  void,
  { state: { selectedDirectory: SelectedDirectoryState } }
>('selectedDirectory/loadDirectoryInfo', async (_, thunkAPI) => {
  const { selectedDirectory } = thunkAPI.getState().selectedDirectory;
  if (!selectedDirectory) {
    throw new Error('selectedDirectory is undefined');
  }
  return Services.getDirectoryInfo(selectedDirectory);
});

export const loadDirectoryInfoFromPath = createAsyncThunk<
  Awaited<ReturnType<typeof Services.getDirectoryInfo>>,
  string,
  { state: { selectedDirectory: SelectedDirectoryState } }
>('selectedDirectory/loadDirectoryInfoFromPath', async (path) => {
  return Services.getDirectoryInfo(path);
});

export const selectDirectory = createAsyncThunk<
  Awaited<ReturnType<typeof Services.selectDirectory>>,
  void,
  {
    state: { selectedDirectory: SelectedDirectoryState };
  }
>('selectedDirectory/selectDirectory', async (_, thunkAPI) => {
  const directoryPath = await Services.selectDirectory();
  if (!directoryPath) {
    return undefined;
  }
  await thunkAPI.dispatch(loadDirectoryInfoFromPath(directoryPath));
  return directoryPath;
});

export const createDirectory = createAsyncThunk<
  Promise<void>,
  void,
  { state: { selectedDirectory: SelectedDirectoryState } }
>('selectedDirectory/createDirectory', async (_, thunkAPI) => {
  const { selectedSubDirectoryOrFile, selectedSubType } =
    thunkAPI.getState().selectedDirectory;

  if (!selectedSubDirectoryOrFile) {
    throw new Error('selectedSubDirectoryOrFile is undefined');
  }

  if (selectedSubType === 'directory') {
    await Services.createDirectory(`${selectedSubDirectoryOrFile}/new-folder`);
  } else {
    await Services.createDirectory(
      `${selectedSubDirectoryOrFile
        .split(PATH_SEPARATOR)
        .slice(0, -1)
        .join(PATH_SEPARATOR)}/new-folder`,
    );
  }
  await thunkAPI.dispatch(loadDirectoryInfo());
});

export const createFile = createAsyncThunk<
  Awaited<ReturnType<typeof Services.createFile>>,
  void,
  { state: { selectedDirectory: SelectedDirectoryState } }
>('selectedDirectory/createFile', async (_, thunkAPI) => {
  const { selectedSubDirectoryOrFile, selectedSubType } =
    thunkAPI.getState().selectedDirectory;

  if (!selectedSubDirectoryOrFile) {
    throw new Error('selectedSubDirectoryOrFile is undefined');
  }

  const createResult = await (async () => {
    if (selectedSubType === 'directory') {
      return Services.createFile(
        `${selectedSubDirectoryOrFile}/new-file.${CURLERROO_FILE_EXTENSION}`,
      );
    }
    return Services.createFile(
      `${selectedSubDirectoryOrFile
        .split(PATH_SEPARATOR)
        .slice(0, -1)
        .join(PATH_SEPARATOR)}/new-file.${CURLERROO_FILE_EXTENSION}`,
    );
  })();
  await thunkAPI.dispatch(loadDirectoryInfo());
  return createResult;
});

export const createFileWithContent = createAsyncThunk<
  Awaited<ReturnType<typeof Services.createFile>>,
  { content: DocType; name?: string },
  { state: { selectedDirectory: SelectedDirectoryState } }
>(
  'selectedDirectory/createFileWithContent',
  async ({ content, name }, thunkAPI) => {
    const { selectedSubDirectoryOrFile, selectedSubType } =
      thunkAPI.getState().selectedDirectory;

    if (!selectedSubDirectoryOrFile) {
      throw new Error('selectedSubDirectoryOrFile is undefined');
    }

    const filename = name || `new-file.${CURLERROO_FILE_EXTENSION}`;

    const createResult = await (async () => {
      if (selectedSubType === 'directory') {
        return Services.createFile(`${selectedSubDirectoryOrFile}/${filename}`);
      }
      return Services.createFile(
        `${selectedSubDirectoryOrFile
          .split(PATH_SEPARATOR)
          .slice(0, -1)
          .join(PATH_SEPARATOR)}/${filename}`,
      );
    })();
    await thunkAPI.dispatch(loadDirectoryInfo());
    await Services.writeFile(createResult.filePath, {
      id: content.id,
      cells: content.cells,
      version: content.version,
      globalVariables: content.globalVariables,
      type: 'notebook',
      executingAllCells: content.executingAllCells,
    });
    return createResult;
  },
);

export const fixSelectedSubDirectoryOrFile = createAsyncThunk<
  {
    selectedSubDirectoryOrFile: string;
    selectedSubType: 'directory' | 'file';
  },
  void,
  { state: { selectedDirectory: SelectedDirectoryState } }
>(
  'selectedDirectory/fixSelectedSubDirectoryOrFile',
  async (_params, thunkAPI) => {
    const { selectedSubDirectoryOrFile, selectedDirectory, selectedSubType } =
      thunkAPI.getState().selectedDirectory;

    if (!selectedSubDirectoryOrFile || !selectedDirectory || !selectedSubType) {
      throw new Error('adfglkerhgd32');
    }

    const fixedPath = await Services.fixSelectedSubDirectoryOrFile({
      selectedSubDirectoryOrFile,
      selectedDirectory,
      selectedSubType,
    });

    return fixedPath;
  },
);

export const deleteDirectoryOrFile = createAsyncThunk<
  Promise<void>,
  string,
  { state: { selectedDirectory: SelectedDirectoryState } }
>('selectedDirectory/deleteDirectoryOrFile', async (path, thunkAPI) => {
  await Services.deleteDirectoryOrFile(path);

  await thunkAPI.dispatch(fixSelectedSubDirectoryOrFile());
  await thunkAPI.dispatch(loadDirectoryInfo());
});

export const renameDirectoryOrFile = createAsyncThunk<
  Promise<void>,
  {
    oldPath: string;
    newPath: string;
  },
  { state: { selectedDirectory: SelectedDirectoryState } }
>(
  'selectedDirectory/renameDirectoryOrFile',
  async ({ oldPath, newPath }, thunkAPI) => {
    await Services.renameDirectoryOrFile({
      oldPath,
      newPath,
    });
    await thunkAPI.dispatch(fixSelectedSubDirectoryOrFile());
    await thunkAPI.dispatch(loadDirectoryInfo());
  },
);

export const duplicateDirectoryOrFile = createAsyncThunk<
  Promise<void>,
  string,
  { state: { selectedDirectory: SelectedDirectoryState } }
>('selectedDirectory/duplicateDirectoryOrFile', async (filePath, thunkAPI) => {
  await Services.duplicateDirectoryOrFile(filePath);
  await thunkAPI.dispatch(loadDirectoryInfo());
});

export const moveDirectoryOrFile = createAsyncThunk<
  Promise<void>,
  {
    oldPath: string;
    newPath: string;
  },
  { state: { selectedDirectory: SelectedDirectoryState } }
>(
  'selectedDirectory/moveDirectoryOrFile',
  async ({ oldPath, newPath }, thunkAPI) => {
    await Services.moveDirectoryOrFile({
      oldPath,
      newPath,
    });
    await thunkAPI.dispatch(fixSelectedSubDirectoryOrFile());
    await thunkAPI.dispatch(loadDirectoryInfo());
  },
);

const initialState = {
  dragToDirectories: {},
  ...(USE_IN_MEMORY_FILE_SYSTEM
    ? {
        selectedDirectory: IN_MEMORY_FILE_SYSTEM_DEFAULT_FILE_PATH.split(
          PATH_SEPARATOR,
        )
          .slice(0, -1)
          .join(PATH_SEPARATOR),
        selectedSubDirectoryOrFile: IN_MEMORY_FILE_SYSTEM_DEFAULT_FILE_PATH,
        selectedSubType: 'file',
      }
    : {}),
} as SelectedDirectoryState;

export const selectedDirectorySlice = createSlice({
  name: 'selectedDirectory',
  initialState,
  reducers: {
    setSelectedSubDirectoryOrFile: (
      state,
      action: PayloadAction<{
        path: string;
        type: 'directory' | 'file';
      }>,
    ) => {
      state.selectedSubDirectoryOrFile = action.payload.path;
      state.selectedSubType = action.payload.type;
    },
    reset: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(selectDirectory.fulfilled, (state, action) => {
      if (!action.payload) {
        return;
      }
      state.selectedDirectory = action.payload;
      state.selectedSubDirectoryOrFile = action.payload;
      state.selectedSubType = 'directory';
    });
    builder.addCase(loadDirectoryInfo.fulfilled, (state, action) => {
      state.selectedDirectoryInfo = action.payload;
    });
    builder.addCase(loadDirectoryInfoFromPath.fulfilled, (state, action) => {
      state.selectedDirectoryInfo = action.payload;
    });
    builder.addCase(
      fixSelectedSubDirectoryOrFile.fulfilled,
      (state, action) => {
        state.selectedSubDirectoryOrFile =
          action.payload.selectedSubDirectoryOrFile;
        state.selectedSubType = action.payload.selectedSubType;
      },
    );
  },
});

export const { setSelectedSubDirectoryOrFile, reset } =
  selectedDirectorySlice.actions;

export default selectedDirectorySlice.reducer;
