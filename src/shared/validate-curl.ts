import { curlKeys } from './http-resources';
import { Variable } from './types';
import { CurlPart } from './get-curl-parts';
import { findVariableFromCurlPartValue } from './utils';
import ip from 'ip';
import { PLATFORM } from '@constants';
import _ from 'lodash';

const globalVariables = [
  {
    key: 'res_body',
    source: 'manual' as const,
  },
  {
    key: 'res_headers',
    source: 'manual' as const,
  },
];

export const validateMissingVariables = ({
  parts,
  variables,
}: {
  parts: CurlPart[];
  variables: Variable[];
}) => {
  const fullVariables = [...variables, ...globalVariables];
  const errors = parts.flatMap((part) => {
    if (!['variable', 'escaped-variable'].includes(part.type!)) {
      return [];
    }
    const isMissing = !findVariableFromCurlPartValue({
      value: part.value,
      variables: fullVariables,
    });
    if (!isMissing) {
      return [];
    }

    return {
      variable: part.value,
      variableIndex: part.index,
      line: part.line,
      column: part.column,
    };
  });

  return errors;
};

export const validateUnsupportedOptions = ({
  parts,
}: {
  parts: CurlPart[];
}) => {
  const errors = parts.flatMap((part) => {
    if (part.type !== 'option') {
      return [];
    }
    const isUnsupported = !curlKeys.includes(part.value);
    if (!isUnsupported) {
      return [];
    }

    return {
      option: part.value,
      optionIndex: part.index,
      line: part.line,
      column: part.column,
    };
  });

  return errors;
};

export const validateCurlSyntax = ({ parts }: { parts: CurlPart[] }) => {
  const filteredParts = parts.filter((part) =>
    [
      'variable',
      'escaped-variable',
      'value',
      'option',
      'curl',
      'space',
      'newline',
      'backslash-newline',
    ].includes(part.type!),
  );

  const { errorParts } = filteredParts.reduce<{
    lastPart?: CurlPart;
    lastNonDelimiterPart?: CurlPart;
    curlExisted: boolean;
    curlUrlExisted: boolean;
    errorParts: (CurlPart & {
      errorMessage: string;
    })[];
  }>(
    (acc, part) => {
      if (part.type === 'curl') {
        return {
          lastPart: part,
          lastNonDelimiterPart: part,
          curlExisted: true,
          curlUrlExisted: false,
          errorParts: acc.errorParts,
        };
      }

      if (
        ['value', 'variable', 'escaped-variable', 'option'].includes(
          part.type!,
        ) &&
        !acc.curlExisted
      ) {
        return {
          lastPart: part,
          lastNonDelimiterPart: part,
          curlExisted: acc.curlExisted,
          curlUrlExisted: acc.curlUrlExisted,
          errorParts: [
            ...acc.errorParts,
            {
              ...part,
              errorMessage: 'curl command is missing',
            },
          ],
        };
      }

      if (!acc.lastPart) {
        return {
          lastPart: part,
          lastNonDelimiterPart: part,
          curlExisted: acc.curlExisted,
          curlUrlExisted: acc.curlUrlExisted,
          errorParts: [],
        };
      }
      if (
        part.type === 'value' &&
        ['space', 'newline', 'backslash-newline'].includes(acc.lastPart?.type!)
      ) {
        if (!acc.curlUrlExisted) {
          if (['curl', 'value'].includes(acc.lastNonDelimiterPart?.type!)) {
            const unsupportedLocalUrl =
              _.attempt(() => {
                const url = new URL(part.value);
                const hostname = url?.hostname;
                const isPrivateIp =
                  _.attempt(() => ip.isPrivate(hostname || '')) === true;
                return (
                  PLATFORM === 'browser' &&
                  (isPrivateIp || hostname === 'localhost')
                );
              }) === true;
            return {
              lastPart: part,
              lastNonDelimiterPart: part,
              curlExisted: acc.curlExisted,
              curlUrlExisted: true,
              errorParts: acc.errorParts.concat(
                !unsupportedLocalUrl
                  ? []
                  : [
                      {
                        ...part,
                        errorMessage:
                          'Local IP addresses could not be used due to restrictions from browser. Please download the desktop app to use Local IP addresses.',
                      },
                    ],
              ),
            };
          }
        } else if (acc.lastNonDelimiterPart?.type === 'value') {
          return {
            lastPart: part,
            lastNonDelimiterPart: part,
            curlExisted: acc.curlExisted,
            curlUrlExisted: acc.curlUrlExisted,
            errorParts: [
              ...acc.errorParts,
              { ...part, errorMessage: 'multiple URLs are not supported' },
            ],
          };
        }
      }
      if (['space', 'newline', 'backslash-newline'].includes(part.type!)) {
        return {
          lastPart: part,
          lastNonDelimiterPart: acc.lastNonDelimiterPart,
          curlExisted: acc.curlExisted,
          curlUrlExisted: acc.curlUrlExisted,
          errorParts: acc.errorParts,
        };
      }
      return {
        lastPart: part,
        lastNonDelimiterPart: part,
        curlExisted: acc.curlExisted,
        curlUrlExisted: acc.curlUrlExisted,
        errorParts: acc.errorParts,
      };
    },
    {
      lastPart: undefined,
      lastNonDelimiterPart: undefined,
      curlExisted: false,
      curlUrlExisted: false,
      errorParts: [],
    },
  );
  return errorParts;
};
