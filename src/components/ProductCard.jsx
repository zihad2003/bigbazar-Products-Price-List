import React from 'react';
import { Instagram } from 'lucide-react';
import { calculatePrice } from '../utils/pricing';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import { useLanguage } from '../contexts/LanguageContext';

const colorSwatches = (product) => {
  const colors = Array.isArray(product?.available_colors) ? product.available_colors : [];
  const fromColors = colors
    .map((c) => {
      if (!c || typeof c !== 'object') return null;
      const name = String(c.name || '').trim();
      const image = c.image || c.image_url;
      if (!image || c.is_available === false) return null;
      return { name, image };
    })
    .filter(Boolean);
  if (fromColors.length > 1) return fromColors;

  const images = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
  const unique = [...new Set(images)];
  if (unique.length > 1) {
    return unique.map((image) => ({ name: '', image }));
  }
  return [];
};

export const ProductCard = ({ product, onClick }) => {
  const { price, originalPrice, hasDiscount } = calculatePrice(product);
  const [imgFailed, setImgFailed] = React.useState(false);
  const [activeSwatch, setActiveSwatch] = React.useState(0);
  const swatches = colorSwatches(product);

  // Choose the best candidate for the display image (never use Instagram video URL as a photo)
  const sourceImage = swatches[activeSwatch]?.image || product.image_url || product.images?.[0] || null;
  // Legacy circular /api/img/{uuid} (no up-) often 404s — try static migrate path as fallback
  const staticFallback =
    sourceImage &&
    /^\/api\/img\/[0-9a-f-]{36}$/i.test(sourceImage) &&
    product?.id
      ? `/img/products/${product.id}.jpg`
      : null;

  const { language } = useLanguage();

  React.useEffect(() => {
    setImgFailed(false);
    setActiveSwatch(0);
  }, [product?.id]);

  React.useEffect(() => {
    setImgFailed(false);
  }, [sourceImage]);

  // Calculate discount percentage
  const discountPercent = hasDiscount && originalPrice > 0 
    ? Math.round(((originalPrice - price) / originalPrice) * 100) 
    : 0;

  const showImage = sourceImage && !imgFailed;

  const displayName = language === 'bn' 
    ? (product.name_bn || product.name) 
    : (product.name_en || product.name);

  const openProduct = () => onClick?.(product);

  // Open the product page so the shopper confirms size/color before the form
  const orderNow = (e) => {
    e.stopPropagation();
    if (product.is_sold_out) return;
    onClick?.(product);
  };

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-neutral-100 group flex flex-col h-full"
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`${displayName} - ৳${price}`}
        onClick={openProduct}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openProduct();
          }
        }}
        className="relative aspect-[4/5] overflow-hidden bg-neutral-50 shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ce112d]/40"
      >
        {showImage ? (
          <div className="relative w-full h-full">
            <img
              src={getOptimizedUrl(sourceImage, mediaSizes.thumbnail)}
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-out"
              alt={displayName}
              loading="lazy"
              decoding="async"
              width={360}
              height={480}
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
              onError={(e) => {
                const el = e.currentTarget;
                if (staticFallback && !el.dataset.triedStatic) {
                  el.dataset.triedStatic = '1';
                  el.src = getOptimizedUrl(staticFallback, mediaSizes.thumbnail);
                  return;
                }
                if (el.src.includes('images.weserv.nl') && sourceImage && !el.dataset.triedDirect) {
                  el.dataset.triedDirect = '1';
                  el.src = sourceImage.startsWith('/') ? sourceImage : getOptimizedUrl(sourceImage);
                  return;
                }
                setImgFailed(true);
              }}
            />
          </div>
        ) : (
          <div className="w-full h-full bg-neutral-100 flex flex-col items-center justify-center gap-2 px-3">
            <Instagram size={22} className="text-zinc-300" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 text-center">
              {language === 'bn' ? 'ছবি নেই' : 'No photo'}
            </span>
          </div>
        )}
        
        {/* Corner Ribbon Sale Badge — above sold-out overlay so % OFF stays readable */}
        {hasDiscount && (
          <div className="absolute top-0 left-0 z-20">
            <div className="bg-[#ce112d] text-white text-[9px] md:text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-br-lg shadow-md">
              {discountPercent}% OFF
            </div>
          </div>
        )}
        
        {product.is_sold_out && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-white/35" />
            <span className="relative text-[10px] md:text-xs font-black uppercase tracking-wider text-neutral-800 bg-white/95 px-3.5 py-1.5 rounded-lg shadow-md border border-neutral-200">
              {language === 'bn' ? 'স্টক নেই' : 'Sold Out'}
            </span>
          </div>
        )}

        {swatches.length > 1 && (
          <div className="absolute bottom-1.5 left-1.5 right-1.5 z-20 flex flex-nowrap gap-1">
            {swatches.slice(0, 6).map((swatch, i) => (
              <button
                key={`${swatch.image}-${i}`}
                type="button"
                aria-label={swatch.name || `${displayName} ${i + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSwatch(i);
                }}
                className={`h-7 md:h-8 flex-1 min-w-0 max-w-[28px] md:max-w-[32px] rounded-md overflow-hidden border bg-white/90 ${
                  activeSwatch === i
                    ? 'border-[#ce112d] ring-1 ring-[#ce112d]'
                    : 'border-white/80'
                }`}
              >
                <img
                  src={getOptimizedUrl(swatch.image, { w: 96, h: 120, q: 70 })}
                  alt=""
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-3.5 md:p-5 flex flex-col flex-1 gap-2.5">
        <div
          role="button"
          tabIndex={0}
          onClick={openProduct}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openProduct();
            }
          }}
          className="space-y-1 cursor-pointer text-left focus:outline-none"
        >
          <p className="text-[10px] md:text-xs font-bold uppercase text-neutral-400 tracking-wider truncate">
            {product.category || 'Clothing'}
          </p>
          <h2 className="text-sm md:text-base font-bold text-neutral-900 line-clamp-2 leading-snug min-h-[40px]">
            {displayName}
          </h2>
        </div>

        <div className="mt-auto flex flex-col gap-2.5 pt-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0 overflow-hidden">
            <span className="text-sm sm:text-base md:text-lg font-black text-[#ce112d] whitespace-nowrap">৳{price}</span>
            {hasDiscount && (
              <span className="text-xs text-neutral-400 line-through font-semibold whitespace-nowrap">৳{originalPrice}</span>
            )}
          </div>
          <button
            type="button"
            onClick={orderNow}
            disabled={!!product.is_sold_out}
            className={`w-full py-2.5 rounded-xl text-[11px] md:text-xs font-bold transition-all ${
              language === 'en' ? 'uppercase tracking-wider' : 'tracking-wide'
            } ${
              product.is_sold_out
                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                : 'bg-[#ce112d] text-white hover:bg-[#b00e26] active:scale-[0.98]'
            }`}
          >
            {product.is_sold_out
              ? (language === 'bn' ? 'স্টক নেই' : 'Sold Out')
              : (language === 'bn' ? 'অর্ডার করুন' : 'Order Now')}
          </button>
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
      <div className="mt-6 space-y-2.5">
        <div className="h-6 w-20 bg-neutral-100 rounded-lg" />
        <div className="h-9 w-full bg-neutral-200 rounded-xl" />
      </div>
    </div>
  </div>
);

export default ProductCard;
