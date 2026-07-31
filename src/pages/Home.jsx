import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, Award, Play, Instagram, Video, ShoppingBag, Sparkles, Truck, CreditCard, CheckCircle, ChevronRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import HeroSlider from '../components/sliders/HeroSlider';
import { ProductCard, ProductSkeleton } from '../components/ProductCard';
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

const DEFAULT_SLIDES = [];

const PAGE_SIZE = 24;

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
          <div className="w-full overflow-hidden bg-neutral-950 relative"
            style={{ height: 'clamp(280px, 56vw, 640px)' }}
          >
            <HeroSlider slides={siteSettings.main_slides} />
          </div>
          {siteSettings.ticker_announcement?.position === 'bottom_slider' && (
            <TickerAnnouncement ticker={siteSettings.ticker_announcement} />
          )}
        </section>
      )}

      {settingsLoading && (
        <section className="w-full">
          <div className="w-full h-[60vh] md:h-[80vh] bg-neutral-100 animate-pulse flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-[#ce112d]/20 border-t-[#ce112d] rounded-full animate-spin" />
          </div>
        </section>
      )}

      {/* Trust Strip */}
      <section className="w-full border-b border-zinc-100 bg-white shadow-sm">
        <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-2 sm:px-0">
          <div className="grid grid-cols-3 divide-x divide-zinc-100">
            {[
              { icon: <Truck size={16} strokeWidth={1.75} />, title: language === 'bn' ? 'ফ্রি ডেলিভারি' : 'Free Delivery', sub: language === 'bn' ? 'মীরসরাই এলাকায়' : 'Within Mirsarai' },
              { icon: <CreditCard size={16} strokeWidth={1.75} />, title: language === 'bn' ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery', sub: language === 'bn' ? 'হাতে পেয়ে পেমেন্ট' : 'Pay on receipt' },
              { icon: <CheckCircle size={16} strokeWidth={1.75} />, title: language === 'bn' ? '১০০% গুণমান' : '100% Quality', sub: language === 'bn' ? 'প্রিমিয়াম ফেব্রিক' : 'Premium finish' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-1.5 sm:gap-3 py-2.5 sm:py-3.5 px-1 sm:px-4">
                <span className="text-[#ce112d] shrink-0">{item.icon}</span>
                <div>
                  <p className="text-[10px] sm:text-xs font-black text-zinc-900 uppercase tracking-tight sm:tracking-wide leading-tight">{item.title}</p>
                  <p className="text-[9px] sm:text-[10px] text-zinc-400 font-medium leading-none mt-0.5">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Wedding Collection Banner — Admin Controlled Canva Poster */}
      {siteSettings.wedding_banner?.enabled && siteSettings.wedding_banner?.image_url && (
        <section className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 md:px-12 mt-6 md:mt-8">
          <Link
            to={`/products?category=${encodeURIComponent(siteSettings.wedding_banner.category_filter || 'Wedding')}`}
            className="block relative w-full aspect-[16/6] sm:aspect-[16/5] md:aspect-[16/4] rounded-2xl md:rounded-3xl overflow-hidden group cursor-pointer shadow-xl hover:shadow-2xl transition-all duration-500"
          >
            <img
              src={siteSettings.wedding_banner.image_url}
              alt="Collection Banner"
              className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-700 ease-out"
              loading="lazy"
            />
          </Link>
        </section>
      )}

      <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 md:px-12 mt-8 md:mt-12 space-y-10">
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
        <div id="search-section" className="max-w-sm">
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

        {/* Dynamic Product Grid / Search Results */}
        <section className="space-y-8 pt-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <h3 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-none text-zinc-900">
                {searchQuery ? (language === 'bn' ? 'অনুসন্ধান ফলাফল' : 'Search Results') : (selectedCategory === 'All' ? (language === 'bn' ? 'নতুন কালেকশন' : 'New Arrival') : selectedCategory)}
              </h3>
              {searchQuery && (
                <p className="text-xs text-zinc-400 font-bold">
                  {language === 'bn' ? `"${searchQuery}" এর জন্য অনুসন্ধান করা হচ্ছে` : `Showing results for "${searchQuery}"`}
                </p>
              )}
            </div>
          </div>

          {loading && page === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-4 md:gap-6">
              {Array.from({ length: 24 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-4 md:gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => navigate(`/product/${product.id}`)}
                />
              ))}
            </div>
          ) : (
            /* Smart Proportional Empty State — Rendered right below search bar */
            <div className="bg-gradient-to-b from-[#ce112d]/[0.03] via-zinc-50/50 to-white border border-zinc-200/80 rounded-[32px] p-8 md:p-14 flex flex-col items-center text-center gap-6 shadow-sm max-w-3xl mx-auto my-4">
              <div className="w-20 h-20 bg-gradient-to-b from-[#ce112d]/15 to-[#ce112d]/5 rounded-3xl flex items-center justify-center border border-[#ce112d]/20 text-[#ce112d] shadow-xl shadow-red-900/10 transform hover:scale-105 transition-transform">
                <ShoppingBag size={36} strokeWidth={2} />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl md:text-3xl font-black text-neutral-900 tracking-tight uppercase italic">
                  {language === 'bn' ? 'কোনো পণ্য পাওয়া যায়নি' : 'No Products Available'}
                </h2>
                <p className="text-xs md:text-sm text-neutral-600 max-w-lg mx-auto leading-relaxed font-medium">
                  {searchQuery
                    ? (language === 'bn' ? `"${searchQuery}" নামে কোনো পণ্য পাওয়া যায়নি। অন্য কোনো নাম লিখে চেষ্টা করুন।` : `Sorry, no items matched "${searchQuery}". Try exploring all collections or clearing search.`)
                    : (language === 'bn' ? 'দুঃখিত, কোনো পণ্য পাওয়া যায়নি। অনুগ্রহ করে সকল পণ্য ক্লিক করুন অথবা অন্য ক্যাটাগরি সিলেক্ট করুন।' : 'Sorry, no items matched. Try exploring all collections or clearing your search filter.')}
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
          )}

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
