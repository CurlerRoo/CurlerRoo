import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { useDebounce } from 'react-use';
import _ from 'lodash';
import { prompt } from '../input-prompt';
import { COLORS, THEME } from '@constants';
import { useContextMenu } from '../context-menu';
import {
  addVariable,
  appendToCellPostScript,
  setFormattedBody,
} from '../../../state/features/documents/active-document';
import { getValueByPath } from '../../../../shared/get-value-by-path';
import {
  addPathToJSONTokens,
  tokenizeJSON,
} from '../../../../shared/tokenize-json';
import {
  HighlightedTokenizedText,
  getHightlightedTokenizedText,
  getLowlightAndHighlightSpans,
} from '../../../../shared/text-search';
import { RootState } from '../../../state/store';
import { HighPerformanceScroll } from '../high-performance-scroll';
import { HotkeyOnFocus } from '../hotkey-on-focus';
import { useSearchBar } from '../../hooks/use-search-bar';
import { responseHandlerTypeToFeature } from './configs';
import { debugLog } from '../../../../shared/utils';
import { PlainTextResponse } from './plain-text-response';

const StringHoverHighlight = styled.span`
  &:hover {
    background-color: #${COLORS[THEME].RED} !important;
    color: white !important;
  }
  color: #${COLORS[THEME].RED} !important;
  border-radius: 4px;
  cursor: pointer;
  word-break: break-all;
`;

const NumberHoverHighlight = styled.span`
  &:hover {
    background-color: #${COLORS[THEME].BLUE} !important;
    color: white !important;
  }
  color: #${COLORS[THEME].BLUE} !important;
  border-radius: 4px;
  cursor: pointer;
  word-break: break-all;
`;

const BooleanHoverHighlight = styled.span`
  &:hover {
    background-color: #${COLORS[THEME].BLUE} !important;
    color: white !important;
  }
  color: #${COLORS[THEME].BLUE} !important;
  border-radius: 4px;
  cursor: pointer;
  word-break: break-all;
`;

const NullHoverHighlight = styled.span`
  &:hover {
    background-color: #${COLORS[THEME].BLUE} !important;
    color: white !important;
  }
  color: #${COLORS[THEME].BLUE} !important;
  border-radius: 4px;
  cursor: pointer;
  word-break: break-all;
`;

const KeyHoverHighlight = styled.span`
  &:hover {
    background-color: #${COLORS[THEME].GREEN} !important;
    color: white !important;
  }
  color: #${COLORS[THEME].GREEN} !important;
  border-radius: 4px;
  cursor: pointer;
  word-break: break-all;
`;

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

function JsonTokenHoverHighlight({
  token,
  children,
  ...props
}: {
  token: HighlightedTokenizedText;
  children: any;
  props?: any;
}) {
  const Component = (() => {
    if (token.type === 'string') {
      return StringHoverHighlight;
    }
    if (token.type === 'number') {
      return NumberHoverHighlight;
    }
    if (token.type === 'boolean') {
      return BooleanHoverHighlight;
    }
    if (token.type === 'null') {
      return NullHoverHighlight;
    }
    if (token.type === 'key') {
      return KeyHoverHighlight;
    }
    throw new Error('Invalid type');
  })();
  return <Component {...props}>{children}</Component>;
}

const MenuItemHoverHighlight = styled.div`
  &:hover {
    background-color: #${COLORS[THEME].BACKGROUND_HIGHLIGHT};
  }
  padding: 8px;
  cursor: pointer;
`;

