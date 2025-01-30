import { SendCurlFunction } from '../../shared/send-curl-interface';
import { Variable } from '../../shared/types';
import { ASSETS_PATH } from './constants';
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
    assetsPath: ASSETS_PATH,
  });
};
