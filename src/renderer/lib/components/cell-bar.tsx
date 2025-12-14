import { useDispatch } from 'react-redux';
import {
  VscChevronDown,
  VscChevronUp,
  VscPlay,
  VscTrash,
} from 'react-icons/vsc';
import 'rc-notification/assets/index.css';
import {
  removeCell,
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
import { useColors } from '../contexts/theme-context';

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
  selectedDirectory,
}: {
  cellIndex: number;
  cell: CurlCellType;
  selectedDirectory: string;
}) {
  const colors = useColors();
  const dispatch: AppDispatch = useDispatch();
  const [isFocused, setIsFocused] = useState(false);
  const isGeneratedName = !cell.name;

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
          backgroundColor: isFocused
            ? `#${colors.SURFACE_SECONDARY}`
            : 'transparent',
          color: isGeneratedName ? `#${colors.TEXT_TERTIARY}` : undefined,
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
        {cell.name || `#${cellIndex + 1}`}
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
            dispatch(validateCellAndSendCurl({ cellIndex, selectedDirectory }));
          }}
          tooltip="Send cURL command"
        >
          Run
        </TextButton>
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
