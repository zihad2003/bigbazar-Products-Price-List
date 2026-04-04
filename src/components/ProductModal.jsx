import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Truck, CreditCard, Box, Check, Play, Image as ImageIcon, Share2, Award, Zap, AlertCircle, ShoppingCart, ChevronLeft } from 'lucide-react';
import { generateShareMessage } from '../utils/messageTemplates';
import { calculatePrice } from '../utils/pricing';
import ProductModalMedia from './ProductModalMedia';
import AlertModal from './AlertModal';
import DeliveryModal from './DeliveryModal';
import { useCart } from '../CartContext';
import { useLanguage } from '../contexts/LanguageContext';

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
      const getValidOptions = (arr) => (arr || []).filter(item => {
        const name = typeof item === 'object' ? item.name : item;
        const isAvailable = typeof item === 'object' ? item.is_available !== false : true;
        return name && String(name).trim() !== '' && isAvailable;
      });

      const validColors = getValidOptions(product.available_colors);
      if (validColors.length === 1) setSelectedColor(typeof validColors[0] === 'object' ? validColors[0].name : validColors[0]);
      else setSelectedColor('');

      const validSizes = getValidOptions(product.available_sizes);
      if (validSizes.length === 1) setSelectedSize(typeof validSizes[0] === 'object' ? validSizes[0].name : validSizes[0]);
      else setSelectedSize('');

      setValidationError('');
      setCurrentImageIndex(0);
      setShowVideo(false);

      // Back button support: Push state when opening
      window.history.pushState({ modal: 'product' }, '');
    }
  }, [product, isOpen]);

  // Listen for back button to close
  useEffect(() => {
    const handlePopState = (e) => {
      if (isOpen) onClose();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const { price, originalPrice, hasDiscount } = calculatePrice(product, flashSale);
  const images = (product.images && Array.isArray(product.images) && product.images.length > 0)
    ? product.images
    : [product.image || product.image_url].filter(Boolean);

  const hasValidColors = product.available_colors?.some(c => {
    const name = typeof c === 'object' ? c.name : c;
    return name && String(name).trim() !== '';
  });
  const hasValidSizes = product.available_sizes?.some(s => {
    const name = typeof s === 'object' ? s.name : s;
    return name && String(name).trim() !== '';
  });

  const handleAddToCart = () => {
    if (product.is_sold_out) return;
    if (hasValidColors && !selectedColor) { setValidationError('color'); return; }
    if (hasValidSizes && !selectedSize) { setValidationError('size'); return; }
    addToCart({ ...product, price }, selectedColor, selectedSize);
    setShowCartSuccess(true);
    setTimeout(() => setShowCartSuccess(false), 2000);
    setValidationError('');
  };

  const handleMainOrder = () => {
    if (product.is_sold_out) return;
    if (hasValidColors && !selectedColor) { setValidationError('color'); return; }
    if (hasValidSizes && !selectedSize) { setValidationError('size'); return; }
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
        className="fixed inset-0 z-[1100] bg-white md:bg-black/60 md:backdrop-blur-xl flex items-center justify-center overflow-hidden"
      >
        <motion.div
          initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 200 }}
          className="relative w-full h-full md:h-auto md:max-h-[85vh] md:max-w-5xl bg-white md:rounded-[40px] overflow-y-auto no-scrollbar flex flex-col md:flex-row shadow-2xl"
        >
          {/* Mobile Sticky Header */}
          <div className="md:hidden sticky top-0 z-[1200] w-full bg-white/95 backdrop-blur-xl border-b border-neutral-100 flex items-center justify-between px-4 h-16 shrink-0">
             <button onClick={onClose} className="p-3 -ml-2 text-neutral-800 active:scale-95 transition-all">
                <ChevronLeft size={24} />
             </button>
             <h1 className="text-sm font-black uppercase tracking-widest truncate max-w-[200px]">{product.name}</h1>
             <div className="w-10"></div>
          </div>

          <button onClick={onClose} className="hidden md:flex absolute top-8 right-8 z-[1200] p-4 bg-black/5 rounded-full hover:bg-[#ce112d] hover:text-white transition-all shadow-sm">
             <X size={24} />
          </button>

          {/* Media Section */}
          <div className="w-full md:w-[48%] relative flex flex-col shrink-0 bg-neutral-50 overflow-hidden min-h-[40vh] md:min-h-0">
             <ProductModalMedia 
                images={images} 
                videoUrl={product.video_url} 
                showVideo={showVideo} 
                setShowVideo={setShowVideo} 
                currentIndex={currentImageIndex}
                setIndex={setCurrentImageIndex}
             />
             
             {/* Photo/Video Toggle */}
             {product.video_url && (
               <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center bg-white/90 backdrop-blur-md rounded-full p-1 shadow-2xl border border-neutral-200 z-[10]">
                 <button 
                  onClick={() => setShowVideo(false)}
                  className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${!showVideo ? 'bg-[#ce112d] text-white' : 'text-neutral-500'}`}
                 >
                   <ImageIcon size={14} />
                   <span className="hidden sm:inline">{language === 'bn' ? 'ছবি দেখুন' : 'See Photo'}</span>
                   <span className="sm:hidden">{language === 'bn' ? 'ছবি' : 'Photo'}</span>
                 </button>
                 <button 
                  onClick={() => setShowVideo(true)}
                  className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${showVideo ? 'bg-[#ce112d] text-white' : 'text-neutral-500'}`}
                 >
                   <Play size={14} />
                   <span className="hidden sm:inline">{language === 'bn' ? 'ভিডিও দেখুন' : 'See Video'}</span>
                   <span className="sm:hidden">{language === 'bn' ? 'ভিডিও' : 'Video'}</span>
                 </button>
               </div>
             )}

             <div className="absolute top-20 md:top-6 left-6 pointer-events-none flex flex-col gap-2 z-[20]">
                <span className="px-5 py-1.5 bg-[#ce112d] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-sm">
                  {language === 'bn' ? 'এক্সক্লুসিভ' : 'Selective'}
                </span>
             </div>
          </div>

          {/* Details Panel */}
          <div className="flex-1 p-6 md:p-12 lg:p-14 bg-white flex flex-col gap-8 md:gap-10">
            <div className="space-y-4">
               <h2 className="text-2xl md:text-5xl font-black text-neutral-900 italic leading-tight">{product.name}</h2>
               <div className="flex items-baseline gap-4">
                  <span className="text-3xl md:text-6xl font-black text-[#ce112d] italic">৳ {price}</span>
                  {hasDiscount && (
                    <span className="text-lg md:text-xl text-neutral-300 line-through font-bold">৳ {originalPrice}</span>
                  )}
               </div>
            </div>

            {/* Selection & Actions */}
            <div className="space-y-8">
               {hasValidSizes && (
                 <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                      {language === 'bn' ? 'সাইজ সিলেক্ট করুন' : 'Select Size'}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                       {product.available_sizes?.filter(s => {
                         const name = typeof s === 'object' ? s.name : s;
                         return name && String(name).trim() !== '';
                       }).map((s, i) => {
                         const name = typeof s === 'object' ? s.name : s;
                         return (
                           <button key={i} onClick={() => { setSelectedSize(name); setValidationError(''); }}
                             className={`py-3 border-[2px] text-[10px] md:text-xs font-black tracking-widest transition-all rounded-xl ${selectedSize === name ? 'bg-neutral-900 text-white border-neutral-900 shadow-xl' : 'border-neutral-100 text-neutral-500'}`}>
                             {name}
                           </button>
                         );
                       })}
                    </div>
                 </div>
               )}

               <div className="space-y-4 pt-4">
                 <AnimatePresence>
                   {validationError && (
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#ce112d] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                       <AlertCircle size={14} /> {language === 'bn' ? 'দয়া করে সাইজ বেছে নিন' : 'Please select size first'}
                     </motion.div>
                   )}
                 </AnimatePresence>
                 
                 {product.is_sold_out ? (
                   <div className="w-full py-5 bg-neutral-50 text-neutral-400 text-center rounded-2xl font-black uppercase tracking-widest text-xs">
                     {language === 'bn' ? 'স্টক নেই' : 'Currently Out of Stock'}
                   </div>
                 ) : (
                   <div className="flex flex-col gap-3">
                      <button onClick={handleMainOrder}
                        className="w-full py-5 bg-[#ce112d] text-white text-[11px] md:text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_15px_35px_rgba(206,17,45,0.15)] active:scale-95 transition-all">
                        {language === 'bn' ? 'অর্ডার করতে এখনই কিনুন' : 'Order Now'}
                      </button>
                      <button onClick={handleAddToCart}
                        className={`w-full py-5 border-2 text-[11px] md:text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${isInCart ? 'bg-neutral-100 border-neutral-100 text-[#ce112d]' : 'border-neutral-900 text-neutral-900'}`}>
                        {isInCart ? <Check size={18} /> : <ShoppingCart size={18} />}
                        {isInCart ? (language === 'bn' ? 'ব্যাগে আছে' : 'In Bag') : (language === 'bn' ? 'ব্যাগে যোগ করুন' : 'Add to Bag')}
                      </button>
                   </div>
                 )}
               </div>
            </div>

            {/* Description */}
            <div className="space-y-3 pt-6 border-t border-neutral-100">
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-300">Description</p>
               <p className="text-sm leading-relaxed text-neutral-500 font-medium whitespace-pre-wrap">{product.description}</p>
            </div>

            {/* Service Grid */}
            <div className="grid grid-cols-2 gap-6 pt-10 pb-32 md:pb-12">
                {[
                  { icon: Truck, label: language === 'bn' ? 'ডেলিভারি' : 'Delivery', desc: language === 'bn' ? 'দ্রুত হোম ডেলিভারি' : 'Fast Shipping' },
                  { icon: Award, label: language === 'bn' ? 'কোয়ালিটি' : 'Quality', desc: language === 'bn' ? 'সেরা ফেব্রিক গ্যারান্টি' : 'Guaranteed' },
                  { icon: CreditCard, label: language === 'bn' ? 'নিরাপদ' : 'Safe', desc: language === 'bn' ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery' },
                  { icon: Zap, label: language === 'bn' ? 'সাপোর্ট' : 'Support', desc: language === 'bn' ? 'মেসেঞ্জার সহায়তা' : '24/7 Care' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center text-[#ce112d] shadow-sm">
                      <item.icon size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-tight text-neutral-900 leading-tight">{item.label}</p>
                      <p className="text-[9px] text-neutral-400 font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </motion.div>
      </motion.div>

      <DeliveryModal isOpen={showDeliveryModal} onClose={() => setShowDeliveryModal(false)} product={{ ...product, price, selectedColor, selectedSize }} />
      <AlertModal isOpen={showAlert} onClose={() => setShowAlert(false)} type="success" title="Copied!" message="Link copied to clipboard!" />
      
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
