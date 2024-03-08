import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ProgressInfo, UpdateCheckResult } from 'electron-updater';
import { Services } from '@services';

export type UpdatesState = {
  updateStatus: 'idle' | 'checking' | 'downloading' | 'downloaded';
  downloadUpdatesProgress: Pick<ProgressInfo, 'percent'>;
  lastCheckedForUpdatesVersion?: string;
};

export const checkForUpdates = createAsyncThunk<
  Promise<UpdateCheckResult | null>,
  void,
  { state: { updates: UpdatesState } }
>('updates/checkForUpdates', () => {
  return Services.checkForUpdates();
});

export const downloadUpdates = createAsyncThunk<
  void,
  void,
  { state: { updates: UpdatesState } }
>('updates/downloadUpdates', async () => {
  await Services.downloadUpdates();
});

export const getDownloadUpdatesProgress = createAsyncThunk<
  Pick<ProgressInfo, 'percent'>,
  void,
  { state: { updates: UpdatesState } }
>('updates/updateDownloadProgress', async () => {
  const progress = await Services.getDownloadUpdatesProgress();
  if (!progress) {
    return {
      percent: 0,
    };
  }
  return {
    percent: progress.percent,
  };
});

export const quitAndInstallUpdates = createAsyncThunk<
  void,
  void,
  { state: { updates: UpdatesState } }
>('updates/quitAndInstallUpdates', async () => {
  await Services.quitAndInstall();
});

const initialState = {
  updateStatus: 'idle',
  downloadUpdatesProgress: {
    percent: 0,
  },
} as UpdatesState;

export const updatesSlice = createSlice({
  name: 'updates',
  initialState,
  reducers: {
    setLastCheckedForUpdatesVersion: (state, action: PayloadAction<string>) => {
      state.lastCheckedForUpdatesVersion = action.payload;
    },
    resetCheckForUpdatesProcess: (state) => {
      state.updateStatus = 'idle';
      state.downloadUpdatesProgress = {
        percent: 0,
      };
    },
    reset: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(checkForUpdates.pending, (state) => {
      state.updateStatus = 'checking';
    });
    builder.addCase(checkForUpdates.fulfilled, (state) => {
      state.updateStatus = 'idle';
      state.downloadUpdatesProgress = {
        percent: 0,
      };
    });
    builder.addCase(checkForUpdates.rejected, (state) => {
      state.updateStatus = 'idle';
      state.downloadUpdatesProgress = {
        percent: 0,
      };
    });
    builder.addCase(downloadUpdates.pending, (state) => {
      state.updateStatus = 'downloading';
    });
    builder.addCase(downloadUpdates.fulfilled, (state) => {
      state.updateStatus = 'downloaded';
    });
    builder.addCase(downloadUpdates.rejected, (state) => {
      state.updateStatus = 'idle';
      state.downloadUpdatesProgress = {
        percent: 0,
      };
    });
    builder.addCase(getDownloadUpdatesProgress.fulfilled, (state, action) => {
      state.downloadUpdatesProgress = action.payload;
    });
    builder.addCase(quitAndInstallUpdates.pending, (state) => {
      state.updateStatus = 'idle';
      state.downloadUpdatesProgress = {
        percent: 0,
      };
    });
    builder.addCase(quitAndInstallUpdates.fulfilled, (state) => {
      state.updateStatus = 'idle';
      state.downloadUpdatesProgress = {
        percent: 0,
      };
    });
    builder.addCase(quitAndInstallUpdates.rejected, (state) => {
      state.updateStatus = 'idle';
      state.downloadUpdatesProgress = {
        percent: 0,
      };
    });
  },
});

export const {
  setLastCheckedForUpdatesVersion,
  resetCheckForUpdatesProcess,
  reset,
} = updatesSlice.actions;

export default updatesSlice.reducer;
