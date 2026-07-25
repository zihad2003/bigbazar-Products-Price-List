import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LayoutGrid, Check } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

// Clothing silhouette icons (matching Home.jsx)
const IconAll = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const IconMen = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3h8" /><path d="M7 3L4 8l3 1v10h10V9l3-1-3-5" />
    <path d="M10 3v4" /><path d="M14 3v4" /><path d="M10 7h4" />
  </svg>
);
const IconWomen = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2h6" />
    <path d="M9 2c-1 0-2 1-2 2v3l-3 2 2 2h2v9h8V11h2l2-2-3-2V4c0-1-1-2-2-2" />
    <path d="M9 11c1 3 5 4 6 9" />
  </svg>
);
const IconBoy = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6" /><path d="M8 3L6 7l3 1v4h6V8l3-1-2-4" />
    <path d="M9 12v6h2v-4h2v4h2v-6" />
  </svg>
);
const IconGirl = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6" /><path d="M9 3L7 6l2 1v4h6V7l2-1-2-3" />
    <path d="M7 11l-2 8h14l-2-8" />
  </svg>
);
const IconPremium = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 15l-2 5L9 9l11 4-5 2zm0 0l4 4M7.5 13.5L5 15l1 1M8.5 8L7 5l-1 1M15.5 8L17 5l1 1" />
    <path d="M12 7a5 5 0 100 10 5 5 0 000-10z" />
  </svg>
);

const CategoryModal = ({ isOpen, onClose, selectedCategory, onSelectCategory }) => {
    const { t, language } = useLanguage();

    const categories = [
        { id: 'All',          label: t('all'),   icon: <IconAll size={20} /> },
        { id: 'Men',          label: t('men'),   icon: <IconMen size={20} /> },
        { id: 'Women',        label: t('women'), icon: <IconWomen size={20} /> },
        { id: 'Kids (Boys)',  label: t('boys'),  icon: <IconBoy size={20} /> },
        { id: 'Kids (Girls)', label: t('girls'), icon: <IconGirl size={20} /> },
        { id: 'Premium',      label: language === 'bn' ? 'এক্সক্লুসিভ' : 'Premium', icon: <IconPremium size={20} /> },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[2500] flex items-end justify-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60"
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="relative w-full max-w-md bg-[#0a0a0a] border-t border-white/10 rounded-t-[40px] p-8 pb-12 shadow-2xl"
                    >
                        {/* Pull Bar */}
                        <div className="flex justify-center mb-6">
                            <div className="w-12 h-1.5 bg-white/10 rounded-full" />
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-[#ce112d]/20 rounded-2xl flex items-center justify-center">
                                <LayoutGrid className="text-[#ce112d]" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black italic uppercase tracking-wider text-white">Select <span className="text-[#ce112d]">Category</span></h2>
                                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-[0.2em] mt-1">Explore our collections</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        onSelectCategory(cat.id);
                                        onClose();
                                    }}
                                    className={`flex items-center justify-between p-5 rounded-3xl transition-all active:scale-[0.98] border ${selectedCategory === cat.id
                                        ? 'bg-[#ce112d] border-[#ce112d] text-white shadow-lg shadow-red-900/20'
                                        : 'bg-white/5 border-white/5 text-neutral-400 hover:border-white/10'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedCategory === cat.id ? 'bg-white/20' : 'bg-white/5'}`}>
                                            {cat.icon}
                                        </div>
                                        <span className="font-black uppercase tracking-widest text-xs">{cat.label}</span>
                                    </div>
                                    {selectedCategory === cat.id && (
                                        <div className="bg-white/20 p-1.5 rounded-full">
                                            <Check size={14} className="text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={onClose}
                            className="mt-8 w-full py-4 bg-white/5 border border-white/10 text-neutral-500 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] transition-all hover:bg-white/10 hover:text-white"
                        >
                            Close
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CategoryModal;
