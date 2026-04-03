import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ProductModal from '../components/ProductModal';
import HeroSlider from '../components/HeroSlider';
import { Search, X, MessageSquare, Globe, ArrowRight } from 'lucide-react';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import { useTheme } from '../ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { calculatePrice } from '../utils/pricing';
import { getFallbackProducts, getFallbackProduct } from '../utils/fallback';

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
    main_slides: [],
    announcement: {
      enabled: false,
      title_bn: 'গুরুত্বপূর্ণ বিজ্ঞপ্তি',
      title_en: 'Important Notice',
      message_bn: 'প্রিয় গ্রাহক, Big Bazar-এর সাথে থাকার জন্য ধন্যবাদ! বর্তমানে আমাদের ইনবক্সে মেসেজের চাপ অনেক বেশি থাকায় রিপ্লাই দিতে সাময়িক বিলম্ব হচ্ছে। আপনার শপিং অভিজ্ঞতা আরও সহজ ও দ্রুত করতে, অনুগ্রহ করে ওয়েবসাইট থেকেই সরাসরি অর্ডার করুন।',
      message_en: 'Dear customer, thanks for staying with Big Bazar! Currently, due to a high volume of messages, replies may be delayed. To make your shopping easier and faster, please order directly from the website.',
      footer_bn: 'Website থেকে অর্ডার করুন — দ্রুত ও সহজ!',
      footer_en: 'Order from Website — Fast & Easy!'
    }
  });

  const { productId } = useParams();
  const navigate = useNavigate();

  const quickCategories = [
    { id: 'Saree', label_en: 'Saree', label_bn: 'শাড়ি', img: 'https://images.weserv.nl/?url=www.taneira.com/dw/image/v2/BGCW_PRD/on/demandware.static/-/Sites-Taneira-Library/default/dwb51ee6ac/Saree%201.jpg' },
    { id: 'Three Piece', label_en: '3 Piece', label_bn: 'থ্রি পিস', img: 'https://images.weserv.nl/?url=images.clothesline365.com/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/t/h/three-piece_1.jpg' },
    { id: 'Panjabi', label_en: 'Panjabi', label_bn: 'পাঞ্জাবি', img: 'https://images.weserv.nl/?url=www.aarong.com/media/catalog/product/0/1/0150000030545.jpg' },
    { id: 'Exclusive', label_en: 'Exclusive', label_bn: 'এক্সক্লুসিভ', img: 'https://images.weserv.nl/?url=i.pinimg.com/736x/8f/3e/2a/8f3e2a0f8eb543b593efd67f78eb5833.jpg' }
  ];

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
    supabase.from('site_settings').select('*')
      .then(({ data }) => {
        if (data) {
          const banner = data.find(s => s.key === 'hero_banner')?.value;
          const slides = data.find(s => s.key === 'main_slides')?.value;
          const announcement = data.find(s => s.key === 'announcement')?.value;
          setSiteSettings(prev => ({
            ...prev,
            banner: banner || prev.banner,
            main_slides: Array.isArray(slides) ? slides : [],
            announcement: announcement || prev.announcement
          }));
        }
      });
  }, []);

  useEffect(() => {
    if (productId) {
      const fetchProduct = async () => {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (error) {
          const fbData = getFallbackProduct(productId);
          if (fbData) setSelectedProduct(fbData);
          else setSelectedProduct(null);
        } else if (data) {
          setSelectedProduct(data);
        }
      };
      fetchProduct();
    } else {
      setSelectedProduct(null);
    }
  }, [productId]);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async (isFirstPage) => {
      if (fetchControllerRef.current) fetchControllerRef.current.abort();
      setLoading(true);
      if (isFirstPage) {
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
          query = values.length > 1 ? query.in('category', values) : query.eq('category', selectedCategory);
        }

        if (debouncedSearchQuery) {
          query = query.or(`name.ilike.%${debouncedSearchQuery}%,description.ilike.%${debouncedSearchQuery}%`);
        }

        const currentPage = isFirstPage ? 0 : page;
        const from = currentPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;
        let finalData = data;
        let finalCount = count;
        let hasError = error;

        if (error) {
          const fb = getFallbackProducts(selectedCategory, debouncedSearchQuery, isFirstPage ? 0 : page, PAGE_SIZE);
          finalData = fb.data;
          finalCount = fb.count;
          hasError = null;
        }

        if (controller.signal.aborted) return;
        if (hasError) throw hasError;
        if (!isMounted) return;

        if (isFirstPage) setProducts(finalData || []);
        else setProducts(prev => [...prev, ...(finalData || [])]);

        setHasMore((finalCount !== null) ? (products.length + (finalData?.length || 0) < finalCount) : (finalData?.length === PAGE_SIZE));
      } catch (err) {
        if (err.name !== 'AbortError') console.error("List fetch error:", err);
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

  useEffect(() => {
    if (page === 0) return;
    let isMounted = true;
    const fetchMore = async () => {
      setLoading(true);
      const query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (selectedCategory && selectedCategory !== 'All') {
        const categoryMaps = {
          'Men': ['Men', 'ছেলেদের'],
          'Women': ['Women', 'মেয়েদের'],
          'Kids (Boys)': ['Kids (Boys)', 'বাচ্চাদের (ছেলে)'],
          'Kids (Girls)': ['Kids (Girls)', 'বাচ্চাদের (মেয়ে)']
        };
        const values = categoryMaps[selectedCategory] || [selectedCategory];
        query.in('category', values);
      }

      const { data, error, count } = await query;
      if (!isMounted) return;

      if (data) {
        setProducts(prev => [...prev, ...data]);
        setHasMore(products.length + data.length < count);
      }
      setLoading(false);
    };
    fetchMore();
    return () => { isMounted = false; };
  }, [page]);

  return (
    <div className="min-h-screen bg-neutral-50 pb-32">
      {/* Mobile Prominent Search Bar (Foodi Style) */}
      <div className="md:hidden sticky top-0 md:top-auto z-[1000] px-4 py-3 bg-white border-b border-neutral-100 shadow-sm">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-neutral-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={language === 'bn' ? 'পণ্য, ডিজাইন বা ক্যাটাগরি খুঁজুন...' : 'Search for designs, saree...'}
            className="w-full bg-neutral-100 rounded-2xl py-3 pl-11 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#ce112d]/10 transition-all border-none"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange('')} className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <X size={18} className="text-neutral-400" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6 md:space-y-12 px-4 md:px-8 pt-4 md:pt-0">
        
        {/* Hero Slider */}
        {siteSettings.main_slides?.length > 0 && (
          <section className="-mx-4 md:mx-0">
            <HeroSlider slides={siteSettings.main_slides} />
          </section>
        )}

        {/* Quick Service/Category Grid (Foodi Style) */}
        <section className="grid grid-cols-4 gap-4 md:hidden">
          {quickCategories.map((item) => (
            <button
              key={item.id}
              onClick={() => onSearchChange(item.id)}
              className="flex flex-col items-center gap-2 group active:scale-95 transition-all"
            >
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-neutral-100 flex items-center justify-center p-1 overflow-hidden group-hover:border-[#ce112d]/50">
                <img src={item.img} alt={item.label_en} className="w-full h-full object-cover rounded-xl" />
              </div>
              <span className="text-[10px] font-black uppercase text-neutral-600 truncate w-full text-center">
                {language === 'bn' ? item.label_bn : item.label_en}
              </span>
            </button>
          ))}
        </section>

        {/* Product Grid Header */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-6 bg-[#ce112d] rounded-full" />
              <h3 id="products-header" className="text-xl md:text-3xl font-black italic uppercase tracking-tighter">
                <span>{language === 'bn' ? 'লেটেস্ট' : 'LATEST'}</span> <span className="text-[#ce112d]">{language === 'bn' ? 'ড্রপস' : 'DROPS'}</span>
              </h3>
            </div>
            
            <button className="flex items-center gap-1 text-[#ce112d] font-black text-[10px] uppercase tracking-widest">
              <span>{language === 'bn' ? 'সব দেখুন' : 'View All'}</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
            {products.map((product) => {
              const displayImage = product.image_url || product.images?.[0] || 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&q=80&w=1000';
              const { price, originalPrice, hasDiscount } = calculatePrice(product);
              
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-neutral-100 cursor-pointer group"
                >
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img
                      src={getOptimizedUrl(displayImage, mediaSizes.thumbnail)}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      alt={product.name}
                      loading="lazy"
                    />
                    {hasDiscount && (
                      <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black italic py-1 px-3 rounded-full shadow-lg transform -rotate-1">
                        SALE
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-1">
                    <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest truncate">
                      {product.category || 'Clothing'}
                    </p>
                    <h4 className="text-sm font-bold text-neutral-800 line-clamp-1 truncate">{product.name}</h4>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex flex-col">
                        <span className="text-lg font-black text-[#ce112d]">৳ {price}</span>
                        {hasDiscount && (
                          <span className="text-[10px] text-neutral-400 line-through">৳ {originalPrice}</span>
                        )}
                      </div>
                      <button className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 group-hover:bg-[#ce112d] group-hover:text-white transition-colors">
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {hasMore && !loading && (
            <div className="flex justify-center pt-8">
              <button
                onClick={() => setPage(p => p + 1)}
                className="px-10 py-4 bg-white border border-neutral-200 rounded-full text-[11px] font-black uppercase tracking-widest text-neutral-800 hover:bg-neutral-50 transition-all shadow-sm"
              >
                {language === 'bn' ? 'আরো লোড করুন' : 'Load More Products'}
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
