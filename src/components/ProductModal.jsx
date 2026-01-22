import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, ShoppingBag, Truck, ShieldCheck, Clock, Share2 } from 'lucide-react';
import { generateWhatsAppLink, generateMessengerLink, generateOrderMessage, generateShareMessage } from '../utils/messageTemplates';
import { calculatePrice } from '../utils/pricing';
import { supabase } from '../supabaseClient';
import VideoPlayer from './VideoPlayer';
import AlertModal from './AlertModal';

const ProductModal = ({ product, flashSale, isOpen, onClose }) => {
  const [contactInfo, setContactInfo] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMessengerPopup, setShowMessengerPopup] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!isOpen) return;

    // Lock body scroll
    const scrollY = window.scrollY;
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
        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-0 md:p-6"
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative w-full h-full md:max-w-6xl md:h-[90vh] bg-neutral-900 md:rounded-[40px] flex flex-col md:flex-row overflow-hidden border border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.8)]"
        >
          {/* Close Trigger */}
          <button onClick={onClose} className="absolute top-6 right-6 z-[110] p-3 rounded-full bg-black/50 text-white backdrop-blur-xl hover:scale-110 transition-transform">
            <X size={24} />
          </button>

          {/* Media Section */}
          <div className="w-full md:w-[60%] h-[50vh] md:h-full bg-black relative group">
            {product.video_url ? (
              <VideoPlayer src={product.video_url} poster={images[0]} isActive={true} priority={true} />
            ) : (
              <div className="relative w-full h-full overflow-hidden">
                <motion.img
                  key={currentImageIndex}
                  src={images[currentImageIndex]}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8 }}
                />
                {images.length > 1 && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentImageIndex(i)}
                        className={`h-1.5 rounded-full transition-all ${i === currentImageIndex ? 'bg-[#ce112d] w-6' : 'bg-white/40 w-1.5'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="flex-1 p-8 md:p-12 overflow-y-auto no-scrollbar flex flex-col gap-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ce112d]">BIGBAZAR Exclusive</span>
                <div className="h-px flex-1 bg-white/5"></div>
              </div>
              <h1 className="text-4xl md:text-5xl font-black italic uppercase leading-none text-white tracking-tighter mb-4">{product.name}</h1>
              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-black text-[#ce112d]">৳{price}</span>
                {hasDiscount && (
                  <span className="text-xl text-neutral-600 line-through">৳{originalPrice}</span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-neutral-400 leading-relaxed font-medium text-lg">
                {product.description}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-neutral-500">{product.category}</span>
                {product.is_hot && <span className="px-3 py-1 bg-[#ce112d]/10 rounded-full text-[10px] font-black uppercase tracking-widest text-[#ce112d]">Hot Item</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <a
                href={generateWhatsAppLink({ ...product, price }, contactInfo?.whatsapp || "8801335945351")}
                target="_blank"
                className="flex items-center justify-center gap-4 py-5 bg-[#25D366] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform active:scale-95"
              >
                <MessageCircle /> Order on WhatsApp
              </a>
              <button
                onClick={handleMessengerOrder}
                className="flex items-center justify-center gap-4 py-5 bg-[#0084FF] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform active:scale-95"
              >
                <ShoppingBag /> Order on Messenger
              </button>
              <button
                onClick={() => {
                  const shareText = generateShareMessage({ ...product, price });
                  navigator.clipboard.writeText(shareText);
                  setShowAlert(true);
                }}
                className="col-span-1 md:col-auto flex items-center justify-center gap-2 py-4 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] text-neutral-400 hover:bg-white hover:text-black transition-colors"
                title="Copy Product Details"
              >
                <Share2 size={16} /> <span className="hidden md:inline">Share Product</span><span className="md:hidden">Share</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/5">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-[#ce112d]"><Truck size={20} /></div>
                <span className="text-[10px] font-bold uppercase text-neutral-500">Fast Delivery</span>
              </div>
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-[#ce112d]"><ShieldCheck size={20} /></div>
                <span className="text-[10px] font-bold uppercase text-neutral-500">Safe Checkout</span>
              </div>
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-[#ce112d]"><Clock size={20} /></div>
                <span className="text-[10px] font-bold uppercase text-neutral-500">24/7 Support</span>
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

        {/* Custom Success Alert */}
        <AlertModal
          isOpen={showAlert}
          onClose={() => setShowAlert(false)}
          title="Success!"
          message="Product details copied to clipboard! You can now paste and share it on social media."
          type="success"
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default ProductModal;