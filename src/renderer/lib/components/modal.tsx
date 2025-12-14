import React, { useEffect } from 'react';
import Dialog from 'rc-dialog';
import 'rc-dialog/assets/index.css';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../../state/store';
import { ThemeProvider, useTheme, useColors } from '../contexts/theme-context';

export function Modal({
  content,
  onClose,
  visible,
}: {
  content: React.ReactNode;
  onClose?: () => void;
  visible?: boolean;
}) {
  const { theme } = useTheme();
  const colors = useColors();
  const [_visible, _setVisible] = React.useState(true);
  return (
    <Dialog
      visible={visible ?? _visible}
      onClose={() => {
        if (!_visible) {
          return;
        }
        _setVisible(false);
        onClose?.();
      }}
      animation="zoom"
      maskAnimation="fade"
      destroyOnClose
      maskClosable
      closable={false}
      keyboard={false}
      maskStyle={{
        backgroundColor:
          theme === 'DARK_MODE' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.45)',
      }}
      style={{
        width: 640,
      }}
      styles={{
        content: {
          width: '100%',
          backgroundColor: `#${colors.SURFACE_PRIMARY}`,
          border: `1px solid #${colors.BORDER}`,
          borderRadius: 10,
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
          color: `#${colors.TEXT_PRIMARY}`,
        },
      }}
    >
      {content}
    </Dialog>
  );
}

export function modal({ content }: { content: React.ReactNode }) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  let setInvisible: () => void;
  function Controller() {
    const [visible, setVisible] = React.useState<boolean | undefined>();
    useEffect(() => {
      setInvisible = () => {
        setVisible(false);
        document.body.removeChild(container);
      };
    }, []);

    return (
      <Modal
        visible={visible}
        content={content}
        onClose={() => {
          document.body.removeChild(container);
        }}
      />
    );
  }

  createRoot(container).render(
    <Provider store={store}>
      <ThemeProvider>
        <Controller />
      </ThemeProvider>
    </Provider>,
  );

  return {
    close: () => {
      setInvisible();
    },
  };
}
