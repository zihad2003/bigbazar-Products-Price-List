import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import { useLanguage } from '../contexts/LanguageContext';
import { motion as m, AnimatePresence as Ap } from 'framer-motion';

export default function CartDrawer({ isOpen, onClose }) {
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const { cartItems, removeFromCart, updateQuantity, cartTotal, cartCount } = useCart();

    return (
        <Ap>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-x-0 bottom-0 top-14 md:top-20 z-[1005] bg-black/40 backdrop-blur-md"
                    />

                    {/* Drawer */}
                    <m.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 250 }}
                        className="fixed right-0 top-14 md:top-20 bottom-0 w-full max-w-md z-[1006] flex flex-col shadow-[0_10px_50px_rgba(0,0,0,0.1)] border-l border-neutral-100 dark:border-white/5"
                        style={{ backgroundColor: 'var(--modal-bg)' }}
                    >
                        {/* Header */}
                        <div className="p-6 pt-10 md:pt-12 border-b flex items-center justify-between border-neutral-100 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#ce112d]/5 flex items-center justify-center text-[#ce112d]">
                                    <ShoppingBag size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="font-black italic uppercase tracking-wider text-base">
                                        {language === 'bn' ? 'আমার ' : 'MY '}<span className="text-[#ce112d]">{language === 'bn' ? 'ব্যাগ' : 'BAG'}</span>
                                    </h3>
                                    <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest pt-0.5 leading-none">
                                        {cartCount} {language === 'bn' ? 'টি পণ্য সিলেক্ট করা হয়েছে' : 'items selected'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="p-2 hover:bg-neutral-50 dark:hover:bg-white/5 rounded-full transition-all active:scale-90 text-neutral-500"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Items List */}
                        <div className="flex-grow overflow-y-auto p-6 space-y-4 no-scrollbar">
                            {cartItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6">
                                    <div className="w-16 h-16 bg-[#ce112d]/5 rounded-full flex items-center justify-center text-[#ce112d] animate-pulse">
                                        <ShoppingBag size={28} strokeWidth={2} />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="font-black uppercase tracking-widest text-xs text-neutral-800 dark:text-neutral-200">
                                            {language === 'bn' ? 'আপনার ব্যাগটি খালি আছে' : 'Your bag is empty'}
                                        </p>
                                        <p className="text-[10px] font-bold text-neutral-400 max-w-[240px] mx-auto leading-relaxed">
                                            {language === 'bn' 
                                                ? 'আমাদের নতুন কালেকশন দেখতে এখনই শপিং শুরু করুন।' 
                                                : 'Explore our collections to add premium clothing styles today.'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="px-8 py-3.5 bg-[#ce112d] text-white rounded-xl font-bold uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-md shadow-[#ce112d]/10"
                                    >
                                        {language === 'bn' ? 'শপিং শুরু করুন' : 'Start Shopping'}
                                    </button>
                                </div>
                            ) : (
                                cartItems.map((item) => (
                                    <div 
                                        key={item.cartId} 
                                        className="flex gap-4 p-3 bg-neutral-50 dark:bg-white/5 rounded-2xl border border-neutral-100 dark:border-white/5 hover:border-neutral-200 dark:hover:border-white/10 transition-all group"
                                    >
                                        <div className="w-20 h-28 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 flex-shrink-0 border border-neutral-200/20">
                                            <img
                                                src={getOptimizedUrl(item.image_url || item.image, mediaSizes.thumbnail)}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                alt={item.name}
                                                onError={(e) => { e.target.src = 'https://placehold.co/100x140?text=Product'; }}
                                            />
                                        </div>
                                        <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5">
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-black italic uppercase text-xs tracking-wider truncate pr-2 text-neutral-900 dark:text-white">
                                                        {item.name}
                                                    </h4>
                                                    <button
                                                        onClick={() => removeFromCart(item.cartId)}
                                                        className="text-neutral-400 hover:text-red-500 transition-colors flex-shrink-0"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                    {item.selectedColor && (
                                                        <span className="px-2 py-0.5 rounded bg-neutral-200/50 dark:bg-white/10 text-[8px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                                                            {item.selectedColor}
                                                        </span>
                                                    )}
                                                    {item.selectedSize && (
                                                        <span className="px-2 py-0.5 rounded bg-neutral-200/50 dark:bg-white/10 text-[8px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                                                            Size: {item.selectedSize}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-1">
                                                <div className="flex items-center bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-white/5 rounded-lg overflow-hidden h-7">
                                                    <button
                                                        onClick={() => updateQuantity(item.cartId, -1)}
                                                        className="px-2.5 h-full hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-400 hover:text-[#ce112d] transition-all"
                                                    >
                                                        <Minus size={9} />
                                                    </button>
                                                    <span className="text-[11px] font-black text-neutral-800 dark:text-neutral-200 min-w-[20px] text-center">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQuantity(item.cartId, 1)}
                                                        className="px-2.5 h-full hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-400 hover:text-[#ce112d] transition-all"
                                                    >
                                                        <Plus size={9} />
                                                    </button>
                                                </div>
                                                <span className="font-black text-sm text-[#ce112d] italic">
                                                    ৳{item.price * item.quantity}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {cartItems.length > 0 && (
                            <div className="p-6 border-t space-y-4 border-neutral-100 dark:border-white/5 bg-neutral-50/50 dark:bg-neutral-950/20">
                                <div className="flex justify-between items-baseline mb-2">
                                    <span className={`text-[9px] font-black uppercase text-neutral-400 ${language === 'bn' ? '' : 'tracking-[0.25em]'}`}>
                                        {t('subtotal')}
                                    </span>
                                    <span className="text-2xl font-black text-[#ce112d] italic">
                                        ৳{cartTotal}
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        navigate('/checkout');
                                        onClose();
                                    }}
                                    className="w-full bg-[#ce112d] hover:bg-[#af0f25] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[12px] md:text-sm flex items-center justify-center gap-3.5 shadow-lg shadow-[#ce112d]/10 hover:scale-[1.01] active:scale-95 transition-all duration-300"
                                >
                                    <span>{language === 'bn' ? 'অর্ডার সাবমিট করতে যান' : 'PROCEED TO CHECKOUT'}</span>
                                    <ArrowRight size={18} strokeWidth={2.5} />
                                </button>
                                <p className={`text-[8px] text-center text-neutral-400 font-bold uppercase leading-none ${language === 'bn' ? '' : 'tracking-widest'}`}>
                                    {language === 'bn' 
                                        ? 'ডেলিভারি চার্জ পরবর্তী ধাপে যোগ হবে' 
                                        : 'Delivery charge will be added at checkout'}
                                </p>
                            </div>
                        )}
                    </m.div>
                </>
            )}
        </Ap>
    );
}
