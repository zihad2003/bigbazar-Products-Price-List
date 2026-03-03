import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ProductModal from '../components/ProductModal';
import BannerSlider from '../components/BannerSlider';
import RamadanHero from '../components/RamadanHero';
import { ShoppingBag, ChevronDown, Instagram, Search, X, MessageSquare, Globe, Moon } from 'lucide-react';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import { useTheme } from '../ThemeContext';

const PAGE_SIZE = 12;

export default function Home({ selectedCategory, searchQuery, onSearchChange }) {
  const { theme } = useTheme();
  const isRamadan = theme === 'ramadan';
  const accentColor = isRamadan ? '#fbbf24' : '#ce112d';

  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [showAnnouncement, setShowAnnouncement] = useState(() => {
    const dismissed = sessionStorage.getItem('bb_announcement_dismissed');
    return !dismissed;
  });
  const [siteSettings, setSiteSettings] = useState({
    banner: {
      title: '5% FLAT DISCOUNT',
      subtitle: 'FOR THE 10K FAMILY ON FACEBOOK PAGE',
      image_url: null
    },
    main_slides: []
  });

  const { productId } = useParams();
  const navigate = useNavigate();

  const dismissAnnouncement = () => {
    setShowAnnouncement(false);
    sessionStorage.setItem('bb_announcement_dismissed', 'true');
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    // Fetch Banner & Slider Settings
    supabase.from('site_settings').select('*')
      .then(({ data }) => {
        if (data) {
          const banner = data.find(s => s.key === 'hero_banner')?.value;
          const slides = data.find(s => s.key === 'main_slides')?.value;
          setSiteSettings(prev => ({
            ...prev,
            banner: banner || prev.banner,
            main_slides: Array.isArray(slides) ? slides : []
          }));
        }
      });
  }, []);

  // Handle direct product link
  useEffect(() => {
    if (productId) {
      const fetchProduct = async () => {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (data && !error) {
          setSelectedProduct(data);
        }
      };
      fetchProduct();
    } else {
      setSelectedProduct(null);
    }
  }, [productId]);

  // Reset page and products when filters change
  useEffect(() => {
    setPage(0);
    setProducts([]);
    setHasMore(true);
  }, [selectedCategory, debouncedSearchQuery]);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      if (page !== 0 && products.length === 0) return;

      setLoading(true);
      try {
        let query = supabase
          .from('products')
          .select('*', { count: 'exact' })
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (selectedCategory && selectedCategory !== 'All') {
          query = query.eq('category', selectedCategory);
        }

        if (debouncedSearchQuery) {
          query = query.or(`name.ilike.%${debouncedSearchQuery}%,description.ilike.%${debouncedSearchQuery}%`);
        }

        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;
        if (error) throw error;

        if (!isMounted) return;

        if (page === 0) {
          setProducts(data || []);
        } else {
          setProducts(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newItems = (data || []).filter(p => !existingIds.has(p.id));
            return [...prev, ...newItems];
          });
        }

        if (count !== null) {
          const loadedCount = (page === 0 ? 0 : products.length) + (data?.length || 0);
          setHasMore(loadedCount < count);
        } else {
          setHasMore((data || []).length === PAGE_SIZE);
        }
      } catch (err) {
        console.error("List fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProducts();
    return () => { isMounted = false; };
  }, [selectedCategory, debouncedSearchQuery, page]);

  return (
    <div className="min-h-screen px-4 md:px-8 pb-32" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto space-y-10 md:space-y-16">

        {/* Announcement Banner */}
        <AnimatePresence>
          {showAnnouncement && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div
                className="relative rounded-2xl md:rounded-3xl overflow-hidden border"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {/* Accent gradient top bar */}
                <div className="h-1" style={{ background: `linear-gradient(90deg, ${accentColor}, #ff4d6d, ${accentColor})` }} />

                <div className="px-4 md:px-6 py-4 md:py-5 flex items-start gap-3 md:gap-4">
                  {/* Icon */}
                  <div
                    className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: `${accentColor}1A` }}
                  >
                    {isRamadan ? (
                      <Moon size={20} style={{ color: accentColor }} />
                    ) : (
                      <MessageSquare size={20} style={{ color: accentColor }} />
                    )}
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p
                      className="text-[10px] md:text-[11px] font-black uppercase tracking-widest"
                      style={{ color: accentColor }}
                    >
                      📢 গুরুত্বপূর্ণ বিজ্ঞপ্তি
                    </p>
                    <p
                      className="text-xs md:text-sm font-semibold leading-relaxed"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      প্রিয় গ্রাহক, <strong style={{ color: accentColor }}>Big Bazar</strong>-এর সাথে থাকার জন্য ধন্যবাদ!
                    </p>
                    <p
                      className="text-[11px] md:text-xs leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      বর্তমানে আমাদের ইনবক্সে মেসেজের চাপ অনেক বেশি থাকায় রিপ্লাই দিতে সাময়িক বিলম্ব হচ্ছে। আপনার শপিং অভিজ্ঞতা আরও সহজ ও দ্রুত করতে, অনুগ্রহ করে <strong style={{ color: 'var(--text-primary)' }}>ওয়েবসাইট থেকেই সরাসরি অর্ডার করুন।</strong>
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Globe size={12} style={{ color: accentColor }} />
                      <span
                        className="text-[9px] md:text-[10px] font-black uppercase tracking-widest"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Website থেকে অর্ডার করুন — দ্রুত ও সহজ!
                      </span>
                    </div>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={dismissAnnouncement}
                    className="flex-shrink-0 p-2 rounded-xl transition-all hover:bg-[#ce112d]/10 group"
                  >
                    <X size={16} style={{ color: 'var(--text-muted)' }} className="group-hover:text-[#ce112d] transition-colors" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ramadan Special Hero */}
        <RamadanHero bannerUrl="https://images.unsplash.com/photo-1564761061036-6cbe17ae3447?q=80&w=2070&auto=format&fit=crop" />

        {/* Slider Section - Only show if slides exist */}
        {siteSettings.main_slides?.length > 0 && (
          <section className="relative">
            <BannerSlider banners={siteSettings.main_slides} />
          </section>
        )}

        {/* Product Grid Section */}
        <section className="space-y-8 md:space-y-10">
          <div className="pb-6 md:pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h3 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter shrink-0" style={{ color: 'var(--text-primary)' }}>
              <span>LATEST</span> <span style={{ color: accentColor }}>DROPS</span>
            </h3>

            {/* Search Bar */}
            <div className="relative w-full max-w-md group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search size={18} style={{ color: 'var(--text-muted)' }} className="transition-colors group-focus-within:text-[var(--accent-color)]" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search for clothes, styles..."
                className="w-full rounded-2xl py-3 md:py-4 pl-12 pr-12 text-sm font-bold backdrop-blur-sm focus:outline-none transition-all"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderWidth: '1px',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute inset-y-0 right-4 flex items-center transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {products.map((product, index) => {
              let displayImage = product.image_url || product.images?.[0];
              if (!displayImage && product.video_url) {
                const match = product.video_url.match(/\/(reels|reel|p|tv)\/([a-zA-Z0-9_-]+)/);
                const id = match ? match[2] : null;
                if (id) {
                  displayImage = `https://images.weserv.nl/?url=instagram.com/p/${id}/media/?size=l`;
                }
              }
              if (!displayImage || displayImage.includes('via.placeholder')) {
                displayImage = 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&q=80&w=1000';
              }

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="group cursor-pointer"
                >
                  <div
                    className="relative aspect-[9/14] rounded-2xl md:rounded-3xl overflow-hidden border transition-all duration-500 group-hover:border-[#ce112d]/50"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-card)' }}
                  >
                    <img
                      src={getOptimizedUrl(displayImage, mediaSizes.thumbnail)}
                      className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                      alt={product.name}
                      loading="lazy"
                    />

                    {/* Info Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-3 md:p-4" style={{ background: 'var(--gradient-overlay)' }}>
                      <div className="flex flex-col gap-0.5 md:gap-1">
                        <p className="text-[9px] md:text-[10px] font-black italic uppercase truncate" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>{product.name}</p>
                        <p className="text-[#ce112d] font-black text-xs md:text-sm">৳ {product.price}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Load More */}
          {hasMore && !loading && (
            <div className="flex justify-center pt-8 md:pt-12">
              <button
                onClick={() => setPage(p => p + 1)}
                className="px-6 md:px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border hover:bg-[#ce112d] hover:text-white hover:border-[#ce112d]"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                See More
              </button>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#ce112d] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </section>
      </div>

      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => navigate('/')}
      />
    </div>
  );
}