import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, MapPin, CreditCard, AlertCircle, CheckCircle2, ShoppingBag, User, Phone, Home, Copy, Check, Wallet, ChevronDown, Package } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { allDistricts, chattogramUpazilas, CHATTOGRAM_DISTRICT, getDeliveryInfo } from '../data/bdLocations';
import { useCart } from '../CartContext';
import { useLanguage } from '../contexts/LanguageContext';

const MultiOrderModal = ({ isOpen, onClose }) => {
    const { t, language } = useLanguage();
    const { cartItems, cartTotal, clearCart } = useCart();
    const [error, setError] = useState('');
    const errorRef = useRef(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [copied, setCopied] = useState(false);

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


    const bKashNumber = "01857045449";
    const needsUpazila = formData.district === CHATTOGRAM_DISTRICT;
    const isLocationComplete = formData.district && (!needsUpazila || formData.upazila);

    const deliveryInfo = isLocationComplete
        ? getDeliveryInfo(formData.district, formData.upazila)
        : null;

    const deliveryCharge = deliveryInfo?.charge ?? 0;
    const finalTotal = cartTotal + deliveryCharge;
    const isExclusiveOrder = cartItems.some(item => item.is_exclusive);
    const advanceAmount = isExclusiveOrder ? 500 : deliveryCharge;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'senderNumber' || name === 'phone') {
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
            setError(language === 'bn' ? "অনুগ্রহ করে সব তথ্য পূরণ করুন (নাম, ফোন, ঠিকানা)।" : "Please fill in all info (Name, Phone, Address).");
            return;
        }
        if (!validateBDNumber(formData.phone)) {
            setError(language === 'bn' ? "সঠিক মোবাইল নাম্বার দিন (যেমন: 017XXXXXXXX)।" : "Please enter a valid phone number.");
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
            setError(language === 'bn' ? "যে নম্বর থেকে টাকা পাঠিয়েছেন সেই নম্বরটি দিন।" : "Please enter the sender number.");
            return;
        }
        if (formData.paymentMethod === 'cod' && advanceAmount > 0 && !formData.senderNumber) {
            const prefix = isExclusiveOrder ? 'অগ্রিম' : 'ডেলিভারি চার্জ';
            setError(language === 'bn' ? `${prefix} ৳${advanceAmount} বিকাশে পাঠিয়ে প্রেরকের নম্বরটি দিন।` : `Please send ৳${advanceAmount} advance and enter sender number.`);
            return;
        }

        setIsSubmitting(true);
        setError('');

        const locationStr = formData.upazila
            ? `${formData.upazila}, ${formData.district}`
            : formData.district;

        try {
            const isSingleItem = cartItems.length === 1;
            const combinedName = cartItems.map(item => {
                const parts = [item.name];
                if (item.selectedColor) parts.push(`${item.selectedColor} color`);
                if (item.selectedSize) parts.push(`${item.selectedSize} size`);

                // Find variant SKU
                let vSKU = item.platform_id || null;
                if (item.selectedColor && item.available_colors) {
                    const cObj = item.available_colors.find(c => (typeof c === 'object' ? c.name : c) === item.selectedColor);
                    if (cObj && cObj.sizes) {
                        const sObj = cObj.sizes.find(s => (typeof s === 'object' ? s.name : s) === item.selectedSize);
                        if (sObj && sObj.sku) vSKU = sObj.sku;
                    }
                }
                if (vSKU) parts.push(`(SKU: ${vSKU})`);

                parts.push(`${item.quantity} piece`);
                return parts.join(' ');
            }).join(' + ');

            const combinedSizes = cartItems.map(item => item.selectedSize).filter(Boolean).join(', ');
            const combinedColors = cartItems.map(item => item.selectedColor).filter(Boolean).join(', ');

            // Use the first item's ID for tracking purposes if it's single, 
            // otherwise use a "Multi" identifier if you had one, but keeping the first item is fine for image lookup.
            const primaryProductId = isSingleItem ? cartItems[0].id : cartItems[0].id;

            const { data: insertedData, error: insertError } = await supabase
                .from('orders')
                .insert([{
                    product_id: primaryProductId,
                    product_name: combinedName.substring(0, 1000),
                    product_price: cartTotal,
                    customer_name: formData.name,
                    customer_phone: formData.phone,
                    customer_address: `${formData.address} | ${locationStr}`,
                    delivery_area: deliveryInfo.area,
                    delivery_charge: deliveryCharge,
                    total_amount: finalTotal,
                    last_four_digits: formData.senderNumber || (formData.paymentMethod === 'cod' ? 'COD' : ''),
                    status: 'Pending',
                    size: combinedSizes.substring(0, 250) || null,
                    color: combinedColors.substring(0, 250) || null,
                    is_exclusive_order: isExclusiveOrder || false,
                    customer_note: (formData.note ? `${formData.note} | Cart Items: ${combinedName}` : `Cart Items: ${combinedName}`).substring(0, 500)
                }])
                .select();

            if (insertError) throw insertError;

            for (const item of cartItems) {
                let updatedGlobalStock = item.stock_count; // null = unlimited
                let updatedColors = item.available_colors;
                const hadRealStock = item.stock_count !== null && item.stock_count !== undefined;

                // 1. Decrement global stock only if it was a real number
                if (hadRealStock) {
                    updatedGlobalStock = Math.max(0, item.stock_count - item.quantity);
                }

                // 2. Decrement variant stock
                if (item.selectedColor && updatedColors?.length > 0) {
                    updatedColors = updatedColors.map(color => {
                        const colorName = typeof color === 'object' ? color.name : color;
                        if (colorName === item.selectedColor && color.sizes?.length > 0) {
                            const updatedSizes = color.sizes.map(sz => {
                                const szName = typeof sz === 'object' ? sz.name : sz;
                                if (szName === item.selectedSize) {
                                    return { ...sz, stock: Math.max(0, (sz.stock || 0) - item.quantity) };
                                }
                                return sz;
                            });
                            return { ...color, sizes: updatedSizes };
                        }
                        return color;
                    });
                }

                // 3. Update Supabase — only mark sold_out if stock was real and hit 0
                await supabase
                    .from('products')
                    .update({
                        stock_count: updatedGlobalStock,
                        is_sold_out: hadRealStock ? updatedGlobalStock <= 0 : false,
                        available_colors: updatedColors
                    })
                    .eq('id', item.id);
            }

            clearCart();
            setIsSuccess(true);
        } catch (err) {
            setError(language === 'bn' ? "অর্ডার সাবমিট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।" : "Order submission failed. Please try again.");
            console.error("Supabase Error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const needsAdvancePayment = formData.paymentMethod === 'bkash' ||
        (formData.paymentMethod === 'cod' && deliveryInfo && advanceAmount > 0);

    return (
        <AnimatePresence>
            {isSuccess && isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[1210] backdrop-blur-3xl flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="border rounded-[32px] p-8 max-w-sm w-full text-center space-y-6 shadow-2xl"
                        style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)' }}
                    >
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="text-green-500" size={40} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black italic uppercase" style={{ color: 'var(--text-primary)' }}>অর্ডার সফল হয়েছে!</h2>
                            <p className="text-sm font-medium mt-2" style={{ color: 'var(--text-secondary)' }}>আপনার মাল্টি-আইটেম অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে।</p>
                        </div>
                        <button onClick={onClose} className="w-full py-4 bg-[#ce112d] text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-[0_10px_40px_rgba(206,17,45,0.3)] transition-all active:scale-95">
                            শপিং-এ ফিরে যান
                        </button>
                    </motion.div>
                </motion.div>
            )}

            {!isSuccess && isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[1200] backdrop-blur-3xl flex items-end sm:items-center justify-center p-0 sm:p-6"
                    style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 40 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 40 }}
                        className="relative w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] border rounded-t-[32px] sm:rounded-[40px] overflow-hidden flex flex-col shadow-2xl"
                        style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', boxShadow: '0 0 80px rgba(0,0,0,0.2)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b flex items-center justify-between bg-gradient-to-r from-[#ce112d]/10 to-transparent shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-[#ce112d] rounded-xl flex items-center justify-center">
                                    <Package className="text-white" size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black italic uppercase leading-none" style={{ color: 'var(--text-primary)' }}>{t('checkout')}</h2>
                                    <p className="text-[#ce112d] text-[9px] font-black uppercase tracking-[0.2em] mt-1">{language === 'bn' ? 'মাল্টি-আইটেম অর্ডার' : 'Multi-Item Order'}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full transition-all" style={{ color: 'var(--text-muted)' }}>
                                <X size={22} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
                            {/* Summary of items */}
                            <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <ShoppingBag size={14} className="text-[#ce112d]" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{t('order_summary')} ({cartItems.length} {t('items')})</span>
                                </div>
                                <div className="max-h-32 overflow-y-auto pr-2 space-y-2">
                                    {cartItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-xs">
                                            <span className="truncate max-w-[200px] font-medium" style={{ color: 'var(--text-secondary)' }}>{item.quantity}x {item.name} {item.size ? `(${item.size})` : ''}</span>
                                            <span className="font-bold text-white">৳{item.price * item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t pt-3 flex justify-between items-center" style={{ borderColor: 'var(--border-color)' }}>
                                    <span className="text-xs font-black uppercase text-neutral-500">{t('subtotal')}</span>
                                    <span className="text-lg font-black text-[#ce112d]">৳{cartTotal}</span>
                                </div>
                            </div>

                            {/* Form */}
                            {error && (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-3.5 bg-[#ce112d]/10 border border-[#ce112d]/20 rounded-2xl flex items-center gap-3 text-[#ce112d] text-xs font-bold">
                                    <AlertCircle size={16} />
                                    {error}
                                </motion.div>
                            )}

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--text-muted)' }} />
                                        <input type="text" name="name" placeholder={t('placeholder_name')} value={formData.name} onChange={handleInputChange}
                                            className="w-full border rounded-xl py-3.5 pl-11 pr-4 text-sm focus:border-[#ce112d] outline-none transition-all"
                                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                                    </div>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--text-muted)' }} />
                                        <input type="tel" name="phone" placeholder={t('placeholder_phone')} value={formData.phone} onChange={handleInputChange}
                                            className="w-full border rounded-xl py-3.5 pl-11 pr-4 text-sm focus:border-[#ce112d] outline-none transition-all"
                                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                                    </div>
                                    <div className="relative">
                                        <Home className="absolute left-4 top-4" size={16} style={{ color: 'var(--text-muted)' }} />
                                        <textarea name="address" placeholder={t('placeholder_address')} value={formData.address} onChange={handleInputChange} rows="2"
                                            className="w-full border rounded-xl py-3.5 pl-11 pr-4 text-sm focus:border-[#ce112d] outline-none transition-all resize-none"
                                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                                    </div>
                                </div>

                                <div className={`grid gap-3 ${needsUpazila ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    <div className="relative">
                                        <select value={formData.district} onChange={(e) => setFormData(p => ({ ...p, district: e.target.value, upazila: '' }))}
                                            className="w-full border rounded-xl py-3.5 pl-4 pr-10 text-sm focus:border-[#ce112d] outline-none transition-all appearance-none cursor-pointer"
                                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                                            <option value="">জেলা নির্বাচন করুন</option>
                                            {allDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                    {needsUpazila && (
                                        <div className="relative">
                                            <select value={formData.upazila} onChange={(e) => setFormData(p => ({ ...p, upazila: e.target.value }))}
                                                className="w-full border rounded-xl py-3.5 pl-4 pr-10 text-sm focus:border-[#ce112d] outline-none transition-all appearance-none cursor-pointer"
                                                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                                                <option value="">উপজেলা নির্বাচন করুন</option>
                                                {chattogramUpazilas.map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                                        </div>
                                    )}
                                </div>

                                {deliveryInfo && (
                                    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#ce112d]/5 border border-[#ce112d]/10">
                                        <MapPin size={14} className="text-[#ce112d]" />
                                        <span className="text-xs font-black text-[#ce112d]">{deliveryInfo.label}</span>
                                    </div>
                                )}

                                <div>
                                    <textarea name="note" placeholder="📝 বিশেষ অনুরোধ (Optional)" value={formData.note} onChange={handleInputChange} rows="1"
                                        className="w-full border rounded-xl py-3 px-4 text-sm focus:border-[#ce112d] outline-none transition-all resize-none"
                                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                                </div>

                                {isExclusiveOrder && (
                                    <div className="bg-[#ce112d]/10 border border-[#ce112d]/20 rounded-xl p-4 flex items-start gap-3">
                                        <AlertCircle className="text-[#ce112d] shrink-0 mt-0.5" size={18} />
                                        <p className="text-[#ce112d] text-xs font-bold leading-relaxed">
                                            {language === 'bn'
                                                ? "এটি একটি এক্সক্লুসিভ প্রোডাক্ট। অর্ডারটি নিশ্চিত করতে সর্বমোট ৫০০ টাকা অগ্রিম প্রদান করতে হবে।"
                                                : "This is an Exclusive product. To confirm the order, a total advance payment of 500 TK is required."}
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase text-neutral-500 tracking-widest ml-1">💳 পেমেন্ট করার মাধ্যম</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'cod', label: 'ক্যাশ অন ডেলিভারি', icon: <Truck size={16} /> },
                                            { id: 'bkash', label: 'বিকাশ পেমেন্ট', icon: <CreditCard size={16} /> }
                                        ].map(m => (
                                            <button key={m.id} type="button" onClick={() => setFormData(p => ({ ...p, paymentMethod: m.id }))}
                                                className={`p-4 rounded-xl border-2 transition-all text-center flex flex-col items-center gap-2 ${formData.paymentMethod === m.id ? 'border-[#ce112d] bg-[#ce112d]/10' : 'bg-neutral-900/50 border-white/5 opacity-60'}`}>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.paymentMethod === m.id ? 'bg-[#ce112d] text-white' : 'bg-neutral-900 text-neutral-500'}`}>{m.icon}</div>
                                                <p className={`text-[9px] font-black uppercase ${formData.paymentMethod === m.id ? 'text-[#ce112d]' : 'text-neutral-500'}`}>{m.label}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {needsAdvancePayment && (
                                    <div className="bg-[#ce112d]/5 border border-[#ce112d]/10 rounded-xl p-4 space-y-3">
                                        <p className="text-[11px] leading-relaxed font-medium" style={{ color: 'var(--text-secondary)' }}>
                                            {formData.paymentMethod === 'cod'
                                                ? <>{isExclusiveOrder ? (language === 'bn' ? 'অগ্রিম পেমেন্ট' : 'Advance Payment') : (language === 'bn' ? 'ডেলিভারি চার্জ' : 'Delivery Charge')} <strong className="text-[#ce112d]">৳{advanceAmount}</strong> {language === 'bn' ? `বিকাশে সেন্ড মানি করুন। বাকি ৳${finalTotal - advanceAmount} হাতে পেয়ে দিবেন।` : `Send money via bKash. Pay due ৳${finalTotal - advanceAmount} on delivery.`}</>
                                                : <>{language === 'bn' ? 'সর্বমোট' : 'Total'} <strong className="text-[#ce112d]">৳{finalTotal}</strong> {language === 'bn' ? 'সেন্ড মানি করুন।' : 'Send Money to below number.'}</>}
                                        </p>
                                        <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg">
                                            <span className="text-sm font-black tracking-widest">{bKashNumber}</span>
                                            <button onClick={handleCopyNumber} className={`p-2 rounded-md ${copied ? 'bg-green-500 text-white' : 'bg-white/10 text-neutral-400'}`}>
                                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                        <input type="tel" name="senderNumber" placeholder={language === 'bn' ? "প্রেরকের বিকাশ নম্বর" : "Sender BKash Number"} value={formData.senderNumber} onChange={handleInputChange}
                                            className="w-full border rounded-xl py-2.5 px-4 text-xs focus:border-[#ce112d] outline-none transition-all"
                                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer - lift for mobile menu (increased for safety) */}
                        <div className="p-6 pb-20 md:p-6 border-t" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                            <div className="flex justify-between items-center mb-6 px-1">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{language === 'bn' ? 'পরিশোধযোগ্য মোট' : 'Total Payable'}</p>
                                    <p className="text-3xl font-black text-[#ce112d]">৳{finalTotal}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{t('delivery_charge')}</p>
                                    <p className="text-sm font-black text-white">{deliveryCharge > 0 ? `৳${deliveryCharge}` : (language === 'bn' ? 'ফ্রি' : 'Free')}</p>
                                </div>
                            </div>
                            <button onClick={handleConfirmOrder} disabled={isSubmitting || cartItems.length === 0}
                                className="w-full flex items-center justify-center gap-3 py-5 bg-[#ce112d] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] shadow-[0_10px_40px_rgba(206,17,45,0.4)] transition-all active:scale-95 disabled:opacity-50">
                                {isSubmitting ? (language === 'bn' ? "অর্ডার হচ্ছে..." : "Processing...") : <>{t('confirm_order')} <ShoppingBag size={20} /></>}
                            </button>
                            <button onClick={onClose} className="w-full mt-3 font-black uppercase tracking-[0.3em] text-[10px] py-2 text-neutral-500">
                                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MultiOrderModal;
