import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import _ from 'lodash';
import { VscClearAll, VscCopy, VscSearch } from 'react-icons/vsc';
import styled from 'styled-components';
import CodeMirror, {
  EditorView,
  ReactCodeMirrorRef,
  Statistics,
} from '@uiw/react-codemirror';
import { Decoration, ViewPlugin, DecorationSet } from '@codemirror/view';
import { ResponseHandlerType, responseHandlerTypeToFeature } from './configs';
import { TextButton } from '../text-button';
import { useContextMenu } from '../context-menu';
import { prompt } from '../input-prompt';
import {
  cancelSend,
  clearOutputs,
  setSearchClickedAt,
  addVariable,
  appendToCellPostScript,
} from '../../../state/features/documents/active-document';
import { CurlCellType } from '../../../../shared/types';
import { JsonTreeResponse } from './json-tree-response';
import { getHeader } from '../../../../shared/get-header';
import { BinaryResponse } from '../binary-response';
import { HtmlResponse } from './html-response';
import { COLORS, THEME } from '@constants';
import { ImageResponse } from './image-response';
import { PlainTextResponse } from './plain-text-response';
import { XmlResponse } from './xml-response';
import { PdfResponse } from './pdf-response';
import {
  useWatchForRefChanged,
  useWatchForRefReady,
} from '../../hooks/use-watch-for-ref-ready';
import { RootState } from '../../../state/store';

const MenuItemHoverHighlight = styled.div`
  &:hover {
    background-color: #${COLORS[THEME].BACKGROUND_HIGHLIGHT};
  }
  padding: 8px;
  cursor: pointer;
`;

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

const HEADER_BLOCK_GAP_LINES = 3;

type HeadersOutput = {
  protocol: string;
  headers: {
    [key: string]: string;
  };
};

type CodeMirrorDocLike = {
  lines: number;
  line: (n: number) => { from: number };
  lineAt: (pos: number) => { number: number; from: number };
};

const getHeaderBlockStartLine = (
  outputs: HeadersOutput[],
  outputIndex: number,
): number => {
  let lineNumber = 1; // 1-based
  for (let i = 0; i < outputIndex; i += 1) {
    lineNumber += 1; // protocol line
    lineNumber += Object.keys(outputs[i].headers).length; // headers lines
    lineNumber += HEADER_BLOCK_GAP_LINES; // empty lines between outputs
  }
  return lineNumber;
};

const findHeaderAtPosition = (
  position: number,
  outputs: HeadersOutput[],
  doc: CodeMirrorDocLike | null | undefined,
): { key: string; value: string; type: 'key' | 'value' } | null => {
  if (!doc) return null;

  const clickedLineNumber = doc.lineAt(position).number; // 1-based
  let blockStartLineNumber = 1;

  for (let outputIndex = 0; outputIndex < outputs.length; outputIndex += 1) {
    const output = outputs[outputIndex];
    const headerEntries = _(output.headers).entries().value();
    const headerCount = headerEntries.length;

    const headerLinesStart = blockStartLineNumber + 1;
    const headerLinesEnd = headerLinesStart + headerCount - 1;

    if (
      clickedLineNumber >= headerLinesStart &&
      clickedLineNumber <= headerLinesEnd
    ) {
      const headerIndex = clickedLineNumber - headerLinesStart;
      const [key, value] = headerEntries[headerIndex];
      const lineFrom = doc.line(clickedLineNumber).from;
      const column = position - lineFrom;

      if (column >= 0 && column < key.length) {
        return { key, value, type: 'key' };
      }

      const valueStartColumn = key.length + 2; // ": "
      const valueEndColumn = valueStartColumn + value.length;
      if (column >= valueStartColumn && column <= valueEndColumn) {
        return { key, value, type: 'value' };
      }

      return null;
    }

    // Advance to next block start line using the same logic as the headers scroll effect.
    blockStartLineNumber += 1; // protocol line
    blockStartLineNumber += headerCount; // headers lines
    blockStartLineNumber += HEADER_BLOCK_GAP_LINES; // empty lines between outputs
  }

  return null;
};

