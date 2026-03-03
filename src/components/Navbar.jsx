import { Search, X, ShoppingBag, Globe } from 'lucide-react';
import { useCart } from '../CartContext';
import { useLanguage } from '../contexts/LanguageContext';

const Navbar = ({ selectedCategory, onSelectCategory, onTrackOrder, onOpenCart }) => {
    const { cartCount } = useCart();
    const { language, toggleLanguage, t } = useLanguage();

    const categories = [
        { id: 'সব', label: t('all') },
        { id: 'ছেলেদের', label: t('men') },
        { id: 'মেয়েদের', label: t('women') },
        { id: 'বাচ্চাদের (ছেলে)', label: t('boys') },
        { id: 'বাচ্চাদের (মেয়ে)', label: t('girls') }
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center justify-center py-4 md:py-6 backdrop-blur-xl transition-all duration-300 border-b" style={{ backgroundColor: 'var(--navbar-bg)', borderColor: 'var(--border-color)' }}>
            {/* Logo Section */}
            <div className="w-full max-w-7xl px-4 md:px-8 mb-4 md:mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter select-none" style={{ color: 'var(--text-primary)' }}>
                        <span>BIG</span>
                        <span className="text-[#ce112d]">BAZAR</span>
                    </h1>
                </div>

                <div className="shrink-0 flex items-center gap-2 md:gap-4">
                    {/* Language Switcher */}
                    <button
                        onClick={toggleLanguage}
                        className="px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:border-[#ce112d]/50 transition-all flex items-center gap-2 shadow-lg group"
                    >
                        <Globe size={14} className="text-[#ce112d]" />
                        <span>{language === 'bn' ? 'English' : 'বাংলা'}</span>
                    </button>

                    <button
                        onClick={onOpenCart}
                        className="relative p-2.5 md:p-3 bg-neutral-900 border border-white/10 rounded-xl text-white hover:bg-white hover:text-black transition-all shadow-lg group"
                    >
                        <ShoppingBag size={18} className="text-[#ce112d] group-hover:text-black transition-colors" />
                        {cartCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#ce112d] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-black group-hover:border-white shadow-xl">
                                {cartCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={onTrackOrder}
                        className="px-3 md:px-5 py-2 md:py-3 bg-neutral-900 border border-white/10 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white hover:bg-white hover:text-black transition-all flex items-center gap-2 shadow-lg group"
                    >
                        <Search size={14} className="text-[#ce112d] group-hover:text-black transition-colors" />
                        <span className="hidden sm:inline">{t('track')}</span>
                        <span className="sm:hidden">{t('tracking')}</span>
                    </button>
                </div>
            </div>

            {/* Navigation Pills */}
            <div className="w-full overflow-x-auto no-scrollbar px-4">
                <div className="flex flex-nowrap md:justify-center gap-2 md:gap-3 min-w-max mx-auto">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => onSelectCategory(cat.id)}
                            className={`px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full transition-all duration-300 whitespace-nowrap ${selectedCategory === cat.id
                                ? 'bg-[#ce112d] text-white shadow-[0_0_20px_rgba(206,17,45,0.4)] scale-105'
                                : 'hover:scale-105'
                                }`}
                            style={selectedCategory !== cat.id ? {
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-muted)',
                                borderWidth: '1px',
                                borderColor: 'var(--border-color)'
                            } : {}}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
