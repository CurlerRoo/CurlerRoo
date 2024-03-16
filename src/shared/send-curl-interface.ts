import _ from 'lodash';
import { Variable } from './types';

export type SendCurlFunction = (args: {
  curlRequest: string;
  variables: Variable[];
  selectedDirectory: string;
}) => Promise<
  {
    protocol: string;
    status: number;
    headers: _.Dictionary<any>;
    body: string;
    bodyFilePath: string;
    bodyBase64: string;
  }[]
>;