const getResponseHandlerTypes = ({
  contentType,
}: {
  contentType: string | undefined;
}): {
  handlerTypes: ResponseHandlerType[];
} => {
  if (!contentType) {
    return {
      handlerTypes: ['Raw text'],
    };
  }
  if (contentType.match(/application\/([\w.+-]*\+)?json/i)) {
    return {
      handlerTypes: ['JSON', 'Raw text'],
    };
  }
  if (
    contentType.match(/text\/([\w.+-]*\+)?html/i) ||
    contentType.match(/application\/([\w.+-]*\+)?html/i)
  ) {
    return {
      handlerTypes: ['HTML', 'Raw text'],
    };
  }
  if (
    contentType.match(/text\/([\w.+-]*\+)?xml/i) ||
    contentType.match(/application\/([\w.+-]*\+)?xml/i)
  ) {
    return {
      handlerTypes: ['XML', 'Raw text'],
    };
  }
  if (contentType.match(/image\/([\w.+-]*\+)?/i)) {
    return {
      handlerTypes: ['Image'],
    };
  }
  if (contentType.match(/application\/([\w.+-]*\+)?pdf/i)) {
    return {
      handlerTypes: ['PDF'],
    };
  }
  if (
    [
      'application/octet-stream',
      'application/zip',
      'application/x-gzip',
      'application/x-tar',
      'application/x-7z-compressed',
    ].some((m) => contentType.includes(m))
  ) {
    return {
      handlerTypes: ['Binary'],
    };
  }
  return {
    handlerTypes: ['Raw text'],
  };
};

function FormattedResponse({
  handlerType,
  response,
  activeCellIndex,
}: {
  handlerType: ResponseHandlerType;
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
  if (handlerType === 'JSON') {
    return (
      <JsonTreeResponse response={response} activeCellIndex={activeCellIndex} />
    );
  }
  if (handlerType === 'HTML') {
    return (
      <HtmlResponse response={response} activeCellIndex={activeCellIndex} />
    );
  }
  if (handlerType === 'XML') {
    return (
      <XmlResponse response={response} activeCellIndex={activeCellIndex} />
    );
  }
  if (handlerType === 'Raw text') {
    return (
      <PlainTextResponse
        response={response}
        activeCellIndex={activeCellIndex}
      />
    );
  }
  if (handlerType === 'Image') {
    return <ImageResponse response={response} />;
  }
  if (handlerType === 'PDF') {
    return <PdfResponse response={response} />;
  }
  if (handlerType === 'Binary') {
    return <BinaryResponse response={response} />;
  }
  return (
    <PlainTextResponse response={response} activeCellIndex={activeCellIndex} />
  );
}

const useResponseHandler = ({ contentType }: { contentType: string }) => {
  const { handlerTypes } = useMemo(
    () => getResponseHandlerTypes({ contentType }),
    [contentType],
  );

  const [selectedHandlerType, setSelectedHandlerType] =
    useState<ResponseHandlerType>(handlerTypes[0]);
  useEffect(() => {
    setSelectedHandlerType(handlerTypes[0]);
  }, [handlerTypes]);
  return {
    selectedHandlerType,
    setSelectedHandlerType,
    handlerTypes,
  };
};

const useHeadersContextMenu = ({
  headersStatisticsRef,
  headersCodeMirrorRef,
  outputs,
  onClickCreateVariable,
}: {
  headersStatisticsRef: React.MutableRefObject<Statistics | null>;
  headersCodeMirrorRef: React.MutableRefObject<ReactCodeMirrorRef | null>;
  outputs: HeadersOutput[];
  onClickCreateVariable: (params: {
    name: string;
    value: string;
    headerKey: string;
  }) => void;
}) => {
  const headersContextMenu = useContextMenu({
    menu: () => () => {
      if (!headersStatisticsRef.current) {
        return null;
      }
      const { from, to } = headersStatisticsRef.current.selectionAsSingle;
      const position = from;
      const header = findHeaderAtPosition(
        position,
        outputs,
        headersCodeMirrorRef.current?.view?.state.doc,
      );

      if (!header) {
        return null;
      }

      const displayValue =
        header.value.length > 40
          ? `${header.value.slice(0, 40)}...`
          : header.value;

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
                headerKey: header.key,
                name,
                value: header.value,
              });
              headersContextMenu.close();
            }}
          >
            Create variable from:{' '}
            <code
              style={{
                backgroundColor: `#${COLORS[THEME].GREY3}`,
              }}
            >
              {header.key}
            </code>
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
              navigator.clipboard.writeText(header.value);
              headersContextMenu.close();
            }}
          >
            Copy:{' '}
            <code
              style={{
                backgroundColor: `#${COLORS[THEME].GREY3}`,
              }}
            >
              {displayValue}
            </code>
          </MenuItemHoverHighlight>
        </div>
      );
    },
  });

  return headersContextMenu;
};

