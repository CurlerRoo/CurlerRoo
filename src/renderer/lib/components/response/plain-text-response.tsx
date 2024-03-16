import { useSelector } from 'react-redux';
import { useEffect, useMemo } from 'react';
import 'rc-notification/assets/index.css';
import _ from 'lodash';
import styled from 'styled-components';
import { HotkeyOnFocus } from '../hotkey-on-focus';
import { useSearchBar } from '../../hooks/use-search-bar';
import {
  getHightlightedTokenizedText,
  getLowlightAndHighlightSpans,
} from '../../../../shared/text-search';
import { RootState } from '../../../state/store';
import { responseHandlerTypeToFeature } from './configs';
import { COLORS, THEME } from '@constants';

const Highlight = styled.span`
  background-color: rgba(255, 255, 0, 0.5);
  word-break: break-all;
`;

const Selected = styled.span`
  background-color: rgba(127, 127, 0, 0.5);
  word-break: break-all;
`;

const Lowlight = styled.span`
  word-break: break-all;
`;

export function PlainTextResponse({
  response,
  activeCellIndex,
}: {
  response: {
    protocol: string;
    headers: {
      [key: string]: string;
    };
    status: number;
    bodyFilePath: string;
    bodyBase64: string;
    body: string[];
  };
  activeCellIndex: number;
}) {
  const joined = useMemo(() => {
    return response.body.join('\n');
  }, [response.body]);
  const { input, showSearch, setShowSearch, searchResultSelectedIndex } =
    useSearchBar({
      activeCellIndex,
      bodyText: joined,
    });

  const textSearchResult = useSelector((state: RootState) => {
    return _.last(state.activeDocument?.cells[activeCellIndex].outputs)
      ?.searchResult;
  });

  const [token] = getHightlightedTokenizedText({
    tokenizedTexts: [
      {
        end: joined.length,
        start: 0,
        index: 0,
        path: '',
        startLine: 0,
        type: 'text',
        value: joined,
      },
    ],
    matchedLocations: textSearchResult || [],
  });

  const spans = (() => {
    if (!token.highlights?.length) {
      return [
        {
          value: token.value,
          type: 'lowlight',
          highlightIndex: undefined,
        },
      ];
    }
    return getLowlightAndHighlightSpans({
      text: token.value,
      highlights: token.highlights.map((m) => ({
        start: m.start - token.start,
        end: m.end - token.start,
        index: m.index,
      })),
      searchResultSelectedIndex,
    });
  })();

  useEffect(() => {
    document
      .getElementById(`plain-text-highlight-${searchResultSelectedIndex}`)
      ?.scrollIntoView({
        behavior: 'instant',
        block: 'center',
        inline: 'center',
      });
  }, [searchResultSelectedIndex]);

  return (
    <HotkeyOnFocus
      style={{
        height: 'calc(100% - 10px)',
        width: '100%',
        position: 'relative',
      }}
      onCtrlF={({ ref }) => {
        if (!responseHandlerTypeToFeature['Raw text'].includes('Search')) {
          return;
        }
        setShowSearch(!showSearch);
        if (showSearch) {
          // if showSearch is true, then we are hiding the search bar
          ref.current?.focus();
        }
      }}
    >
      {input}
      <div
        style={{
          height: 'calc(100% - 20px)',
          width: 'calc(100% - 20px)',
          overflowX: 'hidden',
          padding: 10,
          backgroundColor: `#${COLORS[THEME].WHITE}`,
          borderRadius: 4,
        }}
      >
        {spans.map((span, i) => {
          if (span.type === 'highlight') {
            return (
              <Highlight
                key={i}
                id={`plain-text-highlight-${span.highlightIndex}`}
              >
                {span.value}
              </Highlight>
            );
          }
          if (span.type === 'selected') {
            return (
              <Selected
                key={i}
                id={`plain-text-highlight-${span.highlightIndex}`}
              >
                {span.value}
              </Selected>
            );
          }
          return <Lowlight key={i}>{span.value}</Lowlight>;
        })}
      </div>
    </HotkeyOnFocus>
  );
}
