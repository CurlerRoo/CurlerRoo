import { useDispatch, useSelector } from 'react-redux';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  VscAdd,
  VscCloudDownload,
  VscCloudUpload,
  VscCopy,
  VscRunAll,
  VscSearch,
} from 'react-icons/vsc';
import Notification from 'rc-notification';
import 'rc-notification/assets/index.css';
import { v4 } from 'uuid';
import { Services } from '@services';
import {
  addCell,
  sendAllCurls,
  setActiveCellIndex,
  selectResponseHistory,
} from '../../state/features/documents/active-document';
import { AppDispatch, RootState } from '../../state/store';
import { TextButton } from './text-button';
import { CurlCellType, Variable } from '../../../shared/types';
import { modal } from './modal';
import { getDocOnDiskFromDoc } from '../../../shared/get-doc-on-disk-from-doc';
import { ENDPOINT0, WEB_APP_URL } from '../../../shared/constants/constants';
import { useColors, useTheme } from '../contexts/theme-context';
import { PLATFORM } from '@constants';
import { SetURLSearchParams, useSearchParams } from 'react-router-dom';
import { setSelectedSubDirectoryOrFile } from '../../state/features/selected-directory/selected-directory';
import { useDebounce } from 'react-use';
import { searchAll } from '../../services/search-all';

const HoverHighlight = ({
  children,
  onClick,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}) => {
  const colors = useColors();
  return (
    <div
      onClick={onClick}
      style={style}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = `#${colors.SURFACE_SECONDARY}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </div>
  );
};

function SearchAll({ close }: { close: () => void }) {
  const colors = useColors();
  const [search, setSearch] = useState('');
  const [includeHistories, setIncludeHistories] = useState(true);
  const [results, setResults] = useState<
    {
      filePath: string;
      cellIndex: number;
      previewText: [string, string, string];
      historyId?: string;
      sentAt?: number;
    }[]
  >([]);

  const selectedDirectoryInfo = useSelector(
    (state: RootState) => state.selectedDirectory.selectedDirectoryInfo,
  );

  useDebounce(
    () => {
      (async () => {
        if (!selectedDirectoryInfo || !search) {
          return;
        }

        const results = await searchAll({
          text: search,
          selectedDirectoryInfo,
          includeHistories,
        });
        setResults(results);
      })();
    },
    500,
    [search, selectedDirectoryInfo, includeHistories],
  );

  const [targetCellIndex, setTargetCellIndex] = useState(-1);

  const selectedSubDirectoryOrFile = useSelector(
    (state: RootState) => state.selectedDirectory.selectedSubDirectoryOrFile,
  );
  const activeFilePath = useSelector(
    (state: RootState) => state.activeDocument?.filePath,
  );

  const dispatch = useDispatch();

  const [targetHistoryId, setTargetHistoryId] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    if (
      activeFilePath === selectedSubDirectoryOrFile &&
      targetCellIndex !== -1
    ) {
      const cellIndex = targetCellIndex;
      setTargetCellIndex(-1);
      dispatch(setActiveCellIndex(cellIndex));
      if (targetHistoryId) {
        dispatch(
          selectResponseHistory({
            cellIndex,
            historyId: targetHistoryId,
          }),
        );
        setTargetHistoryId(undefined);
      }
    }
  }, [
    dispatch,
    selectedSubDirectoryOrFile,
    activeFilePath,
    targetCellIndex,
    targetHistoryId,
  ]);

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div>
      <input
        ref={inputRef}
        style={{
          height: 30,
          width: '100%',
          borderRadius: 5,
          border: `1px solid #${colors.BORDER}`,
          outline: 'none',
          textIndent: 10,
          backgroundColor: `#${colors.SURFACE_PRIMARY}`,
          color: `#${colors.TEXT_PRIMARY}`,
        }}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search"
      />
      <div style={{ height: 10 }} />
      <label
        htmlFor="include-histories-checkbox"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8,
          color: `#${colors.TEXT_PRIMARY}`,
          cursor: 'pointer',
          fontSize: '0.9em',
        }}
      >
        <input
          id="include-histories-checkbox"
          type="checkbox"
          checked={includeHistories}
          onChange={(e) => setIncludeHistories(e.target.checked)}
          style={{
            cursor: 'pointer',
          }}
        />
        <span>Include histories</span>
      </label>
      <div style={{ height: 10 }} />
      <div
        style={{
          maxHeight: 300,
          overflowY: 'scroll',
        }}
      >
        {results.length === 0 && (
          <div
            style={{
              padding: 10,
              textAlign: 'center',
              color: `#${colors.TEXT_SECONDARY}`,
            }}
          >
            No results
          </div>
        )}
        {results.map((m) => (
          <div
            key={`${m.filePath}-${m.cellIndex}`}
            style={{
              cursor: 'pointer',
            }}
            onClick={() => {
              setTargetCellIndex(m.cellIndex);
              if (m.historyId) {
                setTargetHistoryId(m.historyId);
              }
              dispatch(
                setSelectedSubDirectoryOrFile({
                  path: m.filePath,
                  type: 'file',
                }),
              );
              close();
            }}
          >
            <div
              style={{
                padding: 5,
                color: `#${colors.PRIMARY}`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>{m.filePath}</span>
              {m.historyId && m.sentAt ? (
                <span
                  style={{
                    color: `#${colors.TEXT_SECONDARY}`,
                    fontSize: '0.9em',
                  }}
                >
                  (historical • {new Date(m.sentAt).toLocaleDateString()}{' '}
                  {new Date(m.sentAt).toLocaleTimeString()})
                </span>
              ) : (
                <span
                  style={{
                    color: `#${colors.TEXT_SECONDARY}`,
                    fontSize: '0.9em',
                  }}
                >
                  (current)
                </span>
              )}
            </div>
            <HoverHighlight style={{ padding: 5, marginLeft: 20 }}>
              <span style={{ color: `#${colors.TEXT_SECONDARY}` }}>
                ...{m.previewText[0]}
              </span>
              <span
                style={{
                  backgroundColor: `#${colors.SELECTION}`,
                  color: `#${colors.TEXT_PRIMARY}`,
                }}
              >
                {m.previewText[1]}
              </span>
              <span style={{ color: `#${colors.TEXT_SECONDARY}` }}>
                {m.previewText[2]}...
              </span>
            </HoverHighlight>
          </div>
        ))}
      </div>
    </div>
  );
}