function JsonSubTree({
  token,
  getContextMenuProps,
  searchResultSelectedIndex,
}: {
  token: HighlightedTokenizedText;
  getContextMenuProps: ({ customData }: { customData?: any }) => any;
  searchResultSelectedIndex?: number;
}): {
  value: any;
} {
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

  if (['string', 'number', 'boolean', 'null'].includes(token.type)) {
    return {
      value: (
        <JsonTokenHoverHighlight token={token}>
          {spans.map((span, i) => {
            if (span.type === 'highlight') {
              return (
                <Highlight
                  key={i}
                  {...getContextMenuProps({
                    customData: {
                      type: token.type,
                      tree: token.path,
                    },
                  })}
                  data-token-start={token.start + span.position}
                  data-token-end={token.end + span.position}
                  data-token-index={token.index}
                >
                  {span.value}
                </Highlight>
              );
            }
            if (span.type === 'selected') {
              return (
                <Selected
                  key={i}
                  {...getContextMenuProps({
                    customData: {
                      type: token.type,
                      tree: token.path,
                    },
                  })}
                  data-token-start={token.start + span.position}
                  data-token-end={token.end + span.position}
                  data-token-index={token.index}
                >
                  {span.value}
                </Selected>
              );
            }
            return (
              <Lowlight
                key={i}
                {...getContextMenuProps({
                  customData: {
                    type: token.type,
                    tree: token.path,
                  },
                })}
                data-token-start={token.start + span.position}
                data-token-end={token.end + span.position}
                data-token-index={token.index}
              >
                {span.value}
              </Lowlight>
            );
          })}
        </JsonTokenHoverHighlight>
      ),
    };
  }
  if (token.type === 'key') {
    return {
      value: (
        <JsonTokenHoverHighlight token={token}>
          {spans.map((span, i) => {
            if (span.type === 'highlight') {
              return (
                <Highlight
                  key={i}
                  {...getContextMenuProps({
                    customData: {
                      type: token.type,
                      tree: token.path,
                    },
                  })}
                  data-token-start={token.start + span.position}
                  data-token-end={token.end + span.position}
                  data-token-index={token.index}
                >
                  {span.value}
                </Highlight>
              );
            }
            if (span.type === 'selected') {
              return (
                <Selected
                  key={i}
                  {...getContextMenuProps({
                    customData: {
                      type: token.type,
                      tree: token.path,
                    },
                  })}
                  data-token-start={token.start + span.position}
                  data-token-end={token.end + span.position}
                  data-token-index={token.index}
                >
                  {span.value}
                </Selected>
              );
            }
            return (
              <Lowlight
                key={i}
                {...getContextMenuProps({
                  customData: {
                    type: token.type,
                    tree: token.path,
                  },
                })}
                data-token-start={token.start + span.position}
                data-token-end={token.end + span.position}
                data-token-index={token.index}
              >
                {span.value}
              </Lowlight>
            );
          })}
        </JsonTokenHoverHighlight>
      ),
    };
  }
  if (token.type === 'structural') {
    return {
      value: spans.map((span, i) => {
        if (span.type === 'highlight') {
          return (
            <Highlight
              key={i}
              data-token-start={token.start + span.position}
              data-token-end={token.end + span.position}
              data-token-index={token.index}
            >
              {span.value}
            </Highlight>
          );
        }
        if (span.type === 'selected') {
          return (
            <Selected
              key={i}
              data-token-start={token.start + span.position}
              data-token-end={token.end + span.position}
              data-token-index={token.index}
            >
              {span.value}
            </Selected>
          );
        }
        return (
          <Lowlight
            key={i}
            data-token-start={token.start + span.position}
            data-token-end={token.end + span.position}
            data-token-index={token.index}
          >
            {span.value}
          </Lowlight>
        );
      }),
    };
  }
  throw new Error('Invalid AST');
}

const validateVariableName = async (value: string | null) => {
  // user cancelled
  if (value === null) {
    return null;
  }
  if (!value || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(
      'Variable name must start with a letter and can only contain letters, numbers, and underscores.',
    );
  }
  return value;
};

