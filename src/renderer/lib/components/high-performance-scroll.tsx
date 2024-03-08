import React, { useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import AutoSizer from 'react-virtualized-auto-sizer';
import { COLORS, THEME } from '@constants';

const validNumberOrNull = (value: number) =>
  Number.isNaN(value) ? null : value;

// Main component with the virtualized list and variable heights
export const HighPerformanceScroll = ({
  getItem,
  scrollToLine,
  itemCount,
  onSelectionChange,
  estimateSize,
}: {
  getItem: (index: number) => {
    tokenIndexStart: number;
    tokenIndexEnd: number;
    tokensStart: number;
    tokensEnd: number;
    item: React.ReactNode;
  };
  estimateSize: (index: number) => number;
  scrollToLine?: number;
  itemCount: number;
  onSelectionChange: (arg: {
    startPosition: number;
    endPosition: number;
  }) => void;
}) => {
  const listRef = React.useRef<HTMLDivElement>(null);

  // const selectionStartRef = React.useRef<HTMLDivElement>(null);
  // const selectionEndRef = React.useRef<HTMLDivElement>(null);
  const selectionInfo = React.useRef<{
    anchorTokenIndex: number | null;
    anchorTokenOffset: number | null;
    anchorPosition: number | null;
    focusTokenIndex: number | null;
    focusTokenOffset: number | null;
    focusPosition: number | null;
  }>({
    anchorTokenIndex: null,
    anchorTokenOffset: null,
    anchorPosition: null,
    focusTokenIndex: null,
    focusTokenOffset: null,
    focusPosition: null,
  });

  const isShiftDown = React.useRef(false);
  useEffect(() => {
    const keyDownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        isShiftDown.current = true;
      }
    };
    const keyUpHandler = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        isShiftDown.current = false;
      }
    };
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    return () => {
      document.removeEventListener('keydown', keyDownHandler);
      document.removeEventListener('keyup', keyUpHandler);
    };
  }, []);

  const isMouseDown = React.useRef(false);

  useEffect(() => {
    const mouseDownHandler = (e: any) => {
      isMouseDown.current = true;
      // we don't want to clear the selection if shift is down
      // or if the click is on the list container which is the scrollbar
      if (isShiftDown.current || e.target?.id === 'list-container') {
        return;
      }
      selectionInfo.current = {
        anchorTokenIndex: null,
        anchorTokenOffset: null,
        anchorPosition: null,
        focusTokenIndex: null,
        focusTokenOffset: null,
        focusPosition: null,
      };
    };
    const mouseUpHandler = () => {
      isMouseDown.current = false;
    };
    document.addEventListener('mousedown', mouseDownHandler);
    document.addEventListener('mouseup', mouseUpHandler);
    return () => {
      document.removeEventListener('mousedown', mouseDownHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };
  }, []);

  // this hook only updates react state, it doesn't do anything to the dom
  useEffect(() => {
    const selectionChangeHandler = (e: Event) => {
      if (e.type === 'mousemove' && !isMouseDown.current) {
        return;
      }

      // if (e.type === 'mouseup' && !isShiftDown.current) {
      //   return;
      // }

      // the problem occurs when mouse is down and mouse is moved outside token element
      // the event is triggered but without focusNode

      const selection = window.getSelection();
      if (!selection) {
        return;
      }
      const anchorNode = selection?.anchorNode?.parentNode as HTMLElement;
      const focusNode = selection?.focusNode?.parentNode as HTMLElement;

      const anchorTokenIndex = validNumberOrNull(
        parseInt(anchorNode?.attributes?.['data-token-index' as any]?.value),
      );
      const focusTokenIndex = validNumberOrNull(
        parseInt(focusNode?.attributes?.['data-token-index' as any]?.value),
      );
      const anchorTokenStart = validNumberOrNull(
        parseInt(anchorNode?.attributes?.['data-token-start' as any]?.value),
      );
      const focusTokenStart = validNumberOrNull(
        parseInt(focusNode?.attributes?.['data-token-start' as any]?.value),
      );

      const newSelectionInfo = (() => {
        if (isShiftDown.current) {
          if (focusTokenIndex === null || focusTokenStart === null) {
            return null;
          }
          return {
            ...selectionInfo.current,
            focusTokenIndex,
            focusTokenOffset: selection.focusOffset,
            focusPosition: focusTokenStart + selection.focusOffset,
          };
        }

        if (focusTokenIndex === null || focusTokenStart === null) {
          return null;
        }
        return {
          ...selectionInfo.current,
          ...(selectionInfo.current.anchorTokenIndex === null &&
            selectionInfo.current.anchorTokenOffset === null &&
            selectionInfo.current.anchorPosition === null &&
            anchorTokenStart !== null && {
              anchorTokenIndex,
              anchorTokenOffset: selection.anchorOffset,
              anchorPosition: anchorTokenStart + selection.anchorOffset,
            }),
          focusTokenIndex,
          focusTokenOffset: selection.focusOffset,
          focusPosition: focusTokenStart + selection.focusOffset,
        };
      })();

      if (
        newSelectionInfo === null ||
        newSelectionInfo.anchorPosition === null
      ) {
        return;
      }

      if (
        selectionInfo.current.anchorPosition !==
          newSelectionInfo.anchorPosition ||
        selectionInfo.current.focusPosition !== newSelectionInfo.focusPosition
      ) {
        onSelectionChange({
          startPosition: Math.min(
            newSelectionInfo.anchorPosition,
            newSelectionInfo.focusPosition,
          ),
          endPosition: Math.max(
            newSelectionInfo.anchorPosition,
            newSelectionInfo.focusPosition,
          ),
        });
      }

      selectionInfo.current = newSelectionInfo;
    };
    document.addEventListener('mousemove', selectionChangeHandler);
    document.addEventListener('mouseup', selectionChangeHandler);
    // document.addEventListener('mousedown', selectionChangeHandler); // It CANNOT be used, the event is inaccuarate. DON'T try it again.
    return () => {
      document.removeEventListener('mousemove', selectionChangeHandler);
      document.removeEventListener('mouseup', selectionChangeHandler);
      // document.removeEventListener('mousedown', selectionChangeHandler); // It CANNOT be used, the event is inaccuarate. DON'T try it again.
    };
  }, [onSelectionChange]);

  // combine selectionInfo with the actual dom
  // find the anchor and focus nodes and set the selection on the dom
  // this is used for maintaining the selection from the react state to the dom
  const updateSelection = React.useCallback(() => {
    const firstToken = listRef.current?.firstChild?.firstChild as HTMLElement;
    const lastToken = listRef.current?.lastChild?.lastChild as HTMLElement;
    const firstTokenIndex = parseInt(
      firstToken?.attributes?.['data-token-index' as any]?.value,
    );

    const lastTokenIndex = parseInt(
      lastToken?.attributes?.['data-token-index' as any]?.value,
    );

    if (Number.isNaN(firstTokenIndex) || Number.isNaN(lastTokenIndex)) {
      return;
    }

    if (
      selectionInfo.current.anchorTokenIndex === null ||
      selectionInfo.current.anchorTokenOffset === null ||
      selectionInfo.current.focusTokenIndex === null ||
      selectionInfo.current.focusTokenOffset === null
    ) {
      return;
    }

    const { anchorNode, anchorOffset } = (() => {
      if (
        selectionInfo.current.anchorTokenIndex >= firstTokenIndex &&
        selectionInfo.current.anchorTokenIndex <= lastTokenIndex
      ) {
        return {
          anchorNode: document.querySelector(
            `[data-token-index="${selectionInfo.current.anchorTokenIndex}"]`,
          )?.childNodes[0] as HTMLElement,
          anchorOffset: selectionInfo.current.anchorTokenOffset,
        };
      }
      if (selectionInfo.current.anchorTokenIndex <= firstTokenIndex) {
        return {
          anchorNode: firstToken,
          anchorOffset: 0,
        };
      }
      if (selectionInfo.current.anchorTokenIndex >= lastTokenIndex) {
        return {
          anchorNode: lastToken,
          anchorOffset: 0,
        };
      }
      return {
        anchorNode: null,
        anchorOffset: null,
      };
    })();

    const { focusNode, focusOffset } = (() => {
      if (
        selectionInfo.current.focusTokenIndex >= firstTokenIndex &&
        selectionInfo.current.focusTokenIndex <= lastTokenIndex
      ) {
        return {
          focusNode: document.querySelector(
            `[data-token-index="${selectionInfo.current.focusTokenIndex}"]`,
          )?.childNodes[0] as HTMLElement,
          focusOffset: selectionInfo.current.focusTokenOffset,
        };
      }
      if (selectionInfo.current.focusTokenIndex <= firstTokenIndex) {
        return {
          focusNode: firstToken,
          focusOffset: 0,
        };
      }
      if (selectionInfo.current.focusTokenIndex >= lastTokenIndex) {
        return {
          focusNode: lastToken,
          focusOffset: 0,
        };
      }
      return {
        focusNode: null,
        focusOffset: null,
      };
    })();

    const selection = window.getSelection();
    if (selection && anchorNode && focusNode) {
      const range = document.createRange();
      range.setStart(anchorNode, anchorOffset);
      selection.removeAllRanges();
      selection.addRange(range);
      selection.extend(focusNode, focusOffset);
    }
  }, []);

  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    getScrollElement: () => parentRef.current!,
    estimateSize,
    count: itemCount,
    overscan: 5,
    onChange: updateSelection,
  });

  useEffect(() => {
    if (scrollToLine !== undefined) {
      rowVirtualizer.scrollToIndex(scrollToLine, {
        align: 'center',
        behavior: 'auto',
      });
    }
  }, [scrollToLine, rowVirtualizer]);

  // I don't know why, but this is needed to make the list work
  // Otherwise the list is not rendered
  const [, forceUpdate] = React.useState(0);
  useEffect(() => {
    forceUpdate((x) => x + 1);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        backgroundColor: `#${COLORS[THEME].WHITE}`,
        borderRadius: 4,
        lineHeight: '20px',
      }}
    >
      <AutoSizer>
        {({ height, width }) => (
          <div
            id="list-container"
            ref={parentRef}
            style={{
              height,
              width,
              overflow: 'auto',
            }}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
                paddingBottom: 20, // 20 - 10 (aboslute/top) = 10
              }}
              ref={listRef}
            >
              {/* Only the visible items in the virtualizer, manually positioned to be in view */}
              {rowVirtualizer.getVirtualItems().map((virtualItem) => (
                <div
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualItem.index}
                  key={virtualItem.key}
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    width: 'calc(100% - 20px)',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  {getItem(virtualItem.index).item}
                </div>
              ))}
            </div>
          </div>
        )}
      </AutoSizer>
    </div>
  );
};
