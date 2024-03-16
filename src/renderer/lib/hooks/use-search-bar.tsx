import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import _ from 'lodash';
import { VscChevronDown, VscChevronUp, VscClose } from 'react-icons/vsc';
import { RootState } from '../../state/store';
import {
  activeDocumentSlice,
  setShowSearch,
} from '../../state/features/documents/active-document';
import { COLORS, THEME } from '@constants';
import { searchOnText } from '../../../shared/text-search';

const ButtonHoverHighlight = styled.div`
  &:hover {
    background-color: #${COLORS[THEME].BACKGROUND_HIGHLIGHT};
  }
  cursor: pointer;
`;

export const useSearchBar = ({
  activeCellIndex,
  bodyText,
}: {
  activeCellIndex: number;
  bodyText: string;
}): {
  showSearch: boolean;
  setShowSearch: (showSearch: boolean) => void;
  searchText: string;
  setSearchText: (text: string) => void;
  searchResultSelectedIndex?: number;
  outputSearchResultLength?: number;
  input: any;
} => {
  const dispatch = useDispatch();
  const showSearch = useSelector(
    (state: RootState) =>
      _.last(state.activeDocument?.cells[activeCellIndex].outputs)?.showSearch,
  );
  const [searchText, setSearchText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const searchResultSelectedIndex = useSelector(
    (state: RootState) =>
      _.last(state.activeDocument?.cells[activeCellIndex].outputs)
        ?.searchResultSelectedIndex,
  );

  const outputSearchResultLength = useSelector(
    (state: RootState) =>
      _.last(state.activeDocument?.cells[activeCellIndex].outputs)?.searchResult
        ?.length,
  );

  const updateFocus = () => {
    inputRef.current?.blur();
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (showSearch && inputRef.current) {
      updateFocus();
    }
  }, [showSearch]);

  useEffect(() => {
    const textSearchResult = searchOnText({
      match: searchText,
      text: bodyText,
    });

    dispatch(
      activeDocumentSlice.actions.setOutputsSearchResult({
        cellIndex: activeCellIndex,
        outputsSearchResult: textSearchResult,
      }),
    );
  }, [searchText, dispatch, activeCellIndex, bodyText]);

  const input = (
    <div
      style={{
        display: showSearch ? 'flex' : 'none',
        position: 'absolute',
        top: 0,
        right: 30,
        width: 300,
        height: 24,
        zIndex: 100,
        alignItems: 'center',
        margin: 5,
        gap: 10,
        backgroundColor: 'white',
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
        padding: 5,
      }}
    >
      <input
        placeholder="Find"
        ref={inputRef}
        style={{
          textIndent: 5,
          width: '100%',
          height: '100%',
          outline: 'none',
          padding: 0,
          border: `1px solid #${COLORS[THEME].BACKGROUND_HIGHLIGHT}`,
          borderRadius: 5,
        }}
        value={searchText}
        onChange={(e) => {
          setSearchText(e.target.value);

          // TODO: this is a hack to keep the search bar on focus
          setTimeout(updateFocus, 25);
          setTimeout(updateFocus, 50);
          setTimeout(updateFocus, 100);
          setTimeout(updateFocus, 200);
          setTimeout(updateFocus, 500);
        }}
      />
      <div
        style={{
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        {outputSearchResultLength
          ? `${
              (searchResultSelectedIndex || 0) + 1
            } of ${outputSearchResultLength}`
          : `No results`}
      </div>
      <ButtonHoverHighlight>
        <VscChevronUp
          size={20}
          style={{ userSelect: 'none' }}
          onClick={() => {
            dispatch(
              activeDocumentSlice.actions.selectPreviousOutputsSearchResult({
                cellIndex: activeCellIndex,
              }),
            );
          }}
        />
      </ButtonHoverHighlight>
      <ButtonHoverHighlight>
        <VscChevronDown
          size={20}
          style={{ userSelect: 'none' }}
          onClick={() => {
            dispatch(
              activeDocumentSlice.actions.selectNextOutputsSearchResult({
                cellIndex: activeCellIndex,
              }),
            );
          }}
        />
      </ButtonHoverHighlight>
      <ButtonHoverHighlight>
        <VscClose
          size={20}
          style={{ userSelect: 'none' }}
          onClick={() => {
            dispatch(
              setShowSearch({
                cellIndex: activeCellIndex,
                showSearch: false,
              }),
            );
          }}
        />
      </ButtonHoverHighlight>
    </div>
  );

  return {
    showSearch: showSearch || false,
    setShowSearch: (showSearch: boolean) => {
      dispatch(
        setShowSearch({
          cellIndex: activeCellIndex,
          showSearch,
        }),
      );
    },
    searchText,
    setSearchText,
    searchResultSelectedIndex,
    outputSearchResultLength,
    input,
  };
};
