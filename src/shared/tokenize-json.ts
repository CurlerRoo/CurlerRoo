type TokenType =
  | 'key'
  | 'string'
  | 'boolean'
  | 'null'
  | 'number'
  | 'structural';

export type JSONToken = {
  value: string;
  start: number;
  end: number;
  type: TokenType;
  index: number;
  startLine: number;
};

export const tokenizeJSON = (jsonString: string): JSONToken[] => {
  // Regular expression to match JSON tokens
  const tokenRegex: RegExp =
    /[{}[\]:,]|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|"(?:\\.|[^"\\])*"/g;
  const tokensWithPositions: JSONToken[] = [];
  let currentPosition: number = 0;
  let currentLine: number = 0;
  let isKey = true; // JSON starts with a key
  const arrayObjectStack: ('[' | '{')[] = [];

  let index = -1;
  jsonString.replace(tokenRegex, (match: string, end: number) => {
    if (end > currentPosition) {
      const value = jsonString.substring(currentPosition, end);
      const lines = value.split('\n');
      lines.forEach((line, i) => {
        index += 1;
        const value = i === lines.length - 1 ? line : `${line}\n`;
        tokensWithPositions.push({
          value,
          start: currentPosition,
          end: currentPosition + value.length,
          type: 'structural',
          index,
          startLine: currentLine,
        });
        if (i !== lines.length - 1) {
          currentLine += 1;
        }
        currentPosition += value.length;
      });
    }

    let type: TokenType;
    if (
      ['{', '}', '[', ']', ':', ','].includes(match[0]) &&
      match.length === 1
    ) {
      type = 'structural';
      if (match === '[' || match === '{') {
        arrayObjectStack.push(match);
      } else if (match === ']' || match === '}') {
        arrayObjectStack.pop();
      }
      isKey =
        (match === '{' || match === ',') &&
        arrayObjectStack[arrayObjectStack.length - 1] !== '[';
    } else if (isKey && match.startsWith('"')) {
      type = 'key';
      isKey = false; // After a key, the next token is not a key
    } else {
      switch (match) {
        case 'true':
        case 'false':
          type = 'boolean';
          break;
        case 'null':
          type = 'null';
          break;
        default:
          if (match.startsWith('"')) {
            type = 'string';
          } else if (match?.[0] === '-' || /\d/.test(match?.[0])) {
            type = 'number';
          } else {
            throw new Error(`Unexpected token: ${match}`);
          }
      }
    }

    if (match.includes('\n')) {
      currentLine += match.split('\n').length - 1;
    }
    index += 1;
    tokensWithPositions.push({
      value: match,
      start: end,
      end: end + match.length,
      type,
      index,
      startLine: currentLine,
    });

    currentPosition = end + match.length;
    return match;
  });

  if (currentPosition < jsonString.length) {
    index += 1;
    const value = jsonString.substring(currentPosition);
    if (value.includes('\n')) {
      currentLine += value.split('\n').length - 1;
    }
    // Add the remaining text as a token
    tokensWithPositions.push({
      value,
      start: currentPosition,
      end: currentPosition + value.length,
      type: 'structural',
      index,
      startLine: currentLine,
    });
  }

  return tokensWithPositions;
};

const removeQuote = (str: string) => {
  if (str.startsWith('"') && str.endsWith('"')) {
    return str.slice(1, -1);
  }
  if (str.startsWith("'") && str.endsWith("'")) {
    return str.slice(1, -1);
  }
  return str;
};

const quoteKeyIfNecessary = (key: string) => {
  // if key contains no spaces, then no quotes are necessary
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
    if (/^".*"$/.test(key)) {
      return key.slice(1, -1);
    }
    if (/^'.*'$/.test(key)) {
      return key.slice(1, -1);
    }
    return key;
  }
  return `["${key}"]`;
};

export const addPathToJSONTokens = ({ tokens }: { tokens: JSONToken[] }) => {
  return tokens.reduce<{
    currentPath: {
      type: 'object' | 'array';
      name?: string;
      value?: string | number | boolean | null;
    }[];
    jsonTokensWithPath: (JSONToken & {
      path: string;
    })[];
  }>(
    (acc, token) => {
      if (token.type === 'structural' && token.value === '{') {
        if (acc.currentPath[acc.currentPath.length - 1]?.type === 'array') {
          acc.currentPath[acc.currentPath.length - 1].name = String(
            Number(acc.currentPath[acc.currentPath.length - 1].name) + 1,
          );
        }
        acc.currentPath.push({ type: 'object', name: '' });
      } else if (token.type === 'structural' && token.value === '}') {
        acc.currentPath.pop();
      } else if (token.type === 'structural' && token.value === '[') {
        if (acc.currentPath[acc.currentPath.length - 1]?.type === 'array') {
          acc.currentPath[acc.currentPath.length - 1].name = String(
            Number(acc.currentPath[acc.currentPath.length - 1].name) + 1,
          );
        }
        acc.currentPath.push({ type: 'array', name: '-1' });
      } else if (token.type === 'structural' && token.value === ']') {
        acc.currentPath.pop();
      } else if (token.type === 'key') {
        acc.currentPath[acc.currentPath.length - 1].name = token.value;
      } else if (
        token.type === 'boolean' ||
        token.type === 'null' ||
        token.type === 'number' ||
        token.type === 'string'
      ) {
        if (acc.currentPath[acc.currentPath.length - 1].type === 'array') {
          acc.currentPath[acc.currentPath.length - 1].name = String(
            Number(acc.currentPath[acc.currentPath.length - 1].name) + 1,
          );
        } else if (
          acc.currentPath[acc.currentPath.length - 1].type === 'object'
        ) {
          acc.currentPath[acc.currentPath.length - 1].value = token.value;
        }
      }
      acc.jsonTokensWithPath.push({
        ...token,
        path: acc.currentPath
          .map((path, i) => {
            if (path.type === 'object') {
              const value = quoteKeyIfNecessary(removeQuote(path.name || ''));
              return value.startsWith('[') || !i ? value : `.${value}`;
            }
            if (path.type === 'array') {
              return `[${path.name}]`;
            }
            return '';
          })
          .join(''),
      });
      return acc;
    },
    {
      currentPath: [],
      jsonTokensWithPath: [],
    },
  ).jsonTokensWithPath;
};
