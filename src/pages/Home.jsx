import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, Award, Play, Instagram } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HeroSlider from '../components/HeroSlider';
import ProductModal from '../components/ProductModal';
import VideoPlayer from '../components/VideoPlayer';
import { supabase } from '../supabaseClient';
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
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  let displayImage = product.image_url || product.images?.[0];

  // Weserv Instagram thumbnail URLs are deprecated — attempt to recover the direct URL
  if (displayImage && displayImage.includes('weserv.nl') && displayImage.includes('instagram.com')) {
    const id = extractInstagramId(displayImage);
    displayImage = id ? `https://www.instagram.com/p/${id}/media/?size=l` : null;
  }

  // Handle local uploads from the Admin panel
  if (displayImage && (displayImage.startsWith('uploads/') || displayImage.startsWith('/uploads/'))) {
    const cleanPath = displayImage.startsWith('/') ? displayImage : `/${displayImage}`;
    displayImage = `${API_URL}${cleanPath}`;
  }

  const hasVideo = !!product.video_url;
  
  // High Priority: If there's a video url but no image, use the Instagram thumbnail as display image
  if (hasVideo && !displayImage) {
    const id = extractInstagramId(product.video_url);
    if (id) displayImage = `https://www.instagram.com/p/${id}/media/?size=l`;
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
        {displayImage ? (
          <div className="w-full h-full relative group/media">
            <img
              src={getOptimizedUrl(displayImage, mediaSizes.thumbnail)}
              className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-1000"
              alt={product.name}
              loading="lazy"
            />
            {hasVideo && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover/media:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                    <Play size={24} className="text-white fill-white ml-1" />
                  </div>
               </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full bg-neutral-900 flex flex-col items-center justify-center gap-3 group-hover:bg-neutral-800 transition-colors">
            <div className="w-14 h-14 rounded-full bg-[#ce112d]/10 border border-[#ce112d]/20 flex items-center justify-center">
              <Instagram size={22} className="text-neutral-500" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500">
               {language === 'bn' ? 'ছবি নেই' : 'No Preview'}
            </span>
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
      <div className="p-4 md:p-6 flex flex-col flex-1 gap-2">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-wide truncate">
            {product.category || 'Clothing'}
          </p>
          <h4 className="text-sm md:text-base font-bold text-neutral-800 line-clamp-2 leading-tight h-10">{product.name}</h4>
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
  <div className="bg-white rounded-[24px] md:rounded-[32px] overflow-hidden border border-neutral-100 animate-pulse flex flex-col h-full">
    <div className="aspect-[4/5] bg-neutral-100" />
    <div className="p-4 md:p-6 space-y-4 flex flex-col flex-1">
      <div className="space-y-2">
        <div className="h-2 w-16 bg-neutral-100 rounded-full" />
        <div className="h-4 w-full bg-neutral-100 rounded-lg" />
        <div className="h-4 w-2/3 bg-neutral-50 rounded-lg" />
      </div>
      <div className="mt-auto flex justify-between items-end">
        <div className="h-6 w-20 bg-neutral-100 rounded-lg" />
        <div className="h-10 w-10 bg-neutral-100 rounded-2xl" />
      </div>
    </div>
  </div>
);

const DEFAULT_SLIDES = [
  {
    id: 'default-1',
    title: 'Elite Panjabi Collection',
    subtitle: 'Curated Elegance 2026',
    image: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&q=80&w=1600',
    cta: 'Explore Collection'
  },
  {
    id: 'default-2',
    title: 'Selective Premium Sari',
    subtitle: 'Signature Styles',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=1600',
    cta: 'Shop Selective'
  }
];

const PAGE_SIZE = 12;

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
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('site_settings').select('*');
        if (data && Array.isArray(data)) {
          const settingsMap = {};
          data.forEach(item => {
            settingsMap[item.key] = item.value;
          });
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

      let query = supabase
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
    ...(visibility.show_new !== false ? [{ id: 'New', icon: <IconNew size={22} />, label: language === 'bn' ? 'নতুন' : 'New' }] : []),
    ...(visibility.show_sale !== false ? [{ id: 'Sale', icon: <IconSale size={22} />, label: language === 'bn' ? 'অফার' : 'Sale' }] : []),
    ...(visibility.show_exclusive !== false ? [{ id: 'Premium', icon: <IconPremium size={22} />, label: language === 'bn' ? 'এক্সক্লুসিভ' : 'Premium' }] : []),
  ];

  return (
    <div className="min-h-screen bg-white pb-16">
      {/* Elite Hero Section - Guaranteed Visibility */}
      <section className="w-full h-[55vh] md:h-[75vh] relative px-4 md:px-12 pt-4 md:pt-10">
        <div className="w-full h-full rounded-[32px] md:rounded-[54px] overflow-hidden shadow-2xl shadow-zinc-200 bg-neutral-50 relative">
          {settingsLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 animate-pulse">
              <div className="w-24 h-24 border-4 border-[#ce112d]/10 border-t-[#ce112d] rounded-full animate-spin" />
            </div>
          ) : (
            <HeroSlider slides={siteSettings.main_slides?.length > 0 ? siteSettings.main_slides : DEFAULT_SLIDES} />
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-12 mt-8 md:mt-12 space-y-10">
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
                {searchQuery ? (language === 'bn' ? 'অনুসন্ধান ফলাফল' : 'Search Results') : (selectedCategory === 'All' ? (language === 'bn' ? 'প্রিমিয়াম কালেকশন' : 'Selective Edits') : selectedCategory)}
              </h3>
              <div className="flex items-center gap-4">
                <div className="h-[2px] w-12 bg-[#ce112d]" />
                <p className="text-[11px] md:text-xs font-medium text-zinc-500">
                  {products.length} {language === 'bn' ? 'টি পণ্য পাওয়া গেছে' : 'items found'}
                </p>
              </div>
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
                  onClick={() => setSelectedProduct(product)}
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

          {hasMore && !loading && (
            <div className="flex justify-center pt-12">
              <button
                onClick={() => setPage(prev => prev + 1)}
                className="group relative px-16 py-6 bg-zinc-900 text-white rounded-[24px] overflow-hidden transition-all hover:scale-105 active:scale-95"
              >
                <div className="relative z-10 flex items-center gap-4">
                  <span className="text-xs font-bold uppercase tracking-widest">{language === 'bn' ? 'আরো পণ্য দেখুন' : 'Explore Designs'}</span>
                  <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                </div>
                <div className="absolute inset-0 bg-[#ce112d] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              </button>
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
              <p className="text-sm font-black uppercase tracking-[0.6em] text-zinc-900 leading-none">Big Bazar Selective</p>
              <p className="text-[10px] uppercase font-black tracking-[0.3em] text-zinc-300 italic">Redefining Premium Shopping • Dhaka</p>
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
