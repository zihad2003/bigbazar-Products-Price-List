import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Truck, CreditCard, Check, Share2, Award, Zap, AlertCircle, ShoppingCart, MessageCircle, X, Lightbulb, ChevronRight } from 'lucide-react';
import { calculatePrice } from '../utils/pricing';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import ProductGallery from '../components/ProductGallery';
import ProductTabs from '../components/ProductTabs';
import RecentlyViewed from '../components/RecentlyViewed';
import AlertModal from '../components/modals/AlertModal';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { bigBazarApi } from '../api/client';
import { trackViewItem, trackAddToCart, trackMessengerClick } from '../utils/analytics';

export default function ProductDetails() {
    const { productId } = useParams();
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const { cartItems, addToCart } = useCart();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCartSuccess, setShowCartSuccess] = useState(false);
    const [messengerNotice, setMessengerNotice] = useState('');
    const [showMessengerModal, setShowMessengerModal] = useState(false);
    const [copiedText, setCopiedText] = useState('');
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [validationError, setValidationError] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [showAlert, setShowAlert] = useState(false);
    const [showStickyBar, setShowStickyBar] = useState(false);
    const [subcategoriesData, setSubcategoriesData] = useState(null);
    const mainActionsRef = React.useRef(null);

    useEffect(() => {
        bigBazarApi.from('site_settings').select('*').then(({ data }) => {
            if (!data) return;
            const isArray = Array.isArray(data);
            const subcats = isArray ? data.find(s => s.key === 'subcategories')?.value : data.subcategories;
            if (subcats && typeof subcats === 'object') setSubcategoriesData(subcats);
        });
    }, []);

    const images = React.useMemo(() => {
        if (!product) return [];
        const base = (product.images && Array.isArray(product.images) && product.images.length > 0)
            ? [...product.images]
            : [product.image || product.image_url].filter(Boolean);

        // Include any color variant photos so that selecting a color instantly maps to the gallery
        if (product.available_colors && Array.isArray(product.available_colors)) {
            product.available_colors.forEach(c => {
                const colorImg = typeof c === 'object' ? (c.image || c.image_url) : null;
                if (colorImg && !base.includes(colorImg)) {
                    base.push(colorImg);
                }
            });
        }
        return base;
    }, [product]);

    useEffect(() => {
        const handleScroll = () => {
            if (mainActionsRef.current && window.innerWidth < 768) {
                const rect = mainActionsRef.current.getBoundingClientRect();
                const isPast = rect.bottom < 100;
                setShowStickyBar(prev => (prev !== isPast ? isPast : prev));
            } else {
                setShowStickyBar(prev => (prev !== false ? false : prev));
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (productId) {
            setLoading(true);
            bigBazarApi.from('products').select('*').eq('id', productId).single()
                .then(res => {
                    if (res && res.data) {
                        const prod = res.data;
                        setProduct(prod);
                        trackViewItem(prod);

                        // Save product to recently viewed list
                        try {
                            const stored = localStorage.getItem('bigbazar_recently_viewed');
                            let list = stored ? JSON.parse(stored) : [];
                            if (!Array.isArray(list)) list = [];
                            list = list.filter(item => item && item.id !== prod.id);
                            list.unshift({
                                id: prod.id,
                                name: prod.name,
                                price: prod.price,
                                original_price: prod.original_price,
                                image_url: prod.image_url || prod.image || (prod.images && prod.images[0]),
                                category: prod.category
                            });
                            localStorage.setItem('bigbazar_recently_viewed', JSON.stringify(list.slice(0, 10)));
                        } catch (e) {
                            console.error('Failed to save to recently viewed:', e);
                        }

                        const getValidOptions = (arr) => (arr || []).filter(item => {
                            const name = typeof item === 'object' ? item.name : item;
                            const isAvailable = typeof item === 'object' ? item.is_available !== false : true;
                            return name && String(name).trim() !== '' && isAvailable;
                        });

                        const validColors = getValidOptions(prod.available_colors);
                        if (validColors.length === 1) setSelectedColor(typeof validColors[0] === 'object' ? validColors[0].name : validColors[0]);
                        else setSelectedColor('');

                        const validSizes = getValidOptions(prod.available_sizes);
                        if (validSizes.length === 1) setSelectedSize(typeof validSizes[0] === 'object' ? validSizes[0].name : validSizes[0]);
                        else setSelectedSize('');
                    } else {
                        setProduct(null);
                    }
                })
                .catch(err => {
                    console.error("Failed to load product details:", err);
                    setProduct(null);
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [productId]);

    useEffect(() => {
        if (!product) return;

        const { price } = calculatePrice(product);
        const schemaData = {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": product.name,
            "image": product.image_url || product.image || (product.images && product.images[0]) || "",
            "description": product.description || `${product.name} - Buy online at Big Bazar Baraiyarhat`,
            "sku": String(product.id),
            "brand": {
                "@type": "Brand",
                "name": "Big Bazar"
            },
            "offers": {
                "@type": "Offer",
                "url": window.location.href,
                "priceCurrency": "BDT",
                "price": price,
                "availability": product.is_sold_out ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
                "seller": {
                    "@type": "Organization",
                    "name": "Big Bazar Baraiyarhat"
                }
            }
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'product-jsonld-schema';
        script.text = JSON.stringify(schemaData);

        const existing = document.getElementById('product-jsonld-schema');
        if (existing) existing.remove();

        document.head.appendChild(script);

        return () => {
            const currentScript = document.getElementById('product-jsonld-schema');
            if (currentScript) currentScript.remove();
        };
    }, [product]);

    const selectedColorObj = React.useMemo(() => {
        if (!selectedColor || !product || !product.available_colors) return null;
        return product.available_colors.find(c => {
            const name = typeof c === 'object' ? c.name : c;
            return name === selectedColor;
        });
    }, [selectedColor, product]);

    const activeImageIndex = React.useMemo(() => {
        if (!selectedColorObj) return 0;
        const colorImg = selectedColorObj.image || selectedColorObj.image_url;
        if (!colorImg) return 0;
        const idx = images.findIndex(img => img === colorImg || (typeof img === 'string' && typeof colorImg === 'string' && (img.endsWith(colorImg) || colorImg.endsWith(img))));
        return idx >= 0 ? idx : 0;
    }, [selectedColorObj, images]);

    // Active size options based on selected color or fallback to available_sizes
    const activeSizes = React.useMemo(() => {
        if (!product) return [];
        if (selectedColorObj && Array.isArray(selectedColorObj.sizes) && selectedColorObj.sizes.length > 0) {
            return selectedColorObj.sizes;
        }
        return product.available_sizes || [];
    }, [product, selectedColorObj]);

    // Auto reset selectedSize if not valid for newly selected color
    useEffect(() => {
        if (selectedColor && activeSizes.length > 0 && selectedSize) {
            const sizeObj = activeSizes.find(s => (typeof s === 'object' ? s.name : s) === selectedSize);
            if (!sizeObj) {
                setSelectedSize('');
            } else if (typeof sizeObj === 'object') {
                const isAvail = sizeObj.is_available !== false && (sizeObj.stock === undefined || parseInt(sizeObj.stock) > 0);
                if (!isAvail) setSelectedSize('');
            }
        }
    }, [selectedColor, activeSizes]);

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 md:px-12 py-32 text-center flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-[#ce112d] border-t-transparent rounded-full animate-spin" />
                <p className="font-bold text-xs uppercase tracking-widest text-[#ce112d] animate-pulse">
                    {language === 'bn' ? 'পণ্য বিবরণ লোড হচ্ছে...' : 'Loading product details...'}
                </p>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-6">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingBag className="text-red-500" size={44} />
                </div>
                <h1 className="text-2xl font-black italic uppercase text-neutral-800 leading-none tracking-tight">
                    {language === 'bn' ? 'পণ্যটি পাওয়া যায়নি' : 'Product Not Found'}
                </h1>
                <p className="text-neutral-500 text-sm max-w-md mx-auto">
                    {language === 'bn'
                        ? 'দুঃখিত,পণ্যটি খুঁজে পাওয়া যায়নি। অনুগ্রহ করে আমাদের কালেকশন চেক করুন।'
                        : 'Sorry, we could not find the product you are looking for. Please browse our collections.'}
                </p>
                <div className="pt-4">
                    <Link to="/" className="inline-flex bg-[#ce112d] text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all">
                        {language === 'bn' ? 'হোমে ফিরে যান' : 'Back to Home'}
                    </Link>
                </div>
            </div>
        );
    }

    const { price, originalPrice, hasDiscount } = calculatePrice(product);

    // Calculate discount percentage
    const discountPercent = hasDiscount && originalPrice > 0
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;

    const isOutOfStock = product.is_sold_out || (product.stock_count !== null && product.stock_count <= 0);

    const hasValidColors = product.available_colors?.some(c => {
        const name = typeof c === 'object' ? c.name : c;
        return name && String(name).trim() !== '';
    });
    const hasValidSizes = activeSizes?.some(s => {
        const name = typeof s === 'object' ? s.name : s;
        return name && String(name).trim() !== '';
    });

    // Check if required selections are made
    const canProceed = () => {
        if (isOutOfStock) return false;
        if (hasValidColors && !selectedColor) return false;
        if (hasValidSizes && !selectedSize) return false;
        return true;
    };

    const scrollToOptions = () => {
        if (mainActionsRef.current) {
            mainActionsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const handleAddToCart = () => {
        if (isOutOfStock) return;
        if (hasValidColors && !selectedColor) { setValidationError('color'); scrollToOptions(); return; }
        if (hasValidSizes && !selectedSize) { setValidationError('size'); scrollToOptions(); return; }
        addToCart({ ...product, price }, selectedColor, selectedSize, quantity);
        trackAddToCart({ ...product, price }, quantity);
        setShowCartSuccess(true);
        setTimeout(() => setShowCartSuccess(false), 2000);
        setValidationError('');
    };

    const handleMainOrder = () => {
        if (isOutOfStock) return;
        if (hasValidColors && !selectedColor) { setValidationError('color'); scrollToOptions(); return; }
        if (hasValidSizes && !selectedSize) { setValidationError('size'); scrollToOptions(); return; }
        setValidationError('');
        addToCart({ ...product, price }, selectedColor, selectedSize, quantity);
        trackAddToCart({ ...product, price }, quantity);
        navigate('/checkout');
    };

    const handleMessengerOrder = () => {
        if (isOutOfStock) return;
        if (hasValidColors && !selectedColor) { setValidationError('color'); scrollToOptions(); return; }
        if (hasValidSizes && !selectedSize) { setValidationError('size'); scrollToOptions(); return; }
        setValidationError('');

        const orderText = `আসসালামু আলাইকুম! আমি এই পণ্যটি অর্ডার করতে চাই:\n\n` +
            `• পণ্য: ${product.name}\n` +
            `• মূল্য: ৳${price}\n` +
            (selectedColor ? `• কালার: ${selectedColor}\n` : '') +
            (selectedSize ? `• সাইজ: ${selectedSize}\n` : '') +
            `• পরিমাণ: ${quantity}\n` +
            `• লিংক: ${window.location.href}`;

        try {
            navigator.clipboard.writeText(orderText);
        } catch (e) {
            console.error('Clipboard copy failed:', e);
        }

        trackMessengerClick(product);
        setCopiedText(orderText);
        setShowMessengerModal(true);
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: product.name,
                url: window.location.href
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href);
            setShowAlert(true);
        }
    };

    const isInCart = cartItems.some(item =>
        item.id === product.id &&
        (item.selectedColor === selectedColor || (!item.selectedColor && !selectedColor)) &&
        (item.selectedSize === selectedSize || (!item.selectedSize && !selectedSize))
    );

    const formatSubcategoryName = (subId) => {
        if (!subId) return '';
        if (subcategoriesData && product?.category && subcategoriesData[product.category]) {
            const match = subcategoriesData[product.category].find(s => s.id?.toLowerCase() === subId.toLowerCase());
            if (match && match.name_en) {
                return match.name_en;
            }
        }
        return subId.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-12 py-6 md:py-12 bg-white">
            {/* Breadcrumbs (Fashion Brand All-English Standard) */}
            <div className="mb-6 flex items-center justify-between text-xs text-neutral-400 font-bold uppercase tracking-widest">
                <div className="flex flex-wrap items-center gap-2">
                    <Link to="/" className="hover:text-neutral-900 transition-colors">
                        Home
                    </Link>
                    <span>/</span>
                    {product.category && (
                        <>
                            <Link 
                                to={`/products?category=${encodeURIComponent(product.category)}`} 
                                className="hover:text-neutral-900 transition-colors"
                            >
                                {product.category}
                            </Link>
                            <span>/</span>
                        </>
                    )}
                    {product.subcategory && (
                        <>
                            <Link 
                                to={`/products?category=${encodeURIComponent(product.category || '')}&subcategory=${encodeURIComponent(product.subcategory)}`} 
                                className="hover:text-neutral-900 transition-colors"
                            >
                                {formatSubcategoryName(product.subcategory)}
                            </Link>
                            <span>/</span>
                        </>
                    )}
                    <span className="text-[#ce112d] font-bold max-w-[200px] sm:max-w-[300px] md:max-w-[400px] truncate capitalize">
                        {product.name}
                    </span>
                </div>
                <button onClick={handleShare} className="flex items-center gap-1.5 hover:text-black transition-all shrink-0">
                    <Share2 size={14} />
                    <span>{language === 'bn' ? 'শেয়ার করুন' : 'Share'}</span>
                </button>
            </div>

            {/* Main Product Layout */}
            <div className="flex flex-col md:flex-row gap-6 lg:gap-12">
                {/* Media Column - Gallery */}
                <div className="w-full md:w-[50%] lg:w-[48%]">
                    <div className="relative">
                        <ProductGallery images={images} activeImageIndex={activeImageIndex} />

                        {/* Badges */}
                        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-[10]">
                            {product.is_new && (
                                <span className="px-3 py-1 bg-[#ce112d] text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-md shadow-md">
                                    {language === 'bn' ? 'নতুন' : 'NEW'}
                                </span>
                            )}
                            {hasDiscount && (
                                <span className="px-3 py-1 bg-neutral-900 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-md shadow-md">
                                    {discountPercent}% OFF
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Details Column */}
                <div className="flex-1 flex flex-col justify-start gap-8">
                    <div className="space-y-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ce112d]">
                            {product.category || 'Clothing'}
                        </span>
                        <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-neutral-900 italic leading-tight capitalize tracking-tight">
                            {product.name}
                        </h1>
                        <div className="flex flex-wrap items-baseline gap-3 pt-1">
                            <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#ce112d] whitespace-nowrap">৳{price}</span>
                            {hasDiscount && (
                                <span className="text-sm sm:text-base md:text-lg lg:text-xl text-neutral-400 line-through font-semibold whitespace-nowrap">৳{originalPrice}</span>
                            )}
                        </div>
                    </div>

                    {/* Options Selection - Only show if data exists */}
                    {(hasValidColors || hasValidSizes) && (
                        <div className="space-y-6">
                            {hasValidColors && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                            {language === 'bn' ? 'কালার সিলেক্ট করুন' : 'Select Color'}: {selectedColor && <span className="text-neutral-900 font-bold ml-1">{selectedColor}</span>}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2.5 sm:gap-3">
                                        {product.available_colors?.filter(c => {
                                            const name = typeof c === 'object' ? c.name : c;
                                            return name && String(name).trim() !== '';
                                        }).map((c, i) => {
                                            const name = typeof c === 'object' ? c.name : c;
                                            const hex = typeof c === 'object' ? c.hex : null;
                                            const img = typeof c === 'object' ? (c.image || c.image_url) : null;
                                            const cIsAvailable = typeof c === 'object' ? c.is_available !== false : true;
                                            const isDisabled = isOutOfStock || !cIsAvailable;
                                            const isSelected = selectedColor === name;

                                            return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => { if (!isDisabled) { setSelectedColor(name); setValidationError(''); } }}
                                                    disabled={isDisabled}
                                                    className={`group relative flex flex-col items-center rounded-2xl transition-all duration-200 overflow-hidden text-left ${
                                                        isDisabled
                                                            ? 'opacity-40 grayscale cursor-not-allowed border-2 border-neutral-100'
                                                            : isSelected
                                                                ? 'border-2 border-[#ce112d] ring-2 ring-[#ce112d]/30 shadow-lg scale-105'
                                                                : 'border-2 border-neutral-200 hover:border-neutral-400 bg-white hover:scale-[1.03] shadow-sm'
                                                    }`}
                                                    style={{ minWidth: '68px', maxWidth: '88px' }}
                                                >
                                                    {/* Mini Proportional Photo Frame */}
                                                    <div className="w-16 h-20 sm:w-20 sm:h-24 bg-neutral-100 relative overflow-hidden shrink-0">
                                                        {img ? (
                                                            <img
                                                                src={getOptimizedUrl(img, { w: 160, h: 200 })}
                                                                className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                                                                alt={name}
                                                                onError={(e) => {
                                                                    if (img && e.currentTarget.src !== img) {
                                                                        e.currentTarget.src = img;
                                                                    }
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-100 gap-1">
                                                                {hex ? (
                                                                    <span className="w-6 h-6 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: hex }}></span>
                                                                ) : (
                                                                    <span className="text-xs font-black text-neutral-400 uppercase">{name.slice(0, 2)}</span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Checkmark badge when selected */}
                                                        {isSelected && (
                                                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#ce112d] text-white flex items-center justify-center shadow-md">
                                                                <Check size={10} strokeWidth={3} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Color Name Label */}
                                                    <div className={`w-full py-1.5 px-1.5 text-center text-[10px] font-black uppercase tracking-wider truncate transition-colors ${
                                                        isSelected ? 'bg-[#ce112d] text-white' : 'bg-neutral-50 text-neutral-800 group-hover:bg-neutral-100'
                                                    }`}>
                                                        {name}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {hasValidSizes && (
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                        {language === 'bn' ? 'সাইজ সিলেক্ট করুন' : 'Select Size'}
                                    </p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {activeSizes.filter(s => {
                                            const name = typeof s === 'object' ? s.name : s;
                                            return name && String(name).trim() !== '';
                                        }).map((s, i) => {
                                            const name = typeof s === 'object' ? s.name : s;
                                            const sStock = typeof s === 'object' ? (s.stock !== undefined ? parseInt(s.stock) : 1) : 1;
                                            const sAvail = typeof s === 'object' ? (s.is_available !== false) : true;
                                            const isDisabled = isOutOfStock || !sAvail || sStock <= 0;
                                            return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => { if (!isDisabled) { setSelectedSize(name); setValidationError(''); } }}
                                                    disabled={isDisabled}
                                                    className={`py-3 border-[2px] text-xs font-black tracking-wider transition-all rounded-xl relative ${isDisabled
                                                            ? 'border-neutral-100 bg-neutral-50 text-neutral-300 line-through cursor-not-allowed opacity-60'
                                                            : selectedSize === name
                                                                ? 'bg-neutral-900 text-white border-neutral-900 shadow-md'
                                                                : 'border-neutral-100 text-neutral-700 hover:border-neutral-300'
                                                        }`}
                                                >
                                                    {name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Quantity + Checkouts */}
                    <div className="space-y-4">
                        <AnimatePresence>
                            {validationError && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#ce112d] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                    <AlertCircle size={14} />
                                    {validationError === 'size'
                                        ? (language === 'bn' ? 'দয়া করে সাইজ বেছে নিন' : 'Please select size first')
                                        : (language === 'bn' ? 'দয়া করে কালার বেছে নিন' : 'Please select color first')
                                    }
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {isOutOfStock ? (
                            <div className="w-full py-4 bg-neutral-50 text-neutral-400 text-center rounded-xl font-black uppercase tracking-widest text-xs">
                                {language === 'bn' ? 'স্টক নেই' : 'Currently Out of Stock'}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {/* Quantity Picker */}
                                <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-neutral-100">
                                    <p className="pl-3 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                        {language === 'bn' ? 'পরিমাণ' : 'Quantity'}
                                    </p>
                                    <div className="flex items-center gap-5 pr-2">
                                        <button
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="w-9 h-9 rounded-lg bg-white border border-neutral-100 flex items-center justify-center text-neutral-900 hover:bg-neutral-900 hover:text-white transition-all active:scale-95 shadow-sm"
                                        >
                                            <span className="text-base font-bold">-</span>
                                        </button>
                                        <span className="text-sm font-black text-neutral-900 w-4 text-center">{quantity}</span>
                                        <button
                                            onClick={() => setQuantity(quantity + 1)}
                                            className="w-9 h-9 rounded-lg bg-white border border-neutral-100 flex items-center justify-center text-neutral-900 hover:bg-neutral-900 hover:text-white transition-all active:scale-95 shadow-sm"
                                        >
                                            <span className="text-base font-bold">+</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Action Buttons - Primary vs Secondary distinction */}
                                <div ref={mainActionsRef} className="space-y-3">
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button
                                            onClick={handleMainOrder}
                                            disabled={!canProceed()}
                                            className={`flex-1 py-4 font-bold rounded-xl transition-all text-center ${
                                                language === 'en' ? 'uppercase tracking-[0.2em] text-[11px] font-black' : 'text-xs md:text-sm tracking-wide'
                                            } ${canProceed()
                                                    ? 'bg-[#ce112d] text-white shadow-xl shadow-red-900/30 hover:bg-[#b00e26] active:scale-95'
                                                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                                }`}
                                        >
                                            {language === 'bn' ? 'অর্ডার করুন' : 'Order Now'}
                                        </button>
                                        <button
                                            onClick={handleAddToCart}
                                            disabled={!canProceed()}
                                            className={`sm:w-44 py-4 border-2 font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                                                language === 'en' ? 'uppercase tracking-[0.2em] text-[11px] font-black' : 'text-xs md:text-sm tracking-wide'
                                            } ${isInCart
                                                    ? 'bg-neutral-100 border-neutral-100 text-[#ce112d]'
                                                    : canProceed()
                                                        ? 'border-neutral-900 text-neutral-900 hover:bg-neutral-50'
                                                        : 'border-neutral-200 text-neutral-400 cursor-not-allowed'
                                                }`}
                                        >
                                            {isInCart ? <Check size={15} /> : <ShoppingCart size={15} />}
                                            {isInCart ? (language === 'bn' ? 'ব্যাগে আছে' : 'In Bag') : (language === 'bn' ? 'ব্যাগে যোগ করুন' : 'Add to Bag')}
                                        </button>
                                    </div>
                                </div>

                                {/* Local Delivery & Assurance Highlight Banner */}
                                <div className="p-3.5 bg-gradient-to-r from-[#ce112d]/5 via-red-50/40 to-neutral-50 rounded-2xl border border-red-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-[#ce112d] text-white flex items-center justify-center shrink-0 shadow-md shadow-red-900/20">
                                            <Truck size={18} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <p className="font-black text-neutral-900 uppercase text-[10px] tracking-tight">
                                                {language === 'bn' ? 'মীরসরাই উপজেলায় হোম ডেলিভারি সম্পূর্ণ ফ্রি!' : 'Free Home Delivery in Mirsharai'}
                                            </p>
                                            <p className="text-[9px] text-neutral-500 font-medium leading-tight">
                                                {language === 'bn' ? 'ক্যাশ অন ডেলিভারি সুবিধা চট্টগ্রাম ও সারা বাংলাদেশে' : 'Cash on Delivery Available Countrywide'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Product Tabs - Description, Video, Size Guide */}
                    <ProductTabs
                        description={product.description}
                        videoUrl={product.video_url}
                        hasSizes={hasValidSizes}
                    />

                    {/* Guarantee / Perks Grid - Fixed 4-column layout */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-neutral-100">
                        {[
                            { icon: Truck, label: language === 'bn' ? 'ডেলিভারি' : 'Delivery', desc: language === 'bn' ? 'দ্রুত হোম ডেলিভারি' : 'Fast Shipping' },
                            { icon: Award, label: language === 'bn' ? 'কোয়ালিটি' : 'Quality', desc: language === 'bn' ? 'সেরা ফেব্রিক গ্যারান্টি' : 'Guaranteed Quality' },
                            { icon: CreditCard, label: language === 'bn' ? 'নিরাপদ' : 'Safe', desc: language === 'bn' ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery' },
                            { icon: Zap, label: language === 'bn' ? 'সাপোর্ট' : 'Support', desc: language === 'bn' ? 'মেসেঞ্জার সহায়তা' : '24/7 Live Care' }
                        ].map((item, i) => (
                            <div key={i} className="flex flex-col items-center text-center gap-2">
                                <div className="w-10 h-10 rounded-lg bg-neutral-50 flex items-center justify-center text-[#ce112d] shadow-sm shrink-0">
                                    <item.icon size={18} strokeWidth={2.5} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-tight text-neutral-900 leading-tight">{item.label}</p>
                                    <p className="text-[9px] text-neutral-400 font-medium leading-tight">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recently Viewed Products Section — Full Width from Left */}
            {product && <RecentlyViewed currentProductId={product.id} />}

            <AlertModal isOpen={showAlert} onClose={() => setShowAlert(false)} type="success" title="Copied!" message="Link copied to clipboard!" />

            <AnimatePresence>
                {showCartSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="fixed bottom-[130px] right-3 sm:right-6 z-[1030] bg-white/95 backdrop-blur-xl border border-zinc-200 shadow-2xl rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2.5 text-zinc-900 max-w-[290px] sm:max-w-sm"
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-10 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-zinc-200 relative">
                                <img
                                    src={getOptimizedUrl(product?.image_url || images[0], { w: 80, h: 90 })}
                                    alt=""
                                    className="w-full h-full object-cover object-top"
                                    onError={(e) => { e.target.src = 'https://placehold.co/80x90/ffffff/ce112d?text=BB'; }}
                                />
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white border border-white">
                                    <Check size={10} strokeWidth={3} />
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-zinc-900 leading-tight">
                                    {language === 'bn' ? 'ব্যাগে যোগ হয়েছে!' : 'Added to bag!'}
                                </p>
                                <p className="text-[10px] text-[#ce112d] font-black truncate mt-0.5">
                                    ৳{price}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                navigate('/checkout');
                                setShowCartSuccess(false);
                            }}
                            className="px-2.5 py-1.5 bg-[#ce112d] hover:bg-[#b30e25] text-white text-[10px] font-bold rounded-xl active:scale-95 transition-all shrink-0 shadow-2xs flex items-center gap-1"
                        >
                            <span>{language === 'bn' ? 'অর্ডার' : 'Checkout'}</span>
                            <ChevronRight size={11} />
                        </button>
                    </motion.div>
                )}
                {showMessengerModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[3000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowMessengerModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white text-neutral-900 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setShowMessengerModal(false)}
                                className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center transition-all"
                            >
                                <X size={16} />
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-[#0084FF]/10 text-[#0084FF] flex items-center justify-center shrink-0">
                                    <MessageCircle size={26} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-neutral-900 leading-tight">
                                        {language === 'bn' ? 'পণ্যের বিবরণ কপি হয়েছে!' : 'Product Details Copied!'}
                                    </h3>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-extrabold mt-1">
                                        <Check size={12} /> {language === 'bn' ? 'ক্লিপবোর্ডে কপি করা হয়েছে' : 'Copied to clipboard'}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 text-xs font-mono text-neutral-700 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto">
                                {copiedText}
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-blue-900">
                                <Lightbulb size={16} className="text-blue-600 shrink-0 mt-0.5" />
                                <p className="leading-relaxed font-semibold">
                                    {language === 'bn'
                                        ? 'মেসেঞ্জারে চ্যাট খুললে মেসেজ বক্সে চাপ দিয়ে ধরে Paste (পেস্ট) চাপুন এবং আমাদের সেন্ড করুন।'
                                        : 'When Messenger opens, press and hold on the chat box, tap Paste, and send it to us.'}
                                </p>
                            </div>

                            <a
                                href="https://m.me/100063541603515"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setShowMessengerModal(false)}
                                className="w-full py-4 bg-[#0084FF] hover:bg-[#0073e6] text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-all active:scale-95 no-underline"
                            >
                                <MessageCircle size={18} />
                                <span>{language === 'bn' ? 'মেসেঞ্জারে চ্যাট শুরু করুন' : 'Open Messenger Chat'}</span>
                            </a>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Floating Sticky Quick-Order Bar - Compact with Thumbnail Floating above Chat Widget */}
            <AnimatePresence>
                {showStickyBar && !loading && product && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="lg:hidden fixed bottom-[130px] right-3 z-[1010] bg-white/95 backdrop-blur-xl border border-zinc-200/90 rounded-2xl p-2 shadow-xl flex items-center gap-2.5 text-zinc-900"
                    >
                        <div className="w-10 h-11 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-zinc-200">
                            <img
                                src={getOptimizedUrl(product.image_url || images[0], { w: 80, h: 90 })}
                                alt={product.name}
                                className="w-full h-full object-cover object-top"
                                onError={(e) => { e.target.src = 'https://placehold.co/80x90/ffffff/ce112d?text=BB'; }}
                            />
                        </div>

                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-black text-[#ce112d] leading-none">৳{price}</span>
                            <span className="text-[9px] text-zinc-500 font-bold truncate max-w-[65px] mt-0.5">
                                {selectedColor || selectedSize
                                    ? `${selectedColor} ${selectedSize}`.trim()
                                    : (language === 'bn' ? 'অপশন' : 'Options')}
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                onClick={handleAddToCart}
                                className="w-8 h-8 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl active:scale-95 transition-all flex items-center justify-center shrink-0 border border-zinc-200"
                                title={language === 'bn' ? 'ব্যাগে যোগ করুন' : 'Add to Bag'}
                            >
                                {isInCart ? <Check size={14} className="text-emerald-600" /> : <ShoppingCart size={14} />}
                            </button>
                            <button
                                onClick={handleMainOrder}
                                className="py-2 px-3 bg-[#ce112d] hover:bg-[#b00e26] text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-md shadow-red-900/20 active:scale-95 transition-all flex items-center gap-1 shrink-0"
                            >
                                <ShoppingBag size={12} />
                                <span>{language === 'bn' ? 'অর্ডার' : 'Order'}</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
