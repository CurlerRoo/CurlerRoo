import Dialog from 'rc-dialog';
import 'rc-dialog/assets/index.css';
import { createRoot } from 'react-dom/client';
import { Fragment, useEffect, useRef, useState } from 'react';
import { TextButton } from './text-button';
import { useColors, useTheme, ThemeProvider } from '../contexts/theme-context';

export type InputPromptProps = {
  params: {
    label: string;
    defaultValue?: string;
    type?: 'text' | 'textarea';
    onConfirm: (value: string | null) => Promise<void>;
  }[];
  onClose: () => void;
};

export function InputPrompt({ params, onClose }: InputPromptProps) {
  const colors = useColors();
  const { theme } = useTheme();
  const [visible, setVisible] = useState(true);
  const disableClickRef = useRef(false);
  const [errorMessages, setErrorMessages] = useState([] as string[]);
  const [values, setValues] = useState(params.map((m) => m.defaultValue || ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    disableClickRef.current = !visible;
  }, [visible]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const submit = async () => {
    if (disableClickRef.current) {
      return;
    }
    disableClickRef.current = true;
    const validationResults = await Promise.all(
      params.map(async (param, i) => {
        const value = values[i];
        try {
          await param.onConfirm(value);
          return null;
        } catch (error: any) {
          return error.message;
        }
      }),
    );
    setErrorMessages(validationResults);
    if (validationResults.some((result) => result !== null)) {
      disableClickRef.current = false;
      return;
    }
    setVisible(false);
  };

  return (
    <Dialog
      destroyOnClose
      visible={visible}
      animation="zoom"
      maskAnimation="fade"
      closable={false}
      keyboard={false}
      maskClosable
      onClose={() => {
        if (!visible) {
          return;
        }
        setVisible(false);
        onClose();
      }}
      maskStyle={{
        backgroundColor:
          theme === 'DARK_MODE' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.45)',
      }}
      style={{
        width: 240,
      }}
      styles={{
        content: {
          width: '100%',
          backgroundColor: `#${colors.SURFACE_SECONDARY}`,
          border: `1px solid #${colors.BORDER}`,
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow:
            theme === 'DARK_MODE'
              ? '0 12px 60px rgba(0, 0, 0, 0.65)'
              : '0 12px 60px rgba(0, 0, 0, 0.35)',
        },
        wrapper: {
          // display: 'flex', is set on App.css
          alignItems: 'center',
          justifyContent: 'center',
        },
        body: {
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          color: `#${colors.TEXT_PRIMARY}`,
          backgroundColor: `#${colors.SURFACE_SECONDARY}`,
        },
      }}
    >
      {params.map(({ label, type }, i) => {
        const error = errorMessages[i];
        return (
          <div key={label}>
            <span style={{ color: `#${colors.TEXT_PRIMARY}` }}>{label}</span>
            <div style={{ height: 10 }} />
            {!type || type === 'text' ? (
              <input
                spellCheck={false}
                style={{
                  width: 200,
                  outline: 'none',
                  height: 20,
                  borderRadius: 4,
                  border: `1px solid #${error ? colors.ERROR : colors.BORDER}`,
                  backgroundColor: `#${colors.SURFACE_PRIMARY}`,
                  color: `#${colors.TEXT_PRIMARY}`,
                  padding: '4px 8px',
                }}
                ref={i === 0 ? inputRef : undefined}
                value={values[i] || ''}
                onChange={(e) =>
                  setValues([
                    ...values.slice(0, i),
                    e.target.value,
                    ...values.slice(i + 1),
                  ])
                }
                // submit on enter
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    submit();
                  }
                }}
              />
            ) : (
              <textarea
                spellCheck={false}
                style={{
                  resize: 'none',
                  outline: 'none',
                  height: 100,
                  width: 200,
                  borderRadius: 4,
                  border: `1px solid #${error ? colors.ERROR : colors.BORDER}`,
                  backgroundColor: `#${colors.SURFACE_PRIMARY}`,
                  color: `#${colors.TEXT_PRIMARY}`,
                  padding: '4px 8px',
                }}
                value={values[i] || ''}
                onChange={(e) =>
                  setValues([
                    ...values.slice(0, i),
                    e.target.value,
                    ...values.slice(i + 1),
                  ])
                }
                // submit on enter
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    submit();
                  }
                }}
              />
            )}
            {error && (
              <div style={{ color: `#${colors.ERROR}`, marginBottom: 10 }}>
                {error}
              </div>
            )}
          </div>
        );
      })}
      <TextButton disabled={!visible} onClick={submit}>
        Ok
      </TextButton>
    </Dialog>
  );
}

export const prompt = async (
  params: {
    label: string;
    defaultValue?: string;
    type?: 'text' | 'textarea';
    onConfirm?: (value: string | null) => Promise<string | null>;
  }[],
) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const resolves: ((value: string | null) => void)[] = [];
  const promises = params.map((param, i) => {
    return new Promise<string | null>((resolve) => {
      resolves[i] = resolve;
    });
  });
  createRoot(container).render(
    <ThemeProvider>
      <InputPrompt
        params={params.map((param, i) => {
          return {
            label: param.label,
            defaultValue: param.defaultValue,
            type: param.type,
            onConfirm: async (value) => {
              await param.onConfirm?.(value);
              resolves[i](value);
            },
          };
        })}
        onClose={() => {
          document.body.removeChild(container);
        }}
      />
    </ThemeProvider>,
  );
  const values = await Promise.allSettled(promises);
  document.body.removeChild(container);
  return values.map((value) => value.status === 'fulfilled' && value.value);
};
