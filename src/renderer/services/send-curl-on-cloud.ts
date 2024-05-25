import _ from 'lodash';
import { Variable } from '../../shared/types';
import { formatCurl } from '../../shared/format-curl';
import { getCurlParts } from '../../shared/get-curl-parts';
import { parseCurlResponse } from '../../shared/parse-curl-response';
import { findVariableFromCurlPartValue } from '../../shared/utils';
import { SendCurlFunction } from '../../shared/send-curl-interface';
import Bluebird from 'bluebird';
import { ENDPOINT0, ENDPOINT1 } from '../../shared/constants/constants';

let endpoint = ENDPOINT0;
let endpointUpdateCalled = false;

const pingWithTimeout = async (url: string, timeout: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  try {
    await fetch(`${url}/ping`, {
      method: 'POST',
      signal: controller.signal,
    });
    return true;
  } catch (e) {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * This function is only used in the browser. Because the browser has to send the curl request to the server.
 * The desktop app makes the request directly so it does not use this function.
 */
export const updateBestEndpoint = async () => {
  if (endpointUpdateCalled) {
    return;
  }
  endpointUpdateCalled = true;

  const latencies = await Bluebird.map(
    [ENDPOINT0, ENDPOINT1],
    async (url) => {
      try {
        // warm up
        await pingWithTimeout(url, 3000);
        const start = Date.now();
        await pingWithTimeout(url, 3000);
        await pingWithTimeout(url, 3000);
        const end = Date.now();
        return {
          latency: end - start,
          url,
        };
      } catch (e) {
        return { latency: Infinity, url };
      }
    },
    {
      concurrency: 100,
    },
  );
  endpoint = latencies.sort((a, b) => a.latency - b.latency)[0].url;
  console.log(`Select endpoint ${endpoint} because it has lower latency`);
};

window.addEventListener('load', () => {
  setTimeout(() => {
    updateBestEndpoint();
  }, 3000);
});

export const sendCurl: SendCurlFunction = async ({
  curlRequest,
  variables = [],
}: {
  curlRequest: string;
  variables: Variable[];
}) => {
  const finalizedCurlRequest = _.flow(
    (req) => req.replace(/^[\s\n;]*/, '').replace(/[\s\n;]*$/, ''),
    (req) => {
      const parts = getCurlParts(req);
      return parts
        .map((part) => {
          if (part.type === 'variable') {
            const variable = findVariableFromCurlPartValue({
              value: part.value,
              variables,
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
              variables,
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

  const { headers, body, bodyBase64 } = await fetch(
    `${endpoint}/execute-curl`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        curl: finalizedCurlRequest,
      }),
    },
  ).then((m) => m.json());

  const responses = parseCurlResponse({
    headers,
    body,
    bodyFilePath: '',
    bodyBase64,
  });
  return responses;
};
