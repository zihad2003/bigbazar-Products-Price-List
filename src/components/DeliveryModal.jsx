import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, MapPin, CreditCard, AlertCircle, CheckCircle2, ShoppingBag, User, Phone, Home, Copy, Check, Wallet } from 'lucide-react';
import { supabase } from '../supabaseClient';

const DeliveryModal = ({ isOpen, onClose, product, contactInfo, selectedSize, selectedColor }) => {
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [copied, setCopied] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        deliveryArea: '', // No default — customer must choose
        lastFourDigits: '',
        note: '',
        paymentMethod: 'cod'
    });

    if (!isOpen) return null;

    const bKashNumber = "01857045449";

    const deliveryCharges = {
        mirsarai: 0,
        chattogram: 100,
        outside: 150
    };

    const calculateTotal = () => {
        if (!formData.deliveryArea) return Number(product.price);
        return Number(product.price) + deliveryCharges[formData.deliveryArea];
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'lastFourDigits') {
            const onlyNums = value.replace(/[^0-9]/g, '').slice(0, 4);
            setFormData(prev => ({ ...prev, [name]: onlyNums }));
            return;
        }

        if (name === 'phone') {
            const onlyNums = value.replace(/[^0-9+]/g, '');
            setFormData(prev => ({ ...prev, [name]: onlyNums }));
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
        const bdRegex = /^(?:88)?01[3-9]\d{8}$/;
        return bdRegex.test(cleanNumber);
    };

    const handleConfirmOrder = async () => {
        // Validate all fields at once
        if (!formData.name || !formData.phone || !formData.address) {
            setError("অনুগ্রহ করে সব তথ্য পূরণ করুন (নাম, ফোন, ঠিকানা)।");
            return;
        }
        if (!validateBDNumber(formData.phone)) {
            setError("সঠিক বাংলাদেশি মোবাইল নাম্বার দিন (যেমন: 017XXXXXXXX)।");
            return;
        }
        if (!formData.deliveryArea) {
            setError("⚠️ অনুগ্রহ করে আপনার ডেলিভারি এরিয়া নির্বাচন করুন।");
            return;
        }

        const charge = deliveryCharges[formData.deliveryArea];

        if (formData.paymentMethod === 'bkash' && !formData.lastFourDigits) {
            setError("অর্ডার কনফার্ম করতে পেমেন্ট নাম্বারের শেষ ৪টি ডিজিট দিন।");
            return;
        }
        if (formData.paymentMethod === 'cod' && charge > 0 && !formData.lastFourDigits) {
            setError(`অর্ডার কনফার্ম করতে ডেলিভারি চার্জ (৳${charge}) অগ্রিম পরিশোধ করে শেষ ৪টি ডিজিট দিন।`);
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const { error: insertError } = await supabase
                .from('orders')
                .insert([{
                    product_id: product.id,
                    product_name: product.name,
                    product_price: parseFloat(product.price),
                    customer_name: formData.name,
                    customer_phone: formData.phone,
                    customer_address: formData.address,
                    delivery_area: formData.deliveryArea,
                    delivery_charge: deliveryCharges[formData.deliveryArea],
                    total_amount: calculateTotal(),
                    last_four_digits: formData.lastFourDigits || (formData.paymentMethod === 'cod' ? 'COD' : ''),
                    status: 'Pending',
                    size: selectedSize || null,
                    color: selectedColor || null,
                    customer_note: formData.note || null
                }]);

            if (insertError) throw insertError;
            setIsSuccess(true);
        } catch (err) {
            setError("অর্ডার সাবমিট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
            console.error("Supabase Error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Determine if we need to show bKash payment section
    const needsAdvancePayment = formData.paymentMethod === 'bkash' ||
        (formData.paymentMethod === 'cod' && formData.deliveryArea && deliveryCharges[formData.deliveryArea] > 0);

    if (isSuccess) {
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[250] backdrop-blur-2xl flex items-center justify-center p-4"
                    style={{ backgroundColor: 'var(--bg-overlay)' }}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="border rounded-[40px] p-10 max-w-md w-full text-center space-y-6"
                        style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)' }}
                    >
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="text-green-500" size={40} />
                        </div>
                        <h2 className="text-3xl font-black italic uppercase" style={{ color: 'var(--text-primary)' }}>Order Confirmed!</h2>
                        <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করবো।</p>
                        <button
                            onClick={onClose}
                            className="w-full py-5 bg-[#ce112d] text-white rounded-2xl font-black uppercase tracking-widest shadow-[0_10px_40px_rgba(206,17,45,0.3)] transition-all active:scale-95"
                        >
                            Back To Shop
                        </button>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        );
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[250] backdrop-blur-2xl flex items-center justify-center p-3 md:p-6"
                style={{ backgroundColor: 'var(--bg-overlay)' }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 40 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 40 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="relative w-full max-w-lg border rounded-[32px] md:rounded-[40px] overflow-hidden"
                    style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', boxShadow: '0 0 80px rgba(0,0,0,0.2)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header - Compact */}
                    <div className="px-5 py-4 md:px-8 md:py-5 border-b flex items-center justify-between bg-gradient-to-r from-[#ce112d]/10 to-transparent" style={{ borderColor: 'var(--border-color)' }}>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#ce112d] rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(206,17,45,0.4)]">
                                <ShoppingBag className="text-white" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-black italic uppercase leading-none" style={{ color: 'var(--text-primary)' }}>
                                    অর্ডার ফর্ম
                                </h2>
                                <p className="text-[#ce112d] text-[9px] font-black uppercase tracking-[0.2em] mt-1">
                                    Quick Order — সব তথ্য এক পেজে
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full transition-all" style={{ color: 'var(--text-muted)' }}>
                            <X size={22} />
                        </button>
                    </div>

                    {/* Single-page scrollable form */}
                    <div className="p-5 md:p-8 overflow-y-auto max-h-[75vh] md:max-h-[70vh] no-scrollbar space-y-5">

                        {/* Error */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className="p-3.5 bg-[#ce112d]/10 border border-[#ce112d]/20 rounded-2xl flex items-center gap-3 text-[#ce112d] text-xs font-bold"
                                >
                                    <AlertCircle size={16} className="flex-shrink-0" />
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ===== SECTION 1: Customer Info ===== */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-muted)' }}>
                                👤 আপনার তথ্য (Your Info)
                            </h4>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="আপনার নাম (Your Name)"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full border rounded-xl py-3 pl-10 pr-4 text-sm focus:border-[#ce112d] outline-none transition-all"
                                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                />
                            </div>
                            <div className="relative">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--text-muted)' }} />
                                <input
                                    type="tel"
                                    name="phone"
                                    placeholder="মোবাইল নাম্বার (01XXXXXXXXX)"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="w-full border rounded-xl py-3 pl-10 pr-4 text-sm focus:border-[#ce112d] outline-none transition-all"
                                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                />
                            </div>
                            <div className="relative">
                                <Home className="absolute left-3.5 top-3" size={16} style={{ color: 'var(--text-muted)' }} />
                                <textarea
                                    name="address"
                                    placeholder="পূর্ণ ঠিকানা: গ্রাম, পোস্ট, থানা, জেলা"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    rows="2"
                                    className="w-full border rounded-xl py-3 pl-10 pr-4 text-sm focus:border-[#ce112d] outline-none transition-all resize-none"
                                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                />
                            </div>
                        </div>

                        {/* ===== SECTION 2: Delivery Area — NO DEFAULT ===== */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-muted)' }}>
                                📍 ডেলিভারি এরিয়া নির্বাচন করুন <span className="text-[#ce112d]">*</span>
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'mirsarai', label: 'মীরসরাই', sub: '', price: 'ফ্রি' },
                                    { id: 'chattogram', label: 'চট্টগ্রাম', sub: '', price: '৳১০০' },
                                    { id: 'outside', label: 'চট্টগ্রামের বাইরে', sub: 'দেশের যে কোনো জেলায়', price: '৳১৫০+' }
                                ].map((area) => (
                                    <button
                                        key={area.id}
                                        type="button"
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, deliveryArea: area.id }));
                                            if (error) setError('');
                                        }}
                                        className={`p-3 rounded-xl border-2 transition-all text-center ${formData.deliveryArea === area.id
                                            ? 'border-[#ce112d] bg-[#ce112d]/10 scale-[1.02]'
                                            : !formData.deliveryArea
                                                ? 'border-[#ce112d]/30 animate-pulse'
                                                : ''
                                            }`}
                                        style={formData.deliveryArea !== area.id ? {
                                            borderColor: !formData.deliveryArea ? undefined : 'var(--border-color)',
                                            backgroundColor: 'var(--bg-card)',
                                            animation: !formData.deliveryArea ? undefined : 'none'
                                        } : {}}
                                    >
                                        <p className={`text-[11px] font-black leading-tight ${formData.deliveryArea === area.id ? 'text-[#ce112d]' : ''}`}
                                            style={formData.deliveryArea !== area.id ? { color: 'var(--text-primary)' } : {}}>
                                            {area.label}
                                        </p>
                                        {area.sub && (
                                            <p className="text-[8px] font-bold mt-0.5 leading-tight" style={{ color: 'var(--text-muted)' }}>
                                                {area.sub}
                                            </p>
                                        )}
                                        <p className={`text-[10px] font-bold mt-1 ${formData.deliveryArea === area.id ? 'text-[#ce112d]/70' : ''}`}
                                            style={formData.deliveryArea !== area.id ? { color: 'var(--text-muted)' } : {}}>
                                            {area.price}
                                        </p>
                                    </button>
                                ))}
                            </div>
                            {!formData.deliveryArea && (
                                <p className="text-[10px] font-bold text-[#ce112d] ml-1 flex items-center gap-1.5">
                                    <AlertCircle size={12} />
                                    আপনার এরিয়া নির্বাচন করুন
                                </p>
                            )}
                        </div>

                        {/* ===== SECTION 3: Optional Note ===== */}
                        <div className="space-y-2">
                            <h4 className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-muted)' }}>
                                📝 বিশেষ নোট (Optional)
                            </h4>
                            <input
                                type="text"
                                name="note"
                                placeholder="কোনো বিশেষ চাহিদা থাকলে লিখুন..."
                                value={formData.note}
                                onChange={handleInputChange}
                                className="w-full border rounded-xl py-3 px-4 text-sm focus:border-[#ce112d] outline-none transition-all"
                                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        {/* ===== SECTION 4: Order Summary ===== */}
                        <div className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                            {/* Selected Variations */}
                            {(selectedSize || selectedColor) && (
                                <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                                    {selectedSize && <span className="px-2 py-1 bg-[#ce112d]/10 rounded-md text-[9px] font-black text-[#ce112d] uppercase">Size: {selectedSize}</span>}
                                    {selectedColor && <span className="px-2 py-1 border rounded-md text-[9px] font-black uppercase" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>Color: {selectedColor}</span>}
                                </div>
                            )}
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>পণ্যের দাম</span>
                                <span className="font-black" style={{ color: 'var(--text-primary)' }}>৳{product.price}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>ডেলিভারি চার্জ</span>
                                <span className="font-black" style={{ color: 'var(--text-primary)' }}>
                                    {formData.deliveryArea ? `৳${deliveryCharges[formData.deliveryArea]}` : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                                <span className="text-base font-black text-[#ce112d] italic">সর্বমোট</span>
                                <span className="text-2xl font-black text-[#ce112d]">৳{calculateTotal()}</span>
                            </div>
                        </div>

                        {/* ===== SECTION 5: Payment Method ===== */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-muted)' }}>
                                💳 পেমেন্ট পদ্ধতি (Payment)
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, paymentMethod: 'cod' }))}
                                    className={`p-3 rounded-xl border-2 transition-all text-center flex flex-col items-center gap-2 ${formData.paymentMethod === 'cod' ? 'border-[#ce112d] bg-[#ce112d]/10' : ''}`}
                                    style={formData.paymentMethod !== 'cod' ? { borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' } : {}}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.paymentMethod === 'cod' ? 'bg-[#ce112d] text-white' : ''}`} style={formData.paymentMethod !== 'cod' ? { backgroundColor: 'var(--bg-badge)', color: 'var(--text-muted)' } : {}}>
                                        <Truck size={16} />
                                    </div>
                                    <p className={`text-[10px] font-black uppercase ${formData.paymentMethod === 'cod' ? 'text-[#ce112d]' : ''}`} style={formData.paymentMethod !== 'cod' ? { color: 'var(--text-muted)' } : {}}>Cash on Delivery</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, paymentMethod: 'bkash' }))}
                                    className={`p-3 rounded-xl border-2 transition-all text-center flex flex-col items-center gap-2 ${formData.paymentMethod === 'bkash' ? 'border-[#ce112d] bg-[#ce112d]/10' : ''}`}
                                    style={formData.paymentMethod !== 'bkash' ? { borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' } : {}}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.paymentMethod === 'bkash' ? 'bg-[#ce112d] text-white' : ''}`} style={formData.paymentMethod !== 'bkash' ? { backgroundColor: 'var(--bg-badge)', color: 'var(--text-muted)' } : {}}>
                                        <CreditCard size={16} />
                                    </div>
                                    <p className={`text-[10px] font-black uppercase ${formData.paymentMethod === 'bkash' ? 'text-[#ce112d]' : ''}`} style={formData.paymentMethod !== 'bkash' ? { color: 'var(--text-muted)' } : {}}>bKash Payment</p>
                                </button>
                            </div>
                        </div>

                        {/* ===== SECTION 6: bKash / Advance Payment (Conditional) ===== */}
                        {needsAdvancePayment && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="overflow-hidden"
                            >
                                <div className="bg-[#ce112d]/5 border border-[#ce112d]/10 rounded-2xl p-4 space-y-4">
                                    {formData.paymentMethod === 'cod' && formData.deliveryArea && deliveryCharges[formData.deliveryArea] > 0 && (
                                        <p className="text-[11px] leading-relaxed font-medium" style={{ color: 'var(--text-secondary)' }}>
                                            ডেলিভারি চার্জ <strong className="text-[#ce112d]">৳{deliveryCharges[formData.deliveryArea]}</strong> অগ্রিম দিন। পণ্যের টাকা হাতে পেয়ে দিবেন।
                                        </p>
                                    )}
                                    {formData.paymentMethod === 'bkash' && (
                                        <p className="text-[11px] leading-relaxed font-medium" style={{ color: 'var(--text-secondary)' }}>
                                            সম্পূর্ণ টাকা <strong className="text-[#ce112d]">৳{calculateTotal()}</strong> বিকাশে সেন্ড মানি করুন।
                                        </p>
                                    )}

                                    <div className="flex items-center justify-center gap-3 py-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[#ce112d]">বিকাশ নাম্বার:</span>
                                        <span className="text-lg md:text-xl font-black tracking-[0.15em]" style={{ color: 'var(--text-primary)' }}>{bKashNumber}</span>
                                        <button
                                            onClick={handleCopyNumber}
                                            className={`p-2 rounded-lg transition-all ${copied ? 'bg-green-500/20 text-green-500' : 'text-neutral-400 hover:text-white'}`}
                                            style={!copied ? { backgroundColor: 'var(--bg-badge)' } : {}}
                                        >
                                            {copied ? <Check size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest ml-1 block" style={{ color: 'var(--text-muted)' }}>
                                            পেমেন্ট নাম্বারের শেষ ৪টি ডিজিট:
                                        </label>
                                        <input
                                            type="text"
                                            name="lastFourDigits"
                                            maxLength="4"
                                            placeholder="e.g. 1234"
                                            value={formData.lastFourDigits}
                                            onChange={handleInputChange}
                                            className="w-full border rounded-xl py-3 px-4 text-center text-lg font-black focus:border-[#ce112d] outline-none transition-all"
                                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* COD free delivery message */}
                        {formData.paymentMethod === 'cod' && formData.deliveryArea === 'mirsarai' && (
                            <div className="flex items-center gap-3 p-3.5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                                <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                                <p className="text-[11px] font-medium leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                    পণ্য হাতে পেয়ে পেমেন্ট করুন। কোনো অগ্রিম দরকার নেই! ✅
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer — Confirm Button */}
                    <div className="px-5 py-4 md:px-8 md:py-5 border-t" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                        <button
                            onClick={handleConfirmOrder}
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center gap-3 py-4 bg-[#ce112d] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] shadow-[0_10px_40px_rgba(206,17,45,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    অর্ডার সাবমিট হচ্ছে...
                                </div>
                            ) : (
                                <>অর্ডারটি কনফার্ম করুন <ShoppingBag size={18} /></>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full mt-3 font-black uppercase tracking-[0.3em] text-[10px] transition-colors py-2"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default DeliveryModal;
