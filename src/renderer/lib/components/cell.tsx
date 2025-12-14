import { Editor } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Tooltip from 'rc-tooltip';
import 'rc-tooltip/assets/bootstrap.css';
import Notification from 'rc-notification';
import 'rc-notification/assets/index.css';
import {
  VscAdd,
  VscCode,
  VscCopy,
  VscListFlat,
  VscPlay,
  VscQuestion,
  VscTrash,
} from 'react-icons/vsc';
import _ from 'lodash';
import { Services } from '@services';
import { CurlCellType, Variable } from '../../../shared/types';
import {
  executePostScript,
  executePreScript,
  setActiveCellIndex,
  setCursorPosition,
  updateCell,
  validateCellAndSendCurl,
} from '../../state/features/documents/active-document';
import { AppDispatch, RootState, store } from '../../state/store';
import { CellBar } from './cell-bar';
import { CurlCompletionItemProvider } from './curl-completion-item-provider';
import {
  validateCurlSyntax,
  validateMissingVariables,
  validateUnsupportedOptions,
} from '../../../shared/validate-curl';
import {
  addDragToCells,
  removeDragToCells,
} from '../../state/features/drag/drag';
import { getCurlParts } from '../../../shared/get-curl-parts';
import { useColors, useTheme } from '../contexts/theme-context';
import { COLORS } from '@constants';
import { modal } from './modal';
import { PostScriptsTutorial } from './post-scripts-tutorial';
import { ShowVariablesTutorialLevel2 } from './variables-tutorial';
import { formatCurl } from '../../../shared/format-curl';
import { debugLog } from '../../../shared/utils';
import { TextButton } from './text-button';
import { getCurlWithValue } from '../../../shared/get-curl-with-value';

let curlCellBeforeMountInitialized = false;
let scriptCellBeforeMountInitialized = false;

// Shared helper functions for Monaco editor themes
type ThemeColors = (typeof COLORS)['LIGHT_MODE'];

function getMonacoEditorColors(colors: ThemeColors) {
  return {
    'editor.background': `#${colors.SURFACE_PRIMARY}`,
    'editor.foreground': `#${colors.TEXT_PRIMARY}`,
    'editorCursor.foreground': `#${colors.TEXT_PRIMARY}`,
    'editorLineNumber.foreground': `#${colors.TEXT_TERTIARY}`,
    'editorLineNumber.dimmedForeground': `#${colors.TEXT_TERTIARY}`,
    'editorLineNumber.activeForeground': `#${colors.TEXT_SECONDARY}`,
    'editor.selectionBackground': `#${colors.SELECTION}`,
    'editor.inactiveSelectionBackground': `#${colors.BORDER}`,
    'editor.lineHighlightBackground': `#${colors.SURFACE_PRIMARY}`,
    'editorIndentGuide.background': `#${colors.BORDER}`,
    'editorIndentGuide.activeBackground': `#${colors.SELECTION}`,
    'editorWidget.background': `#${colors.SURFACE_SECONDARY}`,
    'editorWidget.border': `#${colors.BORDER}`,
  };
}

function getMonacoCurlRules(colors: ThemeColors) {
  return [
    {
      token: 'keyword',
      foreground: colors.PRIMARY,
    },
    {
      token: 'number',
      foreground: colors.SYNTAX_STRING,
    },
    {
      token: 'variable',
      foreground: colors.PRIMARY,
    },
    {
      token: 'string',
      foreground: colors.SYNTAX_STRING,
    },
    {
      token: 'comment',
      foreground: colors.SUCCESS,
    },
  ];
}

