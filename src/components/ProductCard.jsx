import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Instagram } from 'lucide-react';
import { calculatePrice } from '../utils/pricing';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import { useLanguage } from '../contexts/LanguageContext';

export const ProductCard = ({ product, onClick }) => {
  const { price, originalPrice, hasDiscount } = calculatePrice(product);
  const hasVideo = !!product.video_url;

  // Choose the best candidate for the display image
  let sourceImage = product.image_url || product.images?.[0];

  // If no image but has video, use video (normalization happens in getOptimizedUrl)
  if (!sourceImage && hasVideo) {
    sourceImage = product.video_url;
  }

  const { language } = useLanguage();

  // Calculate discount percentage
  const discountPercent = hasDiscount && originalPrice > 0 
    ? Math.round(((originalPrice - price) / originalPrice) * 100) 
    : 0;

  return (
    <div
      onClick={() => onClick(product)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-neutral-100 cursor-pointer group flex flex-col h-full"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-neutral-50 shrink-0">
        {sourceImage ? (
          <div className="relative w-full h-full">
            <img
              src={getOptimizedUrl(sourceImage, mediaSizes.thumbnail)}
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-out"
              alt={product.name}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                if (e.currentTarget.src.includes('images.weserv.nl') && sourceImage) {
                  e.currentTarget.src = sourceImage;
                }
              }}
            />
          </div>
        ) : (
          <div className="w-full h-full bg-neutral-50 flex items-center justify-center">
            <Instagram size={22} className="text-zinc-200" />
          </div>
        )}
        
        {/* Corner Ribbon Sale Badge */}
        {hasDiscount && (
          <div className="absolute top-0 left-0">
            <div className="bg-[#ce112d] text-white text-[9px] md:text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-br-lg shadow-md">
              {discountPercent}% OFF
            </div>
          </div>
        )}
        
        {product.is_sold_out && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center p-6 text-center">
            <span className="text-xs font-bold uppercase text-neutral-900 border-2 border-neutral-900 px-4 py-2 rounded-xl">
              {language === 'bn' ? 'স্টক নেই' : 'Sold Out'}
            </span>
          </div>
        )}
      </div>
      
      <div className="p-3.5 md:p-5 flex flex-col flex-1 gap-3">
        <div className="space-y-1">
          <p className="text-[9px] md:text-[10px] font-bold uppercase text-neutral-400 tracking-wider truncate">
            {product.category || 'Clothing'}
          </p>
          <h4 className="text-sm md:text-base font-bold text-neutral-800 line-clamp-2 leading-tight min-h-[40px] capitalize">{product.name}</h4>
        </div>
        
        <div className="mt-auto flex items-center justify-between gap-1.5 pt-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0 overflow-hidden">
            <span className="text-sm sm:text-base md:text-lg font-black text-[#ce112d] whitespace-nowrap">৳{price}</span>
            {hasDiscount && (
              <span className="text-[10px] sm:text-[11px] text-neutral-400 line-through font-semibold whitespace-nowrap">৳{originalPrice}</span>
            )}
          </div>
          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400 group-hover:bg-[#ce112d] group-hover:text-white transition-all shadow-sm shrink-0">
            <ArrowRight size={14} className="sm:w-4 sm:h-4" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProductSkeleton = () => (
  <div className="bg-white rounded-2xl overflow-hidden border border-neutral-100 animate-pulse h-full">
    <div className="aspect-[4/5] bg-neutral-200" />
    <div className="p-3.5 md:p-5 space-y-3">
      <div className="h-2 w-16 bg-neutral-100 rounded-full" />
      <div className="h-4 w-full bg-neutral-200 rounded-lg" />
      <div className="h-4 w-2/3 bg-neutral-100 rounded-lg" />
      <div className="mt-8 flex justify-between items-end">
        <div className="h-6 w-20 bg-neutral-100 rounded-lg" />
        <div className="h-8 w-8 md:h-10 md:w-10 bg-neutral-200 rounded-xl" />
      </div>
    </div>
  </div>
);

export default ProductCard;