export function JsonTreeResponse({
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

  useEffect(() => {
    try {
      const formattedBody = JSON.stringify(JSON.parse(joined), null, 2);
      dispatch(setFormattedBody({ cellIndex: activeCellIndex, formattedBody }));
    } catch (e) {
      dispatch(
        setFormattedBody({ cellIndex: activeCellIndex, formattedBody: joined }),
      );
    }
  }, [joined, dispatch, activeCellIndex]);

  const formattedBody = useSelector((state: RootState) => {
    return state.activeDocument?.cells[activeCellIndex].outputs.slice(-1)[0]
      .formattedBody;
  });

  const { input, showSearch, setShowSearch, searchResultSelectedIndex } =
    useSearchBar({ activeCellIndex, bodyText: formattedBody || '' });

  const contentLength = joined.length;
  const [selection, setSelection] = useState<{
    startPosition: number;
    endPosition: number;
  } | null>(null);

  const obj = useMemo(() => {
    try {
      return JSON.parse(joined);
    } catch (e) {
      return null;
    }
  }, [joined]);

  const textSearchResult = useSelector((state: RootState) => {
    return _.last(state.activeDocument?.cells[activeCellIndex].outputs)
      ?.searchResult;
  });

  const onClickCreateVariable = useMemo(() => {
    return ({
      name,
      value,
      tree,
    }: {
      name: string;
      value?: unknown;
      tree: string;
    }) => {
      dispatch(
        appendToCellPostScript({
          cellIndex: activeCellIndex,
          postScript: `var ${name} = json_body('${tree}')`,
        }),
      );
      dispatch(
        addVariable({
          cellIndex: activeCellIndex,
          variable: {
            key: name,
            value,
            source: 'response',
          },
        }),
      );
    };
  }, [activeCellIndex, dispatch]);

  const [focused, setFocused] = useState(false);

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

  const contextMenu = useContextMenu({
    menu:
      ({ customData }) =>
      () => {
        if (window.getSelection()?.toString()) {
          return (
            <div>
              <MenuItemHoverHighlight
                onClick={() => {
                  const selectedText = formattedBody?.substring(
                    selection?.startPosition ?? 0,
                    selection?.endPosition ?? 0,
                  );
                  if (!selectedText) {
                    return;
                  }
                  navigator.clipboard.writeText(selectedText);
                  contextMenu.close();
                }}
              >
                Copy selection
              </MenuItemHoverHighlight>
            </div>
          );
        }
        return (
          <div>
            <MenuItemHoverHighlight
              onClick={async () => {
                const [name] = await prompt([
                  { label: 'Variable name:', onConfirm: validateVariableName },
                ]);
                if (!name) {
                  return;
                }
                onClickCreateVariable?.({
                  tree: customData.tree,
                  name,
                  value: getValueByPath(obj, customData.tree),
                });
                contextMenu.close();
              }}
            >
              Create variable
            </MenuItemHoverHighlight>
            <div
              style={{
                height: 1,
                width: '100%',
                backgroundColor: `#${COLORS[THEME].BACKGROUND_HIGHLIGHT}`,
              }}
            />
            <MenuItemHoverHighlight
              onClick={() => {
                const value = getValueByPath(obj, customData.tree);
                navigator.clipboard.writeText(
                  typeof value === 'string'
                    ? value
                    : JSON.stringify(value, null, 2),
                );
                contextMenu.close();
              }}
            >
              Copy value
            </MenuItemHoverHighlight>
          </div>
        );
      },
  });

  const [jsonTokensByLine, setJsonTokensByLine] =
    useState<Record<number, HighlightedTokenizedText[]>>();

  const [lineByHighlightIndex, setLineByHighlightIndex] =
    useState<Record<number, number>>();

  const tokenizedTexts = useMemo(() => {
    if (!formattedBody) {
      return null;
    }
    return addPathToJSONTokens({
      tokens: tokenizeJSON(formattedBody),
    });
  }, [formattedBody]);

  // useDebounce instead of useEffect
  // confirmed that the UI feels much more responsive with this
  useDebounce(
    () => {
      try {
        if (!tokenizedTexts) {
          return null;
        }

        const tokens = getHightlightedTokenizedText({
          tokenizedTexts,
          matchedLocations: textSearchResult || [],
        });
        const lineByHighlightIndex = _(tokens)
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
        const tokensByLine = _(tokens)
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

  const [hoverTree, setHoverTree] = useState<string | null>(null);

  const scrollToLine = lineByHighlightIndex?.[searchResultSelectedIndex ?? 0];

  debugLog('HVH', 'contentLength', contentLength);
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
        height: '100%',
        width: '100%',
        position: 'relative',
      }}
      onCtrlF={({ ref }) => {
        if (!responseHandlerTypeToFeature['JSON'].includes('Search')) {
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
          height: 'calc(100% - 20px)',
          outline: 'none',
        }}
        tabIndex={0}
      >
        {contextMenu.menuPortal}
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
              item: tokens.map((token) => {
                const { value } = JsonSubTree({
                  token,
                  getContextMenuProps: contextMenu.getProps,
                  searchResultSelectedIndex,
                });
                const getDataCustomTree = (
                  target: HTMLElement,
                ): string | null => {
                  const tree = target.getAttribute('data-custom-tree');
                  if (tree) {
                    return tree;
                  }
                  if (target.children.length > 0) {
                    return getDataCustomTree(target.children[0] as HTMLElement);
                  }
                  return null;
                };
                return (
                  <div
                    onMouseEnter={(e) => {
                      const tree = getDataCustomTree(e.target as HTMLElement);
                      setHoverTree(tree);
                    }}
                    onMouseLeave={(e) => {
                      const tree = getDataCustomTree(e.target as HTMLElement);
                      if (tree === hoverTree) {
                        setHoverTree(null);
                      }
                    }}
                    style={{ display: 'inline-block' }}
                    key={token.index}
                  >
                    {value}
                  </div>
                );
              }),
            };
          }}
          scrollToLine={scrollToLine}
        />
      </div>
      <div
        style={{
          height: 20,
          display: 'flex',
          alignItems: 'center',
          color: `#${COLORS[THEME].BLACK_EAL}`,
        }}
      >
        {hoverTree}
      </div>
    </HotkeyOnFocus>
  );
}
