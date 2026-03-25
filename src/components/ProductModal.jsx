import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Truck, ShieldCheck, CreditCard, Box, Check, Play, Image as ImageIcon, Ruler, Share2, Award, Zap, Heart, AlertCircle, ShoppingCart } from 'lucide-react';
import { generateOrderMessage, generateShareMessage } from '../utils/messageTemplates';
import { calculatePrice } from '../utils/pricing';
import { supabase } from '../supabaseClient';
import VideoPlayer from './VideoPlayer';
import AlertModal from './AlertModal';
import DeliveryModal from './DeliveryModal';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import { useCart } from '../CartContext';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * COMPACT PREMIUM PRODUCT MODAL
 * - Optimized space usage (Area reduction)
 * - Horizontal scrolling for colors
 * - Condensed service grid
 * - Tighter spacing for high-conversion flow
 * - SOLD OUT Logic restored
 */
const ProductModal = ({ product, flashSale, isOpen, onClose }) => {
  const { t, language } = useLanguage();
  const { cartItems, addToCart } = useCart();
  const [showCartSuccess, setShowCartSuccess] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showVideo, setShowVideo] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      const validColors = product.available_colors?.filter(c => typeof c === 'object' ? (c.is_available !== false) : true) || [];
      if (validColors.length === 1) setSelectedColor(typeof validColors[0] === 'object' ? validColors[0].name : validColors[0]);
      else setSelectedColor('');
      const validSizes = product.available_sizes?.filter(s => typeof s === 'object' ? (s.is_available !== false) : true) || [];
      if (validSizes.length === 1) setSelectedSize(typeof validSizes[0] === 'object' ? validSizes[0].name : validSizes[0]);
      else setSelectedSize('');
      setValidationError('');
      setCurrentImageIndex(0);
      setShowVideo(false);
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const { price, originalPrice, hasDiscount, discountPercent } = calculatePrice(product, flashSale);
  const images = (product.images && Array.isArray(product.images) && product.images.length > 0)
    ? product.images
    : [product.image || product.image_url].filter(Boolean);

  const handleAddToCart = () => {
    if (product.is_sold_out) return;
    if (product.available_colors?.length > 0 && !selectedColor) { setValidationError('color'); return; }
    if (product.available_sizes?.length > 0 && !selectedSize) { setValidationError('size'); return; }
    addToCart({ ...product, price }, selectedColor, selectedSize);
    setShowCartSuccess(true);
    setTimeout(() => setShowCartSuccess(false), 2000);
    setValidationError('');
  };

  const handleMainOrder = () => {
    if (product.is_sold_out) return;
    if (product.available_colors?.length > 0 && !selectedColor) { setValidationError('color'); return; }
    if (product.available_sizes?.length > 0 && !selectedSize) { setValidationError('size'); return; }
    setValidationError('');
    setShowDeliveryModal(true);
  };

  const isInCart = cartItems.some(item =>
    item.id === product.id &&
    (item.selectedColor === selectedColor || (!item.selectedColor && !selectedColor)) &&
    (item.selectedSize === selectedSize || (!item.selectedSize && !selectedSize))
  );

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-3xl flex items-center justify-center p-0 md:p-6 lg:p-12"
      >
        <motion.div
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 35, stiffness: 250 }}
          className="relative w-full h-[100dvh] md:h-auto md:max-h-[85vh] max-w-6xl bg-white rounded-t-[40px] md:rounded-[40px] overflow-y-auto no-scrollbar flex flex-col md:flex-row shadow-2xl border-[0.5px] border-white/5"
        >
          {/* Close Handle Mobile */}
          <div className="md:hidden sticky top-0 z-[1200] w-full bg-white/95 backdrop-blur-xl border-b border-black/5 flex justify-center py-4 px-6 items-center shrink-0">
             <div className="w-12 h-1.5 rounded-full bg-zinc-200" />
             <button onClick={onClose} className="absolute right-4 p-2.5 bg-zinc-100 rounded-full text-zinc-600 active:scale-90 transition-transform">
                <X size={20} />
             </button>
          </div>

          <button onClick={onClose} className="hidden md:flex absolute top-8 right-8 z-[1200] p-4 bg-black/5 rounded-full hover:bg-[#c8102e] hover:text-white transition-all shadow-sm">
             <X size={24} />
          </button>

          {/* Media Section (Reduced on Tablet/Desktop) */}
          <div className="w-full md:w-[45%] bg-[#fcfcf9] relative overflow-hidden flex flex-col shrink-0">
            <div className="relative flex-1 aspect-[4/5] md:aspect-auto overflow-hidden">
               {showVideo && product.video_url ? (
                 <VideoPlayer src={product.video_url} poster={images[0]} isActive={true} priority={true} />
               ) : (
                 <motion.img
                   key={currentImageIndex}
                   src={getOptimizedUrl(images[currentImageIndex], mediaSizes.gallery)}
                   className="w-full h-full object-cover object-top"
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
                 />
               )}
               
               <div className="absolute top-6 left-6 pointer-events-none flex flex-col gap-2">
                 <span className="px-5 py-1.5 bg-[#ce112d] text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl rounded-sm">
                   {language === 'bn' ? 'এক্সক্লুসিভ' : 'Selective'}
                 </span>
                 {product.is_sold_out && (
                   <span className="px-5 py-1.5 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl rounded-sm">
                     {language === 'bn' ? 'স্টক নেই' : 'Sold Out'}
                   </span>
                 )}
               </div>

               {product.video_url && (
                 <button onClick={() => setShowVideo(!showVideo)} className="absolute bottom-6 left-6 p-4 bg-white/90 backdrop-blur-md border-[0.5px] border-black/10 rounded-full hover:bg-[#c8102e] hover:text-white transition-all shadow-xl active:scale-90">
                   {showVideo ? <ImageIcon size={20} /> : <Play size={20} />}
                 </button>
               )}
            </div>

            {/* Thumbnails (Compact) */}
            {images.length > 1 && (
              <div className="p-3 flex gap-2 overflow-x-auto no-scrollbar border-t-[0.5px] border-black/5 bg-white">
                {images.map((img, i) => (
                  <button key={i} onClick={() => { setCurrentImageIndex(i); setShowVideo(false); }}
                    className={`w-12 h-16 shrink-0 border-2 transition-all rounded-lg overflow-hidden ${i === currentImageIndex ? 'border-[#c8102e]' : 'border-transparent opacity-60'}`}>
                    <img src={getOptimizedUrl(img, { w: 100, h: 140 })} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Panel (COMPACTED) */}
          <div className="flex-1 p-6 md:p-10 lg:p-12 bg-white text-black flex flex-col gap-8 md:gap-10">
            {/* Header */}
            <div className="space-y-3">
               <div className="flex items-center gap-2">
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                   {language === 'bn' ? 'সিলেক্টিভ' : 'Selective'}
                 </p>
                 <div className="h-[0.5px] flex-1 bg-black/5"></div>
               </div>
               <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-zinc-950 leading-tight tracking-tight italic">
                 {product.name}
               </h1>
            </div>

            {/* Price & Action (Condensed) */}
            <div className="space-y-6">
                <div className="flex items-baseline gap-3">
                   <span className="text-4xl md:text-5xl lg:text-6xl font-black text-[#c8102e] tracking-tighter italic">৳{price}</span>
                   {hasDiscount && (
                     <span className="text-xl text-zinc-300 line-through font-bold opacity-60">৳{originalPrice}</span>
                   )}
                </div>

                <div className="space-y-3">
                   <AnimatePresence>
                     {validationError && (
                       <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                         className="flex items-center gap-2 p-3 bg-[#c8102e]/5 border border-[#c8102e]/10 rounded-xl text-[#c8102e] text-[10px] font-black uppercase tracking-widest"
                       >
                         <AlertCircle size={14} />
                         {validationError === 'color' 
                           ? (language === 'bn' ? 'দয়া করে কালার বেছে নিন' : 'Pick your color first')
                           : (language === 'bn' ? 'দয়া করে সাইজ বেছে নিন' : 'Select your size first')}
                       </motion.div>
                     )}
                   </AnimatePresence>

                   {product.is_sold_out ? (
                     <div className="w-full py-5 bg-zinc-50 border border-zinc-100 text-zinc-400 text-center rounded-2xl shadow-inner">
                        <p className="text-[13px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                          <Box size={16} /> {language === 'bn' ? 'পণ্যটি বর্তমানে স্টকে নেই' : 'Currently Out of Stock'}
                        </p>
                     </div>
                   ) : (
                     <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={handleMainOrder}
                          className="flex-[1.5] py-4 bg-[#c8102e] text-white text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:brightness-110 active:scale-[0.98] shadow-2xl shadow-red-500/10 rounded-xl">
                          {language === 'bn' ? 'অর্ডার করতে এখনই কিনুন' : 'Order Now'}
                        </button>
                        <button onClick={handleAddToCart}
                          className={`flex-1 flex items-center justify-center gap-2 py-4 border-[1.5px] text-[11px] font-black uppercase tracking-[0.1em] transition-all active:scale-[0.98] rounded-xl ${isInCart || showCartSuccess ? 'bg-zinc-100 border-zinc-100 text-[#c8102e]' : 'border-zinc-950 text-zinc-950 hover:bg-zinc-950 hover:text-white'}`}>
                          {isInCart || showCartSuccess ? <Check size={18} /> : <ShoppingCart size={18} />}
                          {isInCart || showCartSuccess ? (language === 'bn' ? 'ব্যাগে আছে' : 'In Bag') : (language === 'bn' ? 'ব্যাগে যোগ করুন' : 'Add to Bag')}
                        </button>
                     </div>
                   )}
                </div>
            </div>

            {/* Selection (Optimized for space) */}
            <div className="space-y-8">
               {/* Color Selector (Horizontal Scroll) */}
               {product.available_colors?.length > 0 && (
                 <div className={`space-y-3 p-3 rounded-2xl transition-all ${validationError === 'color' ? 'bg-[#c8102e]/5' : ''}`}>
                    <div className="flex items-center justify-between px-1">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${validationError === 'color' ? 'text-[#c8102e]' : 'text-zinc-400'}`}>
                        {language === 'bn' ? '১. কালার পছন্দ করুন' : '1. Choose Color'}
                      </p>
                      {selectedColor && <span className="text-[9px] font-black text-[#c8102e] uppercase italic">{selectedColor}</span>}
                    </div>
                    
                    <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 px-1">
                      {product.available_colors.map((c, i) => {
                        const color = typeof c === 'object' ? c : { name: c, is_available: true };
                        const isSelected = selectedColor === color.name;
                        return (
                          <button key={i} onClick={() => { setSelectedColor(color.name); setValidationError(''); }}
                            className={`flex flex-col items-center gap-1.5 shrink-0 group transition-all`}>
                            <div className={`w-12 h-12 rounded-2xl border-2 transition-all p-0.5 ${isSelected ? 'border-[#c8102e]' : 'border-zinc-100 hover:border-zinc-300'}`}>
                               <div className="w-full h-full rounded-[14px] overflow-hidden bg-zinc-50 relative" style={{ backgroundColor: color.hex || 'transparent' }}>
                                   {color.image ? (
                                     <img src={getOptimizedUrl(color.image, { w: 100, h: 100 })} className="w-full h-full object-cover" />
                                   ) : !color.hex ? (
                                     <div className="w-full h-full flex items-center justify-center text-[9px] font-black text-zinc-300">{color.name[0]}</div>
                                   ) : null}
                                   {isSelected && <div className="absolute inset-0 bg-[#c8102e]/10 flex items-center justify-center text-white"><Check size={20} strokeWidth={4} /></div>}
                               </div>
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-tight truncate max-w-[48px] ${isSelected ? 'text-[#c8102e]' : 'text-zinc-400'}`}>{color.name}</span>
                          </button>
                        );
                      })}
                    </div>
                 </div>
               )}

               {/* Size Selector (Condensed Grid) */}
               {product.available_sizes?.length > 0 && (
                 <div className={`space-y-3 p-3 rounded-2xl transition-all ${validationError === 'size' ? 'bg-[#c8102e]/5' : ''}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${validationError === 'size' ? 'text-[#c8102e]' : 'text-zinc-400'}`}>
                      {language === 'bn' ? '২. সাইজ সিলেক্ট করুন' : '2. Select Size'}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {product.available_sizes.map((s, i) => {
                        const name = typeof s === 'object' ? s.name : s;
                        const isSelected = selectedSize === name;
                        return (
                          <button key={i} onClick={() => { setSelectedSize(name); setValidationError(''); }}
                            className={`py-2.5 border-[1.5px] text-[10px] font-black tracking-widest transition-all rounded-xl ${isSelected ? 'bg-zinc-950 text-white border-zinc-950' : 'border-zinc-100 text-zinc-500'}`}>
                            {name}
                          </button>
                        );
                      })}
                    </div>
                 </div>
               )}
            </div>

            {/* Description (Condensed) */}
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Description</p>
              <p className="text-[13px] leading-relaxed text-zinc-600 font-medium line-clamp-4 text-justify">
                {product.description}
              </p>
            </div>

            {/* Service Summary (Ultra Compact) */}
            <div className="grid grid-cols-2 gap-4 py-6 border-t-[0.5px] border-black/5">
                {[
                  { icon: Truck, label: language === 'bn' ? 'ডেলিভারি' : 'Delivery', desc: language === 'bn' ? 'দ্রুত হোম ডেলিভারি' : 'Fast Shipping' },
                  { icon: Award, label: language === 'bn' ? 'কোয়ালিটি' : 'Quality', desc: language === 'bn' ? 'সেরা ফেব্রিক গ্যারান্টি' : 'Guaranteed' },
                  { icon: CreditCard, label: language === 'bn' ? 'নিরাপদ' : 'Safe', desc: language === 'bn' ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery' },
                  { icon: Zap, label: language === 'bn' ? 'সাপোর্ট' : 'Support', desc: language === 'bn' ? 'মেসেঞ্জার সহায়তা' : '24/7 Care' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <div className="p-2 border border-black/5 rounded-xl bg-[#fcfcf9] text-[#c8102e]">
                      <item.icon size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-tight text-zinc-950 leading-tight">{item.label}</p>
                      <p className="text-[8px] text-zinc-400 font-medium leading-tight">{item.desc}</p>
                    </div>
                  </div>
                ))}
            </div>
            
            <button 
              onClick={() => { navigator.clipboard.writeText(generateShareMessage({ ...product, price })); setShowAlert(true); }}
              className="mb-20 text-[8px] font-black text-zinc-300 uppercase tracking-[0.4em] text-center hover:text-[#c8102e] flex items-center justify-center gap-2"
            >
              <Share2 size={12} /> Share Product
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Popups (Remaining fully functional) */}
      <AlertModal isOpen={showAlert} onClose={() => setShowAlert(false)} type="success" title="Link Copied!" message="Product link copied to clipboard. Share it with friends!" />
      <DeliveryModal isOpen={showDeliveryModal} onClose={() => setShowDeliveryModal(false)} product={{ ...product, price, selectedColor, selectedSize }} />
      
      <AnimatePresence>
        {showCartSuccess && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[2000] bg-zinc-950 text-white px-8 py-4 rounded-[30px] flex items-center gap-4 shadow-2xl"
          >
            <Check size={18} strokeWidth={3} className="text-green-400" />
            <span className="text-[11px] font-black uppercase tracking-widest">{language === 'bn' ? 'ব্যাগে যোগ করা হয়েছে' : 'Added to bag!'}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

export default ProductModal;
