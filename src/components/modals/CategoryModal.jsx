import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { getSubcategoriesForCategory, TOP_CATEGORIES } from '../../data/categories';
import { bigBazarApi } from '../../api/client';

const CategoryModal = ({
    isOpen,
    onClose,
    selectedCategory,
    onSelectCategory,
    isTopTickerActive,
}) => {
    const { language, setLanguage } = useLanguage();
    const navigate = useNavigate();
    const [expandedCat, setExpandedCat] = useState(null);
    const [subcategoriesData, setSubcategoriesData] = useState(null);
    const [subCounts, setSubCounts] = useState({});

    useEffect(() => {
        if (!isOpen) return;
        bigBazarApi.from('site_settings').select('*').then(({ data }) => {
            if (!data) return;
            const isArray = Array.isArray(data);
            const subcats = isArray
                ? data.find(s => s.key === 'subcategories')?.value
                : data.subcategories;
            if (subcats && typeof subcats === 'object') {
                setSubcategoriesData(subcats);
            }
        });
        bigBazarApi.from('subcategory-counts').select('*').then(({ data }) => {
            if (data && Array.isArray(data)) {
                const countsMap = {};
                data.forEach(item => {
                    if (item.subcategory) countsMap[item.subcategory] = item.count;
                });
                setSubCounts(countsMap);
            }
        });
    }, [isOpen]);

    const categories = [
        { id: 'All', label: language === 'bn' ? 'সকল' : 'All' },
        ...TOP_CATEGORIES.map(c => ({ id: c.id, label: language === 'bn' ? c.bn : c.en })),
    ];

    const handleSelectCategory = (catId) => {
        onSelectCategory(catId);
        if (catId === 'All') navigate('/');
        else navigate(`/products?category=${encodeURIComponent(catId)}`);
        onClose();
    };

    const handleSelectSubcategory = (catId, subId) => {
        onSelectCategory(catId);
        navigate(`/products?category=${encodeURIComponent(catId)}&subcategory=${encodeURIComponent(subId)}`);
        onClose();
    };

    const topPositionClass = isTopTickerActive
        ? 'top-[5.75rem] md:top-[7.25rem]'
        : 'top-14 md:top-20';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className={`fixed ${topPositionClass} bottom-[56px] lg:bottom-0 left-0 right-0 z-[2000] flex justify-end overflow-hidden`}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50"
                    />

                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                        className="relative w-[85%] max-w-xs h-full bg-white shadow-2xl flex flex-col z-10 border-l border-zinc-100"
                    >
                        <div className="p-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#ce112d]" />
                                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                                    {language === 'bn' ? 'মেনু' : 'Menu'}
                                </h3>
                            </div>
                        </div>

                        <div className="px-4 pt-3 pb-1 shrink-0">
                            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                                {language === 'bn' ? 'ক্যাটাগরি সমূহ' : 'All Categories'}
                            </p>
                        </div>

                        <div className="overflow-y-auto no-scrollbar scrollbar-hide p-4 pt-2 space-y-2 flex-1 bg-white">
                            {categories.map((cat) => {
                                const allSubcategories = getSubcategoriesForCategory(cat.id, subcategoriesData);
                                const subcategories = Object.keys(subCounts).length > 0
                                    ? allSubcategories.filter(sub => (subCounts[sub.id] || 0) > 0)
                                    : allSubcategories;
                                const isExpanded = expandedCat === cat.id;
                                const isSelected = selectedCategory === cat.id;

                                return (
                                    <div key={cat.id} className="space-y-1">
                                        <div
                                            className={`flex items-center justify-between p-3.5 rounded-2xl transition-all border ${isSelected
                                                ? 'bg-[#ce112d] border-[#ce112d] text-white shadow-md shadow-red-900/20 font-bold'
                                                : 'bg-zinc-50/80 border-zinc-200/60 text-zinc-800 hover:bg-zinc-100'
                                                }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleSelectCategory(cat.id)}
                                                className="flex-1 text-left text-xs font-extrabold uppercase tracking-wide py-0.5"
                                            >
                                                {cat.label}
                                            </button>

                                            <div className="flex items-center gap-1.5">
                                                {subcategories.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setExpandedCat(isExpanded ? null : cat.id);
                                                        }}
                                                        className={`p-1.5 rounded-lg transition-colors ${isSelected ? 'bg-white/20 text-white' : 'bg-zinc-200/60 hover:bg-zinc-300 text-zinc-700'
                                                            }`}
                                                    >
                                                        <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </button>
                                                )}
                                                {isSelected && (
                                                    <div className="bg-white/20 p-1 rounded-full">
                                                        <Check size={12} className="text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {subcategories.length > 0 && isExpanded && (
                                            <div className="pl-2.5 grid grid-cols-1 gap-1.5 pt-1 pb-1">
                                                {subcategories.map(sub => (
                                                    <button
                                                        key={sub.id}
                                                        type="button"
                                                        onClick={() => handleSelectSubcategory(cat.id, sub.id)}
                                                        className="p-2.5 rounded-xl bg-zinc-50 hover:bg-rose-50 border border-zinc-200/50 text-left text-[11px] font-bold text-zinc-700 hover:text-[#ce112d] transition-all flex items-center gap-2.5"
                                                    >
                                                        {sub.image_url ? (
                                                            <img src={sub.image_url} alt="" className="w-6 h-6 rounded-full object-cover border border-zinc-200 shrink-0" />
                                                        ) : (
                                                            <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-[9px] font-black text-zinc-600 shrink-0">
                                                                {(sub.name_en || sub.en || '?')[0]}
                                                            </div>
                                                        )}
                                                        <span className="truncate">{language === 'bn' ? (sub.name_bn || sub.bn) : (sub.name_en || sub.bn)}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Language last — same control as Footer */}
                        <div className="shrink-0 p-4 border-t border-zinc-100 bg-white">
                            <div className="flex items-center bg-zinc-100 border border-zinc-200 rounded-full p-1 h-10 w-full">
                                <button
                                    type="button"
                                    onClick={() => setLanguage('en')}
                                    className={`flex-1 text-[10px] font-black uppercase tracking-widest h-full rounded-full transition-all duration-300 ${language === 'en' ? 'bg-[#ce112d] text-white shadow-md' : 'text-zinc-500 hover:text-zinc-900'}`}
                                >
                                    ENGLISH
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLanguage('bn')}
                                    className={`flex-1 text-[10px] font-black uppercase tracking-widest h-full rounded-full transition-all duration-300 ${language === 'bn' ? 'bg-[#ce112d] text-white shadow-md' : 'text-zinc-500 hover:text-zinc-900'}`}
                                >
                                    বাংলা
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CategoryModal;
