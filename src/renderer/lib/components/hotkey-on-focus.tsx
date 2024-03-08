import React, { useEffect, useRef } from 'react';

export function HotkeyOnFocus({
  children,
  onCtrlF,
  style,
  onFocus,
  onBlur,
}: {
  children: any;
  onCtrlF: ({ ref }: { ref: React.RefObject<HTMLDivElement> }) => void;
  style?: React.CSSProperties;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: Event) => {
      const event = e as any as React.KeyboardEvent<HTMLDivElement>;
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === 'f' &&
        ref.current?.contains(document.activeElement)
      ) {
        event.preventDefault();
        onCtrlF({ ref });
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCtrlF]);

  return (
    <div
      ref={ref}
      tabIndex={0}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{ outline: 'none', ...style }}
    >
      {children}
    </div>
  );
}
