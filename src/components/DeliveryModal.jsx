import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, MapPin, CreditCard, AlertCircle, CheckCircle2, ShoppingBag, User, Phone, Home, Copy, Check, Wallet, ChevronDown, Star, AlertTriangle, Search } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { allDistricts, chattogramUpazilas, CHATTOGRAM_DISTRICT, getDeliveryInfo } from '../data/bdLocations';
import { useLanguage } from '../contexts/LanguageContext';

const DeliveryModal = ({ isOpen, onClose, product, contactInfo, selectedSize, selectedColor }) => {
    const { t, language } = useLanguage();
    const [error, setError] = useState('');
    const errorRef = useRef(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [reviewSubmitted, setReviewSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        district: '',
        upazila: '',
        senderNumber: '',
        note: '',
        paymentMethod: 'cod'
    });

    if (!isOpen) return null;

    const bKashNumber = "01857045449";

    // Only show upazila dropdown for Chattogram district
    const needsUpazila = formData.district === CHATTOGRAM_DISTRICT;
    const isLocationComplete = formData.district && (!needsUpazila || formData.upazila);

    // Auto-calculate delivery info
    const deliveryInfo = isLocationComplete
        ? getDeliveryInfo(formData.district, formData.upazila)
        : null;

    const deliveryCharge = deliveryInfo?.charge ?? 0;
    const isExclusiveOrder = product?.is_exclusive || false;
    const advanceAmount = isExclusiveOrder ? 500 : deliveryCharge;

    const calculateTotal = () => {
        if (!deliveryInfo) return Number(product.price);
        return Number(product.price) + deliveryInfo.charge;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'senderNumber') {
            setFormData(prev => ({ ...prev, [name]: value.replace(/[^0-9+]/g, '') }));
            return;
        }
        if (name === 'phone') {
            setFormData(prev => ({ ...prev, [name]: value.replace(/[^0-9+]/g, '') }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const handleCopyNumber = () => {
        navigator.clipboard.writeText(bKashNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const validateBDNumber = (number) => {
        const cleanNumber = number.replace(/[+]/g, '');
        return /^(?:88)?01[3-9]\d{8}$/.test(cleanNumber);
    };

    const handleConfirmOrder = async () => {
        if (!formData.name || !formData.phone || !formData.address) {
            setError(language === 'bn' ? "অনুগ্রহ করে সব তথ্য পূরণ করুন (নাম, ফোন, ঠিকানা)।" : "Please fill all info (Name, Phone, Address).");
            return;
        }
        if (!validateBDNumber(formData.phone)) {
            setError(language === 'bn' ? "সঠিক মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।" : "Enter correct mobile number (e.g., 017XXXXXXXX).");
            return;
        }
        if (!formData.district) {
            setError(language === 'bn' ? "অনুগ্রহ করে আপনার জেলা নির্বাচন করুন।" : "Please select your district.");
            return;
        }
        if (needsUpazila && !formData.upazila) {
            setError(language === 'bn' ? "অনুগ্রহ করে আপনার উপজেলা নির্বাচন করুন।" : "Please select your upazila.");
            return;
        }
        if (formData.paymentMethod === 'bkash' && !formData.senderNumber) {
            setError(language === 'bn' ? "যে নম্বর থেকে টাকা পাঠিয়েছেন সেই নম্বরটি দিন।" : "Provide the sender bKash number.");
            return;
        }
        if (formData.paymentMethod === 'cod' && advanceAmount > 0 && !formData.senderNumber) {
            const prefix = isExclusiveOrder ? 'অগ্রিম' : 'ডেলিভারি চার্জ';
            setError(language === 'bn' ? `${prefix} ৳${advanceAmount} বিকাশে পাঠিয়ে প্রেরকের নম্বরটি দিন।` : `Send advance ৳${advanceAmount} via bKash and provide sender number.`);
            return;
        }

        // Check stock
        if (product.stock_count !== null && product.stock_count !== undefined && product.stock_count <= 0) {
            setError(language === 'bn' ? "দুঃখিত, এই পণ্যটি স্টকে নেই।" : "Sorry, this product is out of stock.");
            return;
        }

        setIsSubmitting(true);
        setError('');

        const locationStr = formData.upazila
            ? `${formData.upazila}, ${formData.district}`
            : formData.district;

        try {
            // Safe price parsing
            const parsePrice = (val) => {
                if (typeof val === 'number') return val;
                return parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
            };

            // Find variant SKU if exists
            let variantSKU = product.platform_id || null;
            if (selectedColor && product.available_colors) {
                const colorObj = product.available_colors.find(c => (typeof c === 'object' ? c.name : c) === selectedColor);
                if (colorObj && colorObj.sizes) {
                    const sizeObj = colorObj.sizes.find(s => (typeof s === 'object' ? s.name : s) === selectedSize);
                    if (sizeObj && sizeObj.sku) variantSKU = sizeObj.sku;
                }
            }

            let name = product.name || 'Item';
            if (selectedColor) name += ` (Color: ${selectedColor})`;
            if (selectedSize) name += ` (Size: ${selectedSize})`;
            if (variantSKU) name += ` (SKU: ${variantSKU})`;
            name += ` (Qty: 1)`;
            const productSummary = name;

            const { data: insertedData, error: insertError } = await supabase
                .from('orders')
                .insert([{
                    product_id: product.id,
                    product_name: productSummary.substring(0, 250),
                    product_price: parsePrice(product.price),
                    customer_name: formData.name,
                    customer_phone: formData.phone,
                    customer_address: `${formData.address} | ${locationStr}`,
                    delivery_area: deliveryInfo?.area || null,
                    delivery_charge: deliveryCharge,
                    total_amount: calculateTotal(),
                    last_four_digits: formData.senderNumber || (formData.paymentMethod === 'cod' ? 'COD' : ''),
                    status: 'Pending',
                    size: selectedSize || null,
                    color: selectedColor || null,
                    is_exclusive_order: isExclusiveOrder || false,
                    customer_note: formData.note || null
                }])
                .select();

            if (insertError) throw insertError;

            // Fallback for ID if RLS blocks selection
            const newOrderId = insertedData?.[0]?.id || `ORD-${Date.now().toString().slice(-6)}`;
            setFormData(prev => ({ ...prev, orderId: newOrderId }));

            // Decrease stock count (Global and Variants)
            let updatedGlobalStock = product.stock_count; // null = unlimited
            let updatedColors = product.available_colors;
            const hadRealStock = product.stock_count !== null && product.stock_count !== undefined;

            // 1. Decrement global stock only if it was a real number
            if (hadRealStock) {
                updatedGlobalStock = Math.max(0, product.stock_count - 1);
            }

            // 2. Decrement Variant Stock (Size within Color)
            if (selectedColor && updatedColors?.length > 0) {
                updatedColors = updatedColors.map(color => {
                    const colorName = typeof color === 'object' ? color.name : color;
                    if (colorName === selectedColor && color.sizes?.length > 0) {
                        const updatedSizes = color.sizes.map(sz => {
                            const szName = typeof sz === 'object' ? sz.name : sz;
                            if (szName === selectedSize) {
                                return { ...sz, stock: Math.max(0, (sz.stock || 0) - 1) };
                            }
                            return sz;
                        });
                        return { ...color, sizes: updatedSizes };
                    }
                    return color;
                });
            }

            // 3. Push Updates to Supabase — only mark sold_out if stock was real and hit 0
            const updatePayload = {
                stock_count: updatedGlobalStock,
                is_sold_out: hadRealStock ? updatedGlobalStock <= 0 : false,
                available_colors: updatedColors
            };

            await supabase
                .from('products')
                .update(updatePayload)
                .eq('id', product.id);

            setIsSuccess(true);
        } catch (err) {
            setError(language === 'bn' ? "অর্ডার সাবমিট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।" : "Failed to submit order. Try again.");
            console.error("Supabase Error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const needsAdvancePayment = formData.paymentMethod === 'bkash' ||
        (formData.paymentMethod === 'cod' && deliveryInfo && advanceAmount > 0);

    const handleSubmitReview = async () => {
        if (rating === 0) return;
        try {
            await supabase.from('reviews').insert([{
                rating,
                comment: reviewText || null,
                customer_name: formData.name || 'Anonymous',
                product_id: product.id || null,
                product_name: product.name || null
            }]);
        } catch (err) {
            console.error('Review submit error:', err);
        }
        setReviewSubmitted(true);
    };

    if (isSuccess) {
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[2000] bg-neutral-900/95 backdrop-blur-3xl flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 50 }} 
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Cut Line Circle Accents */}
                        <div className="absolute left-0 top-[115px] -translate-x-1/2 w-8 h-8 rounded-full bg-neutral-900/40 z-1" />
                        <div className="absolute right-0 top-[115px] translate-x-1/2 w-8 h-8 rounded-full bg-neutral-900/40 z-1" />

                        {/* Top Success Header */}
                        <div className="bg-[#ce112d] p-8 text-center text-white shrink-0">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20 backdrop-blur-sm">
                                <Check size={32} strokeWidth={4} />
                            </div>
                            <h2 className="text-2xl font-black italic uppercase leading-none tracking-tight">
                                {language === 'bn' ? 'অর্ডার সফল হয়েছে!' : 'Order Placed!'}
                            </h2>
                            <p className="text-[10px] uppercase font-black tracking-widest mt-2 opacity-80">
                                {language === 'bn' ? 'আমরা আপনার কাছে ফোন দিব' : 'We will call you soon'}
                            </p>
                        </div>

                        {/* Receipt Content */}
                        <div className="flex-1 p-8 pt-10 text-neutral-900 space-y-6 overflow-y-auto no-scrollbar">
                           <div className="space-y-1">
                               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Order Reference</p>
                               <div className="flex items-center justify-between gap-4">
                                  <h3 className="text-2xl font-black text-neutral-900 italic tracking-tighter">#{String(formData.orderId).toUpperCase()}</h3>
                                  <div className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/10">CONFIRMED ✅</div>
                               </div>
                           </div>

                           <div className="space-y-4 pt-6 border-t border-dashed border-neutral-200">
                                {/* Details Row */}
                                <div className="space-y-3">
                                   <div className="flex justify-between items-start">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Customer</span>
                                      <span className="text-sm font-bold text-right">{formData.name}</span>
                                   </div>
                                   <div className="flex justify-between items-start">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Address</span>
                                      <span className="text-xs font-medium text-right max-w-[200px] leading-tight text-neutral-600">{formData.address}</span>
                                   </div>
                                   <div className="flex justify-between items-start">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Phone</span>
                                      <span className="text-sm font-bold text-right">{formData.phone}</span>
                                   </div>
                                </div>

                                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-3">
                                   <div className="flex justify-between text-xs">
                                      <span className="font-medium text-neutral-500">{product.name}</span>
                                      <span className="font-black">৳{product.price}</span>
                                   </div>
                                   <div className="flex justify-between text-xs">
                                      <span className="font-medium text-neutral-500">{language === 'bn' ? 'ডেলিভারি চার্জ' : 'Delivery Charge'}</span>
                                      <span className="font-black">৳{deliveryCharge}</span>
                                   </div>
                                   <div className="pt-2 border-t border-neutral-200 flex justify-between items-baseline">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{language === 'bn' ? 'মমোট বিল' : 'Grand Total'}</span>
                                      <span className="text-2xl font-black text-[#ce112d] italic">৳{calculateTotal()}</span>
                                   </div>
                                </div>
                           </div>
                           
                           <div className="space-y-3 pt-4">
                              <div className="flex items-center gap-3 p-4 bg-yellow-500/5 rounded-2xl border border-yellow-500/10">
                                 <AlertTriangle size={16} className="text-yellow-600 shrink-0" />
                                 <p className="text-[10px] font-bold text-neutral-600 leading-tight italic">
                                    {language === 'bn' ? 'অর্ডারের স্ক্রিনশট নিয়ে রাখুন এবং মেইন মেনুর "ট্র্যাক করুন" বাটন থেকে আপডেট দেখুন।' : 'Please take a screenshot and track your order from the "Track Order" button.'}
                                 </p>
                              </div>
                           </div>
                        </div>

                        {/* Footer Action */}
                        <div className="p-8 pt-2 bg-neutral-50 border-t border-neutral-100">
                            <button onClick={onClose}
                                className="w-full py-5 bg-neutral-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                <ChevronDown size={18} className="rotate-90" />
                                <span>{language === 'bn' ? 'শপে ফিরে যান' : 'Back to Shop'}</span>
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        );
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1100] backdrop-blur-2xl flex items-center justify-center p-2 md:p-4"
                style={{ backgroundColor: 'var(--bg-overlay)' }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 40 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 40 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="relative w-full max-w-lg border rounded-t-[32px] sm:rounded-[40px] overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
                    style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', boxShadow: '0 0 80px rgba(0,0,0,0.2)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-6 py-5 md:px-10 md:py-6 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center shadow-[0_15px_45px_rgba(0,0,0,0.1)] border border-neutral-100 rotate-[-5deg]">
                                <ShoppingBag className="text-[#ce112d]" size={28} />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black italic uppercase leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>
                                    {language === 'bn' ? 'অর্ডার ফর্ম' : 'Order Form'}
                                </h2>
                                <p className="text-[#ce112d] text-[10px] font-black uppercase tracking-[0.4em]">
                                    {language === 'bn' ? 'দ্রুত চেকআউট' : 'Quick Checkout'}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-all border border-transparent hover:border-neutral-200" style={{ color: 'var(--text-muted)' }}>
                            <X size={24} />
                        </button>
                    </div>

                    {/* Form Body */}
                    <div className="p-5 md:p-8 overflow-y-auto no-scrollbar space-y-5 flex-1">

                        {/* Error */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    ref={errorRef}
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    onAnimationComplete={() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                                    className="p-3.5 bg-[#ce112d]/10 border border-[#ce112d]/20 rounded-2xl flex items-center gap-3 text-[#ce112d] text-xs font-bold"
                                >
                                    <AlertCircle size={16} className="flex-shrink-0" />
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ===== Customer Info ===== */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-muted)' }}>
                                👤 {language === 'bn' ? 'আপনার তথ্য' : 'Customer Info'}
                            </h4>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--text-muted)' }} />
                                <input type="text" name="name" placeholder={t('placeholder_name')} value={formData.name} onChange={handleInputChange}
                                    className="w-full border rounded-xl py-3 pl-10 pr-4 text-sm focus:border-[#ce112d] outline-none transition-all"
                                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                            </div>
                            <div className="relative">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--text-muted)' }} />
                                <input type="tel" name="phone" placeholder={t('placeholder_phone')} value={formData.phone} onChange={handleInputChange}
                                    className="w-full border rounded-xl py-3 pl-10 pr-4 text-sm focus:border-[#ce112d] outline-none transition-all"
                                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                            </div>
                            <div className="relative">
                                <Home className="absolute left-3.5 top-3" size={16} style={{ color: 'var(--text-muted)' }} />
                                <textarea name="address" placeholder={t('placeholder_address')} value={formData.address} onChange={handleInputChange} rows="2"
                                    className="w-full border rounded-xl py-3 pl-10 pr-4 text-sm focus:border-[#ce112d] outline-none transition-all resize-none"
                                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                            </div>
                        </div>

                        {/* ===== Delivery Area Selection ===== */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-muted)' }}>
                                📍 {language === 'bn' ? 'ডেলিভারি এরিয়া' : 'Delivery Area'} <span className="text-[#ce112d]">*</span>
                            </h4>

                            {/* District + Upazila in a row */}
                            <div className={`grid gap-2 ${needsUpazila ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {/* District */}
                                <div className="relative">
                                    <select
                                        value={formData.district}
                                        onChange={(e) => {
                                            setFormData(prev => ({ ...prev, district: e.target.value, upazila: '' }));
                                            if (error) setError('');
                                        }}
                                        className="w-full border rounded-xl py-3 pl-4 pr-10 text-sm focus:border-[#ce112d] outline-none transition-all appearance-none cursor-pointer"
                                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: formData.district ? 'var(--text-primary)' : 'var(--text-muted)' }}
                                    >
                                        <option value="">{language === 'bn' ? 'জেলা নির্বাচন করুন' : 'Select District'}</option>
                                        {allDistricts.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                                </div>

                                {/* Upazila — only for Chattogram */}
                                {needsUpazila && (
                                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="relative">
                                        <select
                                            value={formData.upazila}
                                            onChange={(e) => {
                                                setFormData(prev => ({ ...prev, upazila: e.target.value }));
                                                if (error) setError('');
                                            }}
                                            className="w-full border rounded-xl py-3 pl-4 pr-10 text-sm focus:border-[#ce112d] outline-none transition-all appearance-none cursor-pointer"
                                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: formData.upazila ? 'var(--text-primary)' : 'var(--text-muted)' }}
                                        >
                                            <option value="">{language === 'bn' ? 'উপজেলা নির্বাচন করুন' : 'Select Upazila'}</option>
                                            {chattogramUpazilas.map(u => (
                                                <option key={u} value={u}>{u}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                                    </motion.div>
                                )}
                            </div>

                            {/* Auto-detected delivery charge badge */}
                            {deliveryInfo && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl ${deliveryInfo.charge === 0
                                        ? 'bg-green-500/10 border border-green-500/20'
                                        : 'bg-[#ce112d]/5 border border-[#ce112d]/10'
                                        }`}
                                >
                                    <MapPin size={14} className={deliveryInfo.charge === 0 ? 'text-green-500' : 'text-[#ce112d]'} />
                                    <span className={`text-xs font-black ${deliveryInfo.charge === 0 ? 'text-green-500' : 'text-[#ce112d]'}`}>
                                        {deliveryInfo.label}
                                    </span>
                                </motion.div>
                            )}
                        </div>

                        {/* ===== Note (Optional) ===== */}
                        <div>
                            <input type="text" name="note" placeholder={language === 'bn' ? "📝 বিশেষ নোট (ঐচ্ছিক)" : "📝 Special Note (Optional)"} value={formData.note} onChange={handleInputChange}
                                className="w-full border rounded-xl py-3 px-4 text-sm focus:border-[#ce112d] outline-none transition-all"
                                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                        </div>

                        {/* ===== Exclusive Order Alert ===== */}
                        {isExclusiveOrder && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-red-50 border border-red-200 rounded-[24px] p-5 flex items-start gap-4 shadow-sm"
                            >
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 border border-red-200">
                                    <AlertCircle className="text-[#ce112d] animate-pulse" size={20} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Security Requirement</p>
                                    <p className="text-[#ce112d] text-xs font-bold leading-relaxed">
                                        {language === 'bn'
                                            ? "এটি একটি এক্সক্লুসিভ প্রোডাক্ট। অর্ডারটি নিশ্চিত করতে সর্বমোট ৫০০ টাকা অগ্রিম প্রদান করতে হবে।"
                                            : "This is an Exclusive product. To confirm the order, a total advance payment of 500 TK is required."}
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* ===== Order Summary ===== */}
                        <div className="rounded-2xl border p-4 space-y-2.5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                            {selectedSize && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>📏 {t('size')}</span>
                                    <span className="font-black text-[#ce112d] bg-[#ce112d]/10 px-3 py-1 rounded-lg text-xs uppercase">{selectedSize}</span>
                                </div>
                            )}
                            {selectedColor && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>🎨 {t('color')}</span>
                                    <span className="font-black px-3 py-1 rounded-lg text-xs uppercase border" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>{selectedColor}</span>
                                </div>
                            )}
                            {(selectedSize || selectedColor) && (
                                <div className="border-t my-1" style={{ borderColor: 'var(--border-color)' }} />
                            )}
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{language === 'bn' ? 'পণ্যের দাম' : 'Product Price'}</span>
                                <div className="flex items-center gap-2">
                                    {product.original_price && product.original_price > product.price && (
                                        <span className="text-neutral-500 line-through text-xs font-bold">৳{product.original_price}</span>
                                    )}
                                    <span className="font-black" style={{ color: 'var(--text-primary)' }}>৳{product.price}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{t('delivery_charge')}</span>
                                <span className="font-black" style={{ color: deliveryInfo?.charge === 0 ? '#22c55e' : 'var(--text-primary)' }}>
                                    {deliveryInfo ? (deliveryInfo.charge === 0 ? (language === 'bn' ? 'ফ্রি ✅' : 'Free ✅') : `৳${deliveryInfo.charge}`) : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pt-2.5 border-t" style={{ borderColor: 'var(--border-color)' }}>
                                <span className="text-sm font-black text-[#ce112d] italic">{language === 'bn' ? 'সর্বমোট' : 'Grand Total'}</span>
                                <span className="text-xl font-black text-[#ce112d]">৳{calculateTotal()}</span>
                            </div>
                        </div>

                        {/* ===== Payment Method ===== */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-muted)' }}>
                                💳 {language === 'bn' ? 'পেমেন্ট' : 'Payment'}
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'cod', label: language === 'bn' ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery', icon: <Truck size={16} /> },
                                    { id: 'bkash', label: language === 'bn' ? 'বিকাশ পেমেন্ট' : 'bKash Payment', icon: <CreditCard size={16} /> }
                                ].map(m => (
                                    <button key={m.id} type="button"
                                        onClick={() => setFormData(p => ({ ...p, paymentMethod: m.id }))}
                                        className={`p-3 rounded-xl border-2 transition-all text-center flex flex-col items-center gap-2 ${formData.paymentMethod === m.id ? 'border-[#ce112d] bg-[#ce112d]/10' : ''}`}
                                        style={formData.paymentMethod !== m.id ? { borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' } : {}}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.paymentMethod === m.id ? 'bg-[#ce112d] text-white' : ''}`}
                                            style={formData.paymentMethod !== m.id ? { backgroundColor: 'var(--bg-badge)', color: 'var(--text-muted)' } : {}}>
                                            {m.icon}
                                        </div>
                                        <p className={`text-[10px] font-black uppercase ${formData.paymentMethod === m.id ? 'text-[#ce112d]' : ''}`}
                                            style={formData.paymentMethod !== m.id ? { color: 'var(--text-muted)' } : {}}>{m.label}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ===== bKash / Advance Payment ===== */}
                        {needsAdvancePayment && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                                <div className="bg-[#ce112d]/5 border border-[#ce112d]/10 rounded-xl p-3 space-y-3">
                                    <p className="text-[11px] leading-relaxed font-medium" style={{ color: 'var(--text-secondary)' }}>
                                        {formData.paymentMethod === 'cod' && advanceAmount > 0
                                            ? <>{isExclusiveOrder ? (language === 'bn' ? 'অগ্রিম পেমেন্ট' : 'Advance Payment') : (language === 'bn' ? 'ডেলিভারি চার্জ' : 'Delivery Charge')} <strong className="text-[#ce112d]">৳{advanceAmount}</strong> {language === 'bn' ? `বিকাশে সেন্ড মানি করুন। বাকি ৳${calculateTotal() - advanceAmount} হাতে পেয়ে দিবেন।` : `Send money via bKash. Pay due ৳${calculateTotal() - advanceAmount} on delivery.`}</>
                                            : <>{language === 'bn' ? 'সম্পূর্ণ টাকা' : 'Total Amount'} <strong className="text-[#ce112d]">৳{calculateTotal()}</strong> {language === 'bn' ? 'বিকাশে সেন্ড মানি করুন।' : 'Send money via bKash.'}</>}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-[#ce112d] whitespace-nowrap">{language === 'bn' ? 'বিকাশ:' : 'bKash:'}</span>
                                        <span className="text-sm font-black tracking-wider" style={{ color: 'var(--text-primary)' }}>{bKashNumber}</span>
                                        <button onClick={handleCopyNumber}
                                            className={`p-1.5 rounded-lg transition-all ${copied ? 'bg-green-500/20 text-green-500' : ''}`}
                                            style={!copied ? { backgroundColor: 'var(--bg-badge)', color: 'var(--text-muted)' } : {}}>
                                            {copied ? <Check size={14} /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                    <input type="tel" name="senderNumber" placeholder={language === 'bn' ? "যে নম্বর থেকে টাকা পাঠিয়েছেন সেই নম্বরটি লিখুন" : "Sender bKash Number"}
                                        value={formData.senderNumber} onChange={handleInputChange}
                                        className="w-full border rounded-xl py-2.5 px-4 text-sm focus:border-[#ce112d] outline-none transition-all"
                                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                                </div>
                            </motion.div>
                        )}

                        {/* COD free delivery message */}
                        {formData.paymentMethod === 'cod' && !isExclusiveOrder && deliveryInfo?.charge === 0 && (
                            <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                                <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                                <p className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    {language === 'bn' ? 'পণ্য হাতে পেয়ে পেমেন্ট করুন। কোনো অগ্রিম দরকার নেই! ✅' : 'Cash on Delivery. No advance needed! ✅'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 pb-12 pt-5 md:px-10 md:pb-10 md:pt-6 border-t" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                        <button onClick={handleConfirmOrder} disabled={isSubmitting}
                            className="w-full flex items-center justify-center gap-3 py-5 bg-[#ce112d] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] shadow-[0_15px_45px_rgba(206,17,45,0.35)] transition-all active:scale-95 disabled:opacity-50 disabled:scale-100">
                            {isSubmitting ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {language === 'bn' ? 'সাবমিট হচ্ছে...' : 'Submitting...'}
                                </div>
                            ) : (
                                <>{t('confirm_order')} <ShoppingBag size={20} /> </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence >
    );
};

export default DeliveryModal;
