import React, {
  MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import _ from 'lodash';
import { prompt } from '../input-prompt';
import { useColors } from '../../contexts/theme-context';
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
import { RootState } from '../../../state/store';
import CodeMirror, {
  EditorView,
  ReactCodeMirrorRef,
  Statistics,
} from '@uiw/react-codemirror';
import { useCodeMirrorTheme } from './codemirror-theme';
import { javascript } from '@codemirror/lang-javascript';
import { useWatchForRefReady } from '../../hooks/use-watch-for-ref-ready';
import { search, openSearchPanel } from '@codemirror/search';
import { useUpdateEffect } from 'react-use';

const MenuItemHoverHighlight = ({
  children,
  onClick,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}) => {
  const colors = useColors();
  return (
    <div
      onClick={onClick}
      style={{
        padding: 8,
        cursor: 'pointer',
        color: `#${colors.TEXT_PRIMARY}`,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = `#${colors.SURFACE_SECONDARY}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </div>
  );
};

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
  const colors = useColors();

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

  const obj = useMemo(() => {
    try {
      return JSON.parse(joined);
    } catch (e) {
      return null;
    }
  }, [joined]);

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
          variable: {
            key: name,
            value,
            source: 'response',
          },
        }),
      );
    };
  }, [activeCellIndex, dispatch]);

  const tokenizedTexts = useMemo(() => {
    if (!formattedBody) {
      return null;
    }
    return addPathToJSONTokens({
      tokens: tokenizeJSON(formattedBody),
    });
  }, [formattedBody]);

  const statisticsRef: MutableRefObject<Statistics | null> = useRef(null);

  const contextMenu = useContextMenu({
    menu: () => () => {
      if (!statisticsRef.current) {
        return null;
      }
      const { from, to } = statisticsRef.current.selectionAsSingle;
      const token = _.find(tokenizedTexts, (m) => {
        return m.start <= from && m.end >= to;
      });
      if (!token) {
        return null;
      }
      return (
        <div style={{ minWidth: 200 }}>
          <MenuItemHoverHighlight
            onClick={async () => {
              const [name] = await prompt([
                { label: 'Variable name:', onConfirm: validateVariableName },
              ]);
              if (!name) {
                return;
              }
              onClickCreateVariable?.({
                tree: token.path,
                name,
                value: getValueByPath(obj, token.path),
              });
              contextMenu.close();
            }}
          >
            <span style={{ color: `#${colors.TEXT_PRIMARY}` }}>
              Create variable from:{' '}
            </span>
            <code
              style={{
                backgroundColor: `#${colors.SELECTION}`,
                color: `#${colors.TEXT_PRIMARY}`,
              }}
            >
              {token.path.length > 40
                ? `${token.path.slice(0, 20)}(...)${token.path.slice(-20)}`
                : token.path}
            </code>
          </MenuItemHoverHighlight>
          <div
            style={{
              height: 1,
              width: '100%',
              backgroundColor: `#${colors.BORDER}`,
            }}
          />
          <MenuItemHoverHighlight
            onClick={() => {
              navigator.clipboard.writeText(
                typeof token.value === 'string'
                  ? token.value
                  : JSON.stringify(token.value, null, 2),
              );
              contextMenu.close();
            }}
          >
            <span style={{ color: `#${colors.TEXT_PRIMARY}` }}>Copy: </span>
            <code
              style={{
                backgroundColor: `#${colors.SELECTION}`,
                color: `#${colors.TEXT_PRIMARY}`,
              }}
            >
              {token.value.length > 40
                ? `${token.value.slice(0, 40)}...`
                : token.value}
            </code>
          </MenuItemHoverHighlight>
        </div>
      );
    },
  });

  const wrapperRef = useRef<HTMLDivElement>(null);
  useWatchForRefReady(wrapperRef);

  const codeMirrorRef = useRef<ReactCodeMirrorRef>(null);

  const searchClickedAt = useSelector((state: RootState) => {
    return state.activeDocument?.cells[activeCellIndex].outputs.slice(-1)[0]
      .searchClickedAt;
  });

  useUpdateEffect(() => {
    if (searchClickedAt) {
      const codeMirror = codeMirrorRef.current?.view;
      if (codeMirror) {
        openSearchPanel(codeMirror);
      }
    }
  }, [searchClickedAt]);

  const { wordWrappingInEditor } = useSelector(
    (state: RootState) => state.user,
  );

  const codeMirrorTheme = useCodeMirrorTheme();

  return (
    <div
      ref={wrapperRef}
      style={{
        height: 'calc(100% - 10px)',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 8,
      }}
      {...contextMenu.getProps()}
    >
      {contextMenu.menuPortal}
      <CodeMirror
        ref={codeMirrorRef}
        readOnly
        extensions={[
          codeMirrorTheme,
          javascript(),
          search({
            top: true,
          }),
          ...(wordWrappingInEditor ? [EditorView.lineWrapping] : []),
        ]}
        onContextMenu={async (e) => {
          e.preventDefault();
          // await for statistics to be updated
          await new Promise<void>((resolve) => {
            setTimeout(resolve);
          });
        }}
        onStatistics={(statistics) => {
          statisticsRef.current = statistics;
        }}
        height={
          (wrapperRef.current?.clientHeight || 0) > 0
            ? `${wrapperRef.current?.clientHeight}px`
            : `${300}px`
        }
        value={formattedBody}
      />
    </div>
  );
}
