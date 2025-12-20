import { useEffect, useState } from 'react';
import { Services } from '@services';
import { useColors } from '../contexts/theme-context';

interface ImagePreviewProps {
  filePath: string | undefined;
  fileType: 'file' | 'directory' | undefined;
}

export function ImagePreview({ filePath, fileType }: ImagePreviewProps) {
  const colors = useColors();
  const [imagePreview, setImagePreview] = useState<{
    src: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (
      !filePath ||
      fileType !== 'file' ||
      !filePath.match(/\.(png|jpe?g|gif|webp|bmp|svg)$/i)
    ) {
      setImagePreview(null);
      return;
    }
    (async () => {
      try {
        const base64 = await Services.readFileAsBase64(filePath);
        const ext = (filePath.split('.').pop() || 'png').toLowerCase();
        setImagePreview({
          src: `data:image/${ext};base64,${base64}`,
        });
      } catch (error: any) {
        setImagePreview({
          src: '',
          error: error?.message || 'Failed to load image preview',
        });
      }
    })();
  }, [filePath, fileType]);

  if (!imagePreview) {
    return null;
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `#${colors.SURFACE_SECONDARY}`,
        color: `#${colors.TEXT_PRIMARY}`,
        padding: 20,
      }}
    >
      {imagePreview.error ? (
        <div>{imagePreview.error}</div>
      ) : (
        <img
          src={imagePreview.src}
          alt={filePath || 'Image preview'}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            borderRadius: 8,
            border: `1px solid #${colors.BORDER}`,
            backgroundColor: `#${colors.SURFACE_PRIMARY}`,
          }}
        />
      )}
    </div>
  );
}
