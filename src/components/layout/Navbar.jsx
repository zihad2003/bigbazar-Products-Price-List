import { Globe, User, Bell, Menu, X, LayoutGrid } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Navbar = ({ selectedCategory, onSelectCategory, onTrackOrder, onOpenCart, onOpenAuth, onOpenCategories, isCategoryOpen }) => {
    const { cartCount } = useCart();
    const { language, toggleLanguage, t } = useLanguage();
    const navigate = useNavigate();

    const categories = [
        { id: 'Men', label: t('men') },
        { id: 'Women', label: t('women') },
        { id: 'Kids (Boys)', label: t('boys') },
        { id: 'Kids (Girls)', label: t('girls') },
    ];

    const handleCategoryClick = (catId) => {
        onSelectCategory(catId);
    };

    return (
        <nav className="relative z-[1002] transition-all duration-500 bg-white/95 backdrop-blur-md shadow-sm border-b border-zinc-100/80">
            <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 md:px-12">
                <div className="h-14 md:h-20 flex items-center justify-between gap-4 md:gap-8">
                    {/* Logo Section */}
                    <div className="shrink-0 flex items-center">
                        <button
                            onClick={() => { handleCategoryClick('All'); navigate('/'); }}
                            className="inline-block text-left relative"
                        >
                            <h1 className="text-xl md:text-3xl font-black italic tracking-tighter cursor-pointer select-none leading-none brand-logo">
                                <span className="text-[#ce112d]">BIG</span>
                                <span className="text-zinc-900 ml-1">BAZAR</span>
                            </h1>
                        </button>
                    </div>

                    {/* Desktop Category Links */}
                    <div className="hidden lg:flex items-center gap-6">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => handleCategoryClick(cat.id)}
                                className={`text-[11px] font-black uppercase tracking-[0.15em] transition-all relative py-1 ${selectedCategory === cat.id ? 'text-[#ce112d]' : 'text-zinc-500 hover:text-zinc-900'}`}
                            >
                                {cat.label}
                                {selectedCategory === cat.id && (
                                    <motion.div layoutId="navline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ce112d]" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Mobile Category Menu Button — morphs between 3-line Menu and X */}
                    <div className="lg:hidden flex items-center gap-2">
                        <button
                            onClick={onOpenCategories}
                            aria-label={isCategoryOpen ? "Close Menu" : "Open Menu"}
                            className="w-10 h-10 rounded-xl bg-zinc-50 hover:bg-zinc-100 text-zinc-900 border border-zinc-200/80 active:scale-95 transition-all flex items-center justify-center"
                        >
                            {isCategoryOpen ? (
                                <X size={20} className="text-[#ce112d]" />
                            ) : (
                                <Menu size={20} className="text-[#ce112d]" />
                            )}
                        </button>
                    </div>

                    {/* Quick Access Area — Visible on Desktop */}
                    <div className="hidden md:flex items-center gap-2 md:gap-3">
                        {/* Track Order */}
                        <button
                            onClick={onTrackOrder}
                            className="px-4 py-2 rounded-xl text-zinc-400 hover:text-zinc-900 bg-zinc-50 transition-all border border-transparent flex items-center gap-2"
                        >
                            <Globe size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('track')}</span>
                        </button>

                        {/* Language */}
                        <button
                            onClick={toggleLanguage}
                            className="w-11 h-11 rounded-xl bg-zinc-50 flex items-center justify-center active:scale-95 transition-all text-zinc-900 border border-transparent hover:border-zinc-200"
                        >
                            <span className="text-[10px] font-black">{language === 'bn' ? 'EN' : 'বাং'}</span>
                        </button>

                        {/* Cart */}
                        <button
                            onClick={onOpenCart}
                            className="relative h-11 px-5 rounded-xl flex items-center justify-center gap-2.5 bg-[#ce112d] text-white shadow-xl shadow-red-500/20 active:scale-95 hover:brightness-110 transition-all"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="m2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></svg>
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {language === 'bn' ? (cartCount > 0 ? `ব্যাগ (${cartCount})` : 'ব্যাগ') : (cartCount > 0 ? `Bag (${cartCount})` : 'Bag')}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
