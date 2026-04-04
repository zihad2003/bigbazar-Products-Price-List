import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import { getOptimizedUrl, mediaSizes } from '../utils/media';

const ProductModalMedia = ({ images, videoUrl, showVideo, setShowVideo, currentIndex, setIndex }) => {
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
    if (currentIndex < images.length - 1) setIndex(currentIndex + 1);
    else setIndex(0);
  };

  const prevSlide = () => {
    if (currentIndex > 0) setIndex(currentIndex - 1);
    else setIndex(images.length - 1);
  };

  return (
    <div
      className="relative flex-1 bg-neutral-100 flex flex-col"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {showVideo && videoUrl ? (
            <motion.div
              key="video"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-0 bg-black"
            >
              <VideoPlayer src={videoUrl} poster={images[0]} isActive={true} priority={true} />
            </motion.div>
          ) : (
            <motion.img
              key={currentIndex}
              src={getOptimizedUrl(images[currentIndex], mediaSizes.gallery)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 w-full h-full object-cover object-top"
              alt={`Slide ${currentIndex}`}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Pagination dots (only for images) */}
      {!showVideo && images.length > 1 && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {images.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-6 bg-[#ce112d]' : 'w-1.5 bg-white/50'}`}
            />
          ))}
        </div>
      )}

      {/* Navigation arrows (Desktop only) */}
      {!showVideo && images.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full items-center justify-center text-neutral-800 shadow-lg hover:bg-[#ce112d] hover:text-white transition-all z-20"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={nextSlide}
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full items-center justify-center text-neutral-800 shadow-lg hover:bg-[#ce112d] hover:text-white transition-all z-20"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Thumbnail Bar (Mobile only, horizontal scroll) */}
      {!showVideo && images.length > 1 && (
        <div className="md:hidden absolute bottom-20 inset-x-0 p-3 flex gap-2 overflow-x-auto no-scrollbar pointer-events-auto z-[20]">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-12 h-16 shrink-0 border-2 rounded-lg overflow-hidden transition-all ${i === currentIndex ? 'border-[#ce112d] scale-105' : 'border-transparent opacity-60'}`}
            >
              <img src={getOptimizedUrl(img, { w: 100, h: 140 })} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductModalMedia;
