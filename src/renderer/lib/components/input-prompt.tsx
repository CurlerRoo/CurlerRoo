import Dialog from 'rc-dialog';
import 'rc-dialog/assets/index.css';
import { createRoot } from 'react-dom/client';
import { Fragment, useEffect, useRef, useState } from 'react';
import { TextButton } from './text-button';
import { COLORS, THEME } from '@constants';

export type InputPromptProps = {
  params: {
    label: string;
    onConfirm: (value: string | null) => Promise<void>;
  }[];
  onClose: () => void;
};

export function InputPrompt({ params, onClose }: InputPromptProps) {
  const [visible, setVisible] = useState(true);
  const disableClickRef = useRef(false);
  const [errorMessages, setErrorMessages] = useState([] as string[]);
  const [values, setValues] = useState([] as string[]);
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
      style={{
        width: 240,
      }}
      styles={{
        content: {
          width: '100%',
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
        },
      }}
    >
      {params.map(({ label }, i) => {
        const error = errorMessages[i];
        return (
          <Fragment key={label}>
            {error && (
              <div style={{ color: `#${COLORS[THEME].RED}`, marginBottom: 10 }}>
                {error}
              </div>
            )}
            <span>{label}</span>
            <div style={{ height: 10 }} />
            <input
              style={{
                outline: 'none',
                height: 20,
                borderRadius: 4,
                border: `1px solid #${error ? COLORS[THEME].RED : COLORS[THEME].GREY}`,
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
          </Fragment>
        );
      })}

      <div style={{ height: 10 }} />
      <TextButton disabled={!visible} onClick={submit}>
        Ok
      </TextButton>
    </Dialog>
  );
}

export const prompt = async (
  params: {
    label: string;
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
    <InputPrompt
      params={params.map((param, i) => {
        return {
          label: param.label,
          onConfirm: async (value) => {
            await param.onConfirm?.(value);
            resolves[i](value);
          },
        };
      })}
      onClose={() => {
        document.body.removeChild(container);
      }}
    />,
  );
  const values = await Promise.allSettled(promises);
  document.body.removeChild(container);
  return values.map((value) => value.status === 'fulfilled' && value.value);
};
