import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, MessageCircle, Send, CheckCircle2, Truck, ShieldCheck, Clock } from 'lucide-react';
import { generateWhatsAppLink, generateMessengerLink, generateOrderMessage } from '../utils/messageTemplates';
import { getEmbedUrl, resolveTikTokUrl } from '../utils/tiktok';
import { calculatePrice } from '../utils/pricing';
import { supabase } from '../supabaseClient';

const ProductModal = ({ product, flashSale, isOpen, onClose }) => {
  const hasVideo = !!product?.video_url;
  const [embedSrc, setEmbedSrc] = useState(null);
  const [contactInfo, setContactInfo] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMessengerPopup, setShowMessengerPopup] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Force Autoplay logic
  // If video exists, we want to play it immediately.
  // The user interaction IS opening the modal, so we can likely autoplay with sound (if supported) or muted.
  // We will default to autoplay=1 and mute=0. If browser blocks it, it blocks it.
  // But standard TikTok embeds usually handle this well.

  useEffect(() => {
    // Fetch contact info
    const fetchContact = async () => {
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'contact_info').single();
      if (data?.value) setContactInfo(data.value);
    };
    fetchContact();

    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      setCurrentImageIndex(0);
      if (product?.video_url) {
        setEmbedSrc(null);
        const loadVideo = async () => {
          const embed = await getEmbedUrl(product.video_url);
          if (embed) {
            // Force strict embed URL for higher performance
            const videoId = embed.split('/v2/')[1]?.split('?')[0];
            if (videoId) {
              setEmbedSrc(`https://www.tiktok.com/player/v1/${videoId}?autoplay=1&mute=0&loop=1&arrows=1&progress_bar=1&music_info=1&description=1`);
            } else {
              setEmbedSrc(embed);
            }
          }
        };
        loadVideo();
      }
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);

      setEmbedSrc(null);
    }
    return () => {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    };
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const { price, originalPrice, discountPercent, hasDiscount, isFlashSale } = calculatePrice(product, flashSale);

  const handleMessengerOrder = () => {
    const message = generateOrderMessage({ ...product, price });
    navigator.clipboard.writeText(message).then(() => {
      setCountdown(3);
      setShowMessengerPopup(true);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setShowMessengerPopup(false);
            const pageId = contactInfo?.facebook || "109056644140792";
            window.open(generateMessengerLink(pageId), '_blank');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });
  };

  const images = (product.images && Array.isArray(product.images) && product.images.length > 0)
    ? product.images
    : [product.image || product.image_url].filter(Boolean);

  if (images.length === 0) {
    images.push('https://via.placeholder.com/400x400?text=No+Image');
  }

  const hasMultipleImages = images.length > 1;

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] md:flex md:items-center justify-center bg-black/95 backdrop-blur-md p-0 md:p-8 overflow-y-auto md:overflow-hidden"
      >
        <div className="relative w-full min-h-full md:h-full md:min-h-0 max-w-6xl mx-auto bg-neutral-900 md:rounded-3xl flex flex-col md:flex-row overflow-visible md:overflow-hidden border-0 md:border border-white/5 shadow-2xl">

          {/* Close Button Mobile (Absolute) */}
          <button
            onClick={onClose}
            className="md:hidden absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white backdrop-blur-md"
          >
            <X size={20} />
          </button>

          {/* Messenger Order Popup */}
          <AnimatePresence>
            {showMessengerPopup && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ y: 20 }}
                  animate={{ y: 0 }}
                  exit={{ y: -20 }}
                  className="bg-white rounded-3xl p-8 max-w-sm mx-4 shadow-2xl border-4 border-blue-500"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg viewBox="0 0 24 24" width="32" height="32" fill="white">
                        <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.595 8.719v3.94l4.191-2.286c1.025.281 2.115.438 3.214.438 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.219 14.409l-3.047-3.235-5.944 3.235 6.545-6.936 3.097 3.235 5.901-3.235-6.552 6.936z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Order Copied!</h3>
                    <p className="text-gray-600 mb-6">Opening Messenger in...</p>
                    <div className="relative">
                      <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl font-bold text-white">{countdown}</span>
                      </div>
                      <svg className="absolute inset-0 w-20 h-20 mx-auto" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="2"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          strokeDasharray={`${(countdown / 3) * 100}, 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* LEFT SIDE: Media (100% on mobile, 50-60% on desktop) */}
          <div className="w-full md:w-[55%] h-[75vh] md:h-full bg-black relative flex-shrink-0 flex items-center justify-center overflow-hidden">
            {hasVideo && embedSrc ? (
              <iframe
                src={embedSrc}
                title={product.name}
                className="w-full h-full border-0 object-contain md:object-cover bg-black"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="relative w-full h-full flex items-center justify-center bg-neutral-950">
                {/* Fixed 1:1 Aspect Ratio Container for Images */}
                <div className="relative w-full aspect-square max-h-full">
                  <motion.img
                    key={currentImageIndex}
                    src={images[currentImageIndex]}
                    alt={product.name}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="w-full h-full object-contain md:object-cover shadow-2xl"
                  />

                  {/* Subtle glass overlay for premium feel */}
                  <div className="absolute inset-0 pointer-events-none border border-white/5 bg-gradient-to-br from-white/5 to-transparent"></div>
                </div>

                {hasMultipleImages && (
                  <>
                    <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-black/40 hover:bg-[#ce112d]/80 text-white rounded-full transition-all z-20 backdrop-blur-md border border-white/10">
                      <span className="text-2xl mb-1">‹</span>
                    </button>
                    <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-black/40 hover:bg-[#ce112d]/80 text-white rounded-full transition-all z-20 backdrop-blur-md border border-white/10">
                      <span className="text-2xl mb-1">›</span>
                    </button>
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                          className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'bg-[#ce112d] w-6' : 'bg-white/20 hover:bg-white/40'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* RIGHT SIDE: Details (Scrollable) */}
          <div className="flex-1 h-auto md:h-full md:overflow-y-auto bg-[#111] p-6 md:p-10 relative">

            {/* Desktop Top Bar */}
            <div className="hidden md:flex justify-between items-center mb-8">
              <span className="text-white/40 font-black tracking-[0.2em] text-xs uppercase">Big Bazar</span>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-8 pb-24 md:pb-0">

              {/* Product Header */}
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-4">{product.name || product.title}</h1>
                <div className="flex flex-wrap items-baseline gap-4">
                  <p className="text-[#ce112d] font-black text-4xl">৳{price}</p>
                  {hasDiscount && (
                    <>
                      <span className="text-neutral-300 text-lg line-through decoration-white/30">৳{originalPrice}</span>
                      {isFlashSale && (
                        <span className="bg-orange-300 text-white text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider animate-pulse">Flash Sale</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <a
                  href={generateWhatsAppLink({ ...product, price }, contactInfo?.whatsapp || "8801335945351")}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-4 bg-[#25D366] hover:bg-[#1da851] text-white font-bold uppercase tracking-widest rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-[0.98] text-sm shadow-xl shadow-green-900/20"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                  Order on WhatsApp
                </a>
                <button
                  onClick={handleMessengerOrder}
                  className="w-full py-4 bg-[#0084FF] hover:bg-[#006acc] text-white font-bold uppercase tracking-widest rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-[0.98] text-sm shadow-xl shadow-blue-900/20"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.595 8.719v3.94l4.191-2.286c1.025.281 2.115.438 3.214.438 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.219 14.409l-3.047-3.235-5.944 3.235 6.545-6.936 3.097 3.235 5.901-3.235-6.552 6.936z" /></svg>
                  Order on Messenger
                </button>
              </div>
              {/* Description */}
              <div>
                <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                  <span>Product Details</span>
                  <div className="h-px flex-1 bg-white/10"></div>
                </h3>
                <div className="text-neutral-300 text-base leading-relaxed whitespace-pre-wrap font-medium space-y-4">
                  {product.description}
                </div>
              </div>

              {/* Service Features */}
              <div className="grid grid-cols-1 gap-4 py-4 border-y border-white/5">
                <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5">
                  <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-full"><ShieldCheck size={20} /></div>
                  <div>
                    <p className="text-white font-bold text-sm">100% Authentic</p>
                    <p className="text-neutral-500 text-xs">Quality check before shipping</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5">
                  <div className="p-2.5 bg-green-500/20 text-green-400 rounded-full"><Truck size={20} /></div>
                  <div>
                    <p className="text-white font-bold text-sm">Cash on Delivery</p>
                    <p className="text-neutral-500 text-xs">Available nationwide</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5">
                  <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-full"><Clock size={20} /></div>
                  <div>
                    <p className="text-white font-bold text-sm">Fast Delivery</p>
                    <p className="text-neutral-500 text-xs">Returns within 2-3 days</p>
                  </div>
                </div>
              </div>



            </div>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProductModal;