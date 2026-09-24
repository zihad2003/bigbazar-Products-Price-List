import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getOptimizedUrl, mediaSizes } from '../../utils/media';

/**
 * Editorial hero frame — locked ratios so every slide feels intentional
 * (no jump when image intrinsic ratios differ).
 *
 * Mobile  5:4  — strong first impression without eating the whole viewport
 * Tablet  16:9 — classic wide
 * Desktop 2.4:1 — cinematic fashion banner (~1920×800)
 */
const FRAME_CLASS = {
  // Modern full-bleed fashion frame — taller mobile, cinematic desktop
  auto: 'aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9] max-h-[78vh] lg:max-h-[560px]',
  slim: 'aspect-[16/9] md:aspect-[21/9] max-h-[52vh] lg:max-h-[420px]',
  fullscreen: 'aspect-[3/4] sm:aspect-[16/9] lg:aspect-[16/9] max-h-[85vh] lg:max-h-[680px]',
};

export default function HeroSlider({ slides = [], aspectMode = 'auto' }) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  const total = slides.length;
  const frameClass = FRAME_CLASS[aspectMode] || FRAME_CLASS.auto;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const goTo = useCallback((idx, dir) => {
    setDirection(dir);
    setCurrent(idx);
  }, []);

  const next = useCallback(() => {
    if (total <= 1) return;
    goTo((current + 1) % total, 1);
  }, [current, total, goTo]);

  const prev = useCallback(() => {
    if (total <= 1) return;
    goTo((current - 1 + total) % total, -1);
  }, [current, total, goTo]);

  // Preload first slide
  useEffect(() => {
    if (!slides?.length) return;
    const firstSlide = slides[0];
    const targetUrl =
      isMobile && firstSlide?.mobile_image ? firstSlide.mobile_image : firstSlide?.image;
    if (!targetUrl) return;
    const url = getOptimizedUrl(
      targetUrl,
      isMobile ? mediaSizes.bannerMobile : mediaSizes.banner
    );
    if (!url) return;
    let link = document.querySelector("link[data-hero-preload='true']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.setAttribute('data-hero-preload', 'true');
      link.setAttribute('fetchpriority', 'high');
      document.head.appendChild(link);
    }
    link.href = url;
  }, [slides, isMobile]);

  // Auto-play
  useEffect(() => {
    if (isPaused || total <= 1) return;
    const timer = setInterval(next, 5500);
    return () => clearInterval(timer);
  }, [next, isPaused, total]);

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

  if (total === 0) return null;
  const slide = slides[current] || slides[0];

  const hasMobileImage = !!slide?.mobile_image;
  const activeImageUrl = isMobile && hasMobileImage ? slide.mobile_image : slide?.image;
  const activeOptimizedUrl = getOptimizedUrl(
    activeImageUrl,
    isMobile && hasMobileImage ? mediaSizes.bannerMobile : mediaSizes.banner
  );

  const handleBannerClick = () => {
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

  const variants = useMemo(
    () => ({
      enter: (dir) => ({ x: dir > 0 ? '8%' : '-8%', opacity: 0 }),
      center: { x: 0, opacity: 1 },
      exit: (dir) => ({ x: dir > 0 ? '-8%' : '8%', opacity: 0 }),
    }),
    []
  );

  const imageFitClass = slide?.image_fit === 'contain' ? 'object-contain' : 'object-cover';
  const isClickable = !!(slide?.button_link || slide?.product_id);

  return (
    <div
      className={`relative w-full overflow-hidden bg-neutral-100 group select-none ${frameClass}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={`${current}-${isMobile ? 'm' : 'd'}`}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className={`absolute inset-0 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
          onClick={touchMoved ? undefined : handleBannerClick}
        >
          <picture className="w-full h-full block">
            {slide?.mobile_image && (
              <source
                media="(max-width: 767px)"
                srcSet={getOptimizedUrl(slide.mobile_image, mediaSizes.bannerMobile)}
              />
            )}
            <img
              src={activeOptimizedUrl}
              alt={slide?.title || 'Hero Banner'}
              className={`w-full h-full ${imageFitClass} object-center select-none scale-[1.01] group-hover:scale-[1.03] transition-transform duration-[1.4s] ease-out`}
              loading={current === 0 ? 'eager' : 'lazy'}
              fetchpriority={current === 0 ? 'high' : 'auto'}
              decoding="async"
              draggable={false}
              onError={(e) => {
                if (activeImageUrl && e.currentTarget.src !== activeImageUrl) {
                  e.currentTarget.src = activeImageUrl;
                }
              }}
            />
          </picture>
        </motion.div>
      </AnimatePresence>

      {/* Soft bottom veil — keeps dots readable without a card overlay */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 sm:h-28 bg-gradient-to-t from-black/35 via-black/10 to-transparent z-[5]"
        aria-hidden
      />

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 bg-white/90 hover:bg-white text-zinc-800 rounded-full flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100 z-10 active:scale-95 hidden sm:flex"
            aria-label="Previous Slide"
          >
            <ChevronLeft size={20} strokeWidth={2.25} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 bg-white/90 hover:bg-white text-zinc-800 rounded-full flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100 z-10 active:scale-95 hidden sm:flex"
            aria-label="Next Slide"
          >
            <ChevronRight size={20} strokeWidth={2.25} />
          </button>
        </>
      )}

      {total > 1 && (
        <div className="absolute bottom-3.5 sm:bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goTo(idx, idx > current ? 1 : -1);
              }}
              className={`transition-all duration-300 rounded-full ${
                idx === current
                  ? 'w-7 h-1.5 bg-white shadow-sm'
                  : 'w-1.5 h-1.5 bg-white/55 hover:bg-white/85'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={idx === current ? 'true' : undefined}
            />
          ))}
        </div>
      )}

      {total > 1 && !isPaused && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/15 z-10">
          <motion.div
            key={`progress-${current}-${isMobile ? 'm' : 'd'}`}
            className="h-full bg-[#ce112d]"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 5.5, ease: 'linear' }}
          />
        </div>
      )}
    </div>
  );
}
