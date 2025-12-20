import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import {
  VscAdd,
  VscDesktopDownload,
  VscExtensions,
  VscFeedback,
  VscQuestion,
  VscSettingsGear,
  VscStarEmpty,
  VscStarFull,
  VscTrash,
} from 'react-icons/vsc';
import { useEffect, useMemo, useState } from 'react';
import { Services } from '@services';
import './App.css';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from './state/store';
import { Cell } from './lib/components/cell';
import { CellResponses } from './lib/components/response/cell-response';
import { NavBar } from './lib/components/nav-bar';
import { FileList } from './lib/components/file-list';
import { ImagePreview } from './lib/components/image-preview';
import { ColorfulButton } from './lib/components/variable-list';
import { ShowVariablesTutorialLevel1 } from './lib/components/variables-tutorial';
import { AppConsent } from './lib/components/app-consent';
import { showSettings } from './lib/components/settings';
import { showFeedback } from './lib/components/feedback';
import {
  ThemeProvider,
  useColors,
  useTheme,
} from './lib/contexts/theme-context';
import {
  createFileWithContent,
  selectDirectory,
  setSelectedSubDirectoryOrFile,
} from './state/features/selected-directory/selected-directory';
import { ENABLE_UPDATE_FEATURE, PLATFORM } from '@constants';
import { useAutoCheckForUpdates } from './lib/hooks/use-auto-check-for-updates';
import { modal } from './lib/components/modal';
import { TextButton } from './lib/components/text-button';
import {
  addCell,
  addVariable,
  clearVariables,
} from './state/features/documents/active-document';
import isMobile from 'is-mobile';
import { showChromeExtensionNotice } from './lib/components/chrome-extension-notice';
import { extInstalled } from './services/services-on-ext';
import { simpleExampleDocument } from '../shared/simple-example-document';
import { prompt } from './lib/components/input-prompt';
import GitHubButton from 'react-github-btn';
import { v4 } from 'uuid';
import { useSharedLink } from './lib/hooks/use-shared-link';
import { Resizable } from 're-resizable';
import scrollIntoView from 'scroll-into-view-if-needed';

function HomeCells() {
  const dispatch: AppDispatch = useDispatch();
  const colors = useColors();
  const activeDocument = useSelector(
    (state: RootState) => state.activeDocument,
  );
  const id = activeDocument?.id;
  const shared_id = activeDocument?.shared_id;
  const cells = activeDocument?.cells;
  const filePath = activeDocument?.filePath;
  const globalVariables = activeDocument?.globalVariables;
  const activeCellIndex = activeDocument?.activeCellIndex;
  const executingAllCells = activeDocument?.executingAllCells;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cellsRefreshedAt = useMemo(() => new Date().getTime(), [filePath]);

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
      const delay = (() => {
        if (activeCellIndex === 0) {
          return 0;
        }
        const mountedTime = new Date().getTime() - cellsRefreshedAt;
        return mountedTime < 1000 ? 1000 - mountedTime : 0;
      })();
      setTimeout(() => {
        scrollIntoView(cellElement, {
          behavior: 'smooth',
          block: 'start',
          inline: 'start',
        });
      }, delay); // wait for cell to render if the component is just mounted
    }
  }, [activeCellIndex, cellsRefreshedAt]);

  const { selectedDirectory, selectedSubDirectoryOrFile } = useSelector(
    (state: RootState) => state.selectedDirectory,
  );
  const selectedSubType = useSelector(
    (state: RootState) => state.selectedDirectory.selectedSubType,
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
          backgroundColor: `#${colors.SURFACE_SECONDARY}`,
          color: `#${colors.TEXT_PRIMARY}`,
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
              color: `#${colors.PRIMARY}`,
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
          backgroundColor: `#${colors.SURFACE_SECONDARY}`,
          color: `#${colors.TEXT_PRIMARY}`,
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
              color: `#${colors.PRIMARY}`,
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
    !id ||
    !cells ||
    !filePath ||
    !globalVariables ||
    activeCellIndex == null ||
    executingAllCells == null
  ) {
    // Check if it's an image file that should be previewed
    const isImageFile =
      selectedSubType === 'file' &&
      selectedSubDirectoryOrFile?.match(/\.(png|jpe?g|gif|webp|bmp|svg)$/i);

    if (isImageFile) {
      return (
        <ImagePreview
          filePath={selectedSubDirectoryOrFile}
          fileType={selectedSubType}
        />
      );
    }

    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `#${colors.SURFACE_SECONDARY}`,
          color: `#${colors.TEXT_PRIMARY}`,
        }}
      >
        Unsupported file type.
      </div>
    );
  }

  return (
    <div
      style={
        {
          height: '100%',
          backgroundColor: `#${colors.SURFACE_SECONDARY}`,
          color: `#${colors.TEXT_PRIMARY}`,
          '--syntax-blue': `#${colors.PRIMARY}`,
          '--syntax-green': `#${colors.SUCCESS}`,
          '--syntax-red': `#${colors.SYNTAX_STRING}`,
        } as any
      }
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
            id={id}
            shared_id={shared_id}
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
              backgroundColor: `#${colors.BORDER}`,
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
              <TextButton
                key="add-variable"
                icon={VscAdd}
                onClick={async () => {
                  const [name, value] = await prompt([
                    {
                      label: 'Name:',
                      onConfirm: async (value) => {
                        // value should be a valid variable name
                        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/g.test(value || '')) {
                          throw new Error('Invalid variable name');
                        }
                        return value;
                      },
                    },
                    {
                      label: 'Value:',
                      type: 'textarea',
                      onConfirm: async (value) => {
                        if (!value) {
                          throw new Error('Value cannot be empty');
                        }
                        return value;
                      },
                    },
                  ]);
                  if (typeof name !== 'string') {
                    throw new Error('Invalid variable name');
                  }
                  if (typeof value !== 'string') {
                    throw new Error('Invalid variable value');
                  }
                  dispatch(
                    addVariable({
                      variable: {
                        key: name,
                        value,
                        source: 'manual',
                      },
                    }),
                  );
                }}
              >
                Add
              </TextButton>,
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
                <div
                  key={i + 0.5}
                  style={{
                    margin: 5,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <TextButton
                    icon={VscAdd}
                    onClick={() => {
                      dispatch(
                        addCell({
                          cell: {
                            id: v4(),
                            cell_type: 'curl',
                            cursor_position: {
                              lineNumber: 1,
                              column: 1,
                              offset: 0,
                            },
                            execution_count: 0,
                            metadata: {
                              collapsed: false,
                              jupyter: {
                                source_hidden: false,
                              },
                            },
                            outputs: [
                              {
                                protocol: '',
                                bodyFilePath: '',
                                bodyBase64: '',
                                body: [''],
                                headers: {},
                                status: 0,
                                responseDate: 0,
                                formattedBody: '',
                              },
                            ],
                            sendHistories: [],
                            selectedSendHistoryId: undefined,
                            source: [''],
                            pre_scripts_enabled: false,
                            pre_scripts: [''],
                            post_scripts_enabled: false,
                            post_scripts: [''],
                            send_status: 'idle',
                          },
                          cellIndex: i + 1,
                        }),
                      );
                    }}
                  >
                    Add cell
                  </TextButton>
                </div>,
              ];
            })
            .concat(<div key={cells.length} style={{ height: '50vh' }} />)}
        </div>
      </div>
    </div>
  );
}

