import { Search, ShoppingBag, Globe, MapPin, Bell } from 'lucide-react';
import { useCart } from '../CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ selectedCategory, onSelectCategory, onTrackOrder, onOpenCart }) => {
    const { cartCount } = useCart();
    const { language, toggleLanguage, t } = useLanguage();
    const navigate = useNavigate();

    const categories = [
        { id: 'All', label: t('all') },
        { id: 'Men', label: t('men') },
        { id: 'Women', label: t('women') },
        { id: 'Kids (Boys)', label: t('boys') },
        { id: 'Kids (Girls)', label: t('girls') }
    ];

    return (
        <nav className="relative z-[1002] border-b transition-all duration-300" style={{ backgroundColor: 'var(--navbar-bg)', borderColor: 'var(--border-color)' }}>
            {/* Top Row — App Style Location (Mobile Only) */}
            <div className="md:hidden w-full px-4 pt-4 pb-2 flex items-center justify-between">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-[10px] uppercase font-black text-neutral-400 tracking-widest">
                        <span>{language === 'bn' ? 'ডেলিভারি এরিয়া' : 'Deliver to'}</span>
                        <MapPin size={10} className="text-[#ce112d]" />
                    </div>
                    <div className="text-sm font-black italic flex items-center gap-1">
                        <span>Bariarhat, Mirsarai</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={toggleLanguage}
                        className="h-9 px-3 rounded-full bg-neutral-100 flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                        <Globe size={14} className="text-[#ce112d]" />
                        <span className="text-[10px] font-black">{language === 'bn' ? 'EN' : 'বাং'}</span>
                    </button>
                    <button className="h-9 w-9 rounded-full bg-neutral-100 flex items-center justify-center relative active:scale-95 transition-all">
                        <Bell size={16} />
                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#ce112d] rounded-full border-2 border-white" />
                    </button>
                </div>
            </div>

            {/* Main Row — Logo + Desktop Nav */}
            <div className="w-full max-w-7xl mx-auto px-4 md:px-8 h-14 md:h-16 flex items-center justify-between">
                {/* Logo */}
                <h1 
                    onClick={() => navigate('/')}
                    className="text-xl md:text-2xl font-black italic tracking-tighter select-none leading-none cursor-pointer" 
                    style={{ color: 'var(--text-primary)' }}
                >
                    <span>BIG</span>
                    <span className="text-[#ce112d]">BAZAR</span>
                </h1>

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center gap-3">
                    <button
                        onClick={onTrackOrder}
                        className="h-10 px-4 rounded-xl text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all hover:bg-neutral-100"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        <Search size={14} className="text-[#ce112d]" />
                        <span>{t('track')}</span>
                    </button>
                    <button
                        onClick={onOpenCart}
                        className="relative h-10 px-4 rounded-xl flex items-center gap-2 transition-all bg-[#ce112d] text-white active:scale-95"
                    >
                        <ShoppingBag size={14} />
                        <span className="text-[11px] font-black uppercase tracking-wider">{t('cart')}</span>
                        {cartCount > 0 && (
                            <span className="bg-white text-[#ce112d] px-1.5 rounded-md text-[10px] font-black">
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Category Pills (Mobile Only) */}
            <div className="md:hidden w-full overflow-x-auto no-scrollbar pb-3">
                <div className="flex items-center gap-2 px-4 min-w-max mx-auto">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => onSelectCategory(cat.id)}
                            className={`px-5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all duration-300 whitespace-nowrap active:scale-95 ${selectedCategory === cat.id
                                ? 'bg-[#ce112d] text-white shadow-[0_4px_12px_rgba(206,17,45,0.3)]'
                                : 'bg-neutral-100 text-neutral-500'
                                }`}
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
