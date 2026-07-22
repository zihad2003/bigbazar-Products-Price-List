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

  const handleCtaClick = () => {
    const slide = slides[current];
    const link = slide.button_link || slide.product_id;
    if (link) {
      if (link.startsWith('http://') || link.startsWith('https://')) {
        window.open(link, '_blank');
      } else if (link.startsWith('/')) {
        navigate(link);
      } else {
        navigate(`/product/${link}`);
      }
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

  const textAlign = slide?.text_align || 'left';
  const alignClass = textAlign === 'center' ? 'text-center items-center' : textAlign === 'right' ? 'text-right items-end' : 'text-left items-start';
  const flexAlignClass = textAlign === 'center' ? 'justify-center' : textAlign === 'right' ? 'justify-end' : 'justify-start';
  const textColorStyle = slide?.text_color ? { color: slide.text_color } : { color: '#ffffff' };
  const buttonLabel = slide?.button_text || slide?.cta || (slide?.title || slide?.product_id ? 'অর্ডার করুন' : null);
  const imageFitClass = slide?.image_fit === 'contain' ? 'object-contain' : 'object-cover';

  return (
    <div
      className="relative w-full h-full overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
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
          className="absolute inset-0"
        >
          {/* Banner Image */}
          <img
            src={getOptimizedUrl(slide.image, mediaSizes.banner)}
            alt={slide.title || 'Collection Banner'}
            className="w-full h-full object-cover object-center select-none bg-neutral-950"
            loading={current === 0 ? 'eager' : 'lazy'}
            draggable={false}
          />

          {/* Premium Aesthetic Overlays */}
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

          {/* Dynamic Content Overlay */}
          {(slide.title || slide.subtitle || buttonLabel) && (
            <div className="absolute inset-0 flex items-center md:items-center py-6 md:py-10">
              <div className="w-full max-w-7xl mx-auto px-6 md:px-16 lg:px-24">
                <div className={`flex flex-col ${alignClass} space-y-2.5 md:space-y-4 max-w-2xl ${textAlign === 'center' ? 'mx-auto' : ''}`}>
                  {slide.subtitle && (
                    <motion.p
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      style={textColorStyle}
                      className="text-[10px] md:text-xs font-black uppercase tracking-[0.35em] drop-shadow-md opacity-90"
                    >
                      {slide.subtitle}
                    </motion.p>
                  )}
                  {slide.title && (
                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      style={textColorStyle}
                      className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-[1.05] uppercase italic tracking-tighter drop-shadow-2xl"
                    >
                      {slide.title}
                    </motion.h2>
                  )}

                  {/* Replaced Button Section */}
                  {buttonLabel && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.35 }}
                      className={`pt-1 md:pt-3 flex ${flexAlignClass} pointer-events-auto`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCtaClick();
                        }}
                        className="group relative inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 md:px-7 py-1.5 sm:py-2.5 md:py-3 bg-[#ce112d] hover:bg-[#b00e26] text-white text-[11px] sm:text-xs md:text-sm font-bold uppercase tracking-wider rounded-full shadow-lg border border-white/20 transition-all transform active:scale-95"
                      >
                        <span>{buttonLabel}</span>
                        <ChevronRight size={16} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </motion.div>
                  )}

                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Replaced Navigation Arrows */}
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

      {/* Replaced Pagination Dots */}
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