import { useEffect } from 'react';

/** Nested modals share one document lock (refcount). */
let lockCount = 0;
let saved = null;

function applyLock() {
  const { body, documentElement } = document;
  saved = {
    bodyOverflow: body.style.overflow,
    bodyPaddingRight: body.style.paddingRight,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyWidth: body.style.width,
    htmlOverflow: documentElement.style.overflow,
    scrollY: window.scrollY || window.pageYOffset || 0,
  };

  const scrollbarGap = window.innerWidth - documentElement.clientWidth;
  body.style.overflow = 'hidden';
  documentElement.style.overflow = 'hidden';
  // iOS / mobile: fixed body so background cannot rubber-band scroll
  body.style.position = 'fixed';
  body.style.top = `-${saved.scrollY}px`;
  body.style.width = '100%';
  if (scrollbarGap > 0) {
    body.style.paddingRight = `${scrollbarGap}px`;
  }
}

function releaseLock() {
  if (!saved) return;
  const { body, documentElement } = document;
  const y = saved.scrollY;

  body.style.overflow = saved.bodyOverflow || '';
  body.style.paddingRight = saved.bodyPaddingRight || '';
  body.style.position = saved.bodyPosition || '';
  body.style.top = saved.bodyTop || '';
  body.style.width = saved.bodyWidth || '';
  documentElement.style.overflow = saved.htmlOverflow || '';
  saved = null;

  window.scrollTo(0, y);
}

/**
 * Locks document scroll while `locked` is true (modals/drawers).
 * Safe for nested callers — only the last unlock restores scroll.
 */
export function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return undefined;

    if (lockCount === 0) applyLock();
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) releaseLock();
    };
  }, [locked]);
}
