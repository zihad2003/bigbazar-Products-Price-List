import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Moon, Star, Calendar, Truck, Heart } from 'lucide-react';

const EidAnnouncementModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        // Hydration & Expiration Logic
        const targetDate = new Date('2026-03-17T18:00:00');
        const now = new Date();
        if (now.getTime() >= targetDate.getTime()) {
            setIsExpired(true);
        }

        const isDismissed = localStorage.getItem('eid-announcement-dismissed-v1');
        if (!isDismissed) {
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem('eid-announcement-dismissed-v1', 'true');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-neutral-950 rounded-[40px] overflow-hidden shadow-2xl border border-white/10 flex flex-col"
                    >
                        {/* Festive Header Gradient */}
                        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r opacity-80 ${isExpired ? 'from-amber-400 via-amber-600 to-amber-800' : 'from-orange-400 via-[#ce112d] to-purple-500'}`} />

                        {/* Top Close Button */}
                        <button
                            onClick={handleClose}
                            className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-[#ce112d] hover:text-white text-neutral-400 rounded-full transition-all border border-white/5 z-50"
                        >
                            <X size={20} className="stroke-2" />
                        </button>

                        <div className="p-8 sm:p-10 pt-12 text-center space-y-8">
                            {/* Icon / Visual Element */}
                            <div className="relative flex justify-center">
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center relative shadow-inner border border-white/5 ${isExpired ? 'bg-amber-500/10' : 'bg-gradient-to-tr from-orange-500/20 to-purple-500/20'}`}>
                                    <div className={`absolute inset-0 animate-pulse rounded-full ${isExpired ? 'bg-amber-500/5' : 'bg-gradient-to-tr from-orange-500/10 to-purple-500/10'}`} />
                                    {isExpired ? (
                                        <Truck size={44} className="text-amber-500 relative z-10" />
                                    ) : (
                                        <Moon size={44} className="text-orange-400 fill-orange-400/20 relative z-10" />
                                    )}
                                    {!isExpired && (
                                        <>
                                            <div className="absolute -top-2 -right-1">
                                                <Star size={18} className="text-orange-300 fill-orange-300 animate-bounce delay-75" />
                                            </div>
                                            <div className="absolute bottom-1 -left-1">
                                                <Star size={14} className="text-orange-200 fill-orange-200 animate-bounce delay-150" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Text Header */}
                            <div className="space-y-3">
                                <h3 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter leading-none text-white">
                                    {isExpired ? (
                                        <>Booking <span className="text-amber-500">Closed</span> ⚠️</>
                                    ) : (
                                        <>Eid Delivery <span className="text-[#ce112d]">& Update</span> 🌙</>
                                    )}
                                </h3>
                                <p className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.3em] opacity-60">
                                    {isExpired ? 'কুরিয়ার সার্ভিস বন্ধের আপডেট' : 'ঈদ ডেলিভারি এবং অর্ডার আপডেট'}
                                </p>
                            </div>

                            {/* Message Body */}
                            <div className="space-y-6 text-neutral-300">
                                <p className="text-lg font-bold leading-relaxed text-white">
                                    প্রিয় গ্রাহক,
                                </p>
                                <div className="space-y-4 text-sm font-medium leading-relaxed bg-white/5 p-6 rounded-[28px] border border-white/5 relative group overflow-hidden text-center">
                                    {isExpired ? (
                                        <p className="text-amber-200">
                                            কুরিয়ার সার্ভিসের ছুটির কারণে ঈদের আগের ডেলিভারির জন্য নতুন অর্ডার নেওয়া বন্ধ রয়েছে। এখনকার সকল অর্ডার ঈদের পর ডেলিভারি করা হবে।
                                        </p>
                                    ) : (
                                        <>
                                            <p>
                                                কুরিয়ার সার্ভিস বন্ধ থাকার কারণে আগামীকালকের পর থেকে আমরা ঈদের আগের ডেলিভারির জন্য আর কোনো নতুন অর্ডার নিচ্ছি না।
                                            </p>
                                            <p className="text-neutral-400">
                                                তবে, আমাদের ওয়েবসাইটে অর্ডার গ্রহণ চালু থাকবে এবং আগামীকালকের পর প্লেস করা সকল অর্ডারের ডেলিভারি ঈদের ছুটির পর থেকে পর্যায়ক্রমে পুনরায় শুরু হবে।
                                            </p>
                                        </>
                                    )}
                                    <p className="pt-2 text-[#ce112d] font-bold italic">
                                        Big Bazar-এর সাথে থাকার জন্য অসংখ্য ধন্যবাদ।
                                    </p>
                                </div>
                            </div>

                            {/* Festive Footer Tag */}
                            <div className="pt-4 pb-2">
                                <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full border shadow-lg ${isExpired ? 'bg-amber-500/5 border-amber-500/20' : 'bg-gradient-to-r from-orange-500/10 to-purple-500/10 border-orange-500/20'}`}>
                                    <Heart size={16} className={isExpired ? 'text-amber-500' : 'text-orange-400 fill-orange-400/20'} />
                                    <span className={`text-sm font-black uppercase tracking-widest ${isExpired ? 'text-amber-200' : 'text-orange-200'}`}>
                                        সবাইকে অগ্রিম ঈদ মোবারক!
                                    </span>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={handleClose}
                                className={`w-full h-16 rounded-[24px] font-black uppercase tracking-[0.2em] text-sm text-white shadow-2xl transition-all hover:scale-[1.02] active:scale-95 ${isExpired ? 'bg-amber-600 shadow-amber-900/40' : 'bg-[#ce112d] shadow-red-900/40'}`}
                            >
                                {isExpired ? 'Understood' : 'Continue Shopping'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default EidAnnouncementModal;
