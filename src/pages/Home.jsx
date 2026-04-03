import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingBag, ArrowRight, Zap, X, Star, ChevronRight, MapPin, Layers, Award, User as LucideUser, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HeroSlider from '../components/HeroSlider';
import ProductModal from '../components/ProductModal';
import { supabase } from '../supabaseClient';
import { calculatePrice } from '../utils/pricing';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import { useLanguage } from '../contexts/LanguageContext';

const ProductCard = ({ product, onClick }) => {
  const { price, originalPrice, hasDiscount } = calculatePrice(product);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  let displayImage = product.image_url || product.images?.[0];
  
  // Hande local uploads from the Admin panel
  if (displayImage && (displayImage.startsWith('uploads/') || displayImage.startsWith('/uploads/'))) {
      const cleanPath = displayImage.startsWith('/') ? displayImage : `/${displayImage}`;
      displayImage = `${API_URL}${cleanPath}`;
  }

  // Fallback to high-quality mockup if still missing
  if (!displayImage) {
      displayImage = 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&q=80&w=1000';
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
        <img
          src={getOptimizedUrl(displayImage, mediaSizes.thumbnail)}
          className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-1000"
          alt={product.name}
          loading="lazy"
        />
        {hasDiscount && (
          <div className="absolute top-4 left-4 bg-[#ce112d] text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest py-1.5 px-3 rounded-full shadow-lg">
            SALE
          </div>
        )}
        {product.is_sold_out && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center p-6 text-center">
            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-neutral-900 border-2 border-neutral-900 px-4 py-2 rounded-xl">
              {language === 'bn' ? 'স্টক নেই' : 'Sold Out'}
            </span>
          </div>
        )}
      </div>
      <div className="p-4 md:p-6 flex flex-col flex-1 gap-2">
        <div className="space-y-1">
           <p className="text-[9px] md:text-[10px] font-black uppercase text-neutral-300 tracking-[0.3em] truncate">
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

const PAGE_SIZE = 12;

const Home = ({ selectedCategory, setSelectedCategory, searchQuery, onSearchChange }) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [siteSettings, setSiteSettings] = useState({ 
    main_slides: [],
    announcement: '' 
  });

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('site_settings').select('*');
      if (data && Array.isArray(data)) {
        const settingsMap = {};
        data.forEach(item => {
            settingsMap[item.key] = item.value;
        });
        setSiteSettings(prev => ({ ...prev, ...settingsMap }));
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
        const catMap = {
            'Men': ['Men', 'ছেলেদের'],
            'Women': ['Women', 'মেয়েদের'],
            'Kids (Boys)': ['Kids (Boys)', 'বাচ্চাদের (ছেলে)'],
            'Kids (Girls)': ['Kids (Girls)', 'বাচ্চাদের (মেয়ে)']
        };
        const searchCats = catMap[selectedCategory] || [selectedCategory];
        query = query.in('category', searchCats);
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

  const categories = [
    { id: 'All', icon: <Layers size={24} />, label: t('all') },
    { id: 'Men', icon: <LucideUser size={24} />, label: t('men') },
    { id: 'Women', icon: <ShoppingBag size={24} />, label: t('women') },
    { id: 'Kids (Boys)', icon: <Star size={24} />, label: t('boys') },
    { id: 'Kids (Girls)', icon: <Star size={24} />, label: t('girls') },
    { id: 'Exclusive', icon: <Award size={24} />, label: language === 'bn' ? 'এক্সক্লুসিভ' : 'Premium' },
    { id: 'New', icon: <Zap size={24} />, label: language === 'bn' ? 'নতুন' : 'New' },
    { id: 'Sale', icon: <Tag size={24} />, label: language === 'bn' ? 'অফার' : 'Sale' }
  ];

  return (
    <div className="min-h-screen bg-white pb-32">
        {/* Floating Hero Slider - Selective Premium View */}
        {siteSettings.main_slides?.length > 0 && (
          <section className="w-full h-[55vh] md:h-[75vh] relative px-4 md:px-12 pt-4 md:pt-10">
             <div className="w-full h-full rounded-[32px] md:rounded-[54px] overflow-hidden shadow-2xl shadow-zinc-200 bg-white">
                <HeroSlider slides={siteSettings.main_slides} />
             </div>
          </section>
        )}

      <div className="max-w-7xl mx-auto px-6 md:px-12 space-y-24">
        {/* Category Circular Grid (Premium Layout) */}
        <section className="space-y-12">
           <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="flex flex-col items-center gap-4 transition-all active:scale-95 group"
                >
                  <div className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-700 shadow-2xl ${selectedCategory === cat.id ? 'bg-[#ce112d] text-white ring-8 ring-[#ce112d]/10 scale-110' : 'bg-zinc-50 text-zinc-400 group-hover:bg-zinc-100 group-hover:text-zinc-900 group-hover:scale-110'}`}>
                    <div className="transition-transform duration-500">{cat.icon}</div>
                  </div>
                  <div className="text-center space-y-1">
                    <span className={`block text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-colors ${selectedCategory === cat.id ? 'text-[#ce112d]' : 'text-zinc-500'}`}>{cat.label}</span>
                    <div className={`h-1 w-4 mx-auto bg-[#ce112d] rounded-full transition-all duration-700 ${selectedCategory === cat.id ? 'opacity-100' : 'opacity-0 scale-0'}`} />
                  </div>
                </button>
              ))}
           </div>
        </section>

        {/* Search Bar Above Products */}
        <section className="space-y-8">
          <div className="max-w-md mx-auto">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-[#ce112d] transition-colors" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={language === 'bn' ? 'পছন্দের পণ্যটি খুঁজুন...' : 'Search selective collections...'}
                className="w-full bg-zinc-50 border border-transparent focus:border-[#ce112d]/10 focus:bg-white rounded-2xl py-4 pl-12 pr-6 text-sm font-bold uppercase tracking-widest outline-none transition-all shadow-sm"
              />
            </div>
          </div>
        </section>

        {/* Dynamic Product Grid */}
        <section className="space-y-16 pt-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div className="space-y-4">
              <h3 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter leading-none text-zinc-900">
                 {searchQuery ? (language === 'bn' ? 'অনুসন্ধান ফলাফল' : 'Search Results') : (selectedCategory === 'All' ? (language === 'bn' ? 'প্রিমিয়াম কালেকশন' : 'Selective Edits') : selectedCategory)}
              </h3>
              <div className="flex items-center gap-4">
                 <div className="h-[2px] w-12 bg-[#ce112d]" />
                 <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.5em] text-zinc-400">
                    {products.length} {language === 'bn' ? 'টি পণ্য পাওয়া গেছে' : 'Articles curated'}
                 </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-12">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => setSelectedProduct(product)}
              />
            ))}
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
               <div className="w-12 h-12 border-4 border-[#ce112d] border-t-transparent rounded-full animate-spin"></div>
               <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#ce112d] animate-pulse">Curating Luxury Content</p>
            </div>
          )}

          {hasMore && !loading && (
             <div className="flex justify-center pt-32">
                <button
                  onClick={() => setPage(prev => prev + 1)}
                  className="group relative px-16 py-6 bg-zinc-900 text-white rounded-[24px] overflow-hidden transition-all hover:scale-105 active:scale-95"
                >
                   <div className="relative z-10 flex items-center gap-4">
                      <span className="text-[11px] font-black uppercase tracking-[0.4em]">{language === 'bn' ? 'আরো পণ্য দেখুন' : 'Load More Designs'}</span>
                      <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                   </div>
                   <div className="absolute inset-0 bg-[#ce112d] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                </button>
             </div>
          )}
        </section>

        {/* Global Footer Accent - Clean & Minimal */}
        <section className="py-40 text-center">
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
