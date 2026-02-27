import React from 'react';
import { Search, X } from 'lucide-react';

const Navbar = ({ selectedCategory, onSelectCategory }) => {
    const categories = ['All', 'Men', 'Women', 'Kids (Boys)', 'Kids (Girls)'];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center justify-center py-4 md:py-6 backdrop-blur-xl transition-all duration-300 border-b" style={{ backgroundColor: 'var(--navbar-bg)', borderColor: 'var(--border-color)' }}>
            {/* Logo Section */}
            <div className="mb-4 md:mb-6 flex flex-col items-center gap-2">
                <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter select-none" style={{ color: 'var(--text-primary)' }}>
                    <span>BIG</span>
                    <span className="text-[#ce112d]">BAZAR</span>
                </h1>
            </div>

            {/* Navigation Pills */}
            <div className="w-full overflow-x-auto no-scrollbar px-4">
                <div className="flex flex-nowrap md:justify-center gap-2 md:gap-3 min-w-max mx-auto">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => onSelectCategory(cat)}
                            className={`px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full transition-all duration-300 whitespace-nowrap ${selectedCategory === cat
                                ? 'bg-[#ce112d] text-white shadow-[0_0_20px_rgba(206,17,45,0.4)] scale-105'
                                : 'hover:scale-105'
                                }`}
                            style={selectedCategory !== cat ? {
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-muted)',
                                borderWidth: '1px',
                                borderColor: 'var(--border-color)'
                            } : {}}
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
