import React, { useEffect, useMemo } from 'react';
import 'rc-dropdown/assets/index.css';
import { v4 } from 'uuid';
import { createPortal } from 'react-dom';
import _ from 'lodash';

export function PopMenu({
  children,
  clientX,
  clientY,
}: {
  children: React.ReactNode;
  clientX: number;
  clientY: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [show, setShow] = React.useState(true);
  const [width, setWidth] = React.useState(0);
  const [height, setHeight] = React.useState(0);

  // get the width and height of the invisible menu
  // after that the menu will be visible
  useEffect(() => {
    if (!ref.current) {
      return () => {};
    }
    setWidth(ref.current.offsetWidth);
    setHeight(ref.current.offsetHeight);
    return () => {};
  }, [ref]);

  useEffect(() => {
    setShow(true);
  }, [clientX, clientY]);

  const left =
    clientX > window.innerWidth - width ? window.innerWidth - width : clientX;

  const top =
    clientY > window.innerHeight - height ? clientY - height : clientY;

  // close the menu when the user clicks outside of it
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) {
        return;
      }
      setShow(false);
    };
    document.addEventListener('click', listener);
    return () => {
      document.removeEventListener('click', listener);
    };
  }, [setShow, ref]);

  if (!show) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100vw',
        height: '100vh',
      }}
    >
      <div
        ref={ref}
        style={{
          visibility: width && height ? 'visible' : 'hidden',
          position: 'absolute',
          left,
          top,
          zIndex: 999,
          backgroundColor: 'white',
          borderRadius: 6,
          boxShadow: '0 0 40px rgba(0, 0, 0, 0.5)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

const getMenuContextData = (
  target: any,
): { key: string | null; customData: any } => {
  // if e is body, then return null
  if (target === document.body) {
    return { key: null, customData: {} };
  }
  if (target?.attributes?.getNamedItem('data-menu-context-key')) {
    const key = target?.attributes?.getNamedItem(
      'data-menu-context-key',
    )?.value;
    const customData = (target as HTMLElement)?.attributes
      ? _(Array.from((target as HTMLElement)?.attributes))
          .map((attr) => [attr.name, attr.value])
          .filter(([k]) => k.startsWith('data-custom-'))
          .map(([k, v]) => [k.replace('data-custom-', ''), v])
          .fromPairs()
          .value()
      : {};
    return { key, customData };
  }
  return getMenuContextData(target.parentElement);
};

export const useContextMenu = ({
  menu,
}: {
  menu: (arg: {
    e: MouseEvent;
    customData: Record<string, string>;
  }) => () => React.ReactNode;
}) => {
  const [menuPortal, setMenuPortal] = React.useState<React.ReactPortal | null>(
    null,
  );
  const [key] = React.useState<string | null>(v4());
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      const { key: menuContextKey, customData } = getMenuContextData(e.target);
      if (menuContextKey === key) {
        e.preventDefault();
        const Menu = menu({ e, customData });
        setMenuPortal(
          createPortal(
            <PopMenu clientX={e.clientX} clientY={e.clientY}>
              <Menu />
            </PopMenu>,
            document.body,
          ),
        );
      }
    };
    document.addEventListener('contextmenu', listener);
    return () => {
      document.removeEventListener('contextmenu', listener);
    };
  }, [key, setMenuPortal, menu]);

  const getProps = useMemo(() => {
    return ({ customData }: { customData?: any } = {}) => {
      return {
        'data-menu-context-key': key,
        ..._(customData)
          .mapKeys((v, k) => `data-custom-${k}`)
          .value(),
      };
    };
  }, [key]);

  return {
    getProps,
    menuPortal,
    close: () => {
      setMenuPortal(null);
    },
  };
};
