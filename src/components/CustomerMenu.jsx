import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingBag, Globe, LayoutGrid, Tag, User, ReceiptText } from 'lucide-react';
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

    const navItems = [
        {
            id: 'home',
            icon: <Home size={22} />,
            label: language === 'bn' ? 'হোম' : 'Home',
            onClick: handleHomeClick,
            active: location.pathname === '/' && !location.search
        },
        {
            id: 'offers',
            icon: <Tag size={22} />,
            label: language === 'bn' ? 'অফার' : 'Offers',
            onClick: () => { if (onSelectCategory) onSelectCategory('Offers'); navigate('/'); },
            active: false
        },
        {
            id: 'cart',
            isCenter: true,
            icon: (
                <div className="relative">
                    <ShoppingBag size={28} className="text-white" />
                    {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-white text-[#ce112d] text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#ce112d]">
                            {cartCount}
                        </span>
                    )}
                </div>
            ),
            onClick: onOpenCart,
        },
        {
            id: 'tracking',
            icon: <ReceiptText size={22} />,
            label: language === 'bn' ? 'ট্র্যাকিং' : 'Orders',
            onClick: onTrackOrder,
            active: false
        },
        {
            id: 'account',
            icon: <User size={22} />,
            label: language === 'bn' ? 'অ্যাকাউন্ট' : 'Account',
            onClick: () => navigate('/admin'),
            active: location.pathname === '/admin'
        }
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[1001] bg-white border-t border-neutral-100 px-4 pt-2 pb-safe-area shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between max-w-lg mx-auto h-14 relative">
                {navItems.map((item) => (
                    <React.Fragment key={item.id}>
                        {item.isCenter ? (
                            <div className="absolute left-1/2 -translate-x-1/2 -top-10 flex flex-col items-center pointer-events-auto">
                                <button
                                    onClick={item.onClick}
                                    className="w-16 h-16 bg-[#ce112d] rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(206,17,45,0.4)] border-4 border-white active:scale-95 transition-all outline-none"
                                >
                                    {item.icon}
                                </button>
                                <div className="absolute top-[70px] bg-neutral-100 h-1 w-10 rounded-full" />
                            </div>
                        ) : (
                            <button
                                onClick={item.onClick}
                                className={`flex flex-col items-center justify-center flex-1 gap-1 active:scale-90 transition-all outline-none ${item.active ? 'text-[#ce112d]' : 'text-neutral-400'}`}
                            >
                                <div className={`${item.active ? 'transform -translate-y-1' : ''} transition-transform duration-300`}>
                                    {item.icon}
                                </div>
                                <span className="text-[10px] font-medium leading-none">
                                    {item.label}
                                </span>
                            </button>
                        )}
                        {/* Placeholder for center spacing */}
                        {item.id === 'offers' && <div className="flex-1 pointer-events-none" />}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default CustomerMenu;
