import { useDispatch, useSelector } from 'react-redux';
import Tooltip from 'rc-tooltip';
import 'rc-tooltip/assets/bootstrap.css';
import {
  addVariable,
  deleteVariable,
  forceRefocusActiveCell,
  updateCell,
} from '../../state/features/documents/active-document';
import { useColors } from '../contexts/theme-context';
import { RootState } from '../../state/store';
import { insertVariableToCurl } from '../../../shared/insert-variable-to-curl';
import { useEffect, useMemo, useState } from 'react';
import Notification from 'rc-notification';
import 'rc-notification/assets/index.css';
import { prompt } from './input-prompt';

export function ColorfulButton({
  name,
  value,
}: {
  name: string;
  value?: unknown;
}) {
  const colors = useColors();
  const dispatch = useDispatch();
  const cellIndex = useSelector(
    (state: RootState) => state.activeDocument?.activeCellIndex,
  );
  const cell = useSelector(
    (state: RootState) => state.activeDocument?.cells[cellIndex!],
  );
  const [visible, setVisible] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    if (visible === false) {
      setVisible(undefined);
    }
  }, [visible, setVisible]);
  const curl = useMemo(() => cell?.source.join('\n') || '', [cell]);
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

  if (!cell) {
    return null;
  }

  return (
    <Tooltip
      visible={visible}
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
            padding: '2px 0',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row-reverse',
              gap: 10,
            }}
          >
            <div
              style={{
                backgroundColor: `#${colors.SURFACE_PRIMARY}`,
                color: `#${colors.TEXT_PRIMARY}`,
                padding: '0 5px',
                borderRadius: 4,
                cursor: 'pointer',
              }}
              onClick={async () => {
                setVisible(false);
                const [_name, _value] = await prompt([
                  {
                    label: 'Name:',
                    defaultValue: name,
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
                    defaultValue: stringValue,
                    type: 'textarea',
                    onConfirm: async (value) => {
                      if (!value) {
                        throw new Error('Value cannot be empty');
                      }
                      return value;
                    },
                  },
                ]);
                if (typeof _name !== 'string') {
                  throw new Error('Invalid variable name');
                }
                if (typeof _value !== 'string') {
                  throw new Error('Invalid variable value');
                }
                dispatch(
                  addVariable({
                    variable: {
                      key: _name,
                      value: _value,
                      source: 'manual',
                    },
                  }),
                );
              }}
            >
              Edit
            </div>
            <div
              style={{
                backgroundColor: `#${colors.SURFACE_PRIMARY}`,
                color: `#${colors.TEXT_PRIMARY}`,
                padding: '0 5px',
                borderRadius: 4,
                cursor: 'pointer',
              }}
              onClick={() => {
                navigator.clipboard.writeText(stringValue);
                setVisible(false);
              }}
            >
              Copy
            </div>
          </div>
          <div style={{ height: 5 }} />
          <div
            style={{
              backgroundColor: `#${colors.SELECTION}`,
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
            color: `#${colors.PRIMARY}`,
            backgroundColor: `#${colors.SURFACE_SECONDARY}`,
            border: `1px solid #${colors.BORDER}`,
            borderRadius: 4,
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
                    background: `#${colors.ERROR}`,
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