const formatHeadersAsText = (outputs: HeadersOutput[]): string => {
  return outputs
    .map((output, i) => {
      const protocolLine = output.protocol;
      const headerLines = _(output.headers)
        .entries()
        .map(([k, v]) => `${k}: ${v}`)
        .value()
        .join('\n');
      const divider = i < outputs.length - 1 ? '\n\n' : '';
      return `${protocolLine}\n${headerLines}${divider}`;
    })
    .join('\n\n');
};

const createHeadersDecorations = (outputs: HeadersOutput[]) => {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view, outputs);
      }

      update(update: any) {
        if (update.docChanged) {
          this.decorations = this.buildDecorations(update.view, outputs);
        }
      }

      buildDecorations(
        view: EditorView,
        outputs: HeadersOutput[],
      ): DecorationSet {
        const decorations: any[] = [];
        const doc = view.state.doc;
        let blockStartLineNumber = 1;

        outputs.forEach((output) => {
          const protocolLineNumber = blockStartLineNumber;
          const protocolFrom = doc.line(protocolLineNumber).from;
          decorations.push(
            Decoration.mark({
              class: 'cm-header-protocol',
            }).range(protocolFrom, protocolFrom + output.protocol.length),
          );

          const headerEntries = _(output.headers).entries().value();
          headerEntries.forEach(([key, value], headerIndex) => {
            const headerLineNumber = blockStartLineNumber + 1 + headerIndex;
            const lineFrom = doc.line(headerLineNumber).from;

            // Header key - GREEN
            decorations.push(
              Decoration.mark({
                class: 'cm-header-key',
              }).range(lineFrom, lineFrom + key.length),
            );

            // Header value - RED
            const valueFrom = lineFrom + key.length + 2; // ": "
            decorations.push(
              Decoration.mark({
                class: 'cm-header-value',
              }).range(valueFrom, valueFrom + value.length),
            );
          });

          // Advance to next block start line (same logic as the headers scroll effect).
          blockStartLineNumber += 1; // protocol line
          blockStartLineNumber += headerEntries.length; // headers lines
          blockStartLineNumber += HEADER_BLOCK_GAP_LINES; // empty lines between outputs
        });

        return Decoration.set(decorations);
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );
};

const headersTheme = EditorView.theme({
  '.cm-header-protocol': {
    color: `#${COLORS[THEME].RED}`,
  },
  '.cm-header-key': {
    color: `#${COLORS[THEME].GREEN}`,
  },
  '.cm-header-value': {
    color: `#${COLORS[THEME].RED}`,
  },
});

