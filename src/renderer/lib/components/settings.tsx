import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Switch from 'rc-switch';
import 'rc-switch/assets/index.css';
import { Services } from '@services';
import { modal } from './modal';
import { AppDispatch, RootState } from '../../state/store';
import { allowAnalytics } from '../../state/features/user/user';
import {
  APP_VERSION,
  COLORS,
  THEME,
  ENABLE_TELEMETRY_FEATURE,
  ENABLE_UPDATE_FEATURE,
} from '@constants';
import { TextButton } from './text-button';
import {
  checkForUpdates,
  downloadUpdates,
  getDownloadUpdatesProgress,
  quitAndInstallUpdates,
} from '../../state/features/updates/updates';

export function InstallUpdatesModalContent({
  onClose,
}: {
  onClose: () => void;
}) {
  const dispatch: AppDispatch = useDispatch();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <p>Download update complete. Do you want to install it now?</p>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <TextButton
          onClick={async () => {
            onClose();
            const { close } = modal({
              content: (
                <div>
                  <p style={{ fontSize: 14 }}>
                    Installing updates. The application may become unresponsive
                    for a while. Please be patient.
                  </p>
                  <p style={{ fontSize: 16 }}>
                    Please DO NOT close the application.
                  </p>
                </div>
              ),
            });
            const { error } = await dispatch(quitAndInstallUpdates()).then(
              (m) => m as { error: any },
            );
            if (error) {
              close();
              modal({
                content: (
                  <div>
                    <p>Failed to install updates.</p>
                    <p>Info: {error?.message}</p>
                  </div>
                ),
              });
            }
          }}
        >
          Yes
        </TextButton>
        <TextButton onClick={() => onClose()}>No</TextButton>
      </div>
    </div>
  );
}

export function UpdateAvailableModalContent({
  onClose,
  onRemindMeLater,
  version,
}: {
  onClose: () => void;
  onRemindMeLater?: () => void;
  version: string;
}) {
  const dispatch: AppDispatch = useDispatch();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <p>
        New version ({version}) available. Do you want to download and install
        it?
      </p>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <TextButton
          onClick={async () => {
            onClose();
            const { error } = await dispatch(downloadUpdates()).then(
              (m) => m as { error: any },
            );
            if (error) {
              modal({
                content: (
                  <div>
                    <p>Failed to download updates.</p>
                    <p>Info: {error?.message}</p>
                  </div>
                ),
              });
              return;
            }

            const { close } = modal({
              content: <InstallUpdatesModalContent onClose={() => close()} />,
            });
          }}
        >
          Yes
        </TextButton>
        <TextButton onClick={onClose}>No</TextButton>
        <TextButton onClick={onRemindMeLater}>Remind me later</TextButton>
      </div>
    </div>
  );
}

export function SettingsModalContent() {
  const { allowedAnalytics } = useSelector((state: RootState) => state.user);
  const dispatch: AppDispatch = useDispatch();
  const { downloadUpdatesProgress, updateStatus } = useSelector(
    (state: RootState) => state.updates,
  );
  useEffect(() => {
    const timer =
      updateStatus === 'downloading' &&
      setInterval(() => {
        dispatch(getDownloadUpdatesProgress());
      }, 100);
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [updateStatus, dispatch]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 20,
      }}
    >
      {ENABLE_UPDATE_FEATURE && (
        <>
          <div style={{ display: 'flex', gap: 10 }}>
            <span>CurlerRoo</span>
            <span>|</span>
            <span>Version: {APP_VERSION}</span>
            <span>|</span>
            <span
              style={{
                display: 'flex',
                gap: 20,
              }}
            >
              {updateStatus === 'idle' ? (
                <button
                  style={{
                    border: 'none',
                    background: 'none',
                    color: `#${COLORS[THEME].MID_BLUE}`,
                    cursor: 'pointer',
                    padding: 0,
                    margin: 0,
                  }}
                  onClick={async () => {
                    const { payload: checkUpdateResult, error } =
                      await dispatch(checkForUpdates()).then(
                        (m) =>
                          m as {
                            payload: Awaited<
                              ReturnType<typeof Services.checkForUpdates>
                            >;
                            error: any;
                          },
                      );
                    if (error) {
                      modal({
                        content: (
                          <div>
                            <p>Failed to check for updates.</p>
                            <p>Info: {error?.message}</p>
                          </div>
                        ),
                      });
                      return;
                    }
                    if (
                      checkUpdateResult?.updateInfo?.version &&
                      checkUpdateResult?.updateInfo?.version !== APP_VERSION
                    ) {
                      const { close } = modal({
                        content: (
                          <UpdateAvailableModalContent
                            onClose={() => close()}
                            version={checkUpdateResult?.updateInfo?.version}
                          />
                        ),
                      });
                    } else {
                      modal({
                        content: (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                            }}
                          >
                            <p>
                              You are already on the latest version of
                              CurlerRoo!
                            </p>
                          </div>
                        ),
                      });
                    }
                  }}
                >
                  Check for updates
                </button>
              ) : null}
              {updateStatus === 'checking' ? (
                <div>Checking for updates...</div>
              ) : null}
              {updateStatus === 'downloading' ? (
                <div style={{ display: 'flex', flexDirection: 'row', gap: 10 }}>
                  <div>Downloading updates...</div>
                  <div>{Math.round(downloadUpdatesProgress.percent)}%</div>
                </div>
              ) : null}
              {updateStatus === 'downloaded' ? (
                <button
                  style={{
                    border: 'none',
                    background: 'none',
                    color: `#${COLORS[THEME].MID_BLUE}`,
                    cursor: 'pointer',
                    padding: 0,
                    margin: 0,
                  }}
                  onClick={async () => {
                    const { close } = modal({
                      content: (
                        <div>
                          <p style={{ fontSize: 14 }}>
                            Installing updates. The application may become
                            unresponsive for a while. Please be patient.
                          </p>
                          <p style={{ fontSize: 16 }}>
                            Please DO NOT close the application.
                          </p>
                        </div>
                      ),
                    });
                    const { error } = await dispatch(
                      quitAndInstallUpdates(),
                    ).then((m) => m as { error: any });
                    if (error) {
                      close();
                      modal({
                        content: (
                          <div>
                            <p>Failed to install updates.</p>
                            <p>Info: {error?.message}</p>
                          </div>
                        ),
                      });
                    }
                  }}
                >
                  Install updates
                </button>
              ) : null}
            </span>
          </div>
          <div>
            <p style={{ margin: 0 }}>
              You can also download the latest updates manually at{' '}
              <button
                style={{
                  border: 'none',
                  background: 'none',
                  color: `#${COLORS[THEME].MID_BLUE}`,
                  cursor: 'pointer',
                  padding: 0,
                  margin: 0,
                }}
                onClick={() => {
                  Services.openExternal(
                    'https://github.com/CurlerRoo/CurlerRoo/releases',
                  );
                }}
              >
                Github
              </button>
            </p>
          </div>
        </>
      )}
      {ENABLE_TELEMETRY_FEATURE && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Switch
            checked={allowedAnalytics ?? false}
            onChange={(checked) => {
              dispatch(allowAnalytics(checked));
            }}
          />
          <div>
            Allow us to collect anonymous usage data to improve the application
            and make it better.
          </div>
        </div>
      )}
    </div>
  );
}

export const showSettings = () => {
  modal({
    content: <SettingsModalContent />,
  });
};
