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
import { ignoredDirectoryAndFile } from '../../../lib/components/constants';

export type SelectedDirectoryState = {
  selectedDirectory?: string;
  selectedSubDirectoryOrFile?: string;
  selectedSubType?: 'directory' | 'file';
  selectedDirectoryInfo?: Awaited<ReturnType<GetDirectoryInfoFunction>>;
  // Custom file order per directory: { [directoryPath]: [filePath1, filePath2, ...] }
  fileOrder: {
    [directoryPath: string]: string[];
  };
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
  {
    path?: string;
  },
  { state: { selectedDirectory: SelectedDirectoryState } }
>('selectedDirectory/createDirectory', async ({ path }, thunkAPI) => {
  if (path) {
    await Services.createDirectory(path);
    await thunkAPI.dispatch(loadDirectoryInfo());
    return;
  }

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
      shared_id: content.shared_id,
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
    selectedDirectory: string;
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
      // reset the file system if it's broken
      return {
        selectedDirectory: IN_MEMORY_FILE_SYSTEM_DEFAULT_FILE_PATH.split(
          PATH_SEPARATOR,
        )
          .slice(0, -1)
          .join(PATH_SEPARATOR),
        selectedSubDirectoryOrFile: IN_MEMORY_FILE_SYSTEM_DEFAULT_FILE_PATH,
        selectedSubType: 'file',
      };
    }

    const fixedPath = await Services.fixSelectedSubDirectoryOrFile({
      selectedSubDirectoryOrFile,
      selectedDirectory,
      selectedSubType,
    });

    return {
      selectedDirectory,
      ...fixedPath,
    };
  },
);

export const deleteDirectoryOrFile = createAsyncThunk<
  Promise<void>,
  string,
  { state: { selectedDirectory: SelectedDirectoryState } }
