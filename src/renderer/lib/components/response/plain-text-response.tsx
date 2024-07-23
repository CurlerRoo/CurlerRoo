import { useMemo, useRef } from 'react';
import 'rc-notification/assets/index.css';
import _ from 'lodash';
import CodeMirror, {
  EditorView,
  ReactCodeMirrorRef,
} from '@uiw/react-codemirror';
import { useWatchForRefReady } from '../../hooks/use-watch-for-ref-ready';
import { openSearchPanel, search } from '@codemirror/search';
import { useSelector } from 'react-redux';
import { useUpdateEffect } from 'react-use';
import { RootState } from '../../../state/store';

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
          search({
            top: true,
          }),
          ...(wordWrappingInEditor ? [EditorView.lineWrapping] : []),
        ]}
        readOnly
        height={
          (wrapperRef.current?.clientHeight || 0) > 0
            ? `${wrapperRef.current?.clientHeight}px`
            : `${300}px`
        }
        value={joined}
      />
    </div>
  );
}