export function CellResponses({
  activeCellIndex,
  cell,
}: {
  activeCellIndex: number;
  cell: CurlCellType;
}) {
  const dispatch = useDispatch();
  const output = _.last(cell.outputs)!;

  const { selectedHandlerType, setSelectedHandlerType, handlerTypes } =
    useResponseHandler({
      contentType: getHeader(output.headers, 'content-type') || '',
    });

  const [loadingEclipsis, setLoadingEclipsis] = useState(0);

  const headersWrapperRef = useRef<HTMLDivElement>(null);
  useWatchForRefReady(headersWrapperRef);

  const { wordWrappingInEditor } = useSelector(
    (state: RootState) => state.user,
  );

  const headersText = useMemo(
    () => formatHeadersAsText(cell.outputs),
    [cell.outputs],
  );

  const headersDecorations = useMemo(
    () => createHeadersDecorations(cell.outputs),
    [cell.outputs],
  );

  const headersCodeMirrorRef = useRef<ReactCodeMirrorRef>(null);
  useWatchForRefChanged(headersCodeMirrorRef);
  const headersStatisticsRef = useRef<Statistics | null>(null);
  useWatchForRefReady(headersStatisticsRef);

  const onClickCreateVariable = useMemo(() => {
    return ({
      name,
      value,
      headerKey,
    }: {
      name: string;
      value: string;
      headerKey: string;
    }) => {
      dispatch(
        appendToCellPostScript({
          cellIndex: activeCellIndex,
          postScript: `var ${name} = headers('${headerKey}')`,
        }),
      );
      dispatch(
        addVariable({
          variable: {
            key: name,
            value,
            source: 'response',
          },
        }),
      );
    };
  }, [activeCellIndex, dispatch]);

  const headersContextMenu = useHeadersContextMenu({
    headersStatisticsRef,
    headersCodeMirrorRef,
    outputs: cell.outputs,
    onClickCreateVariable,
  });

  useEffect(() => {
    if (cell?.send_status !== 'sending') {
      return () => {};
    }
    const timer = setInterval(() => {
      setLoadingEclipsis((x) => (x + 1) % 4);
    }, 300);
    return () => {
      clearInterval(timer);
    };
  }, [cell?.send_status]);

  useEffect(() => {
    const elementId = `output-${cell.outputs.length - 1}`;
    const element = document.getElementById(elementId);
    // setTimeout may not be necessary, but it's here to ensure that the element is rendered
    // The last time I tested it, it was unnecessary. But I'm leaving it here just in case.
    setTimeout(() => {
      element?.scrollIntoView({
        behavior: 'instant',
        block: 'start',
        inline: 'start',
      });
    }, 0);
  }, [cell.outputs]);

  // Scroll CodeMirror headers editor to the latest output block
  useEffect(() => {
    const codeMirrorView = headersCodeMirrorRef.current?.view;
    if (!codeMirrorView) return;
    if (cell.outputs.length === 0) return;

    const lineNumber = getHeaderBlockStartLine(
      cell.outputs,
      cell.outputs.length - 1,
    );

    setTimeout(() => {
      const doc = codeMirrorView.state.doc;
      if (lineNumber > doc.lines) return;

      const line = doc.line(lineNumber);
      // Use CodeMirror's native scrollIntoView
      codeMirrorView.dispatch({
        effects: EditorView.scrollIntoView(line.from, {
          y: 'start',
        }),
      });
    }, 0);
  }, [headersCodeMirrorRef.current?.view, cell.outputs, headersText]);

  if (!cell) {
    return null;
  }

  const enabledFeatures =
    responseHandlerTypeToFeature[selectedHandlerType] || [];

  const shouldShowBody = !(output.status >= 300 && output.status < 400);
  const shouldShowHeaders = !_.isEmpty(output.headers);

  return (
    <div
      key={`${activeCellIndex}-${_.last(cell.outputs)?.responseDate}`}
      tabIndex={0}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        outline: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 100,
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
          display: cell.send_status === 'sending' ? 'flex' : 'none',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
        }}
      >
        <code>
          &nbsp;&nbsp;&nbsp;Loading
          {_.range(4)
            .map((i) => (i < loadingEclipsis ? '.' : '\u00A0'))
            .join('')}
        </code>
        <div style={{ height: 20 }} />
        <TextButton
          onClick={() => {
            dispatch(
              cancelSend({
                cellIndex: activeCellIndex,
              }),
            );
          }}
        >
          Click here to cancel
        </TextButton>
      </div>
      <div
        style={{
          position: 'relative',
          backgroundColor: `#${COLORS[THEME].BACKGROUND}`,
          height: '100%',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            padding: '10px 15px',
            position: 'relative',
            height: 'calc(100% - 20px)',
          }}
        >
          <TextButton
            icon={VscClearAll}
            onClick={() => {
              dispatch(
                clearOutputs({
                  cellIndex: activeCellIndex,
                }),
              );
            }}
          >
            Clear
          </TextButton>
          <div style={{ height: 10 }} />
          <div
            style={{
              position: 'relative',
              ...(shouldShowBody && {
                height: 'calc(100% - 20px)',
              }),
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {shouldShowHeaders && (
              <>
                <div
                  ref={headersWrapperRef}
                  style={{
                    maxHeight: '25%',
                    backgroundColor: `#${COLORS[THEME].WHITE}`,
                    borderRadius: 4,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                  {...headersContextMenu.getProps()}
                >
                  {headersContextMenu.menuPortal}
                  <CodeMirror
                    ref={headersCodeMirrorRef}
                    extensions={[
                      headersTheme,
                      headersDecorations,
                      ...(wordWrappingInEditor
                        ? [EditorView.lineWrapping]
                        : []),
                    ]}
                    readOnly
                    height={
                      headersWrapperRef.current?.clientHeight
                        ? `${headersWrapperRef.current.clientHeight}px`
                        : '200px'
                    }
                    value={headersText}
                    onContextMenu={async (e) => {
                      e.preventDefault();
                      // await for statistics to be updated
                      await new Promise<void>((resolve) => {
                        setTimeout(resolve);
                      });
                    }}
                    onStatistics={(statistics) => {
                      headersStatisticsRef.current = statistics;
                    }}
                  />
                </div>
                <div
                  style={{
                    height: 10,
                  }}
                />
              </>
            )}
            {shouldShowBody && (
              <>
                <div
                  style={{
                    display: 'flex',
                    gap: 20,
                    alignItems: 'center',
                    height: 20,
                  }}
                >
                  <div>
                    View as:{' '}
                    {handlerTypes
                      .map((m) =>
                        m === selectedHandlerType ? (
                          <b
                            style={{
                              cursor: 'pointer',
                              textDecoration: 'underline',
                            }}
                            onClick={() => {
                              setSelectedHandlerType(m);
                            }}
                            key={m}
                          >
                            {m}
                          </b>
                        ) : (
                          <span
                            style={{
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              setSelectedHandlerType(m);
                            }}
                            key={m}
                          >
                            {m}
                          </span>
                        ),
                      )
                      .flatMap((x) => [x, ' | '])
                      .slice(0, -1)}
                  </div>
                  {enabledFeatures.includes('Copy all') && (
                    <TextButton
                      icon={VscCopy}
                      onClick={() => {
                        const text =
                          output.formattedBody || output.body.join('\n');
                        navigator.clipboard.writeText(text);
                      }}
                    >
                      Copy all
                    </TextButton>
                  )}
                  {enabledFeatures.includes('Search') && (
                    <TextButton
                      icon={VscSearch}
                      onClick={() => {
                        dispatch(
                          setSearchClickedAt({
                            cellIndex: activeCellIndex,
                            searchClickedAt: Date.now(),
                          }),
                        );
                      }}
                    >
                      Search
                    </TextButton>
                  )}
                </div>
                <div style={{ height: 10 }} />
                <div
                  style={{
                    overflow: 'hidden',
                    flex: 1,
                  }}
                >
                  <code
                    style={{
                      wordWrap: 'break-word',
                      whiteSpace: 'pre-wrap',
                      height: '900',
                    }}
                  >
                    <FormattedResponse
                      handlerType={selectedHandlerType}
                      response={output}
                      activeCellIndex={activeCellIndex}
                    />
                  </code>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
