import React, { useEffect, useRef, useState } from 'react';

/**
 * Scroll fade-up reveal. Reusable site-wide (section-level, not per-card).
 * Respects prefers-reduced-motion.
 */
export default function Reveal({ children, className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`bb-reveal ${visible ? 'bb-reveal--in' : ''} ${className}`}>
      {children}
    </div>
  );
}
