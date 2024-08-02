import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useRef, useState } from 'react';
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
} from '../../state/features/documents/active-document';
import { AppDispatch, RootState } from '../../state/store';
import { TextButton } from './text-button';
import { CurlCellType, Variable } from '../../../shared/types';
import { modal } from './modal';
import { getDocOnDiskFromDoc } from '../../../shared/get-doc-on-disk-from-doc';
import {
  COLORS,
  ENDPOINT0,
  THEME,
  WEB_APP_URL,
} from '../../../shared/constants/constants';
import { PLATFORM } from '@constants';
import { SetURLSearchParams, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { setSelectedSubDirectoryOrFile } from '../../state/features/selected-directory/selected-directory';
import { useDebounce } from 'react-use';
import { searchAll } from '../../services/search-all';

const HoverHighlight = styled.div`
  &:hover {
    background-color: #${COLORS[THEME].BACKGROUND_HIGHLIGHT};
  }
`;

function SearchAll({ close }: { close: () => void }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<
    {
      filePath: string;
      cellIndex: number;
      previewText: [string, string, string];
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
        });
        setResults(results);
      })();
    },
    500,
    [search, selectedDirectoryInfo],
  );

  const [targetCellIndex, setTargetCellIndex] = useState(-1);

  const selectedSubDirectoryOrFile = useSelector(
    (state: RootState) => state.selectedDirectory.selectedSubDirectoryOrFile,
  );
  const activeFilePath = useSelector(
    (state: RootState) => state.activeDocument?.filePath,
  );

  const dispatch = useDispatch();

  useEffect(() => {
    if (
      activeFilePath === selectedSubDirectoryOrFile &&
      targetCellIndex !== -1
    ) {
      setTargetCellIndex(-1);
      dispatch(setActiveCellIndex(targetCellIndex));
    }
  }, [dispatch, selectedSubDirectoryOrFile, activeFilePath, targetCellIndex]);

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
          border: `1px solid #${COLORS[THEME].GREY1}`,
          outline: 'none',
          textIndent: 10,
        }}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search"
      />
      <div style={{ height: 20 }} />
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
              color: `#${COLORS[THEME].GREY}`,
            }}
          >
            No results
          </div>
        )}
        {results.map((m) => (
          <div
            style={{
              cursor: 'pointer',
            }}
            onClick={() => {
              setTargetCellIndex(m.cellIndex);
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
                color: `#${COLORS[THEME].BLUE}`,
              }}
            >
              {m.filePath}
            </div>
            <HoverHighlight style={{ padding: 5, marginLeft: 20 }}>
              ...{m.previewText[0]}
              <span
                style={{
                  backgroundColor: `#${COLORS[THEME].YELLOW}`,
                }}
              >
                {m.previewText[1]}
              </span>
              {m.previewText[2]}...
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
      <p>URL:</p>
      <div>
        <input
          ref={inputRef}
          style={{
            width: 'calc(100% - 22px)',
            padding: 10,
            fontSize: '16px',
            border: '1px solid #ccc',
            borderRadius: '5px',
          }}
          placeholder="Paste the shared link here"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
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
            background: 'red',
            color: 'white',
            fontWeight: 'bold',
          },
        });
      });
    });
  }, [id, shared_id, cells, filePath, globalVariables, executingAllCells]);

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
      content: <div>Uploading...</div>,
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
          <p>URL:</p>
          <div>
            <input
              style={{
                width: 'calc(100% - 22px)',
                padding: 10,
                fontSize: '16px',
                border: '1px solid #ccc',
                borderRadius: '5px',
              }}
              value={url}
              readOnly
            />
          </div>
          <p style={{ lineHeight: '1.5rem' }}>
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
          <p style={{ textAlign: 'center' }}>
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