function HomeCellResponse() {
  const colors = useColors();
  const activeDocument = useSelector(
    (state: RootState) => state.activeDocument,
  );
  const cells = activeDocument?.cells;
  const activeCellIndex = activeDocument?.activeCellIndex;

  if (!cells || activeCellIndex === undefined || !cells[activeCellIndex]) {
    return (
      <div
        style={{
          backgroundColor: `#${colors.SURFACE_SECONDARY}`,
          height: '100%',
        }}
      />
    );
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
  const colors = useColors();
  const { theme } = useTheme();
  useSharedLink();

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

  const [fileListSize, setFileListSize] = useState(220);

  useEffect(() => {
    const fn = () => {
      const width = window.innerWidth;
      if (fileListSize > width / 2) {
        setFileListSize(width / 2);
      }
    };
    window.addEventListener('resize', fn);
    return () => {
      window.removeEventListener('resize', fn);
    };
  }, [fileListSize]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          height: containerHeight,
          overflow: 'hidden',
        }}
      >
        <Resizable
          size={{
            width: fileListSize,
            height: '100%',
          }}
          minWidth={100}
          maxWidth="50vw"
          enable={{
            top: false,
            right: true,
            bottom: false,
            left: false,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false,
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: `#${colors.SURFACE_PRIMARY}`,
            color: `#${colors.TEXT_PRIMARY}`,
            paddingRight: 5,
          }}
          handleStyles={{
            right: {
              right: 0,
              width: 5,
              backgroundColor: `#${colors.BORDER}`,
            },
          }}
          onResizeStop={(e, direction, ref, d) => {
            const width = parseInt(ref.style.width);
            setFileListSize(width);
          }}
        >
          <div
            style={{
              flex: 1,
              overflow: 'hidden',
              padding: '10px 0',
            }}
          >
            <FileList activeDocument={activeDocument} />
          </div>
          <div>
            {PLATFORM === 'browser' ? (
              <GitHubButton
                href="https://github.com/CurlerRoo/CurlerRoo"
                data-color-scheme={`no-preference: ${
                  theme === 'DARK_MODE' ? 'dark' : 'light'
                }; light: light; dark: ${theme === 'DARK_MODE' ? 'dark' : 'light'};`}
                data-icon="octicon-star"
                data-size="large"
                data-show-count="true"
                aria-label="Star CurlerRoo/CurlerRoo on GitHub"
              >
                &nbsp;&nbsp;Star on GitHub
              </GitHubButton>
            ) : null}
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
                              color: `#${colors.PRIMARY}`,
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
          </div>
        </Resizable>
        <div
          style={{
            flex: 1,
            display: 'flex',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `calc(50vw - ${fileListSize / 2}px)`,
            }}
          >
            <HomeCells />
          </div>
          <div
            style={{
              width: `calc(50vw - ${fileListSize / 2}px)`,
            }}
          >
            <HomeCellResponse />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // useResetAllStates();

  return (
    <ThemeProvider>
      <AppConsent>
        <Router>
          <Routes>
            <Route path="*" element={<Home />} />
          </Routes>
        </Router>
      </AppConsent>
    </ThemeProvider>
  );
}
