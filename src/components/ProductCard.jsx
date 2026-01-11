import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { calculatePrice } from '../utils/pricing';

const ProductCard = ({ product, flashSale, onClick }) => {
  const { price, originalPrice, discountPercent, hasDiscount, isFlashSale } = calculatePrice(product, flashSale);

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(product)}
      className="relative w-full aspect-[9/16] mb-4 break-inside-avoid cursor-pointer group overflow-hidden rounded-xl bg-neutral-900"
    >
      {/* Thumbnail Image */}
      {(product.image || product.image_url || (product.images && product.images[0])) ? (
        <img
          src={product.image || product.image_url || (product.images && product.images[0])}
          alt={product.title || product.name || 'Product'}
          className="object-cover w-full h-full opacity-90 group-hover:opacity-100 transition-opacity duration-300"
          loading="lazy"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-neutral-800">
          <span className="text-sm text-neutral-500">No Preview</span>
        </div>
      )}

      {/* Play Icon Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 text-white shadow-xl group-hover:scale-110 transition-transform duration-300">
          <Play size={20} fill="currentColor" className="ml-1" />
        </div>
      </div>

      {/* Discount Badge */}
      {hasDiscount && (
        <div className={`absolute top-2 left-2 px-2 py-1 text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-lg z-10 ${isFlashSale ? 'bg-orange-500 animate-pulse' : 'bg-[#ce112d]'}`}>
          {isFlashSale && <span className="mr-1">⚡</span>}
          {discountPercent}% OFF
        </div>
      )}

      {/* Info Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 pt-20 bg-gradient-to-t from-black via-black/90 to-transparent">
        <p className="text-white font-bold text-base truncate drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mb-1">
          {product.name || product.title}
        </p>
        <div className="flex items-baseline gap-2">
          <p className="text-white font-black text-lg drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-tight">
            <span className="text-xs font-bold align-top mr-0.5">৳</span>{price}
          </p>
          {hasDiscount && (
            <p className="text-neutral-400 text-[10px] line-through decoration-white/50 opacity-80">
              ৳{originalPrice}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;