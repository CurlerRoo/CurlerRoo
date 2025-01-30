import { SendCurlFunction } from '../../shared/send-curl-interface';
import { Variable } from '../../shared/types';
import { sendCurlOnLocal } from './send-curl-on-local';

export const sendCurl: SendCurlFunction = async ({
  curlRequest,
  variables = [],
  selectedDirectory,
}: {
  curlRequest: string;
  variables: Variable[];
  selectedDirectory: string;
}) => {
  return sendCurlOnLocal({
    curlRequest,
    variables,
    selectedDirectory,
    assetsPath: '/home/hvh/Documents/Projects/CurlerRoo/src/assets',
  });
};
