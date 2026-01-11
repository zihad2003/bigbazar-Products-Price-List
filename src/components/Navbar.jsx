
import React from 'react';

const Navbar = ({ selectedCategory, onSelectCategory }) => {
    const categories = ['All', 'Men', 'Women', 'Kids (Boys)', 'Kids (Girls)'];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center justify-center py-6 bg-black border-b border-white/5 backdrop-blur-xl transition-all duration-300">
            {/* Logo Section */}
            <div className="mb-6">
                <img src="/logo.png" alt="Big Bazar" className="h-16 md:h-20 object-contain drop-shadow-[0_0_15px_rgba(206,17,45,0.5)]" />
            </div>

            {/* Navigation Pills */}
            <div className="w-full overflow-x-auto no-scrollbar px-4">
                <div className="flex flex-nowrap md:justify-center gap-3 min-w-max mx-auto">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => onSelectCategory(cat)}
                            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-full transition-all duration-300 whitespace-nowrap ${selectedCategory === cat
                                ? 'bg-[#ce112d] text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] scale-105'
                                : 'bg-neutral-900 text-white/40 hover:bg-neutral-800 hover:text-white border border-white/5'
                                }`}
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