const Script = ({
  scriptText,
  cellIndex,
  cell,
  type,
  selectedDirectory,
}: {
  scriptText: string;
  cellIndex: number;
  cell: CurlCellType;
  type: 'before' | 'after';
  selectedDirectory: string;
}) => {
  const colors = useColors();
  const { theme } = useTheme();
  const dispatch: AppDispatch = useDispatch();
  const [isMounted, setIsMounted] = useState(false);
  const { wordWrappingInEditor } = useSelector(
    (state: RootState) => state.user,
  );
  const [editorHeight, setEditorHeight] = useState(60);

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    editorRef.current.onDidFocusEditorText(() => {
      dispatch(setActiveCellIndex(cellIndex));
    });
    editorRef.current.onDidContentSizeChange((e) => {
      const height = e.contentHeight < 40 ? 60 : e.contentHeight + 20;
      setEditorHeight(height);
    });
  }, [dispatch, cellIndex, isMounted]);

  // Update Monaco theme when theme/colors change
  useEffect(() => {
    if (!monacoRef.current || !editorRef.current) {
      return;
    }
    const _monaco = monacoRef.current;
    _monaco.editor.defineTheme('script', {
      base: theme === 'DARK_MODE' ? 'vs-dark' : 'vs',
      inherit: true,
      rules: [],
      colors: getMonacoEditorColors(colors),
    });
    _monaco.editor.setTheme('script');
  }, [theme, colors]);

  const errorMessage =
    type === 'before' ? cell.pre_scripts_error : cell.post_scripts_error;
  const scriptStatus =
    type === 'before' ? cell.pre_scripts_status : cell.post_scripts_status;
  const executeScript =
    type === 'before' ? executePreScript : executePostScript;

  return (
    <>
      <div
        style={{
          height: 19,
          fontWeight: 'bold',
          fontSize: 13,
          color: `#${colors.TEXT_PRIMARY}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 5,
          padding: '0 10px',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <Tooltip
            overlayInnerStyle={{
              minHeight: 0,
              maxWidth: 300,
            }}
            placement="bottom"
            overlay="This allows you to extract values from the response or doing some validation. Using Javascript-like syntax. Click on it to see some examples."
          >
            <span
              style={{
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
              }}
              onClick={() => {
                const { close } = modal({
                  content: (
                    <PostScriptsTutorial
                      onExampleDocumentCreated={() => close()}
                    />
                  ),
                });
              }}
            >
              <span>{type} scripts</span>
              <VscQuestion size={14} />
              <span>:</span>
            </span>
          </Tooltip>
          <div style={{ width: 5 }} />
          <Tooltip
            overlay="Run the script"
            placement="bottom"
            overlayInnerStyle={{
              minHeight: 0,
            }}
          >
            <TextButton
              icon={VscPlay}
              iconProps={{ size: 16 }}
              type="button"
              onClick={async () => {
                const bodyText = _.last(cell.outputs)?.body.join('\n');
                dispatch(
                  executeScript({ cellIndex, bodyText: bodyText || '' }),
                );
              }}
              tooltip="Run script"
            />
          </Tooltip>
          {scriptStatus === 'error' && (
            <span
              style={{
                display: 'flex',
                gap: 5,
                alignItems: 'center',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  color: `#${colors.ERROR}`,
                  fontWeight: 'normal',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  flexGrow: 1,
                }}
              >
                {errorMessage}
              </span>
              <span
                style={{
                  fontWeight: 'normal',
                  backgroundColor: `#${colors.SURFACE_PRIMARY}`,
                  padding: 2,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  navigator.clipboard.writeText(errorMessage || '');
                }}
              >
                Copy
              </span>
            </span>
          )}
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            color: `#${colors.TEXT_SECONDARY}`,
            cursor: 'pointer',
            fontWeight: 'normal',
          }}
        >
          <VscTrash />
          <i
            style={{
              fontSize: 11,
              textDecoration: 'underline',
              whiteSpace: 'nowrap',
            }}
            onClick={() => {
              dispatch(
                updateCell({
                  cellIndex,
                  cell: {
                    ...cell,
                    ...(type === 'before'
                      ? {
                          pre_scripts_enabled: false,
                        }
                      : {
                          post_scripts_enabled: false,
                        }),
                  },
                }),
              );
            }}
          >
            Remove {type} scripts
          </i>
        </span>
      </div>
      <div style={{ height: 5 }} />
      <Editor
        beforeMount={(_monaco) => {
          if (scriptCellBeforeMountInitialized) {
            return;
          }
          scriptCellBeforeMountInitialized = true;

          _monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(
            {
              noSemanticValidation: true,
              noSyntaxValidation: false,
            },
          );
          _monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: _monaco.languages.typescript.ScriptTarget.ES2020,
            allowJs: true,
            checkJs: true,
            allowNonTsExtensions: true,
            lib: ['es2021'],
          });
          _monaco.languages.typescript.javascriptDefaults.addExtraLib(
            `
/**
* @description This function allows you to extract values from the response if it is a JSON.
*/
declare function json_body(path: string): any;
`,
            'global.d.ts',
          );

          // Define the theme *before* the editor first paints (prevents white flash in dark mode).
          _monaco.editor.defineTheme('script', {
            base: theme === 'DARK_MODE' ? 'vs-dark' : 'vs',
            inherit: true,
            rules: [],
            colors: getMonacoEditorColors(colors),
          });
        }}
        theme="script"
        loading={
          <div
            style={{
              height: '100%',
              width: '100%',
              backgroundColor: `#${colors.SURFACE_PRIMARY}`,
            }}
          />
        }
        value={scriptText}
        language="javascript"
        onChange={(e) => {
          dispatch(
            updateCell({
              cellIndex,
              cell: {
                ...cell,
                ...(type === 'before'
                  ? {
                      pre_scripts: (e || '').split('\n'),
                    }
                  : {
                      post_scripts: (e || '').split('\n'),
                    }),
              },
            }),
          );
        }}
        options={{
          minimap: {
            enabled: false,
          },
          smoothScrolling: true,
          scrollbar: {
            handleMouseWheel: false,
          },
          lineNumbersMinChars: 3,
          scrollBeyondLastLine: false,
          overviewRulerLanes: 0,
          lineNumbers: 'on',
          folding: false,
          fontFamily: 'RobotoMono',
          fontSize: 13,
          wordWrap: wordWrappingInEditor ? 'on' : 'off',
        }}
        height={editorHeight}
        onMount={(_editor, _monaco) => {
          _editor.updateOptions({
            tabSize: 2,
          });
          _editor.addAction({
            id: `curl-run-${cellIndex}`,
            label: 'Run',
            contextMenuGroupId: 'navigation',
            keybindings: [
              monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
              monaco.KeyMod.Shift | monaco.KeyCode.Enter,
            ],
            run: () => {
              const _cell = store.getState().activeDocument?.cells[cellIndex];
              if (!_cell || _cell.send_status === 'sending') {
                return;
              }
              dispatch(
                validateCellAndSendCurl({ cellIndex, selectedDirectory }),
              );
            },
          });
          editorRef.current = _editor;
          monacoRef.current = _monaco;

          // because we need to execute some code after the editor is mounted
          setIsMounted(true);
        }}
      />
    </>
  );
};

