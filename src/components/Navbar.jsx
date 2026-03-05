import { Search, ShoppingBag, Globe } from 'lucide-react';
import { useCart } from '../CartContext';
import { useLanguage } from '../contexts/LanguageContext';

const Navbar = ({ selectedCategory, onSelectCategory, onTrackOrder, onOpenCart }) => {
    const { cartCount } = useCart();
    const { language, toggleLanguage, t } = useLanguage();

    const categories = [
        { id: 'All', label: t('all') },
        { id: 'Men', label: t('men') },
        { id: 'Women', label: t('women') },
        { id: 'Kids (Boys)', label: t('boys') },
        { id: 'Kids (Girls)', label: t('girls') }
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b transition-all duration-300" style={{ backgroundColor: 'var(--navbar-bg)', borderColor: 'var(--border-color)' }}>
            {/* Top Row — Logo + Actions */}
            <div className="w-full max-w-7xl mx-auto px-4 md:px-8 h-14 md:h-16 flex items-center justify-between">
                {/* Logo */}
                <h1 className="text-xl md:text-2xl font-black italic tracking-tighter select-none leading-none" style={{ color: 'var(--text-primary)' }}>
                    <span>BIG</span>
                    <span className="text-[#ce112d]">BAZAR</span>
                </h1>

                {/* Right Actions — all on same baseline */}
                <div className="flex items-center gap-2 md:gap-3">
                    {/* Language */}
                    <button
                        onClick={toggleLanguage}
                        className="h-9 px-3 rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderWidth: '1px', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    >
                        <Globe size={13} className="text-[#ce112d]" />
                        <span>{language === 'bn' ? 'EN' : 'বাং'}</span>
                    </button>

                    {/* Track */}
                    <button
                        onClick={onTrackOrder}
                        className="h-9 px-3 rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderWidth: '1px', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    >
                        <Search size={13} className="text-[#ce112d]" />
                        <span className="hidden sm:inline">{t('track')}</span>
                    </button>

                    {/* Cart */}
                    <button
                        onClick={onOpenCart}
                        className="relative h-9 w-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderWidth: '1px', borderColor: 'var(--border-color)' }}
                    >
                        <ShoppingBag size={16} className="text-[#ce112d]" />
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#ce112d] text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none shadow-lg" style={{ borderWidth: '2px', borderColor: 'var(--bg-primary)' }}>
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Category Pills — smooth horizontal scroll on mobile */}
            <div className="w-full overflow-x-auto no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="flex items-center gap-2 px-4 md:px-8 pb-3 pt-1 md:justify-center min-w-max mx-auto">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => onSelectCategory(cat.id)}
                            className={`px-4 md:px-5 py-1.5 md:py-2 text-[10px] md:text-[11px] font-bold uppercase tracking-wider rounded-full transition-all duration-200 whitespace-nowrap leading-tight active:scale-95 ${selectedCategory === cat.id
                                ? 'bg-[#ce112d] text-white shadow-[0_4px_16px_rgba(206,17,45,0.35)]'
                                : ''
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
