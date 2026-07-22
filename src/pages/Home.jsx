import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, Award, Play, Instagram, Video, ShoppingBag, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HeroSlider from '../components/sliders/HeroSlider';
import ProductModal from '../components/modals/ProductModal';
import TickerAnnouncement from '../components/TickerAnnouncement';
import { bigBazarApi, API_URL } from '../api/client';
import { calculatePrice } from '../utils/pricing';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import { useLanguage } from '../contexts/LanguageContext';
import { extractInstagramId } from '../utils/instagram';

// ─── Clothing Silhouette SVG Icons ───────────────────────────────────────────
const IconAll = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IconMen = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {/* Kurta/Panjabi silhouette */}
    <path d="M8 3h8" />
    <path d="M7 3L4 8l3 1v10h10V9l3-1-3-5" />
    <path d="M10 3v4" />
    <path d="M14 3v4" />
    <path d="M10 7h4" />
  </svg>
);

const IconWomen = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {/* Saree/dress silhouette */}
    <path d="M9 2h6" />
    <path d="M9 2c-1 0-2 1-2 2v3l-3 2 2 2h2v9h8V11h2l2-2-3-2V4c0-1-1-2-2-2" />
    <path d="M9 11c1 3 5 4 6 9" />
  </svg>
);

const IconBoy = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {/* Small Panjabi + shorts */}
    <path d="M9 3h6" />
    <path d="M8 3L6 7l3 1v4h6V8l3-1-2-4" />
    <path d="M9 12v6h2v-4h2v4h2v-6" />
  </svg>
);

const IconGirl = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {/* Small frock silhouette */}
    <path d="M9 3h6" />
    <path d="M9 3L7 6l2 1v4h6V7l2-1-2-3" />
    <path d="M7 11l-2 8h14l-2-8" />
  </svg>
);

const IconNew = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

const IconSale = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);
const IconPremium = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 15l-2 5L9 9l11 4-5 2zm0 0l4 4M7.5 13.5L5 15l1 1M8.5 8L7 5l-1 1M15.5 8L17 5l1 1" />
    <path d="M12 7a5 5 0 100 10 5 5 0 000-10z" />
  </svg>
);
// ─────────────────────────────────────────────────────────────────────────────