export function Cell({
  cell,
  cellIndex,
  activeCellIndex,
  globalVariables,
  selectedDirectory,
  id,
}: {
  cell: CurlCellType;
  cellIndex: number;
  activeCellIndex: number;
  globalVariables: Variable[];
  selectedDirectory: string;
  id: string;
}) {
  const colors = useColors();
  const { theme } = useTheme();
  const dispatch: AppDispatch = useDispatch();
  const curlText = cell.source.join('\n');
  const preScriptText = cell.pre_scripts.join('\n');
  const postScriptText = cell.post_scripts.join('\n');

  const [isMounted, setIsMounted] = useState(false);
  const [curlEditorHeight, setCurlEditorHeight] = useState(60);

  const curlEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null,
  );
  const curlMonacoRef = useRef<typeof monaco | null>(null);
  useEffect(() => {
    if (!curlEditorRef.current) {
      return;
    }
    curlEditorRef.current.onDidFocusEditorText(() => {
      dispatch(setActiveCellIndex(cellIndex));
    });
    curlEditorRef.current.onDidContentSizeChange((e) => {
      const height = e.contentHeight < 40 ? 60 : e.contentHeight + 20;
      setCurlEditorHeight(height);
    });
  }, [dispatch, cellIndex, isMounted]);

  // Update Monaco theme when theme/colors change
  useEffect(() => {
    if (!curlMonacoRef.current || !curlEditorRef.current) {
      return;
    }
    const _monaco = curlMonacoRef.current;
    _monaco.editor.defineTheme('curl', {
      base: theme === 'DARK_MODE' ? 'vs-dark' : 'vs',
      inherit: true,
      rules: getMonacoCurlRules(colors),
      colors: getMonacoEditorColors(colors),
    });
    _monaco.editor.setTheme('curl');
  }, [theme, colors]);

  const forceRefocusActiveCell = useSelector(
    (state: RootState) => state.activeDocument?.forceRefocusActiveCell,
  );
  const { wordWrappingInEditor } = useSelector(
    (state: RootState) => state.user,
  );

  const cursorPositionRef = useRef<{
    lineNumber: number;
    column: number;
    offset: number;
  }>(cell.cursor_position);

  useEffect(() => {
    cursorPositionRef.current = cell.cursor_position;
  }, [cell.cursor_position]);

  const isFocusing = cellIndex === activeCellIndex;
  useEffect(() => {
    if (isFocusing) {
      curlEditorRef.current?.focus();
      curlEditorRef.current?.setPosition({
        lineNumber: cursorPositionRef.current.lineNumber,
        column: cursorPositionRef.current.column,
      });
    }
  }, [isFocusing, forceRefocusActiveCell]);

  const validateCurl = useCallback(
    async (e: string) => {
      if (!curlMonacoRef.current || !curlEditorRef.current) {
        return;
      }
      const model = curlEditorRef.current.getModel();
      const parts = getCurlParts(e);
      debugLog('HVH', 'parts', parts);

      const preScriptVariables = cell.pre_scripts_enabled
        ? await Services.executeScript({
            postScript: cell.pre_scripts.join('\n'),
            resBody: '',
            resHeaders: {},
          })
            .then((m) => m.variables)
            .catch(() => {
              // no need to show error because it will be shown in the script editor
              return [];
            })
        : [];

      const missingVariableErrors = validateMissingVariables({
        parts,
        variables: [...preScriptVariables, ...globalVariables],
      });
      const unsupportedOptionErrors = validateUnsupportedOptions({
        parts,
      });
      const invalidSyntaxErrors = validateCurlSyntax({
        parts,
      });
      curlMonacoRef.current.editor.setModelMarkers(
        model!,
        'curl',
        missingVariableErrors
          .map((error) => ({
            startLineNumber: error.line,
            startColumn: error.column,
            endLineNumber: error.line,
            endColumn: error.column + error.variable.length,
            message: `Variable ${error.variable} is not defined`,
            severity: monaco.MarkerSeverity.Error,
          }))
          .concat(
            unsupportedOptionErrors.map((error) => ({
              startLineNumber: error.line,
              startColumn: error.column,
              endLineNumber: error.line,
              endColumn: error.column + error.option.length,
              message: `Option ${error.option} is not supported`,
              severity: monaco.MarkerSeverity.Error,
            })),
          )
          .concat(
            invalidSyntaxErrors.map((error) => ({
              startLineNumber: error.line,
              startColumn: error.column,
              endLineNumber: error.line,
              endColumn: error.column + error.value.length,
              message: error.errorMessage || `Syntax error`,
              severity: monaco.MarkerSeverity.Error,
            })),
          ),
      );
    },
    [globalVariables, cell.pre_scripts, cell.pre_scripts_enabled],
  );

  useEffect(() => {
    validateCurl(curlText);
  }, [validateCurl, curlText]);

  return (
    <div
      id={id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        outline: 0,
      }}
      // on press control + enter\
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.ctrlKey && e.key === 'Enter') {
          const _cell = store.getState().activeDocument?.cells[cellIndex];
          if (!_cell || _cell.send_status === 'sending') {
            return;
          }
          dispatch(validateCellAndSendCurl({ cellIndex, selectedDirectory }));
        } else if (e.shiftKey && e.key === 'Enter') {
          const _cell = store.getState().activeDocument?.cells[cellIndex];
          if (!_cell || _cell.send_status === 'sending') {
            return;
          }
          dispatch(validateCellAndSendCurl({ cellIndex, selectedDirectory }));
        }
      }}
    >
      <CellBar
        cell={cell}
        cellIndex={cellIndex}
        selectedDirectory={selectedDirectory}
      />
      <div
        style={{ flex: 1 }}
        onClick={() => {
          dispatch(setActiveCellIndex(cellIndex));
        }}
      >
        <div
          style={{
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
            borderBottomLeftRadius: 4,
            borderBottomRightRadius: 4,
            padding: '3px 0',
            margin: cellIndex === activeCellIndex ? '0' : '2px', // because of border
            backgroundColor: `#${colors.SURFACE_PRIMARY}`,
            border:
              cellIndex === activeCellIndex
                ? `2px solid #${colors.TEXT_SECONDARY}`
                : 'none',
            boxShadow:
              cellIndex === activeCellIndex
                ? `0 0 4px #${colors.TEXT_SECONDARY}`
                : 'none',
          }}
          onDragEnter={(e) => {
            e.stopPropagation();
            setTimeout(() => {
              dispatch(addDragToCells(cellIndex.toString()));
            }, 100); // TODO:
          }}
          onDragLeave={(e) => {
            e.stopPropagation();
            setTimeout(() => {
              dispatch(removeDragToCells(cellIndex.toString()));
            }, 100); // TODO:
          }}
        >
          {cell.pre_scripts_enabled && (
            <>
              <Script
                scriptText={preScriptText}
                cellIndex={cellIndex}
                cell={cell}
                type="before"
                selectedDirectory={selectedDirectory}
              />
              <div
                style={{
                  height: 1,
                  width: '100%',
                  backgroundColor: `#${colors.DISABLED}`,
                }}
              />
            </>
          )}
          <div
            style={{
              height: 19,
              fontWeight: 'bold',
              fontSize: 13,
              color: `#${colors.TEXT_PRIMARY}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  cursor: 'pointer',
                }}
                onClick={() => {
                  const { close } = modal({
                    content: (
                      <ShowVariablesTutorialLevel2
                        onExampleDocumentCreated={() => close()}
                      />
                    ),
                  });
                }}
              >
                cURL:
              </span>
              <div style={{ width: 5 }} />
              <TextButton
                icon={VscPlay}
                iconProps={{ size: 16 }}
                type="button"
                onClick={async () => {
                  if (cell.send_status === 'sending') {
                    return;
                  }
                  dispatch(setActiveCellIndex(cellIndex));
                  dispatch(
                    validateCellAndSendCurl({ cellIndex, selectedDirectory }),
                  );
                }}
                tooltip="Send cURL command"
              />
              <TextButton
                icon={VscCopy}
                iconProps={{ size: 16 }}
                type="button"
                onClick={async () => {
                  const preScriptVariables = cell.pre_scripts_enabled
                    ? await Services.executeScript({
                        postScript: cell.pre_scripts.join('\n'),
                        resBody: '',
                        resHeaders: {},
                      })
                        .then((m) => m.variables)
                        .catch(() => {
                          Notification.newInstance({}, (notification) => {
                            notification.notice({
                              content: 'Error executing pre script',
                              closable: true,
                              duration: 2,
                              style: {
                                width: 400,
                                background: `#${colors.ERROR}`,
                                color: 'white',
                                fontWeight: 'bold',
                              },
                            });
                          });
                          return null;
                        })
                    : [];

                  if (preScriptVariables === null) {
                    return;
                  }

                  const valuedCurl = getCurlWithValue({
                    curl: cell.source.join('\n'),
                    variables: [...preScriptVariables, ...globalVariables],
                  });
                  navigator.clipboard.writeText(valuedCurl);
                  Notification.newInstance({}, (notification) => {
                    notification.notice({
                      content: 'Copied to clipboard',
                      closable: true,
                      duration: 2,
                      style: {
                        width: 400,
                        background: `#${colors.SUCCESS}`,
                        color: 'white',
                        fontWeight: 'bold',
                      },
                    });
                  });
                }}
                tooltip="Copy final cURL command to clipboard"
              />
              <TextButton
                icon={VscCode}
                iconProps={{ size: 16 }}
                type="button"
                onClick={async () => {
                  dispatch(setActiveCellIndex(cellIndex));
                  curlEditorRef.current?.trigger(
                    'shell',
                    'editor.action.commentLine',
                    '',
                  );
                }}
                tooltip="Toggle comment on/off"
              />
              <TextButton
                icon={VscListFlat}
                iconProps={{ size: 16 }}
                type="button"
                onClick={async () => {
                  dispatch(setActiveCellIndex(cellIndex));
                  curlEditorRef.current?.trigger(
                    'shell',
                    'editor.action.formatDocument',
                    '',
                  );
                }}
                tooltip="Format cURL command"
              />
            </div>
            {!cell.pre_scripts_enabled && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  color: `#${colors.TEXT_SECONDARY}`,
                  cursor: 'pointer',
                  fontWeight: 'normal',
                }}
              >
                <VscAdd />
                <i
                  style={{
                    fontSize: 11,
                    textDecoration: 'underline',
                  }}
                  onClick={() => {
                    dispatch(
                      updateCell({
                        cellIndex,
                        cell: {
                          ...cell,
                          pre_scripts_enabled: true,
                        },
                      }),
                    );
                  }}
                >
                  Add before scripts
                </i>
              </span>
            )}
          </div>
          <div style={{ height: 5 }} />
          <Editor
            // force remount if the cell position is changed
            key={cellIndex}
            beforeMount={(_monaco) => {
              if (curlCellBeforeMountInitialized) {
                return;
              }
              curlCellBeforeMountInitialized = true;

              _monaco.languages.register({ id: 'curl' });
              _monaco.languages.setLanguageConfiguration('curl', {
                comments: {
                  lineComment: '#',
                },
                brackets: [
                  ['{', '}'],
                  ['[', ']'],
                  ['(', ')'],
                ],
                autoClosingPairs: [
                  { open: '{', close: '}' },
                  { open: '[', close: ']' },
                  { open: '(', close: ')' },
                  { open: '"', close: '"' },
                  { open: "'", close: "'" },
                  { open: '`', close: '`' },
                ],
                surroundingPairs: [
                  { open: '{', close: '}' },
                  { open: '[', close: ']' },
                  { open: '(', close: ')' },
                  { open: '"', close: '"' },
                  { open: "'", close: "'" },
                  { open: '`', close: '`' },
                ],
              });
              _monaco.languages.setMonarchTokensProvider('curl', {
                defaultToken: '',
                ignoreCase: true,
                tokenPostfix: '.shell',
                brackets: [
                  { token: 'delimiter.bracket', open: '{', close: '}' },
                  { token: 'delimiter.parenthesis', open: '(', close: ')' },
                  { token: 'delimiter.square', open: '[', close: ']' },
                ],
                keywords: [
                  'if',
                  'then',
                  'do',
                  'else',
                  'elif',
                  'while',
                  'until',
                  'for',
                  'in',
                  'esac',
                  'fi',
                  'fin',
                  'fil',
                  'done',
                  'exit',
                  'set',
                  'unset',
                  'export',
                  'function',
                ],
                builtins: [
                  'ab',
                  'awk',
                  'bash',
                  'beep',
                  'cat',
                  'cc',
                  'cd',
                  'chown',
                  'chmod',
                  'chroot',
                  'clear',
                  'cp',
                  'curl',
                  'cut',
                  'diff',
                  'echo',
                  'find',
                  'gawk',
                  'gcc',
                  'get',
                  'git',
                  'grep',
                  'hg',
                  'kill',
                  'killall',
                  'ln',
                  'ls',
                  'make',
                  'mkdir',
                  'openssl',
                  'mv',
                  'nc',
                  'node',
                  'npm',
                  'ping',
                  'ps',
                  'restart',
                  'rm',
                  'rmdir',
                  'sed',
                  'service',
                  'sh',
                  'shopt',
                  'shred',
                  'source',
                  'sort',
                  'sleep',
                  'ssh',
                  'start',
                  'stop',
                  'su',
                  'sudo',
                  'svn',
                  'tee',
                  'telnet',
                  'top',
                  'touch',
                  'vi',
                  'vim',
                  'wall',
                  'wc',
                  'wget',
                  'who',
                  'write',
                  'yes',
                  'zsh',
                ],
                startingWithDash: /-+\w+/,
                identifiersWithDashes: /[a-zA-Z]\w+(?:@startingWithDash)+/,
                symbols: /[=><!~?&|+\-*/^;.,]+/,
                tokenizer: {
                  root: [
                    [/@identifiersWithDashes/, ''],
                    [
                      /(\s)((?:@startingWithDash)+)/,
                      ['white', 'attribute.name'],
                    ],
                    [
                      /[a-zA-Z]\w*/,
                      {
                        cases: {
                          '@keywords': 'keyword',
                          '@builtins': 'type.identifier',
                          '@default': '',
                        },
                      },
                    ],
                    { include: '@whitespace' },
                    { include: '@strings' },
                    { include: '@parameters' },
                    { include: '@heredoc' },
                    [/[{}[\]()]/, '@brackets'],
                    [/@symbols/, 'delimiter'],
                    { include: '@numbers' },
                    [/[,;]/, 'delimiter'],
                  ],
                  whitespace: [
                    [/\s+/, 'white'],
                    [/(^#!.*$)/, 'metatag'],
                    [/(^#.*$)/, 'comment'],
                  ],
                  numbers: [
                    [/\d*\.\d+([eE][-+]?\d+)?/, 'number.float'],
                    [/0[xX][0-9a-fA-F_]*[0-9a-fA-F]/, 'number.hex'],
                    [/\d+/, 'number'],
                  ],
                  strings: [
                    [/'/, 'string', '@stringBody'],
                    [/\$'/, 'string', '@stringBody'],
                    [/"/, 'string', '@dblStringBody'],
                    [/\$"/, 'string', '@dblStringBody'],
                  ],
                  stringBody: [
                    [/'/, 'string', '@popall'],
                    [/./, 'string'],
                  ],
                  dblStringBody: [
                    [/"/, 'string', '@popall'],
                    [/\$\d+/, 'variable.predefined'],
                    [/\$\w+/, 'variable'],
                    [/\$[*@#?\-$!0_]/, 'variable'],
                    [/\$'/, 'variable', '@parameterBodyQuote'],
                    [/\$"/, 'variable', '@parameterBodyDoubleQuote'],
                    [/\$\(/, 'variable', '@parameterBodyParen'],
                    [/\$\{/, 'variable', '@parameterBodyCurlyBrace'],
                    [/./, 'string'],
                  ],
                  heredoc: [
                    [
                      /(<<[-<]?)(\s*)(['"`]?)([\w-]+)(['"`]?)/,
                      [
                        'constants',
                        'white',
                        'string.heredoc.delimiter',
                        'string.heredoc',
                        'string.heredoc.delimiter',
                      ],
                    ],
                  ],
                  parameters: [
                    [/\$\d+/, 'variable.predefined'],
                    [/\$\w+/, 'variable'],
                    [/\$[*@#?\-$!0_]/, 'variable'],
                    [/\$'/, 'variable', '@parameterBodyQuote'],
                    [/\$"/, 'variable', '@parameterBodyDoubleQuote'],
                    [/\$\(/, 'variable', '@parameterBodyParen'],
                    [/\$\{/, 'variable', '@parameterBodyCurlyBrace'],
                  ],
                  parameterBodyQuote: [
                    [/[^#:%*@\-!_']+/, 'variable'],
                    [/[#:%*@\-!_]/, 'delimiter'],
                    [/[']/, 'variable', '@pop'],
                  ],
                  parameterBodyDoubleQuote: [
                    [/[^#:%*@\-!_"]+/, 'variable'],
                    [/[#:%*@\-!_]/, 'delimiter'],
                    [/["]/, 'variable', '@pop'],
                  ],
                  parameterBodyParen: [
                    [/[^#:%*@\-!_)]+/, 'variable'],
                    [/[#:%*@\-!_]/, 'delimiter'],
                    [/[)]/, 'variable', '@pop'],
                  ],
                  parameterBodyCurlyBrace: [
                    [/[^#:%*@\-!_}]+/, 'variable'],
                    [/[#:%*@\-!_]/, 'delimiter'],
                    [/[}]/, 'variable', '@pop'],
                  ],
                },
              });
              _monaco.languages.registerDocumentFormattingEditProvider('curl', {
                provideDocumentFormattingEdits(
                  model: monaco.editor.ITextModel,
                ) {
                  try {
                    const formatted = formatCurl(model.getValue());
                    if (!formatted) {
                      return [];
                    }
                    return [
                      {
                        range: model.getFullModelRange(),
                        text: formatted,
                      },
                    ];
                  } catch (error) {
                    Notification.newInstance({}, (notification) => {
                      notification.notice({
                        content: (error as Error)?.message || 'Unknown error',
                        closable: true,
                        duration: 10,
                        style: {
                          width: 400,
                          background: `#${colors.ERROR}`,
                          color: 'white',
                          fontWeight: 'bold',
                        },
                      });
                    });
                    return [];
                  }
                },
              });
              // no need to dispose
              _monaco.languages.registerCompletionItemProvider(
                'curl',
                new CurlCompletionItemProvider(),
              );

              // Define the theme *before* the editor first paints (prevents white flash in dark mode).
              _monaco.editor.defineTheme('curl', {
                base: theme === 'DARK_MODE' ? 'vs-dark' : 'vs',
                inherit: true,
                rules: getMonacoCurlRules(colors),
                colors: getMonacoEditorColors(colors),
              });
            }}
            theme="curl"
            loading={
              <div
                style={{
                  height: '100%',
                  width: '100%',
                  backgroundColor: `#${colors.SURFACE_PRIMARY}`,
                }}
              />
            }
            options={{
              lineHeight: 20,
              minimap: {
                enabled: false,
              },
              smoothScrolling: true,
              scrollbar: {
                handleMouseWheel: false,
              },
              lineNumbersMinChars: 3,
              scrollBeyondLastLine: false,
              overviewRulerLanes: 0,
              lineNumbers: 'on',
              folding: false,
              fontFamily: 'RobotoMono',
              fontSize: 13,
              wordWrap: wordWrappingInEditor ? 'on' : 'off',
            }}
            value={curlText}
            onChange={(e) => {
              validateCurl(e || '');
              dispatch(
                updateCell({
                  cellIndex,
                  cell: {
                    ...cell,
                    source: (e || '').split('\n'),
                  },
                }),
              );
            }}
            height={curlEditorHeight}
            language="curl"
            onMount={(_editor, _monaco) => {
              _monaco.editor.setTheme('curl');
              _editor.updateOptions({
                tabSize: 2,
              });
              _editor.addAction({
                id: `curl-run-${cellIndex}`,
                label: 'Run',
                contextMenuGroupId: 'navigation',
                keybindings: [
                  monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                  monaco.KeyMod.Shift | monaco.KeyCode.Enter,
                ],
                run: () => {
                  const _cell =
                    store.getState().activeDocument?.cells[cellIndex];
                  if (!_cell || _cell.send_status === 'sending') {
                    return;
                  }
                  dispatch(
                    validateCellAndSendCurl({ cellIndex, selectedDirectory }),
                  );
                },
              });
              _editor.addAction({
                id: `curl-format-${cellIndex}`,
                label: 'Format',
                contextMenuGroupId: 'navigation',
                keybindings: [
                  monaco.KeyMod.CtrlCmd |
                    monaco.KeyMod.Shift |
                    monaco.KeyCode.KeyF,
                ],
                run: () => {
                  _editor.trigger('curl', 'editor.action.formatDocument', '');
                },
              });
              _editor.onDidChangeCursorPosition((e) => {
                const position = _editor.getPosition();
                const model = _editor.getModel();
                const offset = model?.getOffsetAt(position!);
                if (offset == null || position == null) {
                  return;
                }
                dispatch(
                  setCursorPosition({
                    cellIndex,
                    cursorPosition: {
                      lineNumber: position.lineNumber,
                      column: position.column,
                      offset,
                    },
                  }),
                );
              });
              curlEditorRef.current = _editor;
              curlMonacoRef.current = _monaco;

              // because we need to execute some code after the editor is mounted
              setIsMounted(true);
            }}
          />
          {!cell.post_scripts_enabled && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'end',
                gap: 2,
                color: `#${colors.TEXT_SECONDARY}`,
                cursor: 'pointer',
                padding: '0 10px',
              }}
            >
              <VscAdd />
              <i
                style={{
                  fontSize: 11,
                  textDecoration: 'underline',
                }}
                onClick={() => {
                  dispatch(
                    updateCell({
                      cellIndex,
                      cell: {
                        ...cell,
                        post_scripts_enabled: true,
                      },
                    }),
                  );
                }}
              >
                Add after scripts
              </i>
            </div>
          )}
          {cell.post_scripts_enabled && (
            <>
              <div
                style={{
                  height: 1,
                  width: '100%',
                  backgroundColor: `#${colors.DISABLED}`,
                }}
              />
              <Script
                scriptText={postScriptText}
                cellIndex={cellIndex}
                cell={cell}
                type="after"
                selectedDirectory={selectedDirectory}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
