import { Search, X } from 'lucide-react';
import { useTheme } from '../ThemeContext';

const Navbar = ({ selectedCategory, onSelectCategory, onTrackOrder }) => {
    const { theme } = useTheme();
    const isRamadan = theme === 'ramadan';
    const accentColor = isRamadan ? '#fbbf24' : '#ce112d';
    const categories = ['All', 'Men', 'Women', 'Kids (Boys)', 'Kids (Girls)'];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center justify-center py-4 md:py-6 backdrop-blur-xl transition-all duration-300 border-b" style={{ backgroundColor: 'var(--navbar-bg)', borderColor: 'var(--border-color)' }}>
            {/* Logo Section */}
            <div className="w-full max-w-7xl px-4 md:px-8 mb-4 md:mb-6 flex items-center justify-between">
                <div className="w-10 md:w-24 shrink-0" /> {/* Spacer */}
                <div className="flex flex-col items-center gap-2 flex-grow">
                    <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter select-none" style={{ color: 'var(--text-primary)' }}>
                        <span>BIG</span>
                        <span style={{ color: accentColor }}>BAZAR</span>
                    </h1>
                </div>
                <div className="shrink-0 flex items-center">
                    <button
                        onClick={onTrackOrder}
                        className="px-3 md:px-5 py-1.5 md:py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white hover:bg-white hover:text-black transition-all flex items-center gap-2 shadow-lg group"
                    >
                        <Search size={14} style={{ color: accentColor }} className="group-hover:text-black transition-colors" />
                        <span className="hidden sm:inline">ট্র্যাক করুন</span>
                        <span className="sm:hidden">Tracking</span>
                    </button>
                </div>
            </div>

            {/* Navigation Pills */}
            <div className="w-full overflow-x-auto no-scrollbar px-4">
                <div className="flex flex-nowrap md:justify-center gap-2 md:gap-3 min-w-max mx-auto">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => onSelectCategory(cat)}
                            className={`px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full transition-all duration-300 whitespace-nowrap ${selectedCategory === cat
                                ? 'text-white scale-105'
                                : 'hover:scale-105'
                                }`}
                            style={selectedCategory === cat ? {
                                backgroundColor: accentColor,
                                boxShadow: `0 0 20px ${accentColor}66`
                            } : {
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-muted)',
                                borderWidth: '1px',
                                borderColor: 'var(--border-color)'
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
