import { useDispatch } from 'react-redux';
import { useCallback, useEffect } from 'react';
import { VscAdd, VscRunAll } from 'react-icons/vsc';
import Notification from 'rc-notification';
import 'rc-notification/assets/index.css';
import { v4 } from 'uuid';
import { Services } from '@services';
import {
  addCell,
  sendAllCurls,
} from '../../state/features/documents/active-document';
import { AppDispatch } from '../../state/store';
import { TextButton } from './text-button';
import { CurlCellType, Variable } from '../../../shared/types';

const textButtonStyle = {};

export function NavBar({
  activeCellIndex,
  cells,
  filePath,
  globalVariables,
  executingAllCells,
  selectedDirectory,
}: {
  activeCellIndex: number;
  cells: CurlCellType[];
  filePath: string;
  globalVariables: Variable[];
  executingAllCells: boolean;
  selectedDirectory: string;
}) {
  const dispatch: AppDispatch = useDispatch();

  const saveFile = useCallback(async () => {
    if (!filePath) {
      return;
    }
    await Services.writeFile(filePath, {
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
  }, [cells, filePath, globalVariables, executingAllCells]);

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
    <div style={{ display: 'flex', flexDirection: 'row' }}>
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
      <span style={{ width: 15, display: 'inline-block' }} />
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
    </div>
  );
}
