import * as React from "react";

export function useComposition<T extends HTMLElement>({
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
}: {
  onKeyDown?: (e: React.KeyboardEvent<T>) => void;
  onCompositionStart?: (e: React.CompositionEvent<T>) => void;
  onCompositionEnd?: (e: React.CompositionEvent<T>) => void;
}) {
  const [isComposing, setIsComposing] = React.useState(false);

  const handleCompositionStart = React.useCallback(
    (e: React.CompositionEvent<T>) => {
      setIsComposing(true);
      onCompositionStart?.(e);
    },
    [onCompositionStart]
  );

  const handleCompositionEnd = React.useCallback(
    (e: React.CompositionEvent<T>) => {
      setIsComposing(false);
      onCompositionEnd?.(e);
    },
    [onCompositionEnd]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<T>) => {
      if (isComposing && e.key === "Enter") {
        return;
      }
      onKeyDown?.(e);
    },
    [isComposing, onKeyDown]
  );

  return {
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    onKeyDown: handleKeyDown,
  };
}
