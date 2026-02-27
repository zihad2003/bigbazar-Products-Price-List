import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ProductModal from '../components/ProductModal';
import BannerSlider from '../components/BannerSlider';
import { ShoppingBag, ChevronDown, Instagram, Search, X } from 'lucide-react';

const PAGE_SIZE = 12;

export default function Home({ selectedCategory, searchQuery, onSearchChange }) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
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

        {/* Banner Section */}
        <section className="relative">
          {siteSettings.main_slides?.length > 0 ? (
            <BannerSlider banners={siteSettings.main_slides} />
          ) : siteSettings.banner.image_url ? (
            <div className="relative w-full aspect-[16/9] md:aspect-[32/9] min-h-[180px] rounded-[20px] md:rounded-[30px] overflow-hidden border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              <img
                src={siteSettings.banner.image_url}
                className="w-full h-full object-cover"
                alt="Promotional Banner"
              />
              <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 animate-bounce opacity-40" style={{ color: 'var(--text-primary)' }}>
                <ChevronDown size={24} />
              </div>
            </div>
          ) : (
            <div className="relative w-full min-h-[180px] md:min-h-[400px] rounded-[20px] md:rounded-[30px] overflow-hidden flex flex-col items-center justify-center p-6 md:p-8 text-center bg-gradient-to-r from-[#ce112d] to-black border" style={{ borderColor: 'var(--border-color)' }}>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl md:text-8xl font-black italic uppercase tracking-tighter leading-none text-white drop-shadow-2xl"
              >
                {siteSettings.banner.title}
              </motion.h2>

              <p className="mt-3 md:mt-8 text-[9px] md:text-lg font-bold uppercase tracking-[0.3em] md:tracking-[0.4em] text-white/80">
                {siteSettings.banner.subtitle}
              </p>

              <div className="absolute bottom-4 md:bottom-6 animate-bounce opacity-40">
                <ChevronDown size={24} />
              </div>
            </div>
          )}
        </section>

        {/* Product Grid Section */}
        <section className="space-y-8 md:space-y-10">
          <div className="pb-6 md:pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h3 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter shrink-0" style={{ color: 'var(--text-primary)' }}>
              <span>LATEST</span> <span className="text-[#ce112d]">DROPS</span>
            </h3>

            {/* Search Bar */}
            <div className="relative w-full max-w-md group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search size={18} style={{ color: 'var(--text-muted)' }} className="group-focus-within:text-[#ce112d] transition-colors" />
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
                      src={displayImage}
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
                Discover More
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