import { Globe, User, Bell } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Navbar = ({ selectedCategory, onSelectCategory, onTrackOrder, onOpenCart, onOpenAuth }) => {
    const { cartCount } = useCart();
    const { language, toggleLanguage, t } = useLanguage();
    const navigate = useNavigate();

    const categories = [
        { id: 'All', label: t('all') }
    ];

    return (
        <nav className="relative z-[1002] transition-all duration-500 bg-white/95 backdrop-blur-md shadow-sm border-b border-zinc-100/80">
            <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 md:px-12">
                <div className="h-14 md:h-20 flex items-center justify-between gap-4 md:gap-8">
                    {/* Logo Section */}
                    <div className="shrink-0">
                        <button
                            onClick={() => { onSelectCategory('All'); navigate('/'); }}
                            className="inline-block text-left relative"
                        >
                            <h1 className="text-xl md:text-3xl font-black italic tracking-tighter cursor-pointer select-none leading-none brand-logo">
                                <span className="text-[#ce112d]">BIG</span>
                                <span className="text-zinc-900 ml-1">BAZAR</span>
                            </h1>
                        </button>
                    </div>

                    {/* Desktop Category Links (Elegant) */}
                    <div className="hidden lg:flex items-center gap-6">
                        {categories.slice(1).map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => onSelectCategory(cat.id)}
                                className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all relative py-1 ${selectedCategory === cat.id ? 'text-[#ce112d]' : 'text-zinc-400 hover:text-zinc-900'}`}
                            >
                                {cat.label}
                                {selectedCategory === cat.id && (
                                    <motion.div layoutId="navline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ce112d]" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Quick Access Area */}
                    <div className="flex items-center gap-2 md:gap-3">
                        {/* Track Order */}
                        <button
                            onClick={onTrackOrder}
                            className="p-2 md:px-4 md:py-2 rounded-xl text-zinc-400 hover:text-zinc-900 md:bg-zinc-50 transition-all border border-transparent flex items-center gap-2"
                        >
                            <Globe size={18} />
                            <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">{t('track')}</span>
                        </button>

                        {/* Language */}
                        <button
                            onClick={toggleLanguage}
                            className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-zinc-50 flex items-center justify-center active:scale-95 transition-all text-zinc-900 border border-transparent hover:border-zinc-200"
                        >
                            <span className="text-[10px] font-black">{language === 'bn' ? 'EN' : 'বাং'}</span>
                        </button>



                        {/* Cart */}
                        <button
                            onClick={onOpenCart}
                            className="relative w-9 h-9 md:h-11 md:w-auto md:px-5 rounded-xl flex items-center justify-center md:gap-2.5 bg-[#ce112d] text-white shadow-xl shadow-red-500/20 active:scale-95 hover:brightness-110 transition-all"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="m2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></svg>
                            <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Bag{cartCount > 0 ? ` (${cartCount})` : ''}</span>
                            {cartCount > 0 && (
                                <span className="md:hidden absolute -top-1 -right-1 bg-zinc-900 border-2 border-white text-white w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
