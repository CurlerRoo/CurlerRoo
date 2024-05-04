import { useDispatch, useSelector } from 'react-redux';
import Tooltip from 'rc-tooltip';
import 'rc-tooltip/assets/bootstrap.css';
import {
  deleteVariable,
  forceRefocusActiveCell,
  updateCell,
} from '../../state/features/documents/active-document';
import { COLORS, THEME } from '@constants';
import { RootState } from '../../state/store';
import { insertVariableToCurl } from '../../../shared/insert-variable-to-curl';
import { useMemo } from 'react';
import Notification from 'rc-notification';
import 'rc-notification/assets/index.css';

export function ColorfulButton({
  name,
  value,
}: {
  name: string;
  value?: unknown;
}) {
  const dispatch = useDispatch();
  const cellIndex = useSelector(
    (state: RootState) => state.activeDocument?.activeCellIndex,
  );
  const cell = useSelector(
    (state: RootState) => state.activeDocument?.cells[cellIndex!],
  );
  const curl = useMemo(() => cell?.source.join('\n') || '', [cell]);
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

  if (!cell) {
    return null;
  }

  return (
    <Tooltip
      overlayInnerStyle={{
        minHeight: 0,
      }}
      placement="bottom"
      trigger="hover"
      overlay={
        <div
          style={{
            maxWidth: 400,
            wordWrap: 'break-word',
          }}
        >
          <div
            style={{
              backgroundColor: `#${COLORS[THEME].GREY0}`,
              padding: 5,
              borderRadius: 4,
            }}
          >
            <code
              style={{
                fontSize: 14,
              }}
            >
              {stringValue}
            </code>
          </div>
          <div style={{ height: 10 }} />
          <i style={{ fontSize: 13 }}>
            Note: Click on it to automatically insert.
          </i>
          <br />
        </div>
      }
    >
      <div style={{ position: 'relative' }}>
        <button
          style={{
            color: `#${COLORS[THEME].BLUE}`,
            backgroundColor: 'white',
            borderRadius: 4,
            border: 'none',
            cursor: 'pointer',
          }}
          onClick={() => {
            try {
              if (!cell.cursor_position) {
                return;
              }

              const insertedCurl = insertVariableToCurl({
                index: cell.cursor_position.offset,
                variableName: name,
                curl,
              });
              dispatch(
                updateCell({
                  cellIndex: cellIndex!,
                  cell: {
                    ...cell!,
                    source: insertedCurl.split('\n'),
                  },
                }),
              );
              dispatch(forceRefocusActiveCell());
            } catch (error) {
              Notification.newInstance({}, (notification) => {
                notification.notice({
                  content: (error as Error)?.message || 'Unknown error',
                  closable: true,
                  duration: 10,
                  style: {
                    width: 400,
                    background: `#${COLORS[THEME].RED}`,
                    color: 'white',
                    fontWeight: 'bold',
                  },
                });
              });
            }
          }}
        >
          {name}
        </button>
        <div
          style={{
            position: 'absolute',
            top: -5,
            right: -5,
            width: 15,
            height: 15,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: Number.MAX_SAFE_INTEGER,
            color: 'white',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
          }}
          onClick={() => {
            dispatch(
              deleteVariable({
                variable: { key: name, value, source: 'response' },
              }),
            );
          }}
        >
          x
        </div>
      </div>
    </Tooltip>
  );
}
