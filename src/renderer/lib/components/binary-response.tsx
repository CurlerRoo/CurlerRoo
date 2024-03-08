import { useEffect, useState } from 'react';
import { VscArrowDown } from 'react-icons/vsc';
import Notification from 'rc-notification';
import 'rc-notification/assets/index.css';
import { Services } from '@services';
import { getHeader } from '../../../shared/get-header';
import { TextButton } from './text-button';
import { COLORS, THEME } from '@constants';

export function BinaryResponse({
  response,
}: {
  response: {
    protocol: string;
    headers: {
      [key: string]: string;
    };
    status: number;
    bodyFilePath: string;
    bodyBase64: string;
    body: string[];
  };
}) {
  const contentType = getHeader(response.headers, 'content-type');

  const [bodyFilePathExists, setBodyFilePathExists] = useState(false);
  useEffect(() => {
    (async () => {
      const exists = await Services.checkIfFileExists(response.bodyFilePath);
      setBodyFilePathExists(exists);
    })();
  });

  if (response.body.filter(Boolean).length) {
    return (
      <div
        style={{
          padding: 10,
          backgroundColor: `#${COLORS[THEME].WHITE}`,
          borderRadius: 4,
        }}
      >
        Unsupported content type: {contentType}
      </div>
    );
  }

  if (response.bodyFilePath && !bodyFilePathExists) {
    return (
      <div
        style={{
          padding: 10,
          backgroundColor: `#${COLORS[THEME].WHITE}`,
          borderRadius: 4,
        }}
      >
        <p>
          Response body is no longer available. Please try re-sending the
          request.
        </p>
      </div>
    );
  }

  if (bodyFilePathExists || response.bodyBase64) {
    return (
      <div
        style={{
          padding: 10,
          backgroundColor: `#${COLORS[THEME].WHITE}`,
          borderRadius: 4,
        }}
      >
        <p>Unsupported content type: {contentType}</p>
        <TextButton
          icon={VscArrowDown}
          style={{
            backgroundColor: `#${COLORS[THEME].BACKGROUND_HIGHLIGHT}`,
          }}
          onClick={async () => {
            const base64 =
              response.bodyBase64 ||
              (await Services.readFileAsBase64(response.bodyFilePath));

            await Services.exportFile({
              base64,
            });
            Notification.newInstance({}, (notification) => {
              notification.notice({
                content: 'File downloaded',
                closable: true,
                duration: 1,
                style: {
                  width: 400,
                  background: `#${COLORS[THEME].GREEN}`,
                  color: 'white',
                  fontWeight: 'bold',
                },
              });
            });
          }}
        >
          Download
        </TextButton>
      </div>
    );
  }

  return null;
}
