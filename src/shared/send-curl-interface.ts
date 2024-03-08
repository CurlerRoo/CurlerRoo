import _ from 'lodash';
import { Variable } from './types';

export type SendCurlFunction = (
  curlRequest: string,
  currentVariables: Variable[],
) => Promise<
  {
    protocol: string;
    status: number;
    headers: _.Dictionary<any>;
    body: string;
    bodyFilePath: string;
    bodyBase64: string;
  }[]
>;
