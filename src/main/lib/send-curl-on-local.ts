import _ from 'lodash';
import fs from 'fs';
import tmpPromise from 'tmp-promise';
import { isBinaryFile } from 'isbinaryfile';
import { Variable } from '../../shared/types';
import { formatCurl } from '../../shared/format-curl';
import { getCurlParts } from '../../shared/get-curl-parts';
import { parseCurlResponse } from '../../shared/parse-curl-response';
import { ASSETS_PATH } from './constants';
import { execShPromise } from './exec-sh';
import { debugLog, findVariableFromCurlPartValue } from '../../shared/utils';
import { SendCurlFunction } from '../../shared/send-curl-interface';
import { readFileAsBase64 } from './file-on-disk';

export const sendCurl: SendCurlFunction = async (
  curlRequest: string,
  currentVariables: Variable[] = [],
) => {
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
  const platform = process.platform === 'darwin' ? 'macos' : 'static';
  const curlReplacement = `${ASSETS_PATH}/curl-${platform}-${arch}-8.5.0/curl`;

  const bodyFilePath = await tmpPromise.file().then((m) => m.path);

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
        addOptions: {
          '-s': '',
          '-v': '',
          '--compressed': '',
          '--output': bodyFilePath
            // convert windows path to wsl path if needed
            .replace(/\\/g, '/')
            .replace(/^([A-Za-z]):/, (match, driveLetter) => {
              return `/mnt/${driveLetter.toLowerCase()}`;
            }),
        },
        removeComments: true,
      }),
    (req) => req.replace(/^curl/, curlReplacement),
  )(curlRequest);

  debugLog('HVH', 'finalizedCurlRequest', finalizedCurlRequest);

  const hasRequest = finalizedCurlRequest.startsWith(curlReplacement);

  const promise = hasRequest
    ? execShPromise(finalizedCurlRequest, true).catch((err) => {
        if (err.stderr.startsWith('curl:')) {
          throw new Error(err.stderr);
        }
        return err;
      })
    : Promise.resolve({ stdout: '', stderr: '' });

  const headers = await promise.then((res: any) => res.stderr?.trim());

  const isBinary = await isBinaryFile(bodyFilePath);

  const body = !isBinary
    ? await fs.promises
        .readFile(bodyFilePath)
        .then((data) => data.toString('utf-8'))
        .catch((e) => {
          debugLog('error reading body', e);
          // there was exception, so there is body
          // just not able to read it
          return '';
        })
    : '';

  const responses = parseCurlResponse({
    headers,
    body,
    bodyFilePath: isBinary ? bodyFilePath : '',
    // it could handle bodyBase64, but since it would save the file to disk and make the file bigger
    // we don't want to do that
    bodyBase64: '',
  });
  return responses;
};
