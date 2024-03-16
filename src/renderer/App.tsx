import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import {
  VscDesktopDownload,
  VscExtensions,
  VscFeedback,
  VscQuestion,
  VscSettingsGear,
  VscTrash,
} from 'react-icons/vsc';
import { useEffect, useMemo } from 'react';
import { Services } from '@services';
import './App.css';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from './state/store';
import { Cell } from './lib/components/cell';
import { CellResponses } from './lib/components/response/cell-response';
import { NavBar } from './lib/components/nav-bar';
import { FileList } from './lib/components/file-list';
import { ColorfulButton } from './lib/components/variable-list';
import { ShowVariablesTutorialLevel1 } from './lib/components/variables-tutorial';
import { AppConsent } from './lib/components/app-consent';
import { showSettings } from './lib/components/settings';
import { showFeedback } from './lib/components/feedback';
import {
  createFileWithContent,
  selectDirectory,
  setSelectedSubDirectoryOrFile,
} from './state/features/selected-directory/selected-directory';
import {
  COLORS,
  THEME,
  ENABLE_SETTINGS_FEATURE,
  ENABLE_UPDATE_FEATURE,
  PLATFORM,
} from '@constants';
import { useAutoCheckForUpdates } from './lib/hooks/use-auto-check-for-updates';
import { exampleDocument } from '../shared/example-document';
import { modal } from './lib/components/modal';
import { TextButton } from './lib/components/text-button';
import { clearVariables } from './state/features/documents/active-document';
import isMobile from 'is-mobile';
import { showChromeExtensionNotice } from './lib/components/chrome-extension-notice';
import { extInstalled } from './services/services-on-ext';
import { simpleExampleDocument } from '../shared/simple-example-document';

function HomeCells() {
  const dispatch: AppDispatch = useDispatch();
  const activeDocument = useSelector(
    (state: RootState) => state.activeDocument,
  );
  const cells = activeDocument?.cells;
  const filePath = activeDocument?.filePath;
  const globalVariables = activeDocument?.globalVariables;
  const activeCellIndex = activeDocument?.activeCellIndex;
  const executingAllCells = activeDocument?.executingAllCells;

  useEffect(() => {
    const cellElement = document.getElementById(`cell-${activeCellIndex}`);

    const isInViewport = (cellElement: HTMLElement) => {
      const rect = cellElement.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.bottom <=
          (window.innerHeight || document.documentElement.clientHeight)
      );
    };

    if (cellElement && !isInViewport(cellElement)) {
      cellElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'start',
      });
    }
  }, [activeCellIndex]);

  const { selectedDirectory, selectedSubDirectoryOrFile } = useSelector(
    (state: RootState) => state.selectedDirectory,
  );

  if (!selectedDirectory) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `#${COLORS[THEME].BACKGROUND}`,
          padding: '0 40px',
          fontSize: 16,
        }}
      >
        <p>
          You need to
          <button
            style={{
              border: 'none',
              cursor: 'pointer',
              color: `#${COLORS[THEME].BLUE}`,
              backgroundColor: 'transparent',
              textDecoration: 'underline',
              fontSize: 16,
            }}
            onClick={() => {
              dispatch(selectDirectory());
            }}
          >
            select a directory
          </button>
          to get started.
        </p>
      </div>
    );
  }

  // not selected a file yet
  if (selectedDirectory === selectedSubDirectoryOrFile) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `#${COLORS[THEME].BACKGROUND}`,
          padding: '0 40px',
        }}
      >
        <p
          style={{
            fontSize: 16,
          }}
        >
          You have not selected a file yet. You can
          <button
            style={{
              border: 'none',
              cursor: 'pointer',
              color: `#${COLORS[THEME].BLUE}`,
              backgroundColor: 'transparent',
              textDecoration: 'underline',
              fontSize: 16,
            }}
            onClick={async () => {
              const createResult = await dispatch(
                createFileWithContent({ content: simpleExampleDocument }),
              ).then(
                (m) =>
                  m.payload as Awaited<ReturnType<typeof Services.createFile>>,
              );

              dispatch(
                setSelectedSubDirectoryOrFile({
                  path: createResult.filePath,
                  type: 'file',
                }),
              );
            }}
          >
            create a new file
          </button>
          to get started.
        </p>
        <p
          style={{
            fontSize: 16,
          }}
        >
          Or select an existing file on the left panel.
        </p>
      </div>
    );
  }

  if (
    !cells ||
    !filePath ||
    !globalVariables ||
    activeCellIndex == null ||
    executingAllCells == null
  ) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `#${COLORS[THEME].BACKGROUND}`,
        }}
      >
        Unsupported file type.
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        backgroundColor: `#${COLORS[THEME].BACKGROUND}`,
      }}
    >
      <div
        style={{
          padding: '10px 0 0 0',
          height: 'calc(100% - 10px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '0 15px',
          }}
        >
          <NavBar
            activeCellIndex={activeCellIndex}
            cells={cells}
            filePath={filePath}
            globalVariables={globalVariables}
            executingAllCells={executingAllCells}
            selectedDirectory={selectedDirectory}
          />
          <div
            style={{
              width: '100%',
              height: 1,
              margin: '10px 0',
              backgroundColor: `#${COLORS[THEME].GREY2}`,
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              flexDirection: 'row',
            }}
          >
            <span
              style={{
                gap: 2,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => {
                const { close } = modal({
                  content: (
                    <ShowVariablesTutorialLevel1
                      onExampleDocumentCreated={() => close()}
                    />
                  ),
                });
              }}
            >
              <span>Variables</span>
              <VscQuestion size={16} />
              <span>:</span>
            </span>
            {[
              ...globalVariables.map((variable, i) => {
                return (
                  <ColorfulButton
                    key={i}
                    name={variable.key}
                    value={variable.value}
                  />
                );
              }),
              globalVariables.length > 0 ? (
                <TextButton
                  key="clear-all"
                  icon={VscTrash}
                  onClick={() => {
                    dispatch(clearVariables());
                  }}
                >
                  Clear all
                </TextButton>
              ) : null,
            ]}
          </div>
        </div>
        <div style={{ height: 20 }} />
        <div
          style={{
            overflow: 'auto',
            padding: '0 15px',
          }}
        >
          {cells
            .flatMap((cell, i) => {
              return [
                <Cell
                  id={`cell-${i}`}
                  activeCellIndex={activeCellIndex}
                  globalVariables={globalVariables}
                  cell={cell}
                  cellIndex={i}
                  key={cell.id}
                  selectedDirectory={selectedDirectory}
                />,
                <div key={i + 0.5} style={{ height: 15 }} />,
              ];
            })
            .concat(<div key={cells.length} style={{ height: '50vh' }} />)}
        </div>
      </div>
    </div>
  );
}

