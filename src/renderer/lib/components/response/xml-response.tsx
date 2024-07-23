import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import _ from 'lodash';
import { tokenizeXml } from '../../../../shared/tokenize-xml';
import { RootState } from '../../../state/store';
import { setFormattedBody } from '../../../state/features/documents/active-document';
import { debugLog } from '../../../../shared/utils';
import { useWatchForRefReady } from '../../hooks/use-watch-for-ref-ready';

import CodeMirror, {
  EditorView,
  ReactCodeMirrorRef,
} from '@uiw/react-codemirror';
import { xml } from '@codemirror/lang-xml';
import { useUpdateEffect } from 'react-use';
import { openSearchPanel, search } from '@codemirror/search';

export function XmlResponse({
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

  const tokens = useMemo(() => {
    try {
      return tokenizeXml(joined);
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

  return (
    <div
      ref={wrapperRef}
      style={{
        height: 'calc(100% - 10px)',
        width: '100%',
        position: 'relative',
      }}
    >
      <CodeMirror
        ref={codeMirrorRef}
        extensions={[
          xml(),
          search({ top: true }),
          ...(wordWrappingInEditor ? [EditorView.lineWrapping] : []),
        ]}
        readOnly
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
