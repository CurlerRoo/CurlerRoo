import { v4 } from 'uuid';
import _ from 'lodash';
import { CurlPart, getCurlParts } from './get-curl-parts';
import { BREAKLINE_ESCAPE_CHAR } from '@constants';
import { formatBashJSONString } from './json-stringify';

export type FormatCurlOptions = {
  addOptions: {
    [key: string]: string;
  };
  removeComments?: boolean;
};

const trimArray = <T>(array: T[], isTrimValue: (t: T) => boolean): T[] => {
  if (!array.length) {
    return array;
  }
  if (isTrimValue(array[0])) {
    return trimArray(array.slice(1), isTrimValue);
  }
  if (isTrimValue(array[array.length - 1])) {
    return trimArray(array.slice(0, array.length - 1), isTrimValue);
  }
  return array;
};

export type GroupedParts = {
  // 'embedded-value' example:
  // 'the quick brown '$fox' jumps over the lazy dog'
  type: CurlPart['type'] | 'embedded-value';
  value: CurlPart['value'];
  index: CurlPart['index'];
  line: CurlPart['line'];
  column: CurlPart['column'];
};

// becareful if you want to strip single or double quotes from the value
// because it might contain spaces
export const groupValueAndVariable = (parts: CurlPart[]): GroupedParts[] => {
  return parts.reduce<{
    lastPartType: GroupedParts['type'] | null;
    groupedParts: GroupedParts[];
  }>(
    (acc, part) => {
      if (
        acc.lastPartType === 'embedded-value' &&
        ['value', 'variable', 'escaped-variable'].includes(part.type!)
      ) {
        const lastValue = acc.groupedParts[acc.groupedParts.length - 1].value;
        const value = (() => {
          if (
            (lastValue.startsWith("'") &&
              lastValue.endsWith("'") &&
              part.value.startsWith("'") &&
              part.value.endsWith("'")) ||
            (lastValue.startsWith('"') &&
              lastValue.endsWith('"') &&
              part.value.startsWith('"') &&
              part.value.endsWith('"'))
          ) {
            return (
              lastValue.slice(0, lastValue.length - 1) + part.value.slice(1)
            );
          }

          if (
            lastValue.startsWith("'") &&
            lastValue.endsWith("'") &&
            part.value.startsWith('"') &&
            part.value.endsWith('"') &&
            !lastValue.includes('"')
          ) {
            return `"${lastValue.slice(1, lastValue.length - 1)}${part.value.slice(1)}`;
          }

          if (
            lastValue.startsWith('"') &&
            lastValue.endsWith('"') &&
            part.value.startsWith("'") &&
            part.value.endsWith("'") &&
            !part.value.includes('"')
          ) {
            return `${lastValue.slice(0, lastValue.length - 1)}${part.value.slice(1, part.value.length - 1)}"`;
          }

          return lastValue + part.value;
        })();

        return {
          lastPartType: 'embedded-value',
          groupedParts: [
            ...acc.groupedParts.slice(0, acc.groupedParts.length - 1),
            {
              ...acc.groupedParts[acc.groupedParts.length - 1],
              value,
            },
          ],
        };
      }
      if (['value', 'variable', 'escaped-variable'].includes(part.type!)) {
        return {
          lastPartType: 'embedded-value',
          groupedParts: [
            ...acc.groupedParts,
            { ...part, type: 'embedded-value' },
          ],
        };
      }
      return {
        lastPartType: part.type,
        groupedParts: [...acc.groupedParts, part],
      };
    },
    {
      lastPartType: null,
      groupedParts: [],
    },
  ).groupedParts;
};

