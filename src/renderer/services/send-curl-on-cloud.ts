import _ from 'lodash';
import { Variable } from '../../shared/types';
import { formatCurl } from '../../shared/format-curl';
import { getCurlParts } from '../../shared/get-curl-parts';
import { parseCurlResponse } from '../../shared/parse-curl-response';
import { findVariableFromCurlPartValue } from '../../shared/utils';
import { SendCurlFunction } from '../../shared/send-curl-interface';
import { SEND_CURL_ENDPOINT } from '../../shared/constants/constants-on-browser';

export const sendCurl: SendCurlFunction = async (
  curlRequest: string,
  currentVariables: Variable[] = [],
) => {
  const finalizedCurlRequest = _.flow(
    (req) => req.replace(/^[\s\n;]*/, '').replace(/[\s\n;]*$/, ''),
    (req) => {
      const parts = getCurlParts(req);
      return parts
        .map((part) => {
          if (part.type === 'variable') {
            const variable = findVariableFromCurlPartValue({
              value: part.value,
              variables: currentVariables,
            });
            if (!variable) {
              throw new Error(`Variable not found: ${part.value}`);
            }
            const stringValue =
              typeof variable.value === 'string'
                ? variable.value
                : JSON.stringify(variable.value);
            return {
              type: 'value',
              value: `'${stringValue}'`,
            };
          }
          if (part.type === 'escaped-variable') {
            const variable = findVariableFromCurlPartValue({
              value: part.value,
              variables: currentVariables,
            });
            if (!variable) {
              return part;
            }
            const stringValue =
              typeof variable.value === 'string'
                ? variable.value
                : JSON.stringify(variable.value);
            return {
              type: 'value',
              value: stringValue,
            };
          }
          return part;
        })
        .map((part) => part.value)
        .join('')
        .replaceAll("''", '');
    },
    (req) =>
      formatCurl(req, {
        addOptions: {},
        removeComments: true,
      }),
  )(curlRequest);

  const hasRequest = finalizedCurlRequest.startsWith('curl');

  if (!hasRequest) {
    throw new Error('Invalid curl request');
  }

  const { headers, body, bodyBase64 } = await fetch(SEND_CURL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      curl: finalizedCurlRequest,
    }),
  }).then((m) => m.json());

  const responses = parseCurlResponse({
    headers,
    body,
    bodyFilePath: '',
    bodyBase64,
  });
  return responses;
};
