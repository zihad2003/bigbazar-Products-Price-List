import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, User, ClipboardList } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const CustomerMenu = ({ onTrackOrder, onOpenCart, onOpenCategories, onSelectCategory, onOpenAuth }) => {
    const { language } = useLanguage();
    const { cartCount } = useCart();
    const { user, isLoggedIn } = useAuth();
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

    const handleAccountClick = () => {
        // Same sign-in / account page on mobile and desktop
        navigate('/account');
    };

    const sideBtn = 'flex flex-col items-center justify-center flex-1 gap-1 min-w-0 active:scale-90 transition-all outline-none';

    return (
        <nav
            className="lg:hidden fixed bottom-0 left-0 right-0 z-[1001] overflow-visible bg-white border-t border-neutral-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]"
            style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
            <div className="relative flex items-center justify-between max-w-lg mx-auto h-14 px-2 overflow-visible">
                {/* Home */}
                <button
                    type="button"
                    onClick={handleHomeClick}
                    className={`${sideBtn} ${location.pathname === '/' && !location.search ? 'text-[#ce112d]' : 'text-neutral-400'}`}
                >
                    <Home size={22} strokeWidth={2} />
                    <span className="text-[10px] font-medium leading-none">
                        {language === 'bn' ? 'হোম' : 'Home'}
                    </span>
                </button>

                {/* Categories */}
                <button
                    type="button"
                    onClick={onOpenCategories}
                    className={`${sideBtn} text-neutral-400`}
                >
                    <LayoutGrid size={22} strokeWidth={2} />
                    <span className="text-[10px] font-medium leading-none">
                        {language === 'bn' ? 'ক্যাটাগরি' : 'Categories'}
                    </span>
                </button>

                {/* Spacer for floating cart */}
                <div className="flex-1 relative h-full pointer-events-none" aria-hidden="true" />

                {/* Orders */}
                <button
                    type="button"
                    onClick={onTrackOrder}
                    className={`${sideBtn} text-neutral-400`}
                >
                    <ClipboardList size={22} strokeWidth={2} />
                    <span className="text-[10px] font-medium leading-none">
                        {language === 'bn' ? 'অর্ডার' : 'Orders'}
                    </span>
                </button>

                {/* Account */}
                <button
                    type="button"
                    onClick={handleAccountClick}
                    className={`${sideBtn} ${location.pathname === '/account' ? 'text-[#ce112d]' : 'text-neutral-400'}`}
                >
                    {isLoggedIn && user?.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-[22px] h-[22px] rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                        <User size={22} strokeWidth={2} />
                    )}
                    <span className="text-[10px] font-medium leading-none">
                        {language === 'bn' ? 'অ্যাকাউন্ট' : 'Account'}
                    </span>
                </button>

                {/* Floating center cart — half above the bar (matches reference) */}
                <button
                    type="button"
                    onClick={onOpenCart}
                    aria-label={language === 'bn' ? 'ব্যাগ' : 'Cart'}
                    className="absolute left-1/2 top-0 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white bg-[#ce112d] shadow-[0_8px_24px_rgba(206,17,45,0.45)] outline-none transition-transform active:scale-95"
                >
                    <span className="relative inline-flex">
                        <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="8" cy="21" r="1" />
                            <circle cx="19" cy="21" r="1" />
                            <path d="m2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                        </svg>
                        {cartCount > 0 && (
                            <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#ce112d] bg-white px-0.5 text-[10px] font-bold leading-none text-[#ce112d]">
                                {cartCount > 99 ? '99+' : cartCount}
                            </span>
                        )}
                    </span>
                </button>
            </div>
        </nav>
    );
};

export default CustomerMenu;
