import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getOptimizedUrl, mediaSizes } from '../utils/media';

export default function HeroSlider({ slides = [] }) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const total = slides.length;
  if (total === 0) return null;

  const handleCtaClick = () => {
    const slide = slides[current];
    if (slide.product_id) {
      navigate(`/product/${slide.product_id}`);
    } else {
      const el = document.getElementById('products-header');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

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

  // Auto-play
  useEffect(() => {
    if (isPaused || total <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, isPaused, total]);

  // Touch/swipe support
  const [touchStart, setTouchStart] = useState(null);
  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
    }
    setTouchStart(null);
  };

  const slide = slides[current];

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Aspect ratio container - significantly taller for better proportion */}
      <div className="relative w-full aspect-[1/1] md:aspect-[21/9]">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={current}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-0"
          >
            {/* Image */}
            <img
              src={getOptimizedUrl(slide.image, mediaSizes.banner)}
              alt={slide.title || 'Banner'}
              className="w-full h-full object-cover"
              loading={current === 0 ? 'eager' : 'lazy'}
              draggable={false}
            />

            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Text overlay */}
            {(slide.title || slide.subtitle || slide.cta) && (
              <div className="absolute inset-0 flex items-center justify-center md:justify-start">
                <div className="p-6 md:p-12 lg:p-16 w-full md:max-w-xl space-y-3 md:space-y-4 text-center md:text-left transition-all duration-500">
                  {slide.subtitle && (
                    <motion.p
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="text-[9px] md:text-xs font-bold uppercase tracking-[0.4em] text-white/80"
                    >
                      {slide.subtitle}
                    </motion.p>
                  )}
                  {slide.title && (
                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="text-xl md:text-3xl lg:text-4xl font-black text-white leading-tight uppercase tracking-tight"
                    >
                      {slide.title}
                    </motion.h2>
                  )}
                  {slide.cta && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                      className="flex justify-center md:justify-start pt-4"
                    >
                      <button 
                        onClick={handleCtaClick}
                        className="px-8 md:px-12 py-3.5 md:py-4 bg-[#ce112d] text-white text-[11px] md:text-sm font-black uppercase tracking-[0.2em] rounded-full hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-red-900/40 border border-white/20 whitespace-nowrap"
                      >
                        {slide.cta}
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation arrows */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 z-10 active:scale-90"
            aria-label="Previous"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <button
            onClick={next}
            className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 z-10 active:scale-90"
            aria-label="Next"
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>
        </>
      )}

      {/* Pagination dots */}
      {total > 1 && (
        <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx, idx > current ? 1 : -1)}
              className={`transition-all duration-300 rounded-full ${
                idx === current
                  ? 'w-8 h-2.5 bg-[#ce112d] shadow-lg shadow-red-900/40'
                  : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/60'
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