function HomeCellResponse() {
  const activeDocument = useSelector(
    (state: RootState) => state.activeDocument,
  );
  const cells = activeDocument?.cells;
  const activeCellIndex = activeDocument?.activeCellIndex;

  if (!cells || activeCellIndex === undefined || !cells[activeCellIndex]) {
    return null;
  }

  return (
    <CellResponses
      key={`cell-${cells[activeCellIndex].id}`}
      activeCellIndex={activeCellIndex}
      cell={cells[activeCellIndex]}
    />
  );
}

function Home() {
  const activeDocument = useSelector(
    (state: RootState) => state.activeDocument,
  );

  // useEffect(() => {
  //   Services.clear();
  // }, [3]);

  if (ENABLE_UPDATE_FEATURE) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAutoCheckForUpdates();
  }

  const containerHeight = '100vh';

  const isMobileDevice = useMemo(() => isMobile(), []);
  useEffect(() => {
    if (isMobileDevice) {
      modal({
        content: (
          <div>
            <p
              style={{
                lineHeight: 1.5,
              }}
            >
              We are sorry but the app is not optimized for mobile devices yet.
              Please use a desktop browser instead.
            </p>
          </div>
        ),
      });
    }
  }, [isMobileDevice]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          height: containerHeight,
        }}
      >
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            width: 220,
            backgroundColor: `#${COLORS[THEME].BACKGROUND}`,
          }}
        >
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '10px 0',
            }}
          >
            <FileList activeDocument={activeDocument} />
          </div>
          <div>
            {PLATFORM === 'browser' ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 10,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  modal({
                    content: (
                      <div>
                        <p
                          style={{
                            lineHeight: 1.5,
                          }}
                        >
                          The web app is limited in capabilities due to browser
                          restrictions.
                        </p>
                        <p
                          style={{
                            lineHeight: 1.5,
                          }}
                        >
                          The desktop app can overcome these limitations by
                          allowing you to save files to your computer and
                          execute requests locally, thus providing better
                          privacy and security.
                        </p>
                        <p
                          style={{
                            lineHeight: 1.5,
                          }}
                        >
                          The desktop app is available for macOS and Linux at{' '}
                          <a
                            href="https://curlerroo.com"
                            target="_blank"
                            style={{
                              fontWeight: 'bold',
                              color: 'black',
                            }}
                          >
                            https://curlerroo.com
                          </a>
                          .
                        </p>
                      </div>
                    ),
                  });
                }}
              >
                <VscDesktopDownload size={16} />
                Install Desktop App
              </div>
            ) : null}
            {extInstalled ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 10,
                  cursor: 'pointer',
                }}
                onClick={showChromeExtensionNotice}
              >
                <VscExtensions size={16} />
                Chrome Extension installed
              </div>
            ) : null}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 10,
                cursor: 'pointer',
              }}
              onClick={showFeedback}
            >
              <VscFeedback size={16} />
              Feedback
            </div>
            {ENABLE_SETTINGS_FEATURE && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 10,
                  cursor: 'pointer',
                }}
                onClick={showSettings}
              >
                <VscSettingsGear size={16} />
                Settings
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            width: 'calc(50vw - 110px)',
          }}
        >
          <HomeCells />
        </div>
        <div
          style={{
            width: 'calc(50vw - 110px)',
          }}
        >
          <HomeCellResponse />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // useResetAllStates();

  return (
    <AppConsent>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </Router>
    </AppConsent>
  );
}
