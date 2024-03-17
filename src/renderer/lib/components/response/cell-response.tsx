import { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import _ from 'lodash';
import { VscClearAll, VscCopy, VscSearch } from 'react-icons/vsc';
import { ResponseHandlerType, responseHandlerTypeToFeature } from './configs';
import { TextButton } from '../text-button';
import {
  cancelSend,
  clearOutputs,
  clearSearch,
} from '../../../state/features/documents/active-document';
import { CurlCellType } from '../../../../shared/types';
import { JsonTreeResponse } from './json-tree-response';
import { getHeader } from '../../../../shared/get-header';
import { BinaryResponse } from '../binary-response';
import { HtmlResponse } from './html-response';
import { COLORS, THEME } from '@constants';
import { ImageResponse } from './image-response';
import { PlainTextResponse } from './plain-text-response';
import { useSearchBar } from '../../hooks/use-search-bar';
import { HotkeyOnFocus } from '../hotkey-on-focus';
import { XmlResponse } from './xml-response';
import { PdfResponse } from './pdf-response';

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

  useEffect(() => {
    dispatch(clearSearch({ cellIndex: activeCellIndex }));
  }, [selectedHandlerType, dispatch, activeCellIndex]);

  const { showSearch, setShowSearch } = useSearchBar({
    activeCellIndex,
    bodyText: output.formattedBody || '',
  });

  const [loadingEclipsis, setLoadingEclipsis] = useState(0);

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
                  style={{
                    overflowY: 'scroll',
                    maxHeight: '25%',
                    backgroundColor: `#${COLORS[THEME].WHITE}`,
                    borderRadius: 4,
                    padding: 10,
                  }}
                >
                  <code>
                    {cell.outputs
                      .flatMap((output, i) => [
                        <Fragment key={i}>
                          <div
                            id={`output-${i}`}
                            style={{
                              wordWrap: 'break-word',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            <span style={{ color: `#${COLORS[THEME].RED}` }}>
                              {output.protocol}
                            </span>
                          </div>
                          {_(output.headers)
                            .entries()
                            .map(([k, v]) => {
                              return (
                                <div
                                  key={k}
                                  style={{
                                    wordWrap: 'break-word',
                                    whiteSpace: 'pre-wrap',
                                  }}
                                >
                                  <span
                                    style={{ color: `#${COLORS[THEME].GREEN}` }}
                                  >
                                    {k}
                                  </span>
                                  :{' '}
                                  <span
                                    style={{ color: `#${COLORS[THEME].RED}` }}
                                  >
                                    {v}
                                  </span>
                                </div>
                              );
                            })
                            .value()}
                        </Fragment>,
                        <div
                          key={`${i}-divider`}
                          style={{
                            height: 40,
                          }}
                        />,
                      ])
                      .slice(0, -1)}
                  </code>
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
                  <HotkeyOnFocus
                    onCtrlF={({ ref }) => {
                      if (!enabledFeatures.includes('Search')) {
                        return;
                      }
                      setShowSearch(!showSearch);
                      if (showSearch) {
                        // if showSearch is true, then we are hiding the search bar
                        ref.current?.focus();
                      }
                    }}
                  >
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
                  </HotkeyOnFocus>
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
                        setShowSearch(!showSearch);
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
