import { useEffect, useState } from 'react';
import { VscArrowDown } from 'react-icons/vsc';
import Notification from 'rc-notification';
import 'rc-notification/assets/index.css';
import { Services } from '@services';
import { getHeader } from '../../../shared/get-header';
import { TextButton } from './text-button';
import { useColors } from '../contexts/theme-context';

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
  const colors = useColors();
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
          backgroundColor: `#${colors.SURFACE_BRIGHT}`,
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
          backgroundColor: `#${colors.SURFACE_BRIGHT}`,
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
          backgroundColor: `#${colors.SURFACE_BRIGHT}`,
          borderRadius: 4,
        }}
      >
        <p>Unsupported content type: {contentType}</p>
        <TextButton
          icon={VscArrowDown}
          style={{
            backgroundColor: `#${colors.SURFACE_SECONDARY}`,
          }}
          onClick={async () => {
            const base64 =
              response.bodyBase64 ||
              (await Services.readFileAsBase64(response.bodyFilePath));

            const { canceled, destinationFilePath } = await Services.exportFile(
              {
                base64,
              },
            );
            if (!destinationFilePath || canceled) {
              return;
            }
            Services.showItemInFolder(destinationFilePath);
          }}
        >
          Download
        </TextButton>
      </div>
    );
  }

  return null;
}
