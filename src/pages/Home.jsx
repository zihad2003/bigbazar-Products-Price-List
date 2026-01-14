import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ProductModal from '../components/ProductModal';
import { ShoppingBag, ChevronDown, Instagram } from 'lucide-react';

const PAGE_SIZE = 12;

export default function Home({ selectedCategory }) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [siteSettings, setSiteSettings] = useState({
    banner: {
      title: '5% FLAT DISCOUNT',
      subtitle: 'FOR THE 10K FAMILY ON FACEBOOK PAGE',
      image_url: null
    }
  });

  const { productId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch Banner Settings
    supabase.from('site_settings').select('value').eq('key', 'hero_banner').single()
      .then(({ data }) => {
        if (data?.value) {
          setSiteSettings(prev => ({
            ...prev,
            banner: data.value
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

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('products')
          .select('*', { count: 'exact' })
          .eq('status', 'published')
          .order('serial_no', { ascending: true });

        if (selectedCategory && selectedCategory !== 'All') {
          query = query.eq('category', selectedCategory);
        }

        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        query = query.range(from, to);

        const { data, count, error } = await query;
        if (error) throw error;

        if (page === 0) setProducts(data || []);
        else setProducts(prev => [...prev, ...(data || [])]);

        setHasMore((data || []).length === PAGE_SIZE);
      } catch (err) {
        console.error("List fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategory, page]);

  return (
    <div className="min-h-screen bg-black px-4 md:px-8 pb-32">
      <div className="max-w-7xl mx-auto space-y-16">

        {/* Banner Section - Logic: Show Image ONLY if present, otherwise show Text Banner */}
        <section className="relative">
          {siteSettings.banner.image_url ? (
            // IMAGE BANNER MODE
            <div className="relative w-full aspect-[21/9] md:aspect-[32/9] min-h-[200px] rounded-[30px] overflow-hidden border border-white/5 bg-neutral-900">
              <img
                src={siteSettings.banner.image_url}
                className="w-full h-full object-cover"
                alt="Promotional Banner"
              />
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce opacity-40 mix-blend-difference text-white">
                <ChevronDown size={24} />
              </div>
            </div>
          ) : (
            // TEXT BANNER MODE
            <div className={`relative w-full min-h-[220px] md:min-h-[400px] rounded-[30px] overflow-hidden flex flex-col items-center justify-center p-8 text-center bg-gradient-to-r from-[#ce112d] to-black border border-white/5`}>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-8xl font-black italic uppercase italic tracking-tighter leading-none text-white drop-shadow-2xl"
              >
                {siteSettings.banner.title}
              </motion.h2>

              <p className="mt-4 md:mt-8 text-[10px] md:text-lg font-bold uppercase tracking-[0.4em] text-white/80">
                {siteSettings.banner.subtitle}
              </p>

              <div className="absolute bottom-6 animate-bounce opacity-40">
                <ChevronDown size={24} />
              </div>
            </div>
          )}
        </section>

        {/* Product Grid Section - Masonry/Columns style */}
        <section className="space-y-10">
          <div className="border-b border-white/5 pb-8">
            <h3 className="text-3xl font-black italic uppercase tracking-tighter">
              <span className="text-white">LATEST</span> <span className="text-[#ce112d]">DROPS</span>
            </h3>
          </div>

          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {products.map((product, index) => {
              // Dynamic thumbnail generation if DB image is missing
              let displayImage = product.image_url || product.images?.[0];
              if (!displayImage && product.video_url) {
                const match = product.video_url.match(/\/(reels|reel|p)\/([a-zA-Z0-9_-]+)/);
                const id = match ? match[2] : null;
                if (id) {
                  displayImage = `https://images.weserv.nl/?url=instagram.com/p/${id}/media/?size=l`;
                }
              }
              // Fallback
              if (!displayImage || displayImage.includes('via.placeholder')) {
                displayImage = 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&q=80&w=1000';
              }

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index % 12) * 0.05 }}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="break-inside-avoid group cursor-pointer"
                >
                  <div className="relative aspect-[9/16] bg-neutral-900 rounded-3xl overflow-hidden border border-white/5 group-hover:border-[#ce112d]/50 transition-all duration-500">

                    <img
                      src={displayImage}
                      className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                      alt={product.name}
                      loading="lazy"
                    />

                    {/* Info Overlay at Bottom */}
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black via-black/40 to-transparent">
                      <div className="flex justify-between items-end gap-2">
                        <p className="text-[10px] font-black italic uppercase text-white/90 truncate flex-1">{product.name}</p>
                        <p className="text-[#ce112d] font-black text-sm whitespace-nowrap">৳ {product.price}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Load More */}
          {hasMore && !loading && (
            <div className="flex justify-center pt-12">
              <button
                onClick={() => setPage(p => p + 1)}
                className="px-8 py-3 bg-neutral-900 border border-white/5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
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