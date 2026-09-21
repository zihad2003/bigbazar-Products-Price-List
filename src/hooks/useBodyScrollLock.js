import { useEffect } from 'react';

/**
 * Locks document scroll while `locked` is true (modals/drawers).
 * Restores previous overflow on unlock / unmount.
 */
export function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return undefined;

    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPaddingRight = body.style.paddingRight;
    const prevHtmlOverflow = documentElement.style.overflow;

    const scrollbarGap = window.innerWidth - documentElement.clientWidth;
    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';
    if (scrollbarGap > 0) {
      body.style.paddingRight = `${scrollbarGap}px`;
    }

    return () => {
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevBodyPaddingRight;
      documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [locked]);
}
