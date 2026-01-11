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
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const { productId } = useParams();
  const navigate = useNavigate();

  // Fetch Flash Sale Settings with Real-time Subscription
  useEffect(() => {
    const fetchFlashSale = async () => {
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'flash_sale').single();
      if (data?.value) setFlashSale(data.value);
    };

    fetchFlashSale();

    const channel = supabase
      .channel('public:site_settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings', filter: 'key=eq.flash_sale' }, (payload) => {
        if (payload.new && payload.new.value) {
          setFlashSale(payload.new.value);
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
    // Products will be set by the fetch effect above dependent on [page, selectedCategory]
    // However, when category changes, page becomes 0, triggering fetch for page 0 filtered by new category.
    // We need to ensure we don't append to old category products if the fetch hasn't completed or race condition.
    // Setting products to [] here helps visual reset.
    setProducts([]);
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

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  return (
    <div className="min-h-screen px-4 pb-20 bg-black">
      {/* Hero Header */}
      <header className="pt-10 pb-16 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-bold tracking-widest text-neutral-500 uppercase mb-2"
        >
          Exclusive Collection
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="text-6xl md:text-8xl font-black tracking-tighter text-white"
        >
          Big Bazar
        </motion.h1>
        <div className="mt-8 flex justify-center">
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

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                flashSale={flashSale}
                onClick={handleProductClick}
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