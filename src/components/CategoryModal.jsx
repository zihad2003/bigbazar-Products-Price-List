import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LayoutGrid, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const CategoryModal = ({ isOpen, onClose, selectedCategory, onSelectCategory }) => {
    const { t } = useLanguage();

    const categories = [
        { id: 'All', label: t('all'), icon: '✨' },
        { id: 'Men', label: t('men'), icon: '👔' },
        { id: 'Women', label: t('women'), icon: '👗' },
        { id: 'Kids (Boys)', label: t('boys'), icon: '👦' },
        { id: 'Kids (Girls)', label: t('girls'), icon: '👧' }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[2000] flex items-end justify-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
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
                                        <span className="text-xl">{cat.icon}</span>
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
