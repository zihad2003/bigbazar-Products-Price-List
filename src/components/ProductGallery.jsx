import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ZoomIn, X } from 'lucide-react';
import { getOptimizedUrl, mediaSizes } from '../utils/media';

const ProductGallery = ({ images, activeImageIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(activeImageIndex);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  React.useEffect(() => {
    if (activeImageIndex >= 0 && activeImageIndex < (images?.length || 0)) {
      setCurrentIndex(activeImageIndex);
    }
  }, [activeImageIndex, images]);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) nextSlide();
    if (isRightSwipe) prevSlide();
  };

  const nextSlide = () => {
    if (currentIndex < images.length - 1) setCurrentIndex(currentIndex + 1);
    else setCurrentIndex(0);
  };

  const prevSlide = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    else setCurrentIndex(images.length - 1);
  };

  // Preload all gallery images for instant switching
  React.useEffect(() => {
    if (!images || images.length === 0) return;
    images.forEach((imgSrc) => {
      const url = getOptimizedUrl(imgSrc, mediaSizes.gallery);
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, [JSON.stringify(images)]);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-[4/5] bg-neutral-100 rounded-[24px] md:rounded-[32px] flex items-center justify-center">
        <span className="text-neutral-400 text-sm">No images available</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Main Image */}
      <div 
        className="relative aspect-[4/5] md:aspect-[3/4] lg:aspect-[4/5] bg-neutral-50 rounded-[24px] md:rounded-[32px] overflow-hidden shadow-sm cursor-zoom-in group"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => setIsZoomOpen(true)}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={getOptimizedUrl(images[currentIndex], mediaSizes.gallery)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full object-cover object-top"
            alt={`Product image ${currentIndex + 1}`}
            loading={currentIndex === 0 ? "eager" : "lazy"}
            fetchPriority={currentIndex === 0 ? "high" : "auto"}
            decoding="async"
          />
        </AnimatePresence>

        {/* Zoom Hint Badge */}
        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all pointer-events-none">
          <ZoomIn size={14} />
          <span>Tap to zoom</span>
        </div>

        {/* Navigation arrows (Desktop only, show if multiple images) */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prevSlide(); }}
              className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full items-center justify-center text-neutral-800 shadow-lg hover:bg-[#ce112d] hover:text-white transition-all z-10"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextSlide(); }}
              className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full items-center justify-center text-neutral-800 shadow-lg hover:bg-[#ce112d] hover:text-white transition-all z-10"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Pagination dots */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {images.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-6 bg-[#ce112d]' : 'w-1.5 bg-white/50'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`shrink-0 border-2 rounded-xl overflow-hidden transition-all ${
                i === currentIndex 
                  ? 'border-[#ce112d] ring-2 ring-[#ce112d]/20 scale-105' 
                  : 'border-transparent opacity-60 hover:opacity-100 hover:border-neutral-200'
              }`}
              style={{
                width: '72px',
                height: '90px'
              }}
            >
              <img 
                src={getOptimizedUrl(img, { w: 144, h: 180 })} 
                className="w-full h-full object-cover" 
                alt={`Thumbnail ${i + 1}`}
              />
            </button>
          ))}
        </div>
      )}

      {/* Full-Screen Interactive Lightbox Zoom Modal */}
      <AnimatePresence>
        {isZoomOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 select-none"
            onClick={() => setIsZoomOpen(false)}
          >
            {/* Top Toolbar */}
            <div className="flex items-center justify-between z-10">
              <span className="text-white/70 text-xs font-mono font-bold">
                {currentIndex + 1} / {images.length}
              </span>
              <button
                onClick={() => setIsZoomOpen(false)}
                className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-[#ce112d] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Main Lightbox Image View */}
            <div
              className="relative flex-1 flex items-center justify-center my-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.img
                key={currentIndex}
                src={getOptimizedUrl(images[currentIndex], { w: 1600 })}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                alt={`Full screen product view ${currentIndex + 1}`}
              />

              {/* Prev / Next controls inside Lightbox */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 backdrop-blur-md text-white flex items-center justify-center hover:bg-[#ce112d] transition-all"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 backdrop-blur-md text-white flex items-center justify-center hover:bg-[#ce112d] transition-all"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>

            {/* Bottom Thumbnail Strip inside Lightbox */}
            {images.length > 1 && (
              <div
                className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-14 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                      i === currentIndex ? 'border-[#ce112d] scale-110' : 'border-white/20 opacity-50'
                    }`}
                  >
                    <img
                      src={getOptimizedUrl(img, { w: 100, h: 120 })}
                      className="w-full h-full object-cover"
                      alt={`Lightbox thumbnail ${i + 1}`}
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductGallery;