export const formatCurl = (curl: string, options?: FormatCurlOptions) => {
  const { formatted } = _.flow(
    (_curl) => getCurlParts(_curl),
    groupValueAndVariable,
    (parts) =>
      parts.filter((part) =>
        [
          // 'variable',
          // 'escaped-variable',
          // 'value',
          'embedded-value',
          'option',
          'curl',
          'space',
          options?.removeComments ? v4() : 'comment',
        ].includes(part.type!),
      ),
    (parts) => {
      return trimArray(parts, (part) => part.type === 'space');
    },
    (parts) =>
      parts.reduce(
        (acc, part) => {
          if (part.type === 'space') {
            return {
              ...acc,
              lastPart: part,
            };
          }
          const shouldBreakLine = (() => {
            if (
              ['option', 'curl', 'comment'].includes(part.type!) &&
              !!acc.lastNonSpacePart
            ) {
              return true;
            }
            if (
              part.type === 'embedded-value' &&
              acc.lastNonSpacePart?.type === 'embedded-value'
            ) {
              return true;
            }
            return false;
          })();

          const shouldHaveSpace = (() => {
            if (
              !shouldBreakLine &&
              !!acc.lastNonSpacePart &&
              // basically, if we have 2 values in a row, we must have no space
              [acc.lastPart?.type, part.type].filter(
                (type) => type === 'embedded-value',
              ).length !== 2
            ) {
              return true;
            }
            return false;
          })();

          const shouldBreakLineWithSpace = (() => {
            if (
              shouldBreakLine &&
              part.type !== 'curl' &&
              part.type !== 'comment'
            ) {
              return true;
            }
            return false;
          })();

          const shouldBreakLineWithSlash = (() => {
            if (shouldBreakLine && acc.lastNonSpacePart?.type !== 'comment') {
              return true;
            }
            return false;
          })();

          const shouldHaveAddedOptions = part.type === 'curl';

          // Currently we don't do anything with the content type yet
          // but it is here for future use
          // we could format the body based on the content type
          //
          // Just a reminder: because we're supporting variables in the body
          // standard JSON parsing will not work
          const contentType = (() => {
            if (acc.contentType) {
              return acc.contentType;
            }

            // if the previous part is not header or current part is not value then return
            if (
              acc.lastNonSpacePart?.type !== 'option' ||
              !['-H', '--header'].includes(acc.lastNonSpacePart?.value) ||
              part.type !== 'embedded-value'
            ) {
              return acc.contentType;
            }
            const unquotedValue = part.value
              .replace(/^"(.*)"$/, '$1')
              .replace(/^'(.*)'$/, '$1');

            // if the header value does not contain content-type then return
            if (!unquotedValue.match(/\s*content-type\s*:/i)) {
              return acc.contentType;
            }

            // got it
            const [, value] = unquotedValue.split(/\s*content-type\s*:/i);
            return value.trim();
          })();

          const preformatted = [
            acc.formatted,
            shouldHaveSpace && ' ',
            shouldBreakLineWithSlash && ` ${BREAKLINE_ESCAPE_CHAR}`,
            shouldBreakLine && '\n',
            shouldBreakLineWithSpace && '  ',

            ['-d', '--data', '--data-raw'].includes(
              acc.lastNonSpacePart?.value!,
            ) && contentType?.trim().startsWith('application/json')
              ? formatBashJSONString({
                  jsonString: part.value,
                  initialIndentLevel: 1,
                })
              : part.value,
            shouldHaveAddedOptions &&
              _.entries(options?.addOptions)
                .map(([key, value]) => ` ${key} ${value}`)
                .join(''),
          ];

          return {
            formatted: preformatted.filter(Boolean).join(''),
            lastPart: part,
            lastNonSpacePart: part,
            contentType,
          };
        },
        {
          formatted: '',
        } as {
          formatted: string;
          contentType?: string;
          lastPart?: {
            line: number;
            column: number;
            value: string;
            index: number;
            type: string | null;
          };
          lastNonSpacePart?: {
            line: number;
            column: number;
            value: string;
            index: number;
            type: string | null;
          };
        },
      ),
  )(curl.replace(/\r+\n/g, '\n'));
  return formatted;
};
