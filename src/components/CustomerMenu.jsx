import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingBag, Globe, LayoutGrid } from 'lucide-react';
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
        if (location.pathname !== '/') {
            navigate('/');
            setTimeout(() => {
                if (onOpenCategories) onOpenCategories();
            }, 150);
        } else {
            if (onOpenCategories) onOpenCategories();
        }
    };

    const items = [
        {
            key: 'home',
            icon: <Home size={20} strokeWidth={1.8} />,
            label: language === 'bn' ? 'হোম' : 'Home',
            onClick: handleHomeClick,
            accent: false,
        },
        {
            key: 'category',
            icon: <LayoutGrid size={20} strokeWidth={1.8} />,
            label: language === 'bn' ? 'ক্যাটাগরি' : 'Category',
            onClick: handleMenuClick,
            accent: false,
        },
        {
            key: 'cart',
            icon: (
                <div className="relative">
                    <ShoppingBag size={20} strokeWidth={1.8} />
                    {cartCount > 0 && (
                        <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] bg-[#ce112d] text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 leading-none shadow-md">
                            {cartCount}
                        </span>
                    )}
                </div>
            ),
            label: t('cart'),
            onClick: onOpenCart,
            accent: true,
        },
        {
            key: 'track',
            icon: <Search size={20} strokeWidth={1.8} />,
            label: t('tracking'),
            onClick: onTrackOrder,
            accent: false,
        },
        {
            key: 'lang',
            icon: <Globe size={20} strokeWidth={1.8} />,
            label: language === 'bn' ? 'EN' : 'বাং',
            onClick: toggleLanguage,
            accent: true,
        },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-3 pb-3 pointer-events-none">
            <div className="flex items-stretch justify-around bg-neutral-900/90 backdrop-blur-2xl border border-white/[0.06] rounded-2xl shadow-[0_-4px_30px_rgba(0,0,0,0.4)] pointer-events-auto max-w-sm mx-auto overflow-hidden">
                {items.map((item) => (
                    <button
                        key={item.key}
                        onClick={item.onClick}
                        className="flex flex-col items-center justify-center gap-[3px] py-2.5 flex-1 active:bg-white/5 transition-all"
                    >
                        <span className={item.accent ? 'text-[#ce112d]' : 'text-white/60'}>
                            {item.icon}
                        </span>
                        <span className={`text-[8px] font-bold uppercase tracking-wider leading-none ${item.accent ? 'text-[#ce112d]/80' : 'text-white/35'}`}>
                            {item.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default CustomerMenu;
