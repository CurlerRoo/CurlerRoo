import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  VscAdd,
  VscCloudDownload,
  VscCloudUpload,
  VscCopy,
  VscRunAll,
} from 'react-icons/vsc';
import Notification from 'rc-notification';
import 'rc-notification/assets/index.css';
import { v4 } from 'uuid';
import { Services } from '@services';
import {
  addCell,
  sendAllCurls,
} from '../../state/features/documents/active-document';
import { AppDispatch, RootState } from '../../state/store';
import { TextButton } from './text-button';
import { CurlCellType, Variable } from '../../../shared/types';
import { modal } from './modal';
import { getDocOnDiskFromDoc } from '../../../shared/get-doc-on-disk-from-doc';
import { ENDPOINT0, WEB_APP_URL } from '../../../shared/constants/constants';
import { PLATFORM } from '@constants';
import { SetURLSearchParams, useSearchParams } from 'react-router-dom';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 15 }}>
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
                    showSearch: false,
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
      <TextButton
        icon={VscCloudUpload}
        onClick={async () => {
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
                  <b>deleted on cloud after 48 hours</b> from the last access.
                  The local imported document will not be deleted.
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
        }}
      >
        Create Share Link
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
    </div>
  );
}
