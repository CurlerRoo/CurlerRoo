import { useEffect, useMemo, useState } from 'react';
import { Services } from '@services';
import { getHeader } from '../../../../shared/get-header';
import { COLORS, THEME } from '../../../../shared/constants/constants';

export function ImageResponse({
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
  const contentType = useMemo(() => {
    return getHeader(response.headers, 'content-type');
  }, [response.headers]);

  const [base64, setBase64] = useState<string | null>(response.bodyBase64);
  useEffect(() => {
    (async () => {
      if (response.bodyBase64) {
        return;
      }

      const content = await Services.readFileAsBase64(response.bodyFilePath);
      setBase64(content);
    })();
  }, [response.bodyFilePath, response.bodyBase64]);

  if (!base64) {
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

  return (
    <img
      style={{
        maxWidth: '100%',
        maxHeight: '100%',
      }}
      alt="response"
      src={`data:${contentType};base64,${base64}`}
    />
  );
}