const textButtonStyle = {};

const OpenShareLinkModalBody = ({
  setSearchParams,
  onClose,
}: {
  setSearchParams: SetURLSearchParams;
  onClose: () => void;
}) => {
  const colors = useColors();
  const [url, setUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!url) {
      setErrorMessage('');
      return;
    }

    const isValid = new RegExp(
      `^${WEB_APP_URL}?sharedKey=[a-zA-Z0-9-]+$`
        .replaceAll('?', '\\?')
        .replaceAll('/', '\\/')
        .replaceAll('.', '\\.')
        .replaceAll('&', '\\&')
        .replaceAll('=', '\\='),
    ).test(url);

    if (!isValid) {
      setErrorMessage('Invalid URL');
      return;
    }
    setErrorMessage('');
    setSearchParams({ sharedKey: url.split('=')[1] }); // TODO: use qs
    onClose();
  }, [url, onClose, setSearchParams]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [url]);

  return (
    <div>
      <p style={{ color: `#${colors.TEXT_PRIMARY}` }}>URL:</p>
      <div>
        <input
          ref={inputRef}
          style={{
            width: 'calc(100% - 22px)',
            padding: 10,
            fontSize: '16px',
            border: `1px solid #${errorMessage ? colors.ERROR : colors.BORDER}`,
            borderRadius: '5px',
            backgroundColor: `#${colors.SURFACE_PRIMARY}`,
            color: `#${colors.TEXT_PRIMARY}`,
            outline: 'none',
          }}
          placeholder="Paste the shared link here"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      {errorMessage && (
        <p style={{ color: `#${colors.ERROR}`, marginTop: 10 }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export function NavBar({
  id,
  shared_id,
  activeCellIndex,
  cells,
  filePath,
  globalVariables,
  executingAllCells,
  selectedDirectory,
}: {
  id: string;
  shared_id?: string;
  activeCellIndex: number;
  cells: CurlCellType[];
  filePath: string;
  globalVariables: Variable[];
  executingAllCells: boolean;
  selectedDirectory: string;
}) {
  const colors = useColors();
  const [_searchParams, setSearchParams] = useSearchParams();
  const dispatch: AppDispatch = useDispatch();
  const activeDocument = useSelector(
    (state: RootState) => state.activeDocument,
  );

  const saveFile = useCallback(async () => {
    if (!filePath) {
      return;
    }
    await Services.writeFile(filePath, {
      id,
      shared_id,
      version: 2,
      cells,
      globalVariables,
      type: 'notebook',
      executingAllCells,
    }).catch(() => {
      Notification.newInstance({}, (notification) => {
        notification.notice({
          content: `Error saving file. Your changes may not be saved.`,
          closable: true,
          duration: 10,
          style: {
            width: 400,
            background: `#${colors.ERROR}`,
            color: `#${colors.SURFACE_BRIGHT}`,
            fontWeight: 'bold',
          },
        });
      });
    });
  }, [
    id,
    shared_id,
    cells,
    filePath,
    globalVariables,
    executingAllCells,
    colors,
  ]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      saveFile();
    }, 2000);
    return () => {
      clearInterval(timer);
    };
  }, [saveFile]);

  if (!filePath) {
    return null;
  }

  const createShareLink = async () => {
    if (!activeDocument) {
      return;
    }
    const { close: closeWaitModal } = modal({
      content: (
        <div style={{ color: `#${colors.TEXT_PRIMARY}` }}>Uploading...</div>
      ),
    });

    const docOnDisk = getDocOnDiskFromDoc({
      ...activeDocument,
      type: 'notebook',
    });
    const endpoint = `${ENDPOINT0}/share`;
    const { id } = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(docOnDisk),
    }).then((res) => res.json());

    const url = `${WEB_APP_URL}?sharedKey=${id}`;
    closeWaitModal();
    const { close } = modal({
      content: (
        <div>
          <p style={{ color: `#${colors.TEXT_PRIMARY}` }}>URL:</p>
          <div>
            <input
              style={{
                width: 'calc(100% - 22px)',
                padding: 10,
                fontSize: '16px',
                border: `1px solid #${colors.BORDER}`,
                borderRadius: '5px',
                backgroundColor: `#${colors.SURFACE_PRIMARY}`,
                color: `#${colors.TEXT_PRIMARY}`,
              }}
              value={url}
              readOnly
            />
          </div>
          <p
            style={{
              lineHeight: '1.5rem',
              color: `#${colors.TEXT_PRIMARY}`,
            }}
          >
            Note: For privacy reason, the shared document will be{' '}
            <b>deleted on cloud after 48 hours</b> from the last access. The
            local imported document will not be deleted.
          </p>
          <div style={{ height: 20 }} />
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <TextButton
              icon={VscCopy}
              onClick={() => {
                navigator.clipboard.writeText(url);
                close();
              }}
            >
              Copy
            </TextButton>
          </div>
        </div>
      ),
    });
  };

  const confirmCreateShareLink = async () => {
    const { close } = modal({
      content: (
        <div>
          <p
            style={{
              textAlign: 'center',
              color: `#${colors.TEXT_PRIMARY}`,
            }}
          >
            You are about to upload the document to the cloud and create a share
            link. Are you sure?
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <TextButton
              onClick={() => {
                createShareLink();
                close();
              }}
            >
              Yes
            </TextButton>
            <TextButton onClick={() => close()}>No</TextButton>
          </div>
        </div>
      ),
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
      }}
    >
      <TextButton
        icon={VscAdd}
        style={textButtonStyle}
        type="button"
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
              cellIndex: activeCellIndex + 1,
            }),
          );
        }}
      >
        Request
      </TextButton>
      <TextButton
        onClick={() => {
          dispatch(sendAllCurls({ selectedDirectory }));
        }}
        icon={VscRunAll}
        style={textButtonStyle}
        type="button"
      >
        Run All
      </TextButton>
      <TextButton icon={VscCloudUpload} onClick={confirmCreateShareLink}>
        Share
      </TextButton>
      {PLATFORM !== 'browser' && (
        <TextButton
          icon={VscCloudDownload}
          onClick={() => {
            const { close } = modal({
              content: (
                <OpenShareLinkModalBody
                  setSearchParams={setSearchParams}
                  onClose={() => close()}
                />
              ),
            });
          }}
        >
          Open Share Link
        </TextButton>
      )}
      <TextButton
        onClick={() => {
          const { close } = modal({
            content: <SearchAll close={() => close()} />,
          });
        }}
        icon={VscSearch}
        style={textButtonStyle}
        type="button"
      >
        Search All
      </TextButton>
    </div>
  );
}
