import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ProductModal from '../components/ProductModal';
import BannerSlider from '../components/BannerSlider';
import { Search, X, MessageSquare, Globe } from 'lucide-react';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import { useTheme } from '../ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { calculatePrice } from '../utils/pricing';

const PAGE_SIZE = 12;

export default function Home({ selectedCategory, searchQuery, onSearchChange }) {
  const { t, language } = useLanguage();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const fetchControllerRef = useRef(null);
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

    // Handle scroll to products from mobile menu
    if (window.history.state?.usr?.scrollToProducts) {
      setTimeout(() => {
        const header = document.getElementById('products-header');
        if (header) header.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
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

  // Combined effect for resetting and fetching
  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async (isFirstPage) => {
      // Abort previous fetch if it's still running
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }

      setLoading(true);
      if (isFirstPage) {
        // Only clear if it's a new category/search (to keep existing visibility during soft refreshes)
        setProducts([]);
        setPage(0);
        setHasMore(true);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      fetchControllerRef.current = controller;

      try {
        let query = supabase
          .from('products')
          .select('*', { count: 'exact' })
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (selectedCategory && selectedCategory !== 'All') {
          const categoryMaps = {
            'Men': ['Men', 'ছেলেদের'],
            'Women': ['Women', 'মেয়েদের'],
            'Kids (Boys)': ['Kids (Boys)', 'বাচ্চাদের (ছেলে)'],
            'Kids (Girls)': ['Kids (Girls)', 'বাচ্চাদের (মেয়ে)']
          };

          const values = categoryMaps[selectedCategory] || [selectedCategory];
          if (values.length > 1) {
            query = query.in('category', values);
          } else {
            query = query.eq('category', selectedCategory);
          }
        }

        if (debouncedSearchQuery) {
          query = query.or(`name.ilike.%${debouncedSearchQuery}%,description.ilike.%${debouncedSearchQuery}%`);
        }

        const currentPage = isFirstPage ? 0 : page;
        const from = currentPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (controller.signal.aborted) return;
        if (error) throw error;
        if (!isMounted) return;

        if (isFirstPage) {
          setProducts(data || []);
        } else {
          setProducts(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newItems = (data || []).filter(p => !existingIds.has(p.id));
            return [...prev, ...newItems];
          });
        }

        // Use data.length directly for more accurate hasMore calculation
        const resultLength = data?.length || 0;
        if (count !== null) {
          const totalLoaded = (isFirstPage ? 0 : products.length) + resultLength;
          setHasMore(totalLoaded < count);
        } else {
          setHasMore(resultLength === PAGE_SIZE);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("List fetch error:", err);
        }
      } finally {
        clearTimeout(timeoutId);
        if (isMounted && fetchControllerRef.current === controller) {
          setLoading(false);
          fetchControllerRef.current = null;
        }
      }
    };

    fetchProducts(true);
    return () => { isMounted = false; };
  }, [selectedCategory, debouncedSearchQuery]);

  // Separate effect for pagination
  useEffect(() => {
    if (page === 0) return;

    let isMounted = true;
    const fetchMore = async () => {
      if (fetchControllerRef.current) fetchControllerRef.current.abort();

      setLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      fetchControllerRef.current = controller;

      try {
        let query = supabase
          .from('products')
          .select('*', { count: 'exact' })
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (selectedCategory && selectedCategory !== 'All') {
          const categoryMaps = {
            'Men': ['Men', 'ছেলেদের'],
            'Women': ['Women', 'মেয়েদের'],
            'Kids (Boys)': ['Kids (Boys)', 'বাচ্চাদের (ছেলে)'],
            'Kids (Girls)': ['Kids (Girls)', 'বাচ্চাদের (মেয়ে)']
          };
          const values = categoryMaps[selectedCategory] || [selectedCategory];
          if (values.length > 1) query = query.in('category', values);
          else query = query.eq('category', selectedCategory);
        }

        if (debouncedSearchQuery) {
          query = query.or(`name.ilike.%${debouncedSearchQuery}%,description.ilike.%${debouncedSearchQuery}%`);
        }

        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;
        if (controller.signal.aborted) return;
        if (error) throw error;
        if (!isMounted) return;

        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = (data || []).filter(p => !existingIds.has(p.id));
          return [...prev, ...newItems];
        });

        if (count !== null) {
          const totalLoaded = products.length + (data?.length || 0);
          setHasMore(totalLoaded < count);
        } else {
          setHasMore((data || []).length === PAGE_SIZE);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("See more fetch error:", err);
        }
      } finally {
        clearTimeout(timeoutId);
        if (isMounted && fetchControllerRef.current === controller) {
          setLoading(false);
          fetchControllerRef.current = null;
        }
      }
    };

    fetchMore();
    return () => { isMounted = false; };
  }, [page]);

  return (
    <div className="min-h-screen px-4 md:px-8 pb-32" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto space-y-8 md:space-y-12">

        {/* Slider Section — Now first, above the notice */}
        {siteSettings.main_slides?.length > 0 && (
          <section className="relative">
            <BannerSlider banners={siteSettings.main_slides} />
          </section>
        )}

        {/* Announcement Banner — Now below the slider, non-blocking */}
        <AnimatePresence>
          {showAnnouncement && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div
                className="relative rounded-2xl overflow-hidden border"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div className="h-0.5" style={{ background: 'linear-gradient(90deg, #ce112d, #ff4d6d, #ce112d)' }} />
                <div className="px-4 md:px-5 py-4 flex items-start gap-3">
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: 'rgba(206, 17, 45, 0.1)' }}
                  >
                    <MessageSquare size={16} className="text-[#ce112d]" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-[10px] md:text-[11px] font-extrabold uppercase tracking-widest" style={{ color: '#ce112d' }}>
                      {language === 'bn' ? 'গুরুত্বপূর্ণ বিজ্ঞপ্তি' : 'Important Notice'}
                    </p>
                    <p className="text-xs md:text-sm font-semibold leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                      {language === 'bn' ? <>প্রিয় গ্রাহক, <strong className="text-[#ce112d]">Big Bazar</strong>-এর সাথে থাকার জন্য ধন্যবাদ!</> : <>Dear customer, thanks for staying with <strong className="text-[#ce112d]">Big Bazar</strong>!</>}
                    </p>
                    <p className="text-[11px] md:text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {language === 'bn' ? <>বর্তমানে আমাদের ইনবক্সে মেসেজের চাপ অনেক বেশি থাকায় রিপ্লাই দিতে সাময়িক বিলম্ব হচ্ছে। আপনার শপিং অভিজ্ঞতা আরও সহজ ও দ্রুত করতে, অনুগ্রহ করে <strong style={{ color: 'var(--text-primary)' }}>ওয়েবসাইট থেকেই সরাসরি অর্ডার করুন।</strong></> : <>Currently, due to a high volume of messages, replies may be delayed. To make your shopping easier and faster, please <strong style={{ color: 'var(--text-primary)' }}>order directly from the website.</strong></>}
                    </p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <Globe size={11} className="text-[#ce112d]" />
                      <span className="text-[9px] md:text-[10px] font-extrabold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        {language === 'bn' ? 'Website থেকে অর্ডার করুন — দ্রুত ও সহজ!' : 'Order from Website — Fast & Easy!'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={dismissAnnouncement}
                    className="flex-shrink-0 p-1.5 rounded-lg transition-all hover:bg-[#ce112d]/10"
                  >
                    <X size={14} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Product Grid Section */}
        <section className="space-y-6 md:space-y-8">
          <div className="pb-4 md:pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h3 id="products-header" className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter shrink-0" style={{ color: 'var(--text-primary)' }}>
              <span>{language === 'bn' ? 'লেটেস্ট' : 'LATEST'}</span> <span className="text-[#ce112d]">{language === 'bn' ? 'ড্রপস' : 'DROPS'}</span>
            </h3>

            {/* Modernized Search Bar */}
            <div className="relative w-full max-w-md group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={16} style={{ color: 'var(--text-muted)' }} className="group-focus-within:text-[#ce112d] transition-colors" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={language === 'bn' ? 'পণ্য খুঁজুন...' : 'Search products...'}
                className="w-full rounded-xl py-3 pl-11 pr-10 text-sm font-medium focus:outline-none transition-all focus:ring-2 focus:ring-[#ce112d]/30"
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
                  className="absolute inset-y-0 right-0 pr-3 flex items-center transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X size={16} />
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
                        {(() => {
                          const { price, originalPrice, hasDiscount } = calculatePrice(product);
                          return (
                            <div className="flex items-baseline gap-2">
                              <span className="text-[#ce112d] font-black text-xs md:text-sm">৳ {price}</span>
                              {hasDiscount && (
                                <span className="text-neutral-300 line-through font-bold text-[9px] md:text-[11px] opacity-70">
                                  ৳ {originalPrice}
                                </span>
                              )}
                            </div>
                          );
                        })()}
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
                {language === 'bn' ? 'আরো দেখুন' : 'See More'}
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
