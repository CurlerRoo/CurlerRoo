import React, { useEffect } from 'react';
import Dialog from 'rc-dialog';
import 'rc-dialog/assets/index.css';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../../state/store';

export function Modal({
  content,
  onClose,
  visible,
}: {
  content: React.ReactNode;
  onClose?: () => void;
  visible?: boolean;
}) {
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
      style={{
        width: 640,
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
      <Controller />
    </Provider>,
  );

  return {
    close: () => {
      setInvisible();
    },
  };
}