>('selectedDirectory/deleteDirectoryOrFile', async (path, thunkAPI) => {
  await Services.deleteDirectoryOrFile(path);

  // Remove from order in parent directory
  const parentDirectory = path.replace(/[^/]+$/, '').slice(0, -1);
  thunkAPI.dispatch(
    removeFileFromOrder({
      directoryPath: parentDirectory,
      filePath: path,
    }),
  );

  // Also remove from order if it's a directory (remove all its children's orders)
  const state = thunkAPI.getState().selectedDirectory;
  const fileOrder = state.fileOrder;
  Object.keys(fileOrder).forEach((dirPath) => {
    if (dirPath.startsWith(path + '/') || dirPath === path) {
      // This directory or its subdirectories are being deleted
      // The order will be cleaned up naturally when directories are reloaded
    }
  });

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

    // Update order in parent directory
    const parentDirectory = oldPath.replace(/[^/]+$/, '').slice(0, -1);
    const state = thunkAPI.getState().selectedDirectory;
    const currentOrder = state.fileOrder[parentDirectory] || [];
    const updatedOrder = currentOrder.map((path) =>
      path === oldPath ? newPath : path,
    );
    if (updatedOrder.length > 0) {
      thunkAPI.dispatch(
        reorderFilesInDirectory({
          directoryPath: parentDirectory,
          orderedPaths: updatedOrder,
        }),
      );
    }

    // If it's a directory, update all orders that reference paths under it
    Object.keys(state.fileOrder).forEach((dirPath) => {
      if (dirPath.startsWith(oldPath + '/')) {
        const newDirPath = dirPath.replace(oldPath, newPath);
        const order = state.fileOrder[dirPath];
        thunkAPI.dispatch(
          reorderFilesInDirectory({
            directoryPath: newDirPath,
            orderedPaths: order.map((path) => path.replace(oldPath, newPath)),
          }),
        );
      }
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
  fileOrder: {},
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
    reorderFilesInDirectory: (
      state,
      action: PayloadAction<{
        directoryPath: string;
        orderedPaths: string[];
      }>,
    ) => {
      state.fileOrder[action.payload.directoryPath] =
        action.payload.orderedPaths;
    },
    removeFileFromOrder: (
      state,
      action: PayloadAction<{
        directoryPath: string;
        filePath: string;
      }>,
    ) => {
      const order = state.fileOrder[action.payload.directoryPath];
      if (order) {
        state.fileOrder[action.payload.directoryPath] = order.filter(
          (path) => path !== action.payload.filePath,
        );
      }
    },
    addFileToOrder: (
      state,
      action: PayloadAction<{
        directoryPath: string;
        filePath: string;
        index?: number;
      }>,
    ) => {
      const { directoryPath, filePath, index } = action.payload;
      if (!state.fileOrder[directoryPath]) {
        state.fileOrder[directoryPath] = [];
      }
      const order = state.fileOrder[directoryPath];
      // Remove if already exists
      const filteredOrder = order.filter((path) => path !== filePath);
      // Add at specified index or at the end
      if (index !== undefined && index >= 0 && index < filteredOrder.length) {
        filteredOrder.splice(index, 0, filePath);
      } else {
        filteredOrder.push(filePath);
      }
      state.fileOrder[directoryPath] = filteredOrder;
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
      // Automatically track all files in all directories and cleanup missing files
      const trackDirectory = (dir: typeof action.payload) => {
        if (!dir || !dir.children) {
          return;
        }
        const dirPath = dir.path;
        const currentOrder = state.fileOrder[dirPath] || [];
        const currentOrderSet = new Set(currentOrder);

        // Get all children paths
        const allPaths = dir.children
          .filter((child) => !ignoredDirectoryAndFile.includes(child.name))
          .map((child) => child.path);
        const allPathsSet = new Set(allPaths);

        // Remove paths that no longer exist (cleanup missing files)
        const cleanedOrder = currentOrder.filter((path) =>
          allPathsSet.has(path),
        );

        // Add any missing paths to the order
        const missingPaths = allPaths.filter(
          (path) => !currentOrderSet.has(path),
        );
        if (missingPaths.length > 0) {
          // Sort missing paths by default order (directories first, then alphabetically)
          const sortedMissing = missingPaths.sort((a, b) => {
            const childA = dir.children?.find((c) => c.path === a);
            const childB = dir.children?.find((c) => c.path === b);
            if (!childA || !childB) {
              return 0;
            }
            const isDirA = !!childA.children;
            const isDirB = !!childB.children;
            if (isDirA && !isDirB) {
              return -1;
            }
            if (!isDirA && isDirB) {
              return 1;
            }
            return childA.name
              .toLowerCase()
              .localeCompare(childB.name.toLowerCase());
          });

          // Append missing paths to the end of the cleaned order
          state.fileOrder[dirPath] = [...cleanedOrder, ...sortedMissing];
        } else if (cleanedOrder.length !== currentOrder.length) {
          // Only update if we removed some paths
          state.fileOrder[dirPath] = cleanedOrder;
        }

        // Recursively track subdirectories
        dir.children.forEach((child) => {
          if (child.children) {
            trackDirectory(child);
          }
        });
      };
      trackDirectory(action.payload);
    });
    builder.addCase(loadDirectoryInfoFromPath.fulfilled, (state, action) => {
      state.selectedDirectoryInfo = action.payload;
      // Automatically track all files in all directories and cleanup missing files (same logic as loadDirectoryInfo)
      const trackDirectory = (dir: typeof action.payload) => {
        if (!dir || !dir.children) {
          return;
        }
        const dirPath = dir.path;
        const currentOrder = state.fileOrder[dirPath] || [];
        const currentOrderSet = new Set(currentOrder);

        // Get all children paths
        const allPaths = dir.children
          .filter((child) => !ignoredDirectoryAndFile.includes(child.name))
          .map((child) => child.path);
        const allPathsSet = new Set(allPaths);

        // Remove paths that no longer exist (cleanup missing files)
        const cleanedOrder = currentOrder.filter((path) =>
          allPathsSet.has(path),
        );

        // Add any missing paths to the order
        const missingPaths = allPaths.filter(
          (path) => !currentOrderSet.has(path),
        );
        if (missingPaths.length > 0) {
          // Sort missing paths by default order (directories first, then alphabetically)
          const sortedMissing = missingPaths.sort((a, b) => {
            const childA = dir.children?.find((c) => c.path === a);
            const childB = dir.children?.find((c) => c.path === b);
            if (!childA || !childB) {
              return 0;
            }
            const isDirA = !!childA.children;
            const isDirB = !!childB.children;
            if (isDirA && !isDirB) {
              return -1;
            }
            if (!isDirA && isDirB) {
              return 1;
            }
            return childA.name
              .toLowerCase()
              .localeCompare(childB.name.toLowerCase());
          });

          // Append missing paths to the end of the cleaned order
          state.fileOrder[dirPath] = [...cleanedOrder, ...sortedMissing];
        } else if (cleanedOrder.length !== currentOrder.length) {
          // Only update if we removed some paths
          state.fileOrder[dirPath] = cleanedOrder;
        }

        // Recursively track subdirectories
        dir.children.forEach((child) => {
          if (child.children) {
            trackDirectory(child);
          }
        });
      };
      trackDirectory(action.payload);
    });
    builder.addCase(
      fixSelectedSubDirectoryOrFile.fulfilled,
      (state, action) => {
        state.selectedSubDirectoryOrFile =
          action.payload.selectedSubDirectoryOrFile;
        state.selectedSubType = action.payload.selectedSubType;
        state.selectedDirectory = action.payload.selectedDirectory;
      },
    );
  },
});

export const {
  setSelectedSubDirectoryOrFile,
  reorderFilesInDirectory,
  removeFileFromOrder,
  addFileToOrder,
  reset,
} = selectedDirectorySlice.actions;

export default selectedDirectorySlice.reducer;
