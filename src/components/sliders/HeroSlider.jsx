import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getOptimizedUrl, mediaSizes } from '../../utils/media';

export default function HeroSlider({ slides = [], aspectMode = 'auto' }) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));
  const [loadedRatios, setLoadedRatios] = useState({});

  const total = slides.length;

  // Listen for screen resize (desktop vs mobile breakpoint)
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
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

  // Preload first slide images
  useEffect(() => {
    if (!slides || slides.length === 0) return;
    const firstSlide = slides[0];
    const targetUrl = isMobile && firstSlide?.mobile_image ? firstSlide.mobile_image : firstSlide?.image;
    if (targetUrl) {
      const url = getOptimizedUrl(targetUrl, isMobile ? mediaSizes.bannerMobile : mediaSizes.banner);
      if (url) {
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
      }
    }
  }, [slides, isMobile]);

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

  if (total === 0) return null;
  const slide = slides[current] || slides[0];

  // Pick active image based on viewport (Mobile vs Desktop)
  const hasMobileImage = !!slide?.mobile_image;
  const activeImageUrl = (isMobile && hasMobileImage) ? slide.mobile_image : slide?.image;
  const activeOptimizedUrl = getOptimizedUrl(
    activeImageUrl,
    (isMobile && hasMobileImage) ? mediaSizes.bannerMobile : mediaSizes.banner
  );

  // Navigate on banner click
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

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  const imageFitClass = slide?.image_fit === 'contain' ? 'object-contain' : 'object-cover';
  const isClickable = !!(slide?.button_link || slide?.product_id);

  // Compute container aspect ratio / height
  const containerStyle = useMemo(() => {
    if (aspectMode === 'slim') {
      // 1920x600 Desktop, 1024x500 Tablet, 1:1 or 16:9 Mobile
      if (isMobile) {
        return { aspectRatio: hasMobileImage ? '1 / 1' : '16 / 9' };
      }
      return { aspectRatio: '1920 / 600' };
    }
    if (aspectMode === 'fullscreen') {
      // 16:9 Fullscreen
      if (isMobile && hasMobileImage) {
        return { aspectRatio: '3 / 4' };
      }
      return { aspectRatio: '16 / 9' };
    }

    // Default: 'auto' (Smart Adaptive Fit)
    // 1. Check if ratio was saved in slide
    const savedRatio = (isMobile && hasMobileImage)
      ? (slide?.mobile_aspect_ratio || slide?.aspect_ratio)
      : slide?.aspect_ratio;
    
    // 2. Check if detected on client load
    const detectedRatio = loadedRatios[activeImageUrl];
    const targetRatio = savedRatio || detectedRatio;

    if (targetRatio && targetRatio > 0) {
      return { aspectRatio: `${targetRatio}` };
    }

    // Default fallback based on viewport
    if (isMobile) {
      return hasMobileImage ? { aspectRatio: '1 / 1' } : { aspectRatio: '16 / 9' };
    }
    return { aspectRatio: '1920 / 600' };
  }, [aspectMode, isMobile, hasMobileImage, slide, activeImageUrl, loadedRatios]);

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) {
      const ratio = naturalWidth / naturalHeight;
      setLoadedRatios(prev => (prev[activeImageUrl] === ratio ? prev : { ...prev, [activeImageUrl]: ratio }));
    }
  };

  return (
    <div
      className="relative w-full overflow-hidden bg-neutral-950 group select-none transition-[aspect-ratio] duration-300"
      style={containerStyle}
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
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
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
              alt={slide?.title || "Hero Banner"}
              onLoad={handleImageLoad}
              className={`w-full h-full ${imageFitClass} object-center select-none bg-neutral-950`}
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

      {/* Navigation Arrows */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-11 md:h-11 bg-white/80 hover:bg-white text-gray-800 backdrop-blur-md rounded-full flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100 z-10 active:scale-90"
            aria-label="Previous Slide"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-11 md:h-11 bg-white/80 hover:bg-white text-gray-800 backdrop-blur-md rounded-full flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100 z-10 active:scale-90"
            aria-label="Next Slide"
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
              type="button"
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
            key={`${current}-${isMobile ? 'm' : 'd'}`}
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