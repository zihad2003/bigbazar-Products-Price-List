import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getOptimizedUrl, mediaSizes } from '../utils/media';

const ProductGallery = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

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
        className="relative aspect-[4/5] md:aspect-[3/4] lg:aspect-[4/5] bg-neutral-50 rounded-[24px] md:rounded-[32px] overflow-hidden shadow-sm"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
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
          />
        </AnimatePresence>

        {/* Navigation arrows (Desktop only, show if multiple images) */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full items-center justify-center text-neutral-800 shadow-lg hover:bg-[#ce112d] hover:text-white transition-all z-10"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={nextSlide}
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
    </div>
  );
};

export default ProductGallery;
