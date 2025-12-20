import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Switch from 'rc-switch';
import 'rc-switch/assets/index.css';
import { Services } from '@services';
import { modal } from './modal';
import { AppDispatch, RootState } from '../../state/store';
import {
  allowAnalytics,
  setWordWrappingInEditor,
  setMaxSendHistoryEntries,
} from '../../state/features/user/user';
import {
  APP_VERSION,
  COLORS,
  ENABLE_TELEMETRY_FEATURE,
  ENABLE_UPDATE_FEATURE,
} from '@constants';
import { useTheme, useColors } from '../contexts/theme-context';
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
  const dispatch: AppDispatch = useDispatch();
  const { preference, setPreference } = useTheme();
  const colors = useColors();
  const { allowedAnalytics, wordWrappingInEditor, maxSendHistoryEntries } =
    useSelector((state: RootState) => state.user);
  useEffect(() => {
    if (wordWrappingInEditor === undefined) {
      // Set default value to true if unset (user upgrading from older version)
      dispatch(setWordWrappingInEditor(true));
    }
    if (maxSendHistoryEntries === undefined) {
      // Set default value to 20 if unset (user upgrading from older version)
      dispatch(setMaxSendHistoryEntries(20));
    }
  }, [dispatch, wordWrappingInEditor, maxSendHistoryEntries]);
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
        color: `#${colors.TEXT_PRIMARY}`,
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
                    color: `#${colors.LINK}`,
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
                    color: `#${colors.LINK}`,
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
                  color: `#${colors.LINK}`,
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 'bold' }}>Theme</div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginLeft: 10,
          }}
        >
          <label
            htmlFor="theme-light"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <input
              id="theme-light"
              type="radio"
              name="theme"
              value="LIGHT_MODE"
              checked={preference === 'LIGHT_MODE'}
              onChange={() => setPreference('LIGHT_MODE')}
              style={{ cursor: 'pointer' }}
            />
            <span>Light</span>
          </label>
          <label
            htmlFor="theme-dark"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <input
              id="theme-dark"
              type="radio"
              name="theme"
              value="DARK_MODE"
              checked={preference === 'DARK_MODE'}
              onChange={() => setPreference('DARK_MODE')}
              style={{ cursor: 'pointer' }}
            />
            <span>Dark</span>
          </label>
          <label
            htmlFor="theme-auto"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <input
              id="theme-auto"
              type="radio"
              name="theme"
              value="AUTO"
              checked={preference === 'AUTO'}
              onChange={() => setPreference('AUTO')}
              style={{ cursor: 'pointer' }}
            />
            <span>Auto (follow system)</span>
          </label>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Switch
          checked={wordWrappingInEditor ?? false}
          onChange={(checked) => {
            dispatch(setWordWrappingInEditor(checked));
          }}
        />
        <div>Enable word wrap in the editor</div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <label
          htmlFor="max-history-entries"
          style={{ display: 'flex', alignItems: 'center', gap: 10 }}
        >
          <span>Max send history entries per cell:</span>
          <input
            id="max-history-entries"
            type="number"
            min="1"
            max="100"
            value={String(maxSendHistoryEntries ?? 20)}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (!Number.isNaN(value) && value >= 1 && value <= 100) {
                dispatch(setMaxSendHistoryEntries(value));
              }
            }}
            style={{
              width: 60,
              padding: 4,
              border: `1px solid #${colors.BORDER}`,
              borderRadius: 4,
              backgroundColor: `#${colors.SURFACE_PRIMARY}`,
              color: `#${colors.TEXT_PRIMARY}`,
            }}
          />
        </label>
      </div>
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
