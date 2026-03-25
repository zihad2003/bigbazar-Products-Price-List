import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, ShoppingBag, Truck, ShieldCheck, Clock, Share2, Check, Play, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { generateWhatsAppLink, generateMessengerLink, generateOrderMessage, generateShareMessage } from '../utils/messageTemplates';
import { calculatePrice } from '../utils/pricing';
import { supabase } from '../supabaseClient';
import VideoPlayer from './VideoPlayer';
import AlertModal from './AlertModal';
import DeliveryModal from './DeliveryModal';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import { useCart } from '../CartContext';
import { useLanguage } from '../contexts/LanguageContext';

const ProductModal = ({ product, flashSale, isOpen, onClose }) => {
  const { t, language } = useLanguage();
  const { cartItems, addToCart } = useCart();
  const [showCartSuccess, setShowCartSuccess] = useState(false);
  const [contactInfo, setContactInfo] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMessengerPopup, setShowMessengerPopup] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showVideo, setShowVideo] = useState(false);

  // Reset state when modal opens or product changes
  useEffect(() => {
    if (isOpen && product) {
      // Auto-select if only one color exists
      if (product.available_colors?.length === 1) {
        const singleColor = product.available_colors[0];
        const colorName = typeof singleColor === 'object' ? singleColor.name : singleColor;
        const isAvailable = typeof singleColor === 'object' ? (singleColor.is_available ?? true) : true;
        if (isAvailable) setSelectedColor(colorName);
      } else {
        setSelectedColor('');
      }

      // Auto-select if only one size exists
      if (product.available_sizes?.length === 1) {
        const singleSize = product.available_sizes[0];
        const sizeName = typeof singleSize === 'object' ? singleSize.name : singleSize;
        const isAvailable = typeof singleSize === 'object' ? (singleSize.is_available ?? true) : true;
        if (isAvailable) setSelectedSize(sizeName);
      } else {
        setSelectedSize('');
      }

      setValidationError('');
      setCurrentImageIndex(0);
      setShowVideo(!!product?.video_url);

      // Force scroll to top of modal and details
      setTimeout(() => {
        const modal = document.getElementById('product-modal-scroll');
        if (modal) modal.scrollTop = 0;
        const details = document.getElementById('product-details-section');
        if (details) details.scrollTop = 0;
      }, 0);
    }
  }, [product, isOpen]);

  // Effect to handle size availability based on selected color
  useEffect(() => {
    if (!product || !selectedColor || !product.available_sizes) return;

    const colorObj = product.available_colors?.find(c => (typeof c === 'object' ? c.name : c) === selectedColor);

    // If this color has specific sizes assigned, ensure current size is valid
    if (colorObj && typeof colorObj === 'object' && colorObj.sizes?.length > 0) {
      const isSizeValid = colorObj.sizes.some(sz => (typeof sz === 'object' ? sz.name : sz) === selectedSize);
      if (!isSizeValid) {
        // If current size is invalid for this color, clear it so user can pick
        setSelectedSize('');
      }
    }
  }, [selectedColor, product]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    supabase.from('site_settings').select('value').eq('key', 'contact_info').single()
      .then(({ data }) => data?.value && setContactInfo(data.value));
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const { price, originalPrice, hasDiscount, isFlashSale } = calculatePrice(product, flashSale);
  const images = (product.images && Array.isArray(product.images) && product.images.length > 0)
    ? product.images
    : [product.image || product.image_url].filter(Boolean);

  const validateSelection = () => {
    const hasAvailableSizes = product.available_sizes?.some(s => typeof s === 'object' ? (s.is_available ?? true) : true);
    const hasAvailableColors = product.available_colors?.some(c => typeof c === 'object' ? (c.is_available ?? true) : true);
    if (hasAvailableSizes && !selectedSize) {
      setValidationError('size');
      document.getElementById('variant-selectors')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    if (hasAvailableColors && !selectedColor) {
      setValidationError('color');
      document.getElementById('variant-selectors')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  };

  const handleMainOrder = () => {
    if (product.is_sold_out) return;
    if (validateSelection()) {
      setShowDeliveryModal(true);
    }
  };

  const handleAddToCart = () => {
    if (product.is_sold_out) return;
    if (validateSelection()) {
      // Pass the calculated effective price (handles flash sales/discounts)
      addToCart({ ...product, price: price }, selectedColor, selectedSize);
      setShowCartSuccess(true);
      // We keep it true for a bit for the animation, 
      // but isInCart will keep it green thereafter
      setTimeout(() => setShowCartSuccess(false), 2000);
    }
  };

  const isInCart = cartItems.some(item =>
    item.id === product.id &&
    (item.selectedColor === selectedColor || (!item.selectedColor && !selectedColor)) &&
    (item.selectedSize === selectedSize || (!item.selectedSize && !selectedSize))
  );

  const handleMessengerOrder = () => {
    const message = generateOrderMessage({ ...product, price });
    navigator.clipboard.writeText(message).then(() => {
      setShowMessengerPopup(true);
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setShowMessengerPopup(false);
            window.open(generateMessengerLink(contactInfo?.facebook || "100063541603515"), '_blank');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1100] backdrop-blur-2xl flex items-center justify-center p-0 md:p-6"
        style={{ backgroundColor: 'var(--bg-overlay)' }}
      >
        <motion.div
          id="product-modal-scroll"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 250 }}
          className="relative w-full h-[92vh] md:max-w-6xl md:h-[90vh] rounded-t-[32px] md:rounded-[40px] flex flex-col md:flex-row overflow-y-auto overflow-x-hidden md:overflow-hidden border-t md:border"
          style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', boxShadow: '0 -10px 100px rgba(0,0,0,0.3)' }}
        >
          {/* Mobile Handle */}
          <div className="w-full flex justify-center pt-4 pb-2 md:hidden shrink-0 sticky top-0 z-50 bg-inherit" style={{ backgroundColor: 'var(--modal-bg)' }}>
            <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: 'var(--border-hover)' }} />
          </div>

          {/* Close Trigger */}
          <button onClick={onClose} className="absolute sm:fixed md:absolute top-4 right-4 md:top-6 md:right-6 z-[1100] p-2.5 md:p-3 rounded-full bg-black/50 text-white backdrop-blur-xl hover:scale-110 transition-transform">
            <X size={20} className="md:w-6 md:h-6" />
          </button>

          {/* Media Section (Left) */}
          <div className={`w-full md:w-[50%] bg-black relative group shrink-0 self-start md:self-auto ${showVideo ? 'h-[65vh] md:h-full' : 'h-auto md:h-full'}`}>
            {showVideo ? (
              <div className="w-full h-full relative">
                <VideoPlayer src={product.video_url} poster={images[0]} isActive={true} priority={true} />
                {images.length > 0 && (
                  <button onClick={() => setShowVideo(false)} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[110] bg-black/60 backdrop-blur-md text-white px-5 py-2.5 rounded-full font-black uppercase text-[10px] tracking-widest flex items-center gap-2 border border-white/10 hover:bg-[#ce112d] transition-all shadow-xl hover:scale-105">
                    <ImageIcon size={14} /> {language === 'bn' ? 'ফটো দেখুন' : 'View Photos'}
                  </button>
                )}
              </div>
            ) : (
              <div className="relative w-full h-auto md:h-full overflow-hidden">
                <motion.img
                  key={currentImageIndex}
                  src={getOptimizedUrl(images[currentImageIndex], mediaSizes.gallery)}
                  className="w-full h-auto min-h-[50vh] max-h-[70vh] md:max-h-full md:h-full object-cover object-top"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                />

                {product.video_url && (
                  <button onClick={() => setShowVideo(true)} className="absolute top-4 left-4 md:top-6 md:left-6 z-[110] bg-[#ce112d]/90 backdrop-blur-md text-white px-4 py-2 md:px-5 md:py-2.5 rounded-full font-black uppercase text-[9px] md:text-[10px] tracking-widest flex items-center gap-2 border border-[#ce112d] hover:bg-black transition-all shadow-lg hover:scale-105">
                    <Play size={14} className="md:w-3 md:h-3" /> {language === 'bn' ? 'ভিডিও দেখুন' : 'Watch Video'}
                  </button>
                )}

                {images.length > 1 && (
                  <>
                    <div className="absolute inset-y-0 left-0 w-12 z-10 md:hidden" onClick={() => setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))} />
                    <div className="absolute inset-y-0 right-0 w-12 z-10 md:hidden" onClick={() => setCurrentImageIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))} />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentImageIndex(i)}
                          className={`h-1 rounded-full transition-all ${i === currentImageIndex ? 'bg-[#ce112d] w-4' : 'bg-white/40 w-1'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Details Section (Right) */}
          <div id="product-details-section" className="flex-1 min-w-0 md:h-full flex flex-col relative overflow-hidden">
            {/* Scrollable Area */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-12 pb-40 flex flex-col gap-8 md:gap-10">
              {/* Product Header */}
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#ce112d] font-black uppercase tracking-[0.3em] text-[10px]">
                    <span>BIGBAZAR Exclusive</span>
                    <div className="h-px flex-1 bg-[#ce112d]/10"></div>
                  </div>
                  <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter theme-text leading-none">
                    {product.name || 'Product Details'}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl md:text-7xl font-black text-[#ce112d] tracking-tighter">৳{price}</span>
                    {hasDiscount && (
                      <span className="text-lg md:text-2xl text-zinc-500 line-through font-bold opacity-40">৳{originalPrice}</span>
                    )}
                  </div>
                  <div className="h-10 w-px bg-zinc-500/10 hidden md:block"></div>
                  <div className="flex flex-wrap gap-2">
                    {product.category && (
                      <span className="px-5 py-2 rounded-full text-[10px] font-black uppercase bg-zinc-500/5 text-zinc-500 border border-zinc-500/10">
                        {product.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="py-8 border-y space-y-4" style={{ borderColor: 'var(--border-color)' }}>
                <p className="text-lg md:text-xl leading-relaxed font-medium theme-text-secondary">
                  {product.description}
                </p>
                {!product.is_sold_out && product.stock_count !== null && (
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase border ${
                    product.stock_count <= 5 ? 'bg-orange-500/10 text-orange-500 border-orange-500/20 animate-pulse' : 'bg-green-500/10 text-green-500 border-green-500/20'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${product.stock_count <= 5 ? 'bg-orange-500' : 'bg-green-500'}`} />
                    {product.stock_count} {language === 'bn' ? 'টি বাকি আছে' : 'Items left in stock'}
                  </div>
                )}
              </div>

              {/* Variants */}
              <div id="variant-selectors" className="space-y-10">
                {product.available_colors?.length > 0 && (
                  <div className="space-y-5">
                    <div className="flex justify-between items-end">
                      <label className="text-[11px] font-black uppercase tracking-widest opacity-40">Pick Color</label>
                      {selectedColor && <span className="text-[10px] font-black uppercase text-[#ce112d]">Selected: {selectedColor}</span>}
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {product.available_colors.map((rawColor, idx) => {
                        const color = typeof rawColor === 'object' ? rawColor : { name: rawColor, is_available: true };
                        const isAvailable = (color.is_available ?? true);
                        const isSelected = selectedColor === color.name;
                        return (
                          <button key={idx} onClick={() => isAvailable && setSelectedColor(color.name)} disabled={!isAvailable}
                            className={`group relative flex flex-col items-center gap-2 transition-all ${!isAvailable ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105'}`}>
                            <div className={`w-16 h-16 rounded-full border-4 transition-all ${isSelected ? 'border-[#ce112d] shadow-lg shadow-red-500/20' : 'border-zinc-500/10'} overflow-hidden`}>
                              {color.image ? <img src={getOptimizedUrl(color.image, { w: 100, h: 100 })} className="w-full h-full object-cover" alt="" /> : 
                              color.hex ? <div className="w-full h-full" style={{ backgroundColor: color.hex }} /> : 
                              <div className="w-full h-full flex items-center justify-center text-xs font-black bg-zinc-500/5">{color.name[0]}</div>}
                              {isSelected && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Check className="text-white" size={20} /></div>}
                            </div>
                            <span className={`text-[9px] font-black uppercase ${isSelected ? 'text-[#ce112d]' : 'text-zinc-500'}`}>{color.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    {validationError === 'color' && <p className="text-[10px] font-black text-[#ce112d] uppercase">Please select a color</p>}
                  </div>
                )}

                {product.available_sizes?.length > 0 && (
                  <div className="space-y-5">
                    <div className="flex justify-between items-end">
                      <label className="text-[11px] font-black uppercase tracking-widest opacity-40">Select Size</label>
                      {selectedSize && <span className="text-[10px] font-black uppercase text-[#ce112d]">Size: {selectedSize}</span>}
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {product.available_sizes.map((size, idx) => {
                        const name = typeof size === 'object' ? size.name : size;
                        const isAvailable = typeof size === 'object' ? (size.is_available ?? true) : true;
                        const isSelected = selectedSize === name;
                        return (
                          <button key={idx} onClick={() => isAvailable && setSelectedSize(name)} disabled={!isAvailable}
                            className={`py-4 rounded-2xl text-xs font-black uppercase transition-all border-2 ${!isAvailable ? 'opacity-30 border-transparent bg-zinc-500/5 cursor-not-allowed' : 
                            isSelected ? 'bg-[#ce112d] border-[#ce112d] text-white shadow-xl scale-105' : 'border-zinc-500/10 text-zinc-500 hover:border-[#ce112d]/30'}`}>
                            {name}
                          </button>
                        );
                      })}
                    </div>
                    {validationError === 'size' && <p className="text-[10px] font-black text-[#ce112d] uppercase">Please select a size</p>}
                  </div>
                )}
              </div>

              {/* Service Features */}
              <div className="grid grid-cols-3 gap-8 py-10 border-t mt-auto" style={{ borderColor: 'var(--border-color)' }}>
                {[
                  { icon: Truck, label: language === 'bn' ? 'ফাস্ট ডেলিভারি' : 'Fast Delivery' },
                  { icon: ShieldCheck, label: language === 'bn' ? 'নিরাপদ পেমেন্ট' : 'Safe Checkout' },
                  { icon: Clock, label: language === 'bn' ? '২৪/৭ সাপোর্ট' : '24/7 Support' }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center gap-3 text-center">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[#ce112d]" style={{ backgroundColor: 'var(--bg-badge)' }}>
                      <item.icon size={22} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-50">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sticky Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 bg-gradient-to-t from-[var(--modal-bg)] via-[var(--modal-bg)] to-transparent pt-12 z-20">
              <div className="space-y-4 max-w-2xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {product.is_sold_out ? (
                    <button disabled className="col-span-2 py-6 rounded-[24px] bg-zinc-900 text-zinc-600 font-black uppercase text-sm cursor-not-allowed">{t('sold_out')}</button>
                  ) : (
                    <>
                      <button onClick={handleAddToCart}
                        className={`flex items-center justify-center gap-3 py-6 rounded-[24px] font-black uppercase text-sm transition-all active:scale-95 border-2 ${showCartSuccess || isInCart ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'border-[#ce112d] text-[#ce112d] hover:bg-[#ce112d] hover:text-white'}`}>
                        {showCartSuccess || isInCart ? <><Check size={20} /> {language === 'bn' ? 'ব্যাগ-এ আছে' : 'In Your Bag'}</> : <><ShoppingBag size={20} /> {t('add_to_bag')}</>}
                      </button>
                      <button onClick={handleMainOrder}
                        className="flex items-center justify-center gap-3 py-6 rounded-[24px] bg-[#ce112d] text-white font-black uppercase text-sm transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-red-500/30">
                        {t('order_now')}
                      </button>
                    </>
                  )}
                </div>
                <button onClick={() => { const shareText = generateShareMessage({ ...product, price }); navigator.clipboard.writeText(shareText); setShowAlert(true); }}
                  className="w-full flex items-center justify-center gap-2 py-5 rounded-[24px] border border-zinc-500/10 text-zinc-500 font-black uppercase text-[10px] hover:bg-zinc-500/5 transition-colors">
                  <Share2 size={16} /> {language === 'bn' ? 'শেয়ার করুন' : 'Share Product'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Floating Feedback Overlay */}
        <AnimatePresence>
          {showCartSuccess && (
            <motion.div initial={{ opacity: 0, y: -50, scale: 0.9 }} animate={{ opacity: 1, y: 30, scale: 1 }} exit={{ opacity: 0, y: -50, scale: 0.9 }}
              className="fixed top-0 left-1/2 -translate-x-1/2 z-[2000] pointer-events-none">
              <div className="bg-green-600 text-white px-8 py-4 rounded-full shadow-[0_20px_60px_rgba(22,163,74,0.4)] flex items-center gap-3 border border-white/20">
                <CheckCircle2 size={24} className="animate-pulse" />
                <div className="text-left">
                  <p className="font-black uppercase tracking-widest text-xs">{language === 'bn' ? 'ব্যাগ-এ যোগ করা হয়েছে!' : 'Added to Bag!'}</p>
                  <p className="text-[10px] font-bold opacity-80">{product.name}</p>
                </div>
              </div>
            </motion.div>
          )}

          {showMessengerPopup && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 backdrop-blur-sm">
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-[#0084FF] rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(0,132,255,0.4)] animate-bounce">
                  <ShoppingBag size={48} className="text-white" />
                </div>
                <h2 className="text-3xl font-black italic uppercase">{language === 'bn' ? 'তথ্য কপি হয়েছে!' : 'Order Info Copied!'}</h2>
                <p className="text-neutral-500 font-bold uppercase tracking-widest">{language === 'bn' ? `${countdown} সেকেন্ডের মধ্যে মেসেঞ্জারে নিয়ে যাওয়া হচ্ছে...` : `Redirecting to Messenger in ${countdown}s...`}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DeliveryModal isOpen={showDeliveryModal} onClose={() => setShowDeliveryModal(false)}
          product={{ ...product, price, original_price: originalPrice }} contactInfo={contactInfo}
          onMessengerOrder={handleMessengerOrder} selectedSize={selectedSize} selectedColor={selectedColor} />

        <AlertModal isOpen={showAlert} onClose={() => setShowAlert(false)}
          title={language === 'bn' ? 'সফল হয়েছে!' : 'Success!'}
          message={language === 'bn' ? 'প্রোডাক্টের লিঙ্ক কপি হয়েছে!' : 'Product details copied to clipboard!'}
          type="success" />
      </motion.div>
    </AnimatePresence>
  );
};

export default ProductModal;
