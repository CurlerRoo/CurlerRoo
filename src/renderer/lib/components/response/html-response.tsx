import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import _ from 'lodash';
import { useDebounce } from 'react-use';
import { HotkeyOnFocus } from '../hotkey-on-focus';
import { useSearchBar } from '../../hooks/use-search-bar';
import { responseHandlerTypeToFeature } from './configs';
import { tokenizeHtml } from '../../../../shared/tokenize-html';
import {
  HighlightedTokenizedText,
  getHightlightedTokenizedText,
  getLowlightAndHighlightSpans,
} from '../../../../shared/text-search';
import { RootState } from '../../../state/store';
import { setFormattedBody } from '../../../state/features/documents/active-document';
import { HighPerformanceScroll } from '../high-performance-scroll';
import { COLORS, THEME } from '@constants';
import { debugLog } from '../../../../shared/utils';
import { PlainTextResponse } from './plain-text-response';

const highlightStyles = {
  backgroundColor: `rgba(255, 255, 0, 0.5)`,
  wordBreak: 'break-all',
} as const;

const selectedStyles = {
  backgroundColor: `rgba(127, 127, 0, 0.5)`,
  wordBreak: 'break-all',
} as const;

const lowlightStyles = {
  wordBreak: 'break-all',
} as const;

const tagStyles = {
  color: `#${COLORS[THEME].RED}`,
};

const attributeKeyStyles = {
  color: `#${COLORS[THEME].GREEN}`,
};

const attributeEqualStyles = {
  color: `#${COLORS[THEME].GREEN}`,
};

const attributeValueStyles = {
  color: `#${COLORS[THEME].RED}`,
};

