import {
  ANY_BREAKLINE_ESCAPE_CHAR_REGEX,
  NOT_ANY_BREAKLINE_ESCAPE_CHAR_REGEX,
} from '@constants';
import { tokenize } from './tokenize';

export type CurlPart = {
  value: string;
  index: number;
  type:
    | null
    | 'value'
    | 'option'
    | 'curl'
    | 'variable'
    | 'escaped-variable'
    | 'space'
    | 'newline'
    | 'backslash-newline'
    | 'comment';
  line: number;
  column: number;
};

const tokenizeString = (str: string, startIndex: number) => {
  return tokenize({
    regex: new RegExp(
      // (?<!#[^\\n]*): not commented
      // (?<!${ANY_BREAKLINE_ESCAPE_CHAR_REGEX}): not escaped
      // \\$?: the string can start with $. For example: $'hello' TODO: check if this works on PowerShell
      // (['"]): the string can start with ' or "
      // .*?: the string can contain anything
      // ${NOT_ANY_BREAKLINE_ESCAPE_CHAR_REGEX}: the string can contain anything but not multiline
      // \\1: the string can end with the same quote as the start
      `(?<!#[^\\n]*)(?<!${ANY_BREAKLINE_ESCAPE_CHAR_REGEX})\\$?(['"]).*?${NOT_ANY_BREAKLINE_ESCAPE_CHAR_REGEX}\\1`,
      'gs',
    ),
    str,
    type: 'value' as CurlPart['type'],
    contextType: null,
    startIndex,
  });
};

const tokenizeOption = (str: string, startIndex: number) => {
  return tokenize({
    regex: /(?<=\s)-{1,2}[a-zA-Z0-9-]+/g,
    str,
    type: 'option' as CurlPart['type'],
    contextType: null,
    startIndex,
  });
};

const tokenizeBackslashNewline = (str: string, startIndex: number) => {
  return tokenize({
    regex: new RegExp(`${ANY_BREAKLINE_ESCAPE_CHAR_REGEX}\\n`, 'g'),
    str,
    type: 'backslash-newline' as CurlPart['type'],
    contextType: null,
    startIndex,
  });
};

const tokenizeNewline = (str: string, startIndex: number) => {
  return tokenize({
    regex: /\n/g,
    str,
    type: 'newline' as CurlPart['type'],
    contextType: null,
    startIndex,
  });
};

const tokenizeSpace = (str: string, startIndex: number) => {
  return tokenize({
    regex: /\s+/g,
    str,
    type: 'space' as CurlPart['type'],
    contextType: null,
    startIndex,
  });
};

const tokenizeCurl = (str: string, startIndex: number) => {
  return tokenize({
    regex: /^curl/g,
    str,
    type: 'curl' as CurlPart['type'],
    contextType: null,
    startIndex,
  });
};

const tokenizeVariable = (
  str: string,
  startIndex: number,
  contextType: CurlPart['type'],
) => {
  return tokenize({
    regex: /(\$[a-zA-Z_][a-zA-Z0-9_]*)|(\${[a-zA-Z_][a-zA-Z0-9_]*})/g,
    str,
    type: 'variable' as CurlPart['type'],
    contextType,
    startIndex,
  });
};

const tokenizeEscapedVariable = (
  str: string,
  startIndex: number,
  contextType: CurlPart['type'],
) => {
  return tokenize({
    regex: /(\$[a-zA-Z_][a-zA-Z0-9_]*)|(\${[a-zA-Z_][a-zA-Z0-9_]*})/g,
    str,
    type: 'escaped-variable' as CurlPart['type'],
    contextType,
    startIndex,
  });
};

const tokenizeLiteralValue = (str: string, startIndex: number) => {
  return tokenize({
    regex: /.+/g,
    str,
    type: 'value' as CurlPart['type'],
    contextType: null,
    startIndex,
  });
};

const tokenizeComment = (str: string, startIndex: number) => {
  return tokenize({
    regex: /#.*/g,
    str,
    type: 'comment' as CurlPart['type'],
    contextType: null,
    startIndex,
  });
};

const convertIndicesToLineColumn = (str: string, indices: number[]) => {
  const lineColumnIndices = indices.map((index) => {
    const line = str.slice(0, index).split('\n').length;
    const column = index - str.slice(0, index).lastIndexOf('\n');
    return {
      line,
      column,
    };
  });
  return lineColumnIndices;
};

export const getCurlParts = (request: string): CurlPart[] => {
  const parts = [
    {
      value: request.replace(/\r+\n/g, '\n'),
      index: 0,
      type: null,
    },
  ];

  const stringParts = parts
    .flatMap((part) => {
      if (part.type != null) {
        return [part];
      }
      return tokenizeString(part.value, part.index);
    })
    .flatMap((part) => {
      if (part.type != null) {
        return [part];
      }
      return tokenizeComment(part.value, part.index);
    })
    .flatMap((part) => {
      if (part.type != null) {
        return [part];
      }
      return tokenizeOption(part.value, part.index);
    })
    .flatMap((part) => {
      if (part.type != null) {
        return [part];
      }
      return tokenizeBackslashNewline(part.value, part.index);
    })
    .flatMap((part) => {
      if (part.type != null) {
        return [part];
      }
      return tokenizeNewline(part.value, part.index);
    })
    .flatMap((part) => {
      if (part.type != null) {
        return [part];
      }
      return tokenizeSpace(part.value, part.index);
    })
    .flatMap((part) => {
      if (part.type != null) {
        return [part];
      }
      return tokenizeCurl(part.value, part.index);
    })
    .flatMap((part) => {
      if (part.type != null) {
        return [part];
      }
      return tokenizeLiteralValue(part.value, part.index);
    })
    .flatMap((part) => {
      if (
        part.type === 'value' &&
        (part.value?.startsWith('"') || part.value?.startsWith('$"')) &&
        part.value?.endsWith('"')
      ) {
        return tokenizeEscapedVariable(part.value, part.index, part.type);
      }

      // Not sure. But I think it's unquoted value
      if (
        (part.type === 'value' &&
          part.value?.[0] !== "'" &&
          part.value?.[part.value.length - 1] !== '"') ||
        part.type == null
      ) {
        return tokenizeVariable(part.value, part.index, part.type);
      }
      return [part];
    });

  return stringParts.map((part) => ({
    ...part,
    ...convertIndicesToLineColumn(request, [part.index])[0],
  }));
};