const ProductCard = ({ product, onClick }) => {
  const { price, originalPrice, hasDiscount } = calculatePrice(product);
  const hasVideo = !!product.video_url;

  // Choose the best candidate for the display image
  let sourceImage = product.image_url || product.images?.[0];

  // If no image but has video, use video (normalization happens in getOptimizedUrl)
  if (!sourceImage && hasVideo) {
    sourceImage = product.video_url;
  }

  const { language } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onClick={() => onClick(product)}
      className="bg-white rounded-[24px] md:rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-neutral-100 cursor-pointer group flex flex-col h-full"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-neutral-50 shrink-0">
        {sourceImage ? (
          <div className="relative w-full h-full">
            <img
              src={getOptimizedUrl(sourceImage, mediaSizes.thumbnail)}
              className="w-full h-auto object-cover object-top group-hover:scale-110 transition-transform duration-1000"
              alt={product.name}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="w-full h-full bg-neutral-50 flex items-center justify-center">
            <Instagram size={22} className="text-zinc-200" />
          </div>
        )}
        {hasDiscount && (
          <div className="absolute top-4 left-4 bg-[#ce112d] text-white text-[10px] font-bold uppercase tracking-wide py-1 px-3 rounded-full shadow-lg">
            SALE
          </div>
        )}
        {product.is_sold_out && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center p-6 text-center">
            <span className="text-xs font-bold uppercase text-neutral-900 border-2 border-neutral-900 px-4 py-2 rounded-xl">
              {language === 'bn' ? 'স্টক নেই' : 'Sold Out'}
            </span>
          </div>
        )}
      </div>
      <div className="p-4 md:p-6 flex flex-col flex-1 gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-wide truncate">
            {product.category || 'Clothing'}
          </p>
          <h4 className="text-sm md:text-base font-bold text-neutral-800 line-clamp-2 leading-tight min-h-[44px]">{product.name}</h4>
        </div>
        <div className="mt-auto flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-lg md:text-xl font-black text-[#ce112d] italic">৳ {price}</span>
            {hasDiscount && (
              <span className="text-[10px] text-neutral-300 line-through font-bold">৳ {originalPrice}</span>
            )}
          </div>
          <button className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-400 group-hover:bg-[#ce112d] group-hover:text-white transition-all shadow-sm">
            <ArrowRight size={18} strokeWidth={3} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const ProductSkeleton = () => (
  <div className="bg-white rounded-[24px] md:rounded-[32px] overflow-hidden border border-neutral-100 animate-pulse h-full">
    <div className="aspect-[4/5] bg-neutral-200" />
    <div className="p-4 md:p-6 space-y-3">
      <div className="h-2 w-16 bg-neutral-100 rounded-full" />
      <div className="h-4 w-full bg-neutral-200 rounded-lg" />
      <div className="h-4 w-2/3 bg-neutral-100 rounded-lg" />
      <div className="mt-8 flex justify-between items-end">
        <div className="h-6 w-20 bg-neutral-100 rounded-lg" />
        <div className="h-10 w-10 bg-neutral-200 rounded-2xl" />
      </div>
    </div>
  </div>
);

const DEFAULT_SLIDES = [];

const PAGE_SIZE = 20;

const Home = ({ selectedCategory, setSelectedCategory, searchQuery, onSearchChange }) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [siteSettings, setSiteSettings] = useState({
    main_slides: [],
    announcement: '',
    category_visibility: { show_new: true, show_sale: true, show_exclusive: true }
  });

  // Fetch settings with robust fallback
  // The /api/settings endpoint returns { data: { main_slides: [...], ... } } — a flat object.
  // We unpack it directly rather than iterating over array rows.
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await bigBazarApi.from('site_settings').select('*');
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          // Flat object: { main_slides: [...], announcement: '', ... }
          setSiteSettings(prev => ({
            ...prev,
            ...data,
            main_slides: Array.isArray(data.main_slides) ? data.main_slides : [],
          }));
        } else if (data && Array.isArray(data)) {
          // Legacy array-of-rows fallback: [{ key, value }, ...]
          const settingsMap = {};
          data.forEach(item => { settingsMap[item.key] = item.value; });
          setSiteSettings(prev => ({ ...prev, ...settingsMap }));
        }
      } catch (err) {
        console.error('Settings fetch failed', err);
      } finally {
        setSettingsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Fetch products with pagination & filtering
  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      setLoading(true);
      const start = page * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      let query = bigBazarApi
        .from('products')
        .select('*', { count: 'exact' })
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(start, end);

      if (selectedCategory && selectedCategory !== 'All') {
        if (selectedCategory === 'New') {
          query = query.eq('is_new', true);
        } else if (selectedCategory === 'Sale') {
          query = query.eq('is_sale', true);
        } else if (selectedCategory === 'Premium') {
          query = query.eq('is_exclusive', true);
        } else {
          const catMap = {
            'Men': ['Men', 'ছেলেদের'],
            'Women': ['Women', 'মেয়েদের'],
            'Kids (Boys)': ['Kids (Boys)', 'বাচ্চাদের (ছেলে)'],
            'Kids (Girls)': ['Kids (Girls)', 'বাচ্চাদের (মেয়ে)']
          };
          const searchCats = catMap[selectedCategory] || [selectedCategory];
          query = query.in('category', searchCats);
        }
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query;

      if (isMounted) {
        if (data) {
          if (page === 0) setProducts(data);
          else setProducts(prev => [...prev, ...data]);
          setHasMore(count > (page + 1) * PAGE_SIZE);
        }
        setLoading(false);
      }
    };

    fetchProducts();
    return () => { isMounted = false; };
  }, [page, selectedCategory, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [selectedCategory, searchQuery]);

  const visibility = siteSettings.category_visibility || {};
  const categories = [
    { id: 'All', icon: <IconAll size={22} />, label: t('all') },
    { id: 'Men', icon: <IconMen size={22} />, label: t('men') },
    { id: 'Women', icon: <IconWomen size={22} />, label: t('women') },
    { id: 'Kids (Boys)', icon: <IconBoy size={22} />, label: t('boys') },
    { id: 'Kids (Girls)', icon: <IconGirl size={22} />, label: t('girls') },
  ];

  return (
    <div className="min-h-screen bg-white pb-16">
      {/* Elite Hero Section — full-width banner, DB-controlled */}
      {!settingsLoading && siteSettings.main_slides?.length > 0 && (
        <section className="w-full relative">
          <div className="w-full max-h-[62vh] h-[320px] sm:h-[400px] md:h-[460px] lg:h-[500px] overflow-hidden bg-neutral-950 relative">
            <HeroSlider slides={siteSettings.main_slides} />
          </div>
          {siteSettings.ticker_announcement?.position === 'bottom_slider' && (
            <TickerAnnouncement ticker={siteSettings.ticker_announcement} />
          )}
        </section>
      )}

      {/* Hero loading skeleton */}
      {settingsLoading && (
        <section className="w-full">
          <div className="w-full max-h-[62vh] h-[320px] sm:h-[400px] md:h-[460px] lg:h-[500px] bg-neutral-100 animate-pulse flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-[#ce112d]/20 border-t-[#ce112d] rounded-full animate-spin" />
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-12 mt-8 md:mt-12 space-y-10">
        {/* Maintenance Notice */}
        {/* No Products Found */}
        {/* Smart Proportional Empty State */}
        {!loading && products.length === 0 && (
          <section className="px-2">
            <div className="bg-gradient-to-b from-[#ce112d]/[0.03] via-zinc-50/50 to-white border border-zinc-200/80 rounded-[32px] p-8 md:p-14 flex flex-col items-center text-center gap-6 shadow-sm max-w-3xl mx-auto">
              <div className="w-20 h-20 bg-gradient-to-b from-[#ce112d]/15 to-[#ce112d]/5 rounded-3xl flex items-center justify-center border border-[#ce112d]/20 text-[#ce112d] shadow-xl shadow-red-900/10 transform hover:scale-105 transition-transform">
                <ShoppingBag size={36} strokeWidth={2} />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl md:text-3xl font-black text-neutral-900 tracking-tight uppercase italic">
                  {language === 'bn' ? 'কোনো পণ্য পাওয়া যায়নি' : 'No Products Available'}
                </h2>
                <p className="text-xs md:text-sm text-neutral-600 max-w-lg mx-auto leading-relaxed font-medium">
                  {language === 'bn'
                    ? 'দুঃখিত,কোনো পণ্য পাওয়া যায়নি। অনুগ্রহ করে সকল পণ্য ক্লিক করুন অথবা অন্য ক্যাটাগরি সিলেক্ট করুন।'
                    : 'Sorry,no items matched. Try exploring all collections or clearing your search filter.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (setSelectedCategory) setSelectedCategory('All');
                  if (onSearchChange) onSearchChange('');
                }}
                className="mt-2 px-8 py-3.5 bg-[#ce112d] hover:bg-[#b00e26] text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-red-900/30 active:scale-95 transition-all flex items-center gap-2"
              >
                <span>{language === 'bn' ? 'সকল পণ্য দেখুন' : 'Explore All Collections'}</span>
              </button>
            </div>
          </section>
        )}

        {/* Category Grid */}
        <section>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="flex flex-col items-center gap-2 transition-all active:scale-95 group"
              >
                <div className={`w-12 h-12 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg ${selectedCategory === cat.id ? 'bg-[#ce112d] text-white ring-4 ring-[#ce112d]/10 scale-110' : 'bg-zinc-50 text-zinc-400 group-hover:bg-zinc-100 group-hover:text-zinc-900'}`}>
                  <div className="transition-transform duration-500">{cat.icon}</div>
                </div>
                <span className={`block text-[10px] md:text-[11px] font-bold uppercase tracking-wide transition-colors ${selectedCategory === cat.id ? 'text-[#ce112d]' : 'text-zinc-500'}`}>{cat.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Search Bar - Left Aligned */}
        <div className="max-w-sm">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-[#ce112d] transition-colors" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={language === 'bn' ? 'পণ্য খুঁজুন...' : 'Search products...'}
              className="w-full bg-zinc-50 border border-transparent focus:border-[#ce112d]/10 focus:bg-white rounded-2xl py-3.5 pl-12 pr-6 text-sm outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Dynamic Product Grid */}
        <section className="space-y-8 pt-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-4">
              <h3 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter leading-none text-zinc-900">
                {searchQuery ? (language === 'bn' ? 'অনুসন্ধান ফলাফল' : 'Search Results') : (selectedCategory === 'All' ? (language === 'bn' ? 'নতুন কালেকশন' : 'New Arrival') : selectedCategory)}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {loading && page === 0 ? (
              Array.from({ length: 12 }).map((_, i) => <ProductSkeleton key={i} />)
            ) : (
              products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => navigate(`/product/${product.id}`)}
                />
              ))
            )}
          </div>

          {loading && page > 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-10 h-10 border-4 border-[#ce112d] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-[#ce112d] animate-pulse">Loading more...</p>
            </div>
          )}

          {/* Minimal Modern Load More Section */}
          {hasMore && !loading && (
            <div className="flex flex-col items-center justify-center pt-12 pb-6 gap-3">
              <button
                onClick={() => setPage(prev => prev + 1)}
                className="group inline-flex items-center gap-3 px-10 py-4 bg-zinc-900 hover:bg-[#ce112d] text-white text-xs font-black uppercase tracking-[0.2em] rounded-full shadow-xl hover:shadow-red-900/30 active:scale-95 transition-all duration-300 border border-white/10"
              >
                <span>{language === 'bn' ? 'আরো পণ্য দেখুন' : 'Explore More Designs'}</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em]">
                {language === 'bn' ? 'প্রিমিয়াম কালেকশন • ট্রেন্ডিং ডিজাইন' : 'Selective Edits • Premium Catalog'}
              </span>
            </div>
          )}
        </section>

        {/* Global Footer Accent - Clean & Minimal */}
        <section className="py-16 text-center">
          <div className="inline-flex flex-col items-center gap-8 group">
            <div className="relative">
              <div className="absolute inset-0 bg-[#ce112d]/5 rounded-full blur-3xl group-hover:bg-[#ce112d]/10 transition-colors" />
              <div className="relative w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-2xl border border-zinc-50 transition-transform duration-1000 group-hover:rotate-[360deg]">
                <Award size={40} className="text-[#ce112d]" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-black uppercase tracking-[0.6em] text-zinc-900 leading-none">Big Bazar</p>
              <p className="text-[10px] uppercase font-black tracking-[0.3em] text-zinc-300 italic"> Baraiyarhat Mirsharai Chattagram</p>
            </div>
          </div>
        </section>
      </div>

      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
};

export default Home;
