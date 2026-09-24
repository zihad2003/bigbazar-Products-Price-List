import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ShoppingBag, Truck, CreditCard, CheckCircle, X } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import HeroSlider from '../components/sliders/HeroSlider';
import HomeReviews from '../components/HomeReviews';
import { ProductCard, ProductSkeleton } from '../components/ProductCard';
import ProductModal from '../components/modals/ProductModal';
import TickerAnnouncement from '../components/TickerAnnouncement';
import { bigBazarApi, API_URL } from '../api/client';
import { calculatePrice } from '../utils/pricing';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import { useLanguage } from '../contexts/LanguageContext';
import { extractInstagramId } from '../utils/instagram';
import { getSubcategoriesForCategory, getAllSubcategories, resolveSubcategoryImage } from '../data/categories';
import { useDebounce } from '../hooks/useDebounce';
import { sanitizeInput } from '../utils/security';
import Reveal from '../components/Reveal';

const PAGE_SIZE = 12;

const formatTitleCase = (str) => {
  if (!str || typeof str !== 'string') return '';
  // If string contains mostly uppercase ASCII characters, convert to clean Title Case
  if (/^[A-Z0-9\s,&'-]+$/.test(str) && /[A-Z]/.test(str)) {
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
  }
  return str;
};

const Home = ({ selectedCategory, setSelectedCategory, searchQuery, onSearchChange }) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [subcategoriesData, setSubcategoriesData] = useState(null);
  const sentinelRef = useRef(null);
  const loadingRef = useRef(false);
  const [siteSettings, setSiteSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('bb_site_settings_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.main_slides?.length > 0) return parsed;
      }
    } catch (e) {}
    return {
      main_slides: [],
      announcement: '',
      category_visibility: { show_new: true, show_sale: true, show_exclusive: true }
    };
  });
  const [settingsLoading, setSettingsLoading] = useState(!siteSettings.main_slides?.length);

  const [subCounts, setSubCounts] = useState({});

  // Fetch subcategory counts
  useEffect(() => {
    bigBazarApi.from('subcategory-counts').select('*').then(({ data }) => {
      if (data && Array.isArray(data)) {
        const countsMap = {};
        data.forEach(item => {
          if (item.subcategory) countsMap[item.subcategory] = item.count;
        });
        setSubCounts(countsMap);
      }
    });
  }, []);

  // Compute active subcategories based on selected category, filtering out empty ones
  const rawSubcategories = selectedCategory && selectedCategory !== 'All'
    ? getSubcategoriesForCategory(selectedCategory, subcategoriesData)
    : getAllSubcategories(subcategoriesData, 12);

  const activeSubcategories = rawSubcategories;

  // Fetch settings & cache locally
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await bigBazarApi.from('site_settings').select('*');
        let newSettings = null;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          newSettings = {
            ...data,
            main_slides: Array.isArray(data.main_slides) ? data.main_slides : [],
          };
          if (data.subcategories && typeof data.subcategories === 'object') {
            setSubcategoriesData(data.subcategories);
          }
        } else if (data && Array.isArray(data)) {
          const settingsMap = {};
          data.forEach(item => { settingsMap[item.key] = item.value; });
          newSettings = settingsMap;
          if (settingsMap.subcategories && typeof settingsMap.subcategories === 'object') {
            setSubcategoriesData(settingsMap.subcategories);
          }
        }
        if (newSettings) {
          setSiteSettings(prev => ({ ...prev, ...newSettings }));
          try {
            localStorage.setItem('bb_site_settings_cache', JSON.stringify(newSettings));
          } catch (e) {}
        }
      } catch (err) {
        console.error('Settings fetch failed', err);
      } finally {
        setSettingsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Reset page + clear list when filters change (prevents append race)
  useEffect(() => {
    setPage(0);
    setProducts([]);
  }, [selectedCategory, debouncedSearchQuery]);

  // Fetch products with pagination & filtering
  useEffect(() => {
    let cancelled = false;
    const fetchProducts = async () => {
      loadingRef.current = true;
      if (page === 0) setLoading(true);
      else setLoadingMore(true);

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

      const cleanSearch = sanitizeInput(debouncedSearchQuery);
      if (cleanSearch) {
        query = query.or(`name.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%`);
      }

      const { data, count } = await query;

      if (cancelled) return;
      if (data) {
        if (page === 0) setProducts(data);
        else setProducts(prev => [...prev, ...data]);
        setHasMore(count > (page + 1) * PAGE_SIZE);
      } else {
        setHasMore(false);
      }
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    };

    fetchProducts();
    return () => { cancelled = true; };
  }, [page, selectedCategory, debouncedSearchQuery]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingRef.current || loading || loadingMore) return;
    loadingRef.current = true;
    setPage((prev) => prev + 1);
  }, [hasMore, loading, loadingMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: '280px', threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore, products.length]);

  return (
    <div className="min-h-screen bg-white pb-16">
      {/* Hero — inset rounded frame (mobile-first broader banner) */}
      {!settingsLoading && siteSettings.main_slides?.length > 0 && (
        <section className="w-full relative pt-3 sm:pt-4 md:pt-6">
          <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-3 sm:px-5 md:px-8 lg:px-12">
            <div className="relative w-full overflow-hidden rounded-[1.35rem] sm:rounded-[1.75rem] md:rounded-[2.25rem] bg-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04]">
              <HeroSlider
                slides={siteSettings.main_slides}
                aspectMode={siteSettings.slider_aspect || 'auto'}
              />
            </div>
          </div>
          {siteSettings.ticker_announcement?.position === 'bottom_slider' && (
            <div className="mt-3 sm:mt-4">
              <TickerAnnouncement ticker={siteSettings.ticker_announcement} />
            </div>
          )}
        </section>
      )}

      {settingsLoading && (
        <section className="w-full pt-3 sm:pt-4 md:pt-6">
          <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-5 md:px-8 lg:px-12">
            <div className="w-full aspect-[16/10] sm:aspect-[16/9] lg:aspect-[11/5] max-h-[52vh] rounded-[1.35rem] sm:rounded-[1.75rem] md:rounded-[2.25rem] bg-neutral-100 animate-pulse" />
          </div>
        </section>
      )}


      {/* Wedding Collection Banner — Admin Controlled Canva Poster */}
      {siteSettings.wedding_banner?.enabled && siteSettings.wedding_banner?.image_url && (
        <Reveal>
          <section className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 md:px-12 mt-6 md:mt-8">
            <Link
              to={`/products?category=${encodeURIComponent(siteSettings.wedding_banner.category_filter || 'Wedding')}`}
              className="block relative w-full aspect-[16/6] sm:aspect-[16/5] md:aspect-[16/4] rounded-2xl md:rounded-3xl overflow-hidden group cursor-pointer shadow-xl hover:shadow-2xl transition-all duration-500"
            >
              <img
                src={getOptimizedUrl(siteSettings.wedding_banner.image_url, mediaSizes.banner)}
                alt="Collection Banner"
                className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-700 ease-out"
                loading="lazy"
                decoding="async"
              />
            </Link>
          </section>
        </Reveal>
      )}

      <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto mt-8 md:mt-12 space-y-10">
        {/* Photo-Based Subcategory Grid — rounded portrait cards, ~30% larger */}
        {activeSubcategories.length > 0 && (
          <Reveal>
            <section className="relative px-3 sm:px-5 md:px-12">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-2.5 md:gap-3">
                {activeSubcategories.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      const targetCat = sub._category || selectedCategory || 'All';
                      const cat = targetCat === 'All' ? sub._category : targetCat;
                      if (cat && cat !== 'All') {
                        navigate(`/products?category=${encodeURIComponent(cat)}&subcategory=${encodeURIComponent(sub.id)}`);
                      } else {
                        navigate(`/products?subcategory=${encodeURIComponent(sub.id)}`);
                      }
                    }}
                    className="flex flex-col items-center gap-1.5 sm:gap-2 transition-all active:scale-95 group min-w-0"
                  >
                    <div className="w-full aspect-[3/4] rounded-[1.35rem] sm:rounded-[1.6rem] md:rounded-[1.85rem] overflow-hidden bg-zinc-900 shadow-sm ring-1 ring-black/[0.06] group-hover:ring-[#ce112d]/40 group-hover:shadow-md transition-all duration-300">
                      {resolveSubcategoryImage(sub) ? (
                        <img
                          src={getOptimizedUrl(resolveSubcategoryImage(sub), mediaSizes.subcat)}
                          alt={sub.name_en || ''}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          decoding="async"
                          width={280}
                          height={360}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex items-center justify-center">
                          <span className="text-2xl sm:text-3xl font-black text-white/90">
                            {(sub.name_en || sub.name_bn || '?')[0]}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="block text-[11px] sm:text-sm md:text-base font-bold text-zinc-700 text-center leading-snug w-full min-h-[2.4em] line-clamp-2 px-0.5">
                      {formatTitleCase(language === 'bn' ? (sub.name_bn || sub.name_en) : (sub.name_en || sub.name_bn))}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* Product Grid Section */}
        <section className="space-y-8 pt-2 px-4 md:px-12">
          <Reveal>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-100">
              <div className="space-y-1">
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-none text-zinc-900">
                  {searchQuery
                    ? (language === 'bn' ? 'অনুসন্ধান ফলাফল' : 'Search Results')
                    : (selectedCategory === 'All' ? (language === 'bn' ? 'নতুন কালেকশন' : 'New Arrival') : selectedCategory)
                  }
                </h2>
                {searchQuery && (
                  <p className="text-xs text-zinc-500 font-bold">
                    {language === 'bn' ? `"${searchQuery}" এর জন্য অনুসন্ধান করা হচ্ছে` : `Showing results for "${searchQuery}"`}
                  </p>
                )}
              </div>

              <div className="relative group w-full sm:w-72 md:w-80" role="search">
                <label htmlFor="home-product-search" className="sr-only">
                  {language === 'bn' ? 'পণ্য অনুসন্ধান' : 'Search products'}
                </label>
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#ce112d] transition-colors"
                  size={16}
                  aria-hidden="true"
                />
                <input
                  id="home-product-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={language === 'bn' ? 'পণ্য খুঁজুন...' : 'Search products...'}
                  aria-label={language === 'bn' ? 'পণ্য খুঁজুন' : 'Search products'}
                  className="w-full bg-zinc-50 border border-zinc-200/90 focus:border-[#ce112d] focus:bg-white rounded-xl py-2.5 pl-10 pr-9 text-sm outline-none transition-all shadow-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    aria-label={language === 'bn' ? 'অনুসন্ধান মুছুন' : 'Clear search'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-0.5 rounded-full hover:bg-zinc-100 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </Reveal>

          {loading && page === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 12 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : products.length > 0 ? (
            <Reveal>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={() => navigate(`/product/${product.id}`)}
                  />
                ))}
              </div>
            </Reveal>
          ) : (
            <Reveal>
              <div className="bg-gradient-to-b from-[#ce112d]/[0.03] via-zinc-50/50 to-white border border-zinc-200/80 rounded-3xl p-8 md:p-14 flex flex-col items-center text-center gap-6 shadow-sm max-w-3xl mx-auto my-4">
                <div className="w-20 h-20 bg-gradient-to-b from-[#ce112d]/15 to-[#ce112d]/5 rounded-3xl flex items-center justify-center border border-[#ce112d]/20 text-[#ce112d] shadow-xl shadow-red-900/10">
                  <ShoppingBag size={36} strokeWidth={2} />
                </div>
                <div className="space-y-3">
                  <h2 className="text-2xl md:text-3xl font-black text-neutral-900 tracking-tight uppercase">
                    {language === 'bn' ? 'কোনো পণ্য পাওয়া যায়নি' : 'No Products Available'}
                  </h2>
                  <p className="text-xs md:text-sm text-neutral-600 max-w-lg mx-auto leading-relaxed font-medium">
                    {searchQuery
                      ? (language === 'bn' ? `"${searchQuery}" নামে কোনো পণ্য পাওয়া যায়নি। অন্য কোনো নাম লিখে চেষ্টা করুন।` : `Sorry, no items matched "${searchQuery}". Try exploring all collections or clearing search.`)
                      : (language === 'bn' ? 'দুঃখিত, কোনো পণ্য পাওয়া যায়নি। অনুগ্রহ করে সকল পণ্য ক্লিক করুন অথবা অন্য ক্যাটাগরি সিলেক্ট করুন।' : 'Sorry, no items matched. Try exploring all collections or clearing your search filter.')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (setSelectedCategory) setSelectedCategory('All');
                    if (onSearchChange) onSearchChange('');
                  }}
                  className="mt-2 px-8 py-3 bg-[#ce112d] hover:bg-[#b00e26] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-2"
                >
                  <span>{language === 'bn' ? 'সকল পণ্য দেখুন' : 'Explore All Collections'}</span>
                </button>
              </div>
            </Reveal>
          )}

          {loadingMore && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-8 h-8 border-4 border-[#ce112d] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-[#ce112d] animate-pulse">
                {language === 'bn' ? 'লোড হচ্ছে…' : 'Loading more…'}
              </p>
            </div>
          )}

          {hasMore && products.length > 0 && (
            <div ref={sentinelRef} className="h-6" aria-hidden />
          )}

          {!hasMore && products.length > 0 && (
            <p className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider py-8">
              {language === 'bn' ? 'আর কোনো পণ্য নেই' : 'No more products'}
            </p>
          )}
        </section>
      </div>

      <Reveal>
        <HomeReviews />
      </Reveal>

      {/* Trust & Guarantee Strip */}
      <Reveal>
        <section className="w-full border-t border-b border-zinc-100 bg-zinc-50/70 mt-14 py-8">
          <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 md:px-12">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200/80">
              {[
                {
                  icon: <Truck size={20} strokeWidth={1.8} />,
                  title: language === 'bn' ? 'ফ্রি ডেলিভারি' : 'Free Delivery',
                  sub: language === 'bn' ? 'মীরসরাই এলাকায়' : 'Within Mirsarai',
                },
                {
                  icon: <CreditCard size={20} strokeWidth={1.8} />,
                  title: language === 'bn' ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery',
                  sub: language === 'bn' ? 'হাতে পেয়ে পেমেন্ট' : 'Pay on receipt',
                },
                {
                  icon: <CheckCircle size={20} strokeWidth={1.8} />,
                  title: language === 'bn' ? '১০০% গুণমান' : '100% Quality',
                  sub: language === 'bn' ? 'প্রিমিয়াম ফেব্রিক' : 'Premium finish',
                },
              ].map((item, i) => (
                <div key={i} className={`flex items-center justify-center text-left gap-3.5 sm:gap-4 py-2 sm:py-0 px-2 sm:px-6 ${i > 0 ? 'pt-4 sm:pt-0' : ''}`}>
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white shadow-sm border border-zinc-200/60 flex items-center justify-center text-[#ce112d] shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900 leading-tight">{item.title}</p>
                    <p className="text-xs text-zinc-500 font-medium leading-normal mt-0.5">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
};

export default Home;
