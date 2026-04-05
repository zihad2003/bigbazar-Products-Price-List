import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import MultiOrderModal from './modals/MultiOrderModal';
import { useLanguage } from '../contexts/LanguageContext';

export default function CartDrawer({ isOpen, onClose }) {
    const { t, language } = useLanguage();
    const { cartItems, removeFromCart, updateQuantity, cartTotal, cartCount } = useCart();
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md z-[1010] flex flex-col shadow-2xl"
                        style={{ backgroundColor: 'var(--modal-bg)' }}
                    >
                        {/* Header */}
                        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                            <div className="flex items-center gap-3">
                                <ShoppingBag className="text-[#ce112d]" size={24} />
                                <div>
                                    <h3 className="font-black italic uppercase tracking-widest text-lg">{language === 'bn' ? 'আমার ' : 'My '}<span className="text-[#ce112d]">{t('cart')}</span></h3>
                                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{cartCount} {language === 'bn' ? 'টি পণ্য সিলেক্ট করা হয়েছে' : 'items selected'}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Items List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                            {cartItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                                    <ShoppingBag size={64} strokeWidth={1} />
                                    <div>
                                        <p className="font-black uppercase tracking-widest text-sm">{language === 'bn' ? 'আপনার কার্ট খালি' : 'Your cart is empty'}</p>
                                        <p className="text-xs font-bold mt-1">{language === 'bn' ? 'অর্ডার করতে কিছু পণ্য যোগ করুন' : 'Add something to start shopping'}</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="mt-4 px-8 py-3 bg-[#ce112d] text-white rounded-full font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-lg"
                                    >
                                        {language === 'bn' ? 'শপিং শুরু করুন' : 'Start Shopping'}
                                    </button>
                                </div>
                            ) : (
                                cartItems.map((item) => (
                                    <div key={item.cartId} className="flex gap-4 group">
                                        <div className="w-20 h-28 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 flex-shrink-0 border border-white/5">
                                            <img
                                                src={getOptimizedUrl(item.image_url || item.image, mediaSizes.thumbnail)}
                                                className="w-full h-full object-cover"
                                                alt={item.name}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-black italic uppercase text-xs tracking-wider truncate pr-4">{item.name}</h4>
                                                <button
                                                    onClick={() => removeFromCart(item.cartId)}
                                                    className="text-neutral-500 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {item.selectedColor && (
                                                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-widest text-neutral-400">
                                                        {t('color')}: <span className="text-white">{item.selectedColor}</span>
                                                    </span>
                                                )}
                                                {item.selectedSize && (
                                                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-widest text-neutral-400">
                                                        {t('size')}: <span className="text-white">{item.selectedSize}</span>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between pt-1">
                                                <div className="flex items-center gap-3 bg-neutral-100 dark:bg-white/5 rounded-full px-3 py-1.5 border border-white/5">
                                                    <button
                                                        onClick={() => updateQuantity(item.cartId, -1)}
                                                        className="hover:text-[#ce112d] transition-colors"
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                    <span className="text-xs font-black min-w-[20px] text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.cartId, 1)}
                                                        className="hover:text-[#ce112d] transition-colors"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                </div>
                                                <span className="font-black text-sm text-[#ce112d]">৳{item.price * item.quantity}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {cartItems.length > 0 && (
                            <div className="p-6 border-t space-y-4" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">{t('subtotal')}</span>
                                    <span className="text-2xl font-black text-[#ce112d]">৳{cartTotal}</span>
                                </div>
                                <button
                                    onClick={() => setIsCheckoutOpen(true)}
                                    className="w-full bg-[#ce112d] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(206,17,45,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    {t('checkout')} <ArrowRight size={18} />
                                </button>
                                <p className="text-[8px] text-center text-neutral-500 font-bold uppercase tracking-widest">{language === 'bn' ? 'ডেলিভারি চার্জ পরের ধাপে যোগ করা হবে' : 'Delivery charge will be added in next step'}</p>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
            <MultiOrderModal
                isOpen={isCheckoutOpen}
                onClose={() => {
                    setIsCheckoutOpen(false);
                    onClose(); // Close the drawer too after successful order or cancel
                }}
            />
        </AnimatePresence>
    );
}
