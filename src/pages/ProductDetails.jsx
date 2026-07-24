import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Truck, CreditCard, ChevronLeft, Check, Play, Image as ImageIcon, Share2, Award, Zap, AlertCircle, ShoppingCart } from 'lucide-react';
import { calculatePrice } from '../utils/pricing';
import ProductModalMedia from '../components/ProductModalMedia';
import AlertModal from '../components/modals/AlertModal';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { bigBazarApi } from '../api/client';

export default function ProductDetails() {
    const { productId } = useParams();
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const { cartItems, addToCart } = useCart();
    
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCartSuccess, setShowCartSuccess] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [validationError, setValidationError] = useState('');
    const [showVideo, setShowVideo] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [showAlert, setShowAlert] = useState(false);

    useEffect(() => {
        if (productId) {
            setLoading(true);
            bigBazarApi.from('products').select('*').eq('id', productId).single()
                .then(res => {
                    if (res && res.data) {
                        const prod = res.data;
                        setProduct(prod);

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
                        ? 'দুঃখিত, আমরা এই আইডি দিয়ে কোনো পণ্য খুঁজে পাইনি। অনুগ্রহ করে আমাদের কালেকশন চেক করুন।'
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
    const images = (product.images && Array.isArray(product.images) && product.images.length > 0)
        ? product.images
        : [product.image || product.image_url].filter(Boolean);

    // Calculate discount percentage
    const discountPercent = hasDiscount && originalPrice > 0 
        ? Math.round(((originalPrice - price) / originalPrice) * 100) 
        : 0;

    const hasValidColors = product.available_colors?.some(c => {
        const name = typeof c === 'object' ? c.name : c;
        return name && String(name).trim() !== '';
    });
    const hasValidSizes = product.available_sizes?.some(s => {
        const name = typeof s === 'object' ? s.name : s;
        return name && String(name).trim() !== '';
    });

    const handleAddToCart = () => {
        if (product.is_sold_out) return;
        if (hasValidColors && !selectedColor) { setValidationError('color'); return; }
        if (hasValidSizes && !selectedSize) { setValidationError('size'); return; }
        addToCart({ ...product, price }, selectedColor, selectedSize, quantity);
        setShowCartSuccess(true);
        setTimeout(() => setShowCartSuccess(false), 2000);
        setValidationError('');
    };

    const handleMainOrder = () => {
        if (product.is_sold_out) return;
        if (hasValidColors && !selectedColor) { setValidationError('color'); return; }
        if (hasValidSizes && !selectedSize) { setValidationError('size'); return; }
        setValidationError('');
        addToCart({ ...product, price }, selectedColor, selectedSize, quantity);
        navigate('/checkout');
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

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-12 py-6 md:py-12 bg-white">
            {/* Breadcrumbs */}
            <div className="mb-6 flex items-center justify-between text-xs text-neutral-400 font-bold uppercase tracking-widest">
                <div className="flex items-center gap-2">
                    <Link to="/" className="hover:text-black transition-colors">Home</Link>
                    <span>/</span>
                    <span className="text-[#ce112d] font-bold">{product.category || 'Women'}</span>
                    <span>/</span>
                    <span className="text-neutral-800 font-bold max-w-[220px] md:max-w-[320px] truncate">{product.name}</span>
                </div>
                <button onClick={handleShare} className="flex items-center gap-1.5 hover:text-black transition-all">
                    <Share2 size={14} />
                    <span>{language === 'bn' ? 'শেয়ার করুন' : 'Share'}</span>
                </button>
            </div>

            {/* Main Product Layout */}
            <div className="flex flex-col md:flex-row gap-6 lg:gap-12">
                {/* Media Column */}
                <div className="w-full md:w-[50%] lg:w-[48%] relative flex flex-col justify-start bg-neutral-50 rounded-[24px] md:rounded-[32px] overflow-hidden aspect-[4/5] md:aspect-[3/4] lg:aspect-[4/5] shadow-sm">
                    <ProductModalMedia 
                        images={images} 
                        videoUrl={product.video_url} 
                        showVideo={showVideo} 
                        setShowVideo={setShowVideo} 
                        currentIndex={currentImageIndex}
                        setIndex={setCurrentImageIndex}
                    />
                    
                    {/* Media Type Toggles */}
                    {product.video_url && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center bg-white/90 backdrop-blur-md rounded-full p-1 shadow-2xl border border-neutral-200 z-[10]">
                            <button 
                                onClick={() => setShowVideo(false)}
                                className={`flex items-center gap-2 px-5 py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${!showVideo ? 'bg-[#ce112d] text-white' : 'text-neutral-500'}`}
                            >
                                <ImageIcon size={12} md:size={14} />
                                <span>{language === 'bn' ? 'ছবি দেখুন' : 'See Photo'}</span>
                            </button>
                            <button 
                                onClick={() => setShowVideo(true)}
                                className={`flex items-center gap-2 px-5 py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${showVideo ? 'bg-[#ce112d] text-white' : 'text-neutral-500'}`}
                            >
                                <Play size={12} md:size={14} />
                                <span>{language === 'bn' ? 'ভিডিও দেখুন' : 'See Video'}</span>
                            </button>
                        </div>
                    )}

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

                {/* Details Column */}
                <div className="flex-1 flex flex-col justify-start gap-6 lg:py-2">
                    <div className="space-y-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ce112d]">
                            {product.category || 'Clothing'}
                        </span>
                        <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-neutral-900 italic leading-tight uppercase tracking-tight">
                            {product.name}
                        </h1>
                        <div className="flex items-baseline gap-3 pt-1">
                            <span className="text-3xl md:text-4xl lg:text-5xl font-black text-[#ce112d]">৳ {price}</span>
                            {hasDiscount && (
                                <span className="text-base md:text-lg lg:text-xl text-neutral-400 line-through font-semibold">৳ {originalPrice}</span>
                            )}
                        </div>
                    </div>

                    {/* Options Selection */}
                    <div className="space-y-6">
                        {hasValidColors && (
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                    {language === 'bn' ? 'কালার সিলেক্ট করুন' : 'Select Color'}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {product.available_colors?.filter(c => {
                                        const name = typeof c === 'object' ? c.name : c;
                                        return name && String(name).trim() !== '';
                                    }).map((c, i) => {
                                        const name = typeof c === 'object' ? c.name : c;
                                        const hex = typeof c === 'object' ? c.hex : null;
                                        return (
                                            <button 
                                                key={i} 
                                                onClick={() => { setSelectedColor(name); setValidationError(''); }}
                                                className={`group relative flex items-center gap-2 px-3 py-2 border-[2px] rounded-lg transition-all ${selectedColor === name ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-100 hover:border-neutral-200'}`}
                                            >
                                                {hex && (
                                                    <span className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: hex }}></span>
                                                )}
                                                <span className="text-[10px] font-black uppercase tracking-wider">{name}</span>
                                                {selectedColor === name && <Check size={10} className="ml-1" />}
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
                                    {product.available_sizes?.filter(s => {
                                        const name = typeof s === 'object' ? s.name : s;
                                        return name && String(name).trim() !== '';
                                    }).map((s, i) => {
                                        const name = typeof s === 'object' ? s.name : s;
                                        return (
                                            <button 
                                                key={i} 
                                                onClick={() => { setSelectedSize(name); setValidationError(''); }}
                                                className={`py-2.5 border-[2px] text-[10px] md:text-xs font-black tracking-wider transition-all rounded-lg ${selectedSize === name ? 'bg-neutral-900 text-white border-neutral-900 shadow-lg' : 'border-neutral-100 text-neutral-500 hover:border-neutral-200'}`}
                                            >
                                                {name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Error Handling and Quantity + Checkouts */}
                        <div className="space-y-4 pt-2">
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
                            
                            {product.is_sold_out ? (
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

                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button 
                                            onClick={handleMainOrder}
                                            className="flex-1 py-4 bg-[#ce112d] text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-red-900/20 active:scale-95 transition-all text-center"
                                        >
                                            {language === 'bn' ? 'অর্ডার করতে এখনই কিনুন' : 'Order Now'}
                                        </button>
                                        <button 
                                            onClick={handleAddToCart}
                                            className={`sm:w-44 py-4 border-2 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${isInCart ? 'bg-neutral-100 border-neutral-100 text-[#ce112d]' : 'border-neutral-900 text-neutral-900'}`}
                                        >
                                            {isInCart ? <Check size={15} /> : <ShoppingCart size={15} />}
                                            {isInCart ? (language === 'bn' ? 'ব্যাগে আছে' : 'In Bag') : (language === 'bn' ? 'ব্যাগে যোগ করুন' : 'Add to Bag')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description Section */}
                    <div className="space-y-3 pt-5 border-t border-neutral-100">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-300">Description</p>
                        <p className="text-sm leading-relaxed text-neutral-600 font-medium whitespace-pre-wrap">{product.description}</p>
                    </div>

                    {/* Guarantee / Perks Grid */}
                    <div className="grid grid-cols-2 gap-4 pt-5 border-t border-neutral-100">
                        {[
                            { icon: Truck, label: language === 'bn' ? 'ডেলিভারি' : 'Delivery', desc: language === 'bn' ? 'দ্রুত হোম ডেলিভারি' : 'Fast Shipping' },
                            { icon: Award, label: language === 'bn' ? 'কোয়ালিটি' : 'Quality', desc: language === 'bn' ? 'সেরা ফেব্রিক গ্যারান্টি' : 'Guaranteed Quality' },
                            { icon: CreditCard, label: language === 'bn' ? 'নিরাপদ' : 'Safe', desc: language === 'bn' ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery' },
                            { icon: Zap, label: language === 'bn' ? 'সাপোর্ট' : 'Support', desc: language === 'bn' ? 'মেসেঞ্জার সহায়তা' : '24/7 Live Care' }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-3 items-center">
                                <div className="w-9 h-9 rounded-lg bg-neutral-50 flex items-center justify-center text-[#ce112d] shadow-sm shrink-0">
                                    <item.icon size={16} strokeWidth={2.5} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-tight text-neutral-900 leading-tight truncate">{item.label}</p>
                                    <p className="text-[9px] text-neutral-400 font-medium truncate">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <AlertModal isOpen={showAlert} onClose={() => setShowAlert(false)} type="success" title="Copied!" message="Link copied to clipboard!" />
            
            <AnimatePresence>
                {showCartSuccess && (
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[2000] bg-zinc-950 text-white px-8 py-4 rounded-[30px] flex items-center gap-4 shadow-2xl"
                    >
                        <Check size={18} strokeWidth={3} className="text-green-400" />
                        <span className="text-[11px] font-black uppercase tracking-widest">{language === 'bn' ? 'ব্যাগে যোগ করা হয়েছে' : 'Added to bag!'}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
