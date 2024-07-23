import { RefObject, useEffect, useState } from 'react';

export const useWatchForRefReady = <T extends HTMLElement>(
  ref: RefObject<T>,
) => {
  const [, rerender] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      if (ref.current) {
        rerender((v) => v + 1);
        clearInterval(timer);
      }
    }, 50);
  }, [ref]);
};