export function HtmlResponse({
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
  const dispatch = useDispatch();
  const joined = useMemo(() => response.body.join('\n'), [response.body]);
  const formattedBody = useSelector((state: RootState) => {
    return state.activeDocument?.cells[activeCellIndex].outputs.slice(-1)[0]
      .formattedBody;
  });

  const { input, showSearch, setShowSearch, searchResultSelectedIndex } =
    useSearchBar({
      activeCellIndex,
      bodyText: formattedBody || '',
    });

  const textSearchResult = useSelector((state: RootState) => {
    return _.last(state.activeDocument?.cells[activeCellIndex].outputs)
      ?.searchResult;
  });

  const tokens = useMemo(() => {
    try {
      return tokenizeHtml(joined);
    } catch (e) {
      debugLog('HVH', 'e', e);
      return null;
    }
  }, [joined]);

  useEffect(() => {
    if (!tokens) {
      return;
    }
    dispatch(
      setFormattedBody({
        cellIndex: activeCellIndex,
        formattedBody: tokens?.map((token) => token.value).join('') || '',
      }),
    );
  }, [tokens, activeCellIndex, dispatch]);

  const [jsonTokensByLine, setJsonTokensByLine] =
    useState<Record<number, HighlightedTokenizedText[]>>();

  const [lineByHighlightIndex, setLineByHighlightIndex] =
    useState<Record<number, number>>();

  // useDebounce instead of useEffect
  // confirmed that the UI feels much more responsive with this
  useDebounce(
    () => {
      try {
        if (!tokens) {
          return null;
        }

        const highlightedTokens = getHightlightedTokenizedText({
          tokenizedTexts: tokens,
          matchedLocations: textSearchResult || [],
        });
        const lineByHighlightIndex = _(highlightedTokens)
          .flatMap((token) =>
            (token.highlights || []).map((highlight) => ({
              highlight,
              token,
            })),
          )
          .groupBy((m) => m.highlight.index)
          .mapValues((m) => m[0].token.startLine)
          .value();
        setLineByHighlightIndex(lineByHighlightIndex);
        const tokensByLine = _(highlightedTokens)
          .groupBy((m) => m.startLine)
          .value();
        return setJsonTokensByLine(tokensByLine);
      } catch (e) {
        return null;
      }
    },
    0,
    [textSearchResult],
  );

  const scrollToLine = lineByHighlightIndex?.[searchResultSelectedIndex ?? 0];

  const [focused, setFocused] = useState(false);

  const [selection, setSelection] = useState<{
    startPosition: number;
    endPosition: number;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'c' && focused) {
        const selectedText = formattedBody?.substring(
          selection?.startPosition ?? 0,
          selection?.endPosition ?? 0,
        );
        if (!selectedText) {
          return;
        }
        event.preventDefault();
        navigator.clipboard.writeText(selectedText);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    formattedBody,
    selection?.startPosition,
    selection?.endPosition,
    focused,
  ]);

  const contentLength = response.body.length;
  if (contentLength > 5000000) {
    return (
      <PlainTextResponse
        activeCellIndex={activeCellIndex}
        response={response}
      />
    );
  }

  if (!jsonTokensByLine) {
    return null;
  }

  return (
    <HotkeyOnFocus
      style={{
        height: 'calc(100% - 10px)',
        width: '100%',
        position: 'relative',
      }}
      onCtrlF={({ ref }) => {
        if (!responseHandlerTypeToFeature['HTML'].includes('Search')) {
          return;
        }
        setShowSearch(!showSearch);
        if (showSearch) {
          // if showSearch is true, then we are hiding the search bar
          ref.current?.focus();
        }
      }}
      onFocus={() => {
        setFocused(true);
      }}
      onBlur={() => {
        setFocused(false);
      }}
    >
      {input}
      <div
        style={{
          width: '100%',
          height: '100%',
          outline: 'none',
        }}
        tabIndex={0}
      >
        <HighPerformanceScroll
          onSelectionChange={({ startPosition, endPosition }) => {
            setSelection({ startPosition, endPosition });
          }}
          itemCount={_(jsonTokensByLine).keys().value().length}
          estimateSize={(index) => {
            const tokens = jsonTokensByLine[index];
            const tokensStart = tokens[0].start;
            const tokensEnd = tokens[tokens.length - 1].end;
            return Math.ceil((tokensEnd - tokensStart) / 100) * 20; // TODO: 100
          }}
          getItem={(index) => {
            const tokens = jsonTokensByLine[index];
            const tokenIndexStart = tokens[0].index;
            const tokenIndexEnd = tokens[tokens.length - 1].index;
            const tokensStart = tokens[0].start;
            const tokensEnd = tokens[tokens.length - 1].end;

            return {
              tokenIndexStart,
              tokenIndexEnd,
              tokensStart,
              tokensEnd,
              item: (
                <>
                  {tokens.flatMap((token) => {
                    const tokenStyles = (() => {
                      if (token.type === 'tag') {
                        return tagStyles;
                      }
                      if (token.type === 'attributeKey') {
                        return attributeKeyStyles;
                      }
                      if (token.type === 'attributeEqual') {
                        return attributeEqualStyles;
                      }
                      if (token.type === 'attributeValue') {
                        return attributeValueStyles;
                      }
                      return {};
                    })();
                    const spans = (() => {
                      if (!token.highlights?.length) {
                        return [
                          {
                            value: token.value,
                            type: 'lowlight',
                            position: 0,
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
                    return spans.map((span) => {
                      const spanStyles = (() => {
                        if (span.type === 'highlight') {
                          return highlightStyles;
                        }
                        if (span.type === 'selected') {
                          return selectedStyles;
                        }
                        return lowlightStyles;
                      })();
                      return (
                        <span
                          data-token-index={token.index}
                          data-token-start={token.start + span.position}
                          data-token-end={token.end + span.position}
                          style={{ ...tokenStyles, ...spanStyles }}
                        >
                          {span.value}
                        </span>
                      );
                    });
                  })}
                </>
              ),
            };
          }}
          scrollToLine={scrollToLine}
        />
      </div>
    </HotkeyOnFocus>
  );
}
