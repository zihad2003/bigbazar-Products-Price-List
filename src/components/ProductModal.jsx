import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, ShoppingBag, Truck, ShieldCheck, Clock, Share2, Check } from 'lucide-react';
import { generateWhatsAppLink, generateMessengerLink, generateOrderMessage, generateShareMessage } from '../utils/messageTemplates';
import { calculatePrice } from '../utils/pricing';
import { supabase } from '../supabaseClient';
import VideoPlayer from './VideoPlayer';
import AlertModal from './AlertModal';
import DeliveryModal from './DeliveryModal';

const ProductModal = ({ product, flashSale, isOpen, onClose }) => {
  const [contactInfo, setContactInfo] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMessengerPopup, setShowMessengerPopup] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [validationError, setValidationError] = useState('');

  // 1. All hooks must be at the top level
  useEffect(() => {
    if (!product) return;
    if (product.available_sizes?.length > 0 && !selectedSize) {
      const available = product.available_sizes.filter(s => typeof s === 'object' ? (s.is_available !== false) : true);
      if (available.length > 0) {
        setSelectedSize(typeof available[0] === 'object' ? available[0].name : available[0]);
      }
    }
  }, [product, selectedSize]);

  useEffect(() => {
    if (!product) return;
    const currentImages = (product.images && Array.isArray(product.images) && product.images.length > 0)
      ? product.images
      : [product.image || product.image_url].filter(Boolean);

    if (product.available_colors?.length > 0 && !selectedColor) {
      const available = product.available_colors.filter(c => typeof c === 'object' ? (c.is_available !== false) : true);
      if (available.length > 0) {
        const color = available[0];
        const name = typeof color === 'object' ? color.name : color;
        setSelectedColor(name);
        if (typeof color === 'object' && color.image) {
          const imgIdx = currentImages.indexOf(color.image);
          if (imgIdx !== -1) setCurrentImageIndex(imgIdx);
        }
      }
    }
  }, [product, selectedColor]);

  // Effect to handle size availability based on selected color
  useEffect(() => {
    if (!product || !selectedColor || !product.available_sizes) return;

    const colorObj = product.available_colors?.find(c => (typeof c === 'object' ? c.name : c) === selectedColor);

    // If this color has specific sizes assigned, ensure current size is valid
    if (colorObj && typeof colorObj === 'object' && colorObj.sizes?.length > 0) {
      if (!colorObj.sizes.includes(selectedSize)) {
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

  const handleMainOrder = () => {
    if (product.is_sold_out) return;
    const hasAvailableSizes = product.available_sizes?.some(s => typeof s === 'object' ? (s.is_available ?? true) : true);
    const hasAvailableColors = product.available_colors?.some(c => typeof c === 'object' ? (c.is_available ?? true) : true);
    if (hasAvailableSizes && !selectedSize) {
      setValidationError('size');
      document.getElementById('variant-selectors')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (hasAvailableColors && !selectedColor) {
      setValidationError('color');
      document.getElementById('variant-selectors')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setShowDeliveryModal(true);
  };

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
        className="fixed inset-0 z-[100] backdrop-blur-2xl flex items-center justify-center p-0 md:p-6"
        style={{ backgroundColor: 'var(--bg-overlay)' }}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 250 }}
          className="relative w-full h-[92vh] md:max-w-6xl md:h-[90vh] rounded-t-[32px] md:rounded-[40px] flex flex-col md:flex-row overflow-hidden border-t md:border"
          style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', boxShadow: '0 -10px 100px rgba(0,0,0,0.3)' }}
        >
          <div className="w-full flex justify-center pt-4 pb-2 md:hidden shrink-0">
            <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: 'var(--border-hover)' }} />
          </div>

          {/* Close Trigger */}
          <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 z-[110] p-2.5 md:p-3 rounded-full bg-black/50 text-white backdrop-blur-xl hover:scale-110 transition-transform">
            <X size={20} className="md:w-6 md:h-6" />
          </button>

          {/* Media Section */}
          <div className="w-full md:w-[50%] h-[40vh] md:h-full bg-black relative group shrink-0">
            {product.video_url ? (
              <VideoPlayer src={product.video_url} poster={images[0]} isActive={true} priority={true} />
            ) : (
              <div className="relative w-full h-full overflow-hidden">
                <motion.img
                  key={currentImageIndex}
                  src={images[currentImageIndex]}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                />
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

          {/* Details Section */}
          <div className="flex-1 p-6 md:p-12 overflow-y-auto no-scrollbar flex flex-col gap-8 md:gap-10">
            <div>
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-[#ce112d]">BIGBAZAR Exclusive</span>
                {product.is_sold_out && (
                  <span className="px-2 py-0.5 bg-[#ce112d] text-white text-[8px] font-black uppercase rounded-md animate-pulse">Sold Out</span>
                )}
                <div className="h-px flex-1" style={{ backgroundColor: 'var(--border-color)' }}></div>
              </div>
              <h1 className="text-2xl md:text-5xl font-black italic uppercase leading-tight tracking-tighter mb-3 md:mb-4" style={{ color: 'var(--text-primary)' }}>{product.name}</h1>
              <div className="flex items-center gap-4 md:gap-6 mt-4">
                <button
                  onClick={handleMainOrder}
                  disabled={product.is_sold_out}
                  className={`flex-shrink-0 px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[11px] md:text-xs transition-all active:scale-95 shadow-[0_10px_30px_rgba(206,17,45,0.2)] ${product.is_sold_out ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed shadow-none' : 'bg-[#ce112d] text-white hover:scale-[1.05]'}`}
                >
                  {product.is_sold_out ? "Sold Out" : "অর্ডার করুন"}
                </button>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl md:text-5xl font-black text-[#ce112d] tracking-tighter">৳{price}</span>
                  {hasDiscount && (
                    <span className="text-base md:text-xl text-neutral-600 line-through font-bold">৳{originalPrice}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <p className="leading-relaxed font-medium text-base md:text-lg" style={{ color: 'var(--text-secondary)' }}>
                {product.description}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" style={{ backgroundColor: 'var(--bg-badge)', color: 'var(--text-muted)' }}>{product.category}</span>
                {product.is_hot && <span className="px-3 py-1 bg-[#ce112d]/10 rounded-full text-[10px] font-black uppercase tracking-widest text-[#ce112d]">Hot Item</span>}
              </div>

              {/* Variant Selectors */}
              <div id="variant-selectors" className="space-y-6 md:space-y-8 py-5 md:py-6 border-y" style={{ borderColor: 'var(--border-color)' }}>
                {product.available_sizes?.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Pick Your Size</label>
                      {selectedSize && <span className="text-[11px] font-black uppercase text-[#ce112d]">Size: {selectedSize}</span>}
                    </div>
                    {validationError === 'size' && (
                      <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mx-1 text-[9px] md:text-[10px] text-[#ce112d] font-black uppercase tracking-widest bg-[#ce112d]/5 p-2.5 rounded-xl border border-[#ce112d]/10">
                        অনুগ্রহ করে একটি সাইজ সিলেক্ট করুন
                      </motion.p>
                    )}
                    <div className="grid grid-cols-4 md:grid-cols-4 gap-2 md:gap-3">
                      {product.available_sizes.map((size, idx) => {
                        const name = typeof size === 'object' ? size.name : size;
                        let isAvailable = typeof size === 'object' ? (size.is_available ?? true) : true;

                        // Color-wise size logic: if a color is selected and has a specific sizes list,
                        // mark sizes not in that list as unavailable.
                        if (selectedColor && isAvailable) {
                          const colorObj = product.available_colors?.find(c => (typeof c === 'object' ? c.name : c) === selectedColor);
                          if (colorObj && typeof colorObj === 'object' && colorObj.sizes?.length > 0) {
                            if (!colorObj.sizes.includes(name)) {
                              isAvailable = false;
                            }
                          }
                        }
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              isAvailable && setSelectedSize(name);
                              setValidationError('');
                            }}
                            disabled={!isAvailable}
                            className={`relative aspect-square sm:aspect-auto sm:py-3 flex items-center justify-center rounded-xl text-xs font-black uppercase transition-all border-2 ${!isAvailable ? 'bg-neutral-900/50 border-white/5 text-neutral-600 cursor-not-allowed overflow-hidden' : (selectedSize === name ? 'bg-[#ce112d] border-[#ce112d] text-white shadow-[0_5px_15px_rgba(206,17,45,0.3)] scale-105' : 'bg-transparent border-white/5 text-neutral-400 hover:border-white/20')}`}
                          >
                            {name}
                            {!isAvailable && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-[120%] h-[1px] bg-neutral-600/50 rotate-45 transform"></div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {product.available_colors?.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Available Colors</label>
                      {selectedColor && <span className="text-[10px] font-black uppercase text-neutral-400">Selected: <span className="text-[#ce112d]">{selectedColor}</span></span>}
                    </div>
                    {validationError === 'color' && (
                      <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mx-1 text-[9px] md:text-[10px] text-[#ce112d] font-black uppercase tracking-widest bg-[#ce112d]/5 p-2.5 rounded-xl border border-[#ce112d]/10">
                        অনুগ্রহ করে একটি কালার সিলেক্ট করুন
                      </motion.p>
                    )}
                    <div className="flex flex-wrap gap-3 md:gap-4">
                      {product.available_colors.map((rawColor, idx) => {
                        const color = typeof rawColor === 'object' ? rawColor : { name: rawColor, is_available: true, image: null, hex: null };
                        const colorName = color.name;
                        const colorImage = color.image;
                        const colorHex = color.hex;
                        const isAvailable = color.is_available ?? true;
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (!isAvailable) return;
                              setSelectedColor(colorName);
                              setValidationError('');
                              if (colorImage) {
                                const imgIdx = images.indexOf(colorImage);
                                if (imgIdx !== -1) setCurrentImageIndex(imgIdx);
                              }
                            }}
                            disabled={!isAvailable}
                            className={`group flex flex-col items-center gap-2 ${!isAvailable ? 'cursor-not-allowed' : ''}`}
                          >
                            <div className={`relative w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden transition-all border-[3px] ${!isAvailable ? 'border-white/5 opacity-20' : (selectedColor === colorName ? 'border-[#ce112d] shadow-[0_0_20px_rgba(206,17,45,0.4)] scale-110' : 'border-white/10 opacity-100 hover:scale-105 hover:border-white/30')}`}>
                              {colorImage ? (
                                <img src={colorImage} className="w-full h-full object-cover" />
                              ) : colorHex ? (
                                <div className="w-full h-full" style={{ backgroundColor: colorHex }} />
                              ) : (
                                <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-[12px] font-black uppercase text-neutral-500">{colorName.charAt(0)}</div>
                              )}

                              {selectedColor === colorName && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <Check size={18} className="text-white drop-shadow-lg" />
                                </div>
                              )}

                              {!isAvailable && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                  <div className="w-[120%] h-[2px] bg-neutral-400 rotate-45 transform"></div>
                                </div>
                              )}
                            </div>
                            <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-tighter truncate max-w-[70px] ${!isAvailable ? 'text-neutral-700' : (selectedColor === colorName ? 'text-[#ce112d]' : 'text-neutral-400')}`}>
                              {colorName}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={handleMainOrder}
                  disabled={product.is_sold_out}
                  className={`w-full flex items-center justify-center gap-4 py-5 md:py-6 rounded-2xl md:rounded-3xl font-black uppercase tracking-widest text-base md:text-lg transition-all active:scale-95 shadow-[0_10px_50px_rgba(206,17,45,0.3)] ${product.is_sold_out ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed shadow-none' : 'bg-[#ce112d] text-white hover:scale-[1.02]'}`}
                >
                  {product.is_sold_out ? "Out of Stock" : <><ShoppingBag size={20} className="md:w-6 md:h-6" /> অর্ডার করুন</>}
                </button>
                <button
                  onClick={() => {
                    const shareText = generateShareMessage({ ...product, price });
                    navigator.clipboard.writeText(shareText);
                    setShowAlert(true);
                  }}
                  className="flex items-center justify-center gap-2 py-4 border rounded-2xl font-black uppercase tracking-widest text-[10px] transition-colors hover:bg-[#ce112d] hover:text-white hover:border-[#ce112d]"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  <Share2 size={16} /> Share Product
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 md:gap-6 pt-5 md:pt-6 border-t pb-8 md:pb-10" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex flex-col items-center text-center gap-2 md:gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-[#ce112d]" style={{ backgroundColor: 'var(--bg-badge)' }}><Truck size={18} className="md:w-5 md:h-5" /></div>
                  <span className="text-[9px] md:text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Fast Delivery</span>
                </div>
                <div className="flex flex-col items-center text-center gap-2 md:gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-[#ce112d]" style={{ backgroundColor: 'var(--bg-badge)' }}><ShieldCheck size={18} className="md:w-5 md:h-5" /></div>
                  <span className="text-[9px] md:text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Safe Checkout</span>
                </div>
                <div className="flex flex-col items-center text-center gap-2 md:gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-[#ce112d]" style={{ backgroundColor: 'var(--bg-badge)' }}><Clock size={18} className="md:w-5 md:h-5" /></div>
                  <span className="text-[9px] md:text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>24/7 Support</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Messenger Copy Transition */}
        <AnimatePresence>
          {showMessengerPopup && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
            >
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-[#0084FF] rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(0,132,255,0.4)] animate-bounce">
                  <ShoppingBag size={48} className="text-white" />
                </div>
                <h2 className="text-3xl font-black italic uppercase">Order Info Copied!</h2>
                <p className="text-neutral-500 font-bold uppercase tracking-widest">Redirecting to Messenger in {countdown}s...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DeliveryModal
          isOpen={showDeliveryModal}
          onClose={() => setShowDeliveryModal(false)}
          product={product}
          contactInfo={contactInfo}
          onMessengerOrder={handleMessengerOrder}
          selectedSize={selectedSize}
          selectedColor={selectedColor}
        />

        <AlertModal
          isOpen={showAlert}
          onClose={() => setShowAlert(false)}
          title="Success!"
          message="Product details copied to clipboard!"
          type="success"
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default ProductModal;