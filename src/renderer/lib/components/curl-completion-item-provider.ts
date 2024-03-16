import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import {
  acceptLanguages,
  authenticationSchemes,
  cacheControls,
  connections,
  contentSecurityPolicies,
  contentTypes,
  curlKeysWithValues,
  curlKeysWithoutValues,
  forwardeds,
  headers,
  methods,
  tes,
} from './http-resources';
import { BREAKLINE_ESCAPE_CHAR } from '@constants';
import { debugLog } from '../../../shared/utils';

const removeAllSpacesAndNewLinesAndTabs = (str: string) =>
  str.replace(/\s/g, '').replace(/\n/g, '').replace(/\t/g, '');

const CompletionItemKind = monaco.languages.CompletionItemKind;
const triggerSuggestCommand = {
  id: 'editor.action.triggerSuggest',
  title: 'Suggest',
};

export class CurlCompletionItemProvider
  implements monaco.languages.CompletionItemProvider
{
  triggerCharacters = [' ', '-', "'", ':', ',', ';'];

  public async provideCompletionItems(
    document: monaco.editor.ITextModel,
    position: monaco.Position,
    // context: CompletionContext,
    // token: monaco.CancellationToken,
  ) {
    const currentRange = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: position.column,
      endColumn: position.column,
    };

    const pastRange = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: position.column - 1,
      endColumn: position.column,
    };

    const textUntilPosition = document.getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    });

    const textAfterPosition = document.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: position.lineNumber,
      endColumn: Number.MAX_VALUE,
    });

    debugLog('HVH', 'textUntilPosition', textUntilPosition);

    const headerValueListSuggestions = ({
      headerName,
      values,
      includeQ = false,
      separator = ',',
      qSeparator = ';',
    }: {
      headerName: string;
      values: string[];
      includeQ?: boolean;
      separator?: string;
      qSeparator?: string;
    }) => {
      if (includeQ && separator === qSeparator) {
        throw new Error('separator and qSeparator must be different');
      }

      const _closeQuote = !textAfterPosition.startsWith("'") ? "'" : '';

      const regex1 = new RegExp(`'${headerName}:\\s+$`, 'i');
      const regex2 = new RegExp(`'${headerName}:\\s+.*${separator}$`, 'i');
      const regex3 = new RegExp(`'${headerName}:\\s+.*${separator}\\s?$`, 'i');
      const regex4 = new RegExp(`'${headerName}:\\s+.*${qSeparator}$`, 'i');

      if (textUntilPosition.match(regex1)) {
        return {
          suggestions: values.flatMap((acceptLanguage) => [
            {
              label: acceptLanguage,
              kind: CompletionItemKind.Field,
              insertText: `${acceptLanguage}$0${_closeQuote}`,
              range: currentRange,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
          ]),
        };
      }

      if (textUntilPosition.match(regex2)) {
        return {
          suggestions: values.flatMap((acceptLanguage) => [
            {
              label: acceptLanguage,
              kind: CompletionItemKind.Field,
              insertText: ` ${acceptLanguage}`,
              range: currentRange,
            },
          ]),
        };
      }

      if (textUntilPosition.match(regex3)) {
        return {
          suggestions: values.flatMap((acceptLanguage) => [
            {
              label: acceptLanguage,
              kind: CompletionItemKind.Field,
              insertText: ` ${acceptLanguage}`,
              range: pastRange,
            },
          ]),
        };
      }

      if (includeQ && textUntilPosition.match(regex4)) {
        return {
          suggestions: [
            {
              label: 'q=',
              kind: CompletionItemKind.Field,
              insertText: `q=`,
              range: currentRange,
            },
          ],
        };
      }
      return { suggestions: [] };
    };

    const headerSingleValueSuggestions = ({
      headerName,
      values,
      isValueCompleted = false,
    }: {
      headerName: string;
      values: string[];
      isValueCompleted?: boolean;
    }) => {
      const regex1 = new RegExp(`'${headerName}:\\s+$`, 'i');
      const _closeQuote = !textAfterPosition.startsWith("'") ? "'" : '';
      if (textUntilPosition.match(regex1)) {
        if (isValueCompleted) {
          return {
            suggestions: values.flatMap((value) => [
              {
                label: value,
                kind: CompletionItemKind.Field,
                insertText: `${value}${_closeQuote}`,
                range: currentRange,
              },
            ]),
          };
        }

        return {
          suggestions: values.flatMap((value) => [
            {
              label: value,
              kind: CompletionItemKind.Field,
              insertText: `${value} $0${_closeQuote}`,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range: currentRange,
            },
          ]),
        };
      }
      return { suggestions: [] };
    };

    if (
      ['c', 'cu', 'cur'].includes(
        removeAllSpacesAndNewLinesAndTabs(textUntilPosition),
      )
    ) {
      return {
        suggestions: [
          {
            label: 'curl',
            kind: CompletionItemKind.Method,
            insertText: 'curl ',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: pastRange,
          },
        ],
      };
    }

    if (textUntilPosition.match(/\n\s*$/)) {
      const { isInString } = textUntilPosition.split('').reduce(
        (acc, char) => {
          if (char === "'" && acc.lastChar === BREAKLINE_ESCAPE_CHAR) {
            return {
              isInString: acc.isInString,
              lastChar: char,
            };
          }
          if (char === "'") {
            return {
              isInString: !acc.isInString,
              lastChar: char,
            };
          }
          return {
            isInString: acc.isInString,
            lastChar: char,
          };
        },
        {
          isInString: false,
          lastChar: '',
        },
      );

      if (!isInString) {
        return {
          suggestions: [
            ...curlKeysWithValues.map((curlKey) => ({
              label: curlKey,
              kind: CompletionItemKind.Field,
              insertText: `${curlKey} '$0'`,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range: currentRange,
              ...(curlKey === '-H' ||
              curlKey === '--header' ||
              curlKey === '-X' ||
              curlKey === '--request'
                ? {
                    command: triggerSuggestCommand,
                  }
                : {}),
            })),
            ...curlKeysWithoutValues.map((curlKey) => ({
              label: curlKey,
              kind: CompletionItemKind.Field,
              insertText: `${curlKey}`,
              range: currentRange,
            })),
          ],
        };
      }
    }

    if (textUntilPosition.match(/[^-]-$/)) {
      return {
        suggestions: [
          ...curlKeysWithValues.map((curlKey) => ({
            label: curlKey,
            kind: CompletionItemKind.Field,
            insertText: `${curlKey} '$0'`,
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: pastRange,
            ...(curlKey === '-H' ||
            curlKey === '--header' ||
            curlKey === '-X' ||
            curlKey === '--request'
              ? {
                  command: triggerSuggestCommand,
                }
              : {}),
          })),
          ...curlKeysWithoutValues.map((curlKey) => ({
            label: curlKey,
            kind: CompletionItemKind.Field,
            insertText: `${curlKey}`,
            range: pastRange,
          })),
        ],
      };
    }

    if (textUntilPosition.match(/--$/)) {
      return {
        suggestions: [
          ...curlKeysWithValues
            .filter((curlKey) => curlKey.startsWith('--'))
            .map((curlKey) => ({
              label: curlKey,
              kind: CompletionItemKind.Field,
              insertText: `${curlKey} '$0'`,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column - 2,
                endColumn: position.column,
              },
              ...(curlKey === '-H' ||
              curlKey === '--header' ||
              curlKey === '-X' ||
              curlKey === '--request'
                ? {
                    command: triggerSuggestCommand,
                  }
                : {}),
            })),
          ...curlKeysWithoutValues
            .filter((curlKey) => curlKey.startsWith('--'))
            .map((curlKey) => ({
              label: curlKey,
              kind: CompletionItemKind.Field,
              insertText: `${curlKey}`,
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column - 2,
                endColumn: position.column,
              },
            })),
        ],
      };
    }

    if (
      textUntilPosition.match(/-H\s+'$/) ||
      textUntilPosition.match(/--header\s+'$/)
    ) {
      return {
        suggestions: headers.map((header) => ({
          label: header,
          kind: CompletionItemKind.Field,
          insertText: `${header}: `,
          range: currentRange,
          command: triggerSuggestCommand,
        })),
      };
    }

    if (
      textUntilPosition.match(/-H\s+$/) ||
      textUntilPosition.match(/--header\s+$/)
    ) {
      return {
        suggestions: headers.map((header) => ({
          label: header,
          kind: CompletionItemKind.Field,
          insertText: `'${header}: `,
          range: currentRange,
          command: triggerSuggestCommand,
        })),
      };
    }

    if (
      textUntilPosition.match(/-X\s+'$/) ||
      textUntilPosition.match(/--request\s+'$/)
    ) {
      const closeQuote = !textAfterPosition.startsWith("'") ? "'" : '';
      return {
        suggestions: methods.map((method) => ({
          label: method,
          kind: CompletionItemKind.Method,
          insertText: `${method}${closeQuote}`,
          range: currentRange,
        })),
      };
    }

    if (
      textUntilPosition.match(/-X\s+$/) ||
      textUntilPosition.match(/--request\s+$/)
    ) {
      const closeQuote = !textAfterPosition.startsWith("'") ? "'" : '';
      return {
        suggestions: methods.map((method) => ({
          label: method,
          kind: CompletionItemKind.Method,
          insertText: `'${method}${closeQuote}`,
          range: currentRange,
        })),
      };
    }

    const contentTypeSuggestions = headerSingleValueSuggestions({
      headerName: 'Content-Type',
      values: contentTypes,
      isValueCompleted: true,
    });

    if (contentTypeSuggestions.suggestions.length > 0) {
      return contentTypeSuggestions;
    }

    const acceptSuggestions = headerValueListSuggestions({
      headerName: 'Accept',
      values: contentTypes,
      includeQ: true,
    });

    if (acceptSuggestions.suggestions.length > 0) {
      return acceptSuggestions;
    }

    const acceptLanguageSuggestions = headerValueListSuggestions({
      headerName: 'Accept-Language',
      values: acceptLanguages,
      includeQ: true,
    });
    if (acceptLanguageSuggestions.suggestions.length > 0) {
      return acceptLanguageSuggestions;
    }

    const accessControlRequestMethodSuggestions = headerSingleValueSuggestions({
      headerName: 'Access-Control-Request-Method',
      values: methods,
      isValueCompleted: true,
    });
    if (accessControlRequestMethodSuggestions.suggestions.length > 0) {
      return accessControlRequestMethodSuggestions;
    }

    const accessControlRequestHeadersSuggestions = headerValueListSuggestions({
      headerName: 'Access-Control-Request-Headers',
      values: headers,
    });
    if (accessControlRequestHeadersSuggestions.suggestions.length > 0) {
      return accessControlRequestHeadersSuggestions;
    }

    const cacheControlSuggestions = headerValueListSuggestions({
      headerName: 'Cache-Control',
      values: cacheControls,
    });
    if (cacheControlSuggestions.suggestions.length > 0) {
      return cacheControlSuggestions;
    }

    const connectionSuggestions = headerSingleValueSuggestions({
      headerName: 'Connection',
      values: connections,
      isValueCompleted: true,
    });
    if (connectionSuggestions.suggestions.length > 0) {
      return connectionSuggestions;
    }

    const contentSecurityPoliciesSuggestions = headerValueListSuggestions({
      headerName: 'Content-Security-Policy',
      values: contentSecurityPolicies,
      separator: ';',
    });
    if (contentSecurityPoliciesSuggestions.suggestions.length > 0) {
      return contentSecurityPoliciesSuggestions;
    }

    const forwardedsSuggestions = headerValueListSuggestions({
      headerName: 'Forwarded',
      values: forwardeds,
      separator: ';',
    });
    if (forwardedsSuggestions.suggestions.length > 0) {
      return forwardedsSuggestions;
    }

    const authorizationSuggestions = headerSingleValueSuggestions({
      headerName: 'Authorization',
      values: authenticationSchemes,
      isValueCompleted: false,
    });
    if (authorizationSuggestions.suggestions.length > 0) {
      return authorizationSuggestions;
    }

    const proxyAuthorizationSuggestions = headerSingleValueSuggestions({
      headerName: 'Proxy-Authorization',
      values: authenticationSchemes,
      isValueCompleted: false,
    });
    if (proxyAuthorizationSuggestions.suggestions.length > 0) {
      return proxyAuthorizationSuggestions;
    }

    const tesSuggestions = headerValueListSuggestions({
      headerName: 'TE',
      values: tes,
      includeQ: true,
    });
    if (tesSuggestions.suggestions.length > 0) {
      return tesSuggestions;
    }

    return {
      suggestions: [],
    };
  }
}
