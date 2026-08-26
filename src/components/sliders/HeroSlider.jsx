import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getOptimizedUrl, mediaSizes } from '../../utils/media';

export default function HeroSlider({ slides = [] }) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const total = slides.length;
  if (total === 0) return null;

  const goTo = useCallback((idx, dir) => {
    setDirection(dir);
    setCurrent(idx);
  }, []);

  const next = useCallback(() => {
    goTo((current + 1) % total, 1);
  }, [current, total, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + total) % total, -1);
  }, [current, total, goTo]);

  // Preload first slide banner image in head immediately for lightning fast hero load
  useEffect(() => {
    if (slides && slides[0]?.image) {
      const firstUrl = getOptimizedUrl(slides[0].image, mediaSizes.banner);
      if (firstUrl) {
        let link = document.querySelector("link[data-hero-preload='true']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.setAttribute('data-hero-preload', 'true');
          link.setAttribute('fetchpriority', 'high');
          document.head.appendChild(link);
        }
        link.href = firstUrl;
      }
    }
  }, [slides]);

  // Preload remaining slider images so slide transitions are instant
  useEffect(() => {
    if (!slides || slides.length === 0) return;
    slides.forEach((s) => {
      if (s?.image) {
        const url = getOptimizedUrl(s.image, mediaSizes.banner);
        if (url) {
          const img = new Image();
          img.src = url;
        }
      }
    });
  }, [slides]);

  // Auto-play
  useEffect(() => {
    if (isPaused || total <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, isPaused, total]);

  // Touch/swipe support
  const [touchStart, setTouchStart] = useState(null);
  const [touchMoved, setTouchMoved] = useState(false);

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
    setTouchMoved(false);
  };
  const handleTouchMove = () => setTouchMoved(true);
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
    }
    setTouchStart(null);
  };

  // Navigate on banner click
  const handleBannerClick = () => {
    const slide = slides[current];
    const link = slide.button_link || slide.product_id;
    if (!link) return;
    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank', 'noopener');
    } else if (link.startsWith('/')) {
      navigate(link);
    } else {
      navigate(`/product/${link}`);
    }
  };

  const slide = slides[current];

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  const imageFitClass = slide?.image_fit === 'contain' ? 'object-contain' : 'object-cover';
  const isClickable = !!(slide?.button_link || slide?.product_id);

  return (
    <div
      className="relative w-full h-full overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={current}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={`absolute inset-0 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
          onClick={touchMoved ? undefined : handleBannerClick}
        >
          <img
            src={getOptimizedUrl(slide.image, mediaSizes.banner)}
            alt="Banner"
            className={`w-full h-full ${imageFitClass} object-top md:object-center select-none bg-neutral-950`}
            loading={current === 0 ? 'eager' : 'lazy'}
            fetchPriority={current === 0 ? 'high' : 'auto'}
            decoding="async"
            draggable={false}
            onError={(e) => {
              if (slide.image && e.currentTarget.src !== slide.image) {
                e.currentTarget.src = slide.image;
              }
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {total > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-11 md:h-11 bg-white/80 hover:bg-white text-gray-800 backdrop-blur-md rounded-full flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100 z-10 active:scale-90"
            aria-label="Previous"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-11 md:h-11 bg-white/80 hover:bg-white text-gray-800 backdrop-blur-md rounded-full flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100 z-10 active:scale-90"
            aria-label="Next"
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>
        </>
      )}

      {/* Pagination Dots */}
      {total > 1 && (
        <div className="absolute bottom-2 sm:bottom-3 md:bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); goTo(idx, idx > current ? 1 : -1); }}
              className={`transition-all duration-300 rounded-full ${idx === current
                ? 'w-5 sm:w-6 h-1.5 sm:h-2 bg-[#ce112d]'
                : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/60 hover:bg-white'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {total > 1 && !isPaused && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 z-10">
          <motion.div
            key={current}
            className="h-full bg-[#ce112d]"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 5, ease: 'linear' }}
          />
        </div>
      )}
    </div>
  );
}