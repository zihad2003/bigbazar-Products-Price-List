import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { calculatePrice } from '../utils/pricing';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import { useLanguage } from '../contexts/LanguageContext';

export default function RecentlyViewed({ currentProductId }) {
    const { language } = useLanguage();
    const navigate = useNavigate();
    const [recentProducts, setRecentProducts] = useState([]);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('bigbazar_recently_viewed');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    // Exclude current product and take top 6
                    const filtered = parsed.filter(item => item && item.id !== currentProductId).slice(0, 6);
                    setRecentProducts(filtered);
                }
            }
        } catch (e) {
            console.error('Failed to read recently viewed products:', e);
        }
    }, [currentProductId]);

    if (!recentProducts || recentProducts.length === 0) return null;

    return (
        <section className="pt-10 border-t border-neutral-100">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Clock size={16} className="text-[#ce112d]" />
                    <h3 className="text-lg md:text-xl font-black uppercase italic tracking-tight text-neutral-900">
                        {language === 'bn' ? 'সম্প্রতি দেখেছেন' : 'Recently Viewed'}
                    </h3>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                {recentProducts.map((prod) => {
                    const { price } = calculatePrice(prod);
                    const displayImg = prod.image_url || prod.image || (prod.images && prod.images[0]);

                    return (
                        <div
                            key={prod.id}
                            onClick={() => {
                                navigate(`/product/${prod.id}`);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="bg-white rounded-2xl p-2 md:p-3 border border-neutral-100 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between"
                        >
                            <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-neutral-50 mb-2">
                                <img
                                    src={getOptimizedUrl(displayImg, mediaSizes.thumbnail)}
                                    alt={prod.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    loading="lazy"
                                />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest truncate">
                                    {prod.category || 'Clothing'}
                                </p>
                                <h4 className="text-xs font-bold text-neutral-800 truncate leading-tight">
                                    {prod.name}
                                </h4>
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-xs font-black text-[#ce112d] whitespace-nowrap">৳{price}</span>
                                    <div className="w-5 h-5 rounded-md bg-neutral-50 flex items-center justify-center text-neutral-400 group-hover:bg-[#ce112d] group-hover:text-white transition-all shrink-0">
                                        <ArrowRight size={10} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
