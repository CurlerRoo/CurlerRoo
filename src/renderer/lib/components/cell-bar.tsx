import { useDispatch } from 'react-redux';
import {
  VscAdd,
  VscChevronDown,
  VscChevronUp,
  VscPlay,
  VscTrash,
} from 'react-icons/vsc';
import 'rc-notification/assets/index.css';
import { v4 } from 'uuid';
import {
  removeCell,
  addCell,
  setActiveCellIndex,
  moveCellUp,
  moveCellDown,
  validateCellAndSendCurl,
  setCellName,
} from '../../state/features/documents/active-document';
import { AppDispatch } from '../../state/store';
import { TextButton } from './text-button';
import { CurlCellType } from '../../../shared/types';
import styled from 'styled-components';
import { useState } from 'react';

const textButtonStyle = {};
const CellName = styled.span`
  margin: 2px;
  font-size: 16px;
  display: inline-block;
  min-width: 100px;
  outline: none;
  &:hover {
    background-color: white;
  }
`;

export function CellBar({
  cellIndex,
  cell,
}: {
  cellIndex: number;
  cell: CurlCellType;
}) {
  const dispatch: AppDispatch = useDispatch();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <CellName
        contentEditable
        onFocus={() => {
          setIsFocused(true);
        }}
        style={{
          backgroundColor: isFocused ? 'white' : 'transparent',
        }}
        onBlur={(e) => {
          const trimmed = e.target.innerText?.trim();
          dispatch(setCellName({ cellIndex, name: trimmed }));
          setIsFocused(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.blur();
          }
        }}
      >
        {cell.name}
      </CellName>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 5,
        }}
      >
        <TextButton
          icon={VscPlay}
          iconProps={{ size: 16 }}
          style={textButtonStyle}
          type="button"
          onClick={async () => {
            if (cell.send_status === 'sending') {
              return;
            }
            dispatch(setActiveCellIndex(cellIndex));
            dispatch(validateCellAndSendCurl(cellIndex));
          }}
          tooltip="Send cURL command"
        />
        <TextButton
          icon={VscChevronUp}
          iconProps={{ size: 16 }}
          onClick={() => {
            dispatch(moveCellUp(cellIndex));
          }}
          tooltip="Move cell up"
        />
        <TextButton
          icon={VscChevronDown}
          iconProps={{ size: 16 }}
          onClick={() => {
            dispatch(moveCellDown(cellIndex));
          }}
          tooltip="Move cell down"
        />
        <TextButton
          icon={VscAdd}
          iconProps={{ size: 16 }}
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
                cellIndex: cellIndex + 1,
              }),
            );
          }}
          tooltip="Add new cell"
        />
        <TextButton
          icon={VscTrash}
          iconProps={{ size: 16 }}
          style={textButtonStyle}
          type="button"
          onClick={() => {
            dispatch(removeCell(cellIndex));
          }}
          tooltip="Delete cell"
        />
      </div>
    </div>
  );
}
