import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowRight, ShoppingBag, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProductCard, ProductSkeleton } from '../components/ProductCard';
import { bigBazarApi } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';

const PAGE_SIZE = 24;

const BASE_CATEGORIES = [
  { id: 'All',          en: 'All',            bn: 'সকল' },
  { id: 'Men',          en: 'Men',            bn: 'ছেলেদের' },
  { id: 'Women',        en: 'Women',          bn: 'মেয়েদের' },
  { id: 'Kids (Boys)',  en: 'Boys',           bn: 'ছেলে শিশু' },
  { id: 'Kids (Girls)', en: 'Girls',          bn: 'মেয়ে শিশু' },
];

export default function Products() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [weddingConfig, setWeddingConfig] = useState(null); // from site_settings

  const initialCategory = searchParams.get('category') || 'All';
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const searchRef = useRef(null);

  // Fetch admin settings for wedding banner config
  useEffect(() => {
    bigBazarApi.from('site_settings').select('*').then(({ data }) => {
      if (!data) return;
      const wb = Array.isArray(data)
        ? data.find(s => s.key === 'wedding_banner')?.value
        : data.wedding_banner;
      if (wb?.enabled && wb?.category_filter) setWeddingConfig(wb);
    });
  }, []);

  // Build category list — add wedding tab only if admin enabled it
  const CATEGORIES = [
    ...BASE_CATEGORIES,
    ...(weddingConfig ? [{
      id: weddingConfig.category_filter,
      en: weddingConfig.title_en || 'Wedding',
      bn: weddingConfig.title_bn || 'ওয়েডিং',
    }] : []),
  ];

  // Sync category with URL param
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat && cat !== selectedCategory) {
      setSelectedCategory(cat);
      setPage(0);
    }
  }, [searchParams]);

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    setPage(0);
    setProducts([]);
    if (cat === 'All') setSearchParams({});
    else setSearchParams({ category: cat });
  };

  // Fetch products
  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      setLoading(true);
      const start = page * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      let query = bigBazarApi
        .from('products')
        .select('*', { count: 'exact' })
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(start, end);

      if (selectedCategory && selectedCategory !== 'All') {
        // Check if this matches the admin-configured wedding category filter
        const isWeddingCat = weddingConfig && selectedCategory === weddingConfig.category_filter;
        if (isWeddingCat) {
          // Use a broad ilike search on the filter keyword
          const kw = weddingConfig.category_filter.toLowerCase();
          query = query.or(`category.ilike.%${kw}%,is_exclusive.eq.true`);
        } else {
          const catMap = {
            'Men':          ['Men', 'ছেলেদের'],
            'Women':        ['Women', 'মেয়েদের'],
            'Kids (Boys)':  ['Kids (Boys)', 'বাচ্চাদের (ছেলে)'],
            'Kids (Girls)': ['Kids (Girls)', 'বাচ্চাদের (মেয়ে)'],
          };
          query = query.in('category', catMap[selectedCategory] || [selectedCategory]);
        }
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, count } = await query;

      if (isMounted) {
        if (data) {
          if (page === 0) setProducts(data);
          else setProducts(prev => [...prev, ...data]);
          setHasMore(count > (page + 1) * PAGE_SIZE);
          setTotalCount(count || 0);
        }
        setLoading(false);
      }
    };

    fetchProducts();
    return () => { isMounted = false; };
  }, [page, selectedCategory, searchQuery]);

  useEffect(() => {
    setPage(0);
    setProducts([]);
  }, [selectedCategory, searchQuery]);

  const currentCat = CATEGORIES.find(c => c.id === selectedCategory);
  const catLabel = currentCat ? (language === 'bn' ? currentCat.bn : currentCat.en) : 'All';

  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="border-b border-zinc-100 bg-white">
        <div className="w-full max-w-[1920px] mx-auto px-4 md:px-12 py-6 md:py-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ce112d] mb-1">Big Bazar</p>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-zinc-900 leading-none">
                {catLabel}
              </h1>
              {!loading && (
                <p className="text-xs text-zinc-400 font-medium mt-2">
                  {totalCount.toLocaleString()} {language === 'bn' ? 'পণ্য পাওয়া গেছে' : 'products found'}
                </p>
              )}
            </div>

            {/* Search */}
            <div className="relative group w-full sm:w-72 md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-[#ce112d] transition-colors" size={16} />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={language === 'bn' ? 'পণ্য খুঁজুন...' : 'Search products...'}
                className="w-full bg-zinc-50 border border-zinc-200 focus:border-[#ce112d]/30 focus:bg-white rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1920px] mx-auto px-4 md:px-12">
        <div className="flex gap-8 py-6 md:py-8">

          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-44 lg:w-52 shrink-0">
            <div className="sticky top-24 space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 px-3 pb-2">
                {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
              </p>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all duration-200 ${
                    selectedCategory === cat.id
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                  }`}
                >
                  {language === 'bn' ? cat.bn : cat.en}
                  {selectedCategory === cat.id && (
                    <span className="float-right w-1.5 h-1.5 rounded-full bg-[#ce112d] mt-1" />
                  )}
                </button>
              ))}
            </div>
          </aside>

          {/* Mobile Filter Bar */}
          <div className="md:hidden w-full mb-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`shrink-0 px-3.5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all border ${
                  selectedCategory === cat.id
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
                }`}
              >
                {language === 'bn' ? cat.bn : cat.en}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-1 min-w-0">
            {/* Empty State */}
            {!loading && products.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-300">
                  <ShoppingBag size={28} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-black text-zinc-900 uppercase tracking-wide">
                    {language === 'bn' ? 'কোনো পণ্য পাওয়া যায়নি' : 'No products found'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {language === 'bn' ? 'অন্য ক্যাটাগরি চেষ্টা করুন' : 'Try a different category or clear search'}
                  </p>
                </div>
                <button
                  onClick={() => { handleCategoryChange('All'); setSearchQuery(''); }}
                  className="px-6 py-2.5 bg-zinc-900 hover:bg-[#ce112d] text-white text-xs font-black uppercase tracking-widest rounded-full transition-all"
                >
                  {language === 'bn' ? 'সকল পণ্য' : 'View All'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-5">
              {loading && page === 0
                ? Array.from({ length: 20 }).map((_, i) => <ProductSkeleton key={i} />)
                : products.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={() => navigate(`/product/${product.id}`)}
                    />
                  ))
              }
            </div>

            {loading && page > 0 && (
              <div className="flex items-center justify-center py-12 gap-3">
                <div className="w-5 h-5 border-2 border-[#ce112d] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Loading…</span>
              </div>
            )}

            {hasMore && !loading && (
              <div className="flex justify-center pt-10 pb-4">
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="group inline-flex items-center gap-2.5 px-8 py-3 bg-zinc-900 hover:bg-[#ce112d] text-white text-xs font-black uppercase tracking-[0.2em] rounded-full transition-all duration-300 active:scale-95"
                >
                  <span>{language === 'bn' ? 'আরো দেখুন' : 'Load More'}</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
