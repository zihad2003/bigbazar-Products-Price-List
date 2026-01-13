import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';

const PAGE_SIZE = 12;

export default function Home({ selectedCategory }) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [flashSale, setFlashSale] = useState(null);
  const [heroBanner, setHeroBanner] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const { productId } = useParams();
  const navigate = useNavigate();

  // Fetch Site Settings (Flash Sale & Hero Banner) with Real-time Subscription
  useEffect(() => {
    const fetchSettings = async () => {
      const { data: flashData } = await supabase.from('site_settings').select('value').eq('key', 'flash_sale').single();
      if (flashData?.value) setFlashSale(flashData.value);

      const { data: bannerData } = await supabase.from('site_settings').select('value').eq('key', 'hero_banner').single();
      if (bannerData?.value) setHeroBanner(bannerData.value);
    };

    fetchSettings();

    const channel = supabase
      .channel('public:site_settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings' }, (payload) => {
        if (payload.new) {
          if (payload.new.key === 'flash_sale') setFlashSale(payload.new.value);
          if (payload.new.key === 'hero_banner') setHeroBanner(payload.new.value);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch Products with DB Filtering & Pagination
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);

      // Start query
      let query = supabase.from('products').select('*', { count: 'exact' }).order('created_at', { ascending: false });

      // Apply category filter if not 'All'
      if (selectedCategory !== 'All') {
        query = query.eq('category', selectedCategory);
      }

      // Apply pagination
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        console.error('Error fetching products:', error);
      } else {
        if (page === 0) {
          setProducts(data);
        } else {
          setProducts(prev => [...prev, ...data]);
        }

        // Check if we have loaded all available products
        if (data.length < PAGE_SIZE || (page + 1) * PAGE_SIZE >= count) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      }
      setLoading(false);
    };

    fetchProducts();
  }, [selectedCategory, page]);

  // Reset page when category changes
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    setProducts([]); // Clear products immediately when category changes
  }, [selectedCategory]);

  // Handle URL Product ID
  useEffect(() => {
    if (productId) {
      // If product is not in current list (e.g. direct link), we might need to fetch it individually
      const found = products.find(p => p.id == productId);
      if (found) {
        setSelectedProduct(found);
      } else {
        // Fetch individual product if not in current view
        supabase.from('products').select('*').eq('id', productId).single()
          .then(({ data }) => {
            if (data) setSelectedProduct(data);
          });
      }
    }
  }, [productId, products]);

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    navigate(`/product/${product.id}`);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    navigate('/');
  };

  // Preload priority images
  useEffect(() => {
    if (products.length > 0) {
      // Preload first 6 images
      products.slice(0, 6).forEach(product => {
        const displayImage = product.image || product.image_url || (product.images && product.images[0]);
        if (displayImage) {
          const img = new Image();
          img.src = displayImage;
        }
      });
    }
  }, [products]);

  return (
    <div className="min-h-screen px-4 pb-20 bg-black">
      {/* Hero Header */}
      <header className="pt-4 md:pt-10 pb-8 md:pb-16 text-center">
        {heroBanner?.active ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-[#ce112d] to-purple-800 p-6 md:p-12 rounded-3xl relative overflow-hidden shadow-2xl shadow-red-900/20"
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-7xl font-black italic tracking-tighter text-white mb-2 uppercase drop-shadow-md">{heroBanner.text}</h2>
              <p className="text-lg md:text-2xl font-bold text-white/90 tracking-widest uppercase">{heroBanner.subtext}</p>
            </div>
          </motion.div>
        ) : (
          <>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] md:text-xs font-bold tracking-widest text-neutral-500 uppercase mb-2"
            >
              Exclusive Collection
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="text-5xl md:text-8xl font-black tracking-tighter text-white"
            >
              Big Bazar
            </motion.h1>
          </>
        )}
        <div className="mt-6 md:mt-8 flex justify-center">
          <span className="text-neutral-600 animate-bounce">↓</span>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto space-y-16">
        <section>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl font-black text-white italic tracking-tighter">
              {selectedCategory === 'All' ? 'LATEST' : selectedCategory.toUpperCase()} <span className="text-[#ce112d]">DROPS</span>
            </h2>
            <div className="h-px flex-grow bg-gradient-to-r from-white/20 to-transparent"></div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                flashSale={flashSale}
                onClick={handleProductClick}
                priority={index < 6}
              />
            ))}
          </div>

          {products.length === 0 && !loading && (
            <div className="text-center py-20">
              <p className="text-neutral-500 text-lg">No products found in this category.</p>
            </div>
          )}

          {loading && products.length === 0 && (
            <div className="text-center py-20">
              <p className="text-neutral-500 animate-pulse">Loading products...</p>
            </div>
          )}

          {hasMore && products.length > 0 && (
            <div className="mt-12 text-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-8 py-3 bg-neutral-900 border border-white/10 hover:bg-neutral-800 text-white font-bold uppercase tracking-widest rounded-full transition-all disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </section>
      </div>

      <ProductModal
        product={selectedProduct}
        flashSale={flashSale}
        isOpen={!!selectedProduct}
        onClose={handleCloseModal}
      />
    </div>
  );
}