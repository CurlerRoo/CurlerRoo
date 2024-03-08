import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { UpdateInfo } from 'electron-updater';
import { Services } from '@services';
import { UpdateAvailableModalContent } from '../components/settings';
import { AppDispatch, RootState } from '../../state/store';
import {
  checkForUpdates,
  resetCheckForUpdatesProcess,
  setLastCheckedForUpdatesVersion,
} from '../../state/features/updates/updates';
import { modal } from '../components/modal';
import { APP_VERSION } from '@constants';

export const useAutoCheckForUpdates = () => {
  const dispatch: AppDispatch = useDispatch();
  const { lastCheckedForUpdatesVersion } = useSelector(
    (state: RootState) => state.updates,
  );
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | undefined>();

  useEffect(() => {
    dispatch(resetCheckForUpdatesProcess());
  }, [dispatch]);

  useEffect(() => {
    (async () => {
      const checkForUpdatesResult = await dispatch(checkForUpdates()).then(
        (m) =>
          m as {
            payload: Awaited<ReturnType<typeof Services.checkForUpdates>>;
            error: any;
          },
      );
      if (checkForUpdatesResult.payload?.updateInfo) {
        setUpdateInfo(checkForUpdatesResult.payload?.updateInfo);
      }
    })();
  }, [dispatch]);

  useEffect(() => {
    if (!updateInfo) {
      return;
    }
    if (updateInfo.version === lastCheckedForUpdatesVersion) {
      return;
    }
    if (updateInfo.version === APP_VERSION) {
      return;
    }
    const { close } = modal({
      content: (
        <UpdateAvailableModalContent
          onClose={() => {
            close();
            dispatch(setLastCheckedForUpdatesVersion(updateInfo?.version));
          }}
          onRemindMeLater={() => {
            close();
          }}
          version={updateInfo?.version}
        />
      ),
    });
  }, [dispatch, updateInfo, lastCheckedForUpdatesVersion]);
};
