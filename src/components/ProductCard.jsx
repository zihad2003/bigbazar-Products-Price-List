import { motion, useScroll, useTransform } from 'framer-motion';
import { Play } from 'lucide-react';
import { calculatePrice } from '../utils/pricing';
import { useState, useEffect, useRef } from 'react';
import { resolveTikTokUrl, fetchTikTokData } from '../utils/tiktok';

const ProductCard = ({ product, index, flashSale, onClick, priority = false }) => {
  const { price, originalPrice, discountPercent, hasDiscount, isFlashSale } = calculatePrice(product, flashSale);
  const [thumbnail, setThumbnail] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const cardRef = useRef(null);

  // Antigravity Parallax Effect
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"]
  });

  // Calculate parallax based on index for variety
  const parallaxValue = (index % 3 + 1) * 30; // 30, 60, or 90px drift
  const y = useTransform(scrollYProgress, [0, 1], [parallaxValue, -parallaxValue]);

  useEffect(() => {
    if ((!product.image && !product.image_url && (!product.images || product.images.length === 0)) && product.video_url) {
      const loadThumbnail = async () => {
        try {
          const data = await fetchTikTokData(product.video_url);
          if (data && data.thumbnail) {
            setThumbnail(data.thumbnail);
            return;
          }
          let videoUrl = product.video_url;
          const resolved = await resolveTikTokUrl(videoUrl);
          if (resolved) videoUrl = resolved;
          const res = await fetch(`https://www.tiktok.com/oembed?url=${videoUrl}`);
          const oembedData = await res.json();
          if (oembedData.thumbnail_url) {
            setThumbnail(oembedData.thumbnail_url);
          }
        } catch (e) {
          console.warn("Could not fetch TikTok thumbnail", e);
        }
      };
      loadThumbnail();
    }
  }, [product]);

  const displayImage = product.image || product.image_url || (product.images && product.images[0]) || thumbnail;

  return (
    <motion.div
      ref={cardRef}
      layout
      style={{ y }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, (index % 2 === 0 ? -10 : 10), 0]
      }}
      transition={{
        y: {
          duration: 3 + (index % 3),
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        },
        opacity: { duration: 0.5 },
        scale: { duration: 0.5 }
      }}
      whileHover={{
        scale: 1.05,
        zIndex: 50,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick(product)}
      className="relative w-full aspect-[9/16] mb-4 break-inside-avoid cursor-pointer group overflow-hidden rounded-xl bg-neutral-900 border border-white/5 hover:border-[#ce112d]/50 transition-colors"
    >
      {/* Thumbnail Image */}
      {displayImage ? (
        <>
          <div className={`absolute inset-0 bg-neutral-800 transition-opacity duration-300 ${imageLoaded ? 'opacity-0' : 'opacity-100'}`} />
          <img
            src={displayImage}
            alt={product.title || product.name || 'Product'}
            className={`object-cover w-full h-full transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading={priority ? "eager" : "lazy"}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
          />
        </>
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-neutral-800">
          <span className="text-sm text-neutral-500">No Preview</span>
        </div>
      )}

      {/* Play Icon Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 text-white shadow-xl group-hover:scale-110 group-hover:bg-[#ce112d]/40 transition-all duration-300">
          <Play size={20} fill="currentColor" className="ml-1" />
        </div>
      </div>

      {/* Badges */}
      <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
        {hasDiscount && (
          <div className={`px-2 py-1 text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-lg ${isFlashSale ? 'bg-orange-500 animate-pulse' : 'bg-[#ce112d]'}`}>
            {isFlashSale && <span className="mr-1">⚡</span>}
            {discountPercent}% OFF
          </div>
        )}
        {(product.is_new || product.badge === 'New Arrival') && (
          <div className="px-2 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-lg">
            NEW
          </div>
        )}
      </div>

      {/* Info Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 pt-20 bg-gradient-to-t from-black via-black/95 to-transparent">
        <p className="text-white font-bold text-sm md:text-base truncate drop-shadow-md mb-1">
          {product.name || product.title}
        </p>
        <div className="flex items-baseline gap-2">
          <p className="text-white font-black text-lg md:text-xl tracking-tighter">
            <span className="text-xs font-bold align-top mr-0.5">৳</span>{price}
          </p>
          {hasDiscount && (
            <p className="text-neutral-500 text-[10px] line-through">
              ৳{originalPrice}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;