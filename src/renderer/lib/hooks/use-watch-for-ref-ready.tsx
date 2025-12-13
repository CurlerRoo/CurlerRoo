import { RefObject, useEffect, useRef, useState } from 'react';

export const useWatchForRefReady = <T,>(ref: RefObject<T | null>) => {
  const [, rerender] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      if (ref.current) {
        rerender((v) => v + 1);
        clearInterval(timer);
      }
    }, 50);
    return () => {
      clearInterval(timer);
    };
  }, [ref]);
};

export const useWatchForRefChanged = <T,>(ref: RefObject<T | null>) => {
  const [, rerender] = useState(0);
  const prevRefValue = useRef<T | null>(null);
  useEffect(() => {
    // initialize from current value so we only rerender on *changes*
    prevRefValue.current = ref.current;
    const timer = setInterval(() => {
      if (!Object.is(prevRefValue.current, ref.current)) {
        prevRefValue.current = ref.current;
        rerender((v) => v + 1);
      }
    }, 50);
    return () => {
      clearInterval(timer);
    };
  }, [ref]);
};
