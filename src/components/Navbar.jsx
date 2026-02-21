import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

const Navbar = ({ selectedCategory, onSelectCategory, searchQuery, onSearchChange }) => {
    const categories = ['All', 'Men', 'Women', 'Kids (Boys)', 'Kids (Girls)'];
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center justify-center py-6 bg-black border-b border-white/5 backdrop-blur-xl transition-all duration-300">
            {/* Top Bar with Logo and Search */}
            <div className="w-full max-w-7xl px-4 md:px-8 mb-6 flex items-center justify-between relative">
                {/* Spacer for centering logo if needed, but we'll use justify-between */}
                <div className="w-10 md:w-32 hidden md:block"></div>

                <div className="flex flex-col items-center gap-2 flex-1">
                    <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter select-none">
                        <span className="text-white">BIG</span>
                        <span className="text-[#ce112d]">BAZAR</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    {/* Search Component */}
                    <div className={`relative flex items-center transition-all duration-500 ease-in-out ${isSearchOpen ? 'w-[200px] md:w-[300px]' : 'w-10'}`}>
                        <div className={`absolute right-0 flex items-center w-full transition-all duration-500 ${isSearchOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder="Search products..."
                                className="w-full bg-neutral-900 border border-white/10 rounded-full py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-[#ce112d]/50 transition-all font-bold"
                                autoFocus={isSearchOpen}
                            />
                            <Search size={16} className="absolute left-4 text-neutral-500" />
                            <button
                                onClick={() => {
                                    setIsSearchOpen(false);
                                    onSearchChange('');
                                }}
                                className="absolute right-3 p-1 hover:bg-white/5 rounded-full transition-colors"
                            >
                                <X size={14} className="text-neutral-500" />
                            </button>
                        </div>

                        {!isSearchOpen && (
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="p-3 bg-neutral-900 border border-white/5 rounded-full hover:bg-neutral-800 transition-all group shadow-lg"
                            >
                                <Search size={18} className="text-white group-hover:text-[#ce112d] transition-colors" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation Pills */}
            <div className="w-full overflow-x-auto no-scrollbar px-4">
                <div className="flex flex-nowrap md:justify-center gap-3 min-w-max mx-auto">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => onSelectCategory(cat)}
                            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-full transition-all duration-300 whitespace-nowrap ${selectedCategory === cat
                                ? 'bg-[#ce112d] text-white shadow-[0_0_20px_rgba(206,17,45,0.4)] scale-105'
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
