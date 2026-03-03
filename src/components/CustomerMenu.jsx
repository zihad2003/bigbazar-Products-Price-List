import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingBag, Globe, Menu } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../CartContext';

const CustomerMenu = ({ onTrackOrder, onOpenCart, onOpenCategories, onSelectCategory }) => {
    const { language, toggleLanguage, t } = useLanguage();
    const { cartCount } = useCart();
    const navigate = useNavigate();
    const location = useLocation();

    const handleHomeClick = () => {
        if (onSelectCategory) onSelectCategory('All');
        if (location.pathname !== '/') {
            navigate('/');
            setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleMenuClick = () => {
        if (onSelectCategory) onSelectCategory('All');
        if (location.pathname !== '/') {
            navigate('/');
            setTimeout(() => {
                const header = document.getElementById('products-header');
                if (header) {
                    header.scrollIntoView({ behavior: 'smooth' });
                } else {
                    window.scrollTo({ top: 800, behavior: 'smooth' });
                }
                if (onOpenCategories) onOpenCategories();
            }, 150);
        } else {
            const header = document.getElementById('products-header');
            if (header) {
                header.scrollIntoView({ behavior: 'smooth' });
            } else {
                window.scrollTo({ top: 800, behavior: 'smooth' });
            }
            if (onOpenCategories) onOpenCategories();
        }
    };

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4 pointer-events-none">
            <div className="flex items-center justify-around bg-neutral-900/80 backdrop-blur-2xl border border-white/10 p-2 rounded-3xl shadow-2xl pointer-events-auto max-w-sm mx-auto">
                {/* Home */}
                <button
                    onClick={handleHomeClick}
                    className="flex flex-col items-center gap-1 p-2 rounded-2xl active:bg-white/5 active:scale-95 transition-all flex-1"
                >
                    <Home size={20} className="text-white/70" />
                    <span className="text-[9px] font-black uppercase tracking-tighter text-white/40">{language === 'bn' ? 'হোম' : 'Home'}</span>
                </button>

                {/* Categories */}
                <button
                    onClick={handleMenuClick}
                    className="flex flex-col items-center gap-1 p-2 rounded-2xl active:bg-white/5 active:scale-95 transition-all flex-1"
                >
                    <Menu size={20} className="text-white/70" />
                    <span className="text-[9px] font-black uppercase tracking-tighter text-white/40">{language === 'bn' ? 'ক্যাটাগরি' : 'Menu'}</span>
                </button>

                {/* Cart */}
                <button
                    onClick={onOpenCart}
                    className="relative flex flex-col items-center gap-1 p-2 rounded-2xl active:bg-white/5 active:scale-95 transition-all flex-1"
                >
                    <div className="relative">
                        <ShoppingBag size={20} className="text-[#ce112d]" />
                        {cartCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-black text-[8px] font-black rounded-full flex items-center justify-center border border-black shadow-lg">
                                {cartCount}
                            </span>
                        )}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-tighter text-white/40">{t('cart')}</span>
                </button>

                {/* Track */}
                <button
                    onClick={onTrackOrder}
                    className="flex flex-col items-center gap-1 p-2 rounded-2xl active:bg-white/5 active:scale-95 transition-all flex-1"
                >
                    <Search size={20} className="text-white/70" />
                    <span className="text-[9px] font-black uppercase tracking-tighter text-white/40">{t('tracking')}</span>
                </button>

                {/* Language Toggle */}
                <button
                    onClick={toggleLanguage}
                    className="flex flex-col items-center gap-1 p-2 rounded-2xl active:bg-[#ce112d]/20 active:scale-95 transition-all flex-1"
                >
                    <Globe size={20} className="text-[#ce112d]" />
                    <span className="text-[9px] font-black uppercase tracking-tighter text-[#ce112d]">{language === 'bn' ? 'EN' : 'বাং'}</span>
                </button>
            </div>
        </div>
    );
};

export default CustomerMenu;
