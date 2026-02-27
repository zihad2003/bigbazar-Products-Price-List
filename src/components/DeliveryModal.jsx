import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, MapPin, Clock, CreditCard, AlertCircle, CheckCircle2, ShoppingBag, User, Phone, Home, ChevronRight, ChevronLeft, Copy, Check, Wallet } from 'lucide-react';
import { supabase } from '../supabaseClient';

const DeliveryModal = ({ isOpen, onClose, product, contactInfo, selectedSize, selectedColor }) => {
    const [step, setStep] = useState(1); // 1: Info, 2: Form, 3: Payment/Final
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [copied, setCopied] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        deliveryArea: 'mirsarai',
        lastFourDigits: '',
        note: '',
        paymentMethod: 'cod' // Added payment method
    });

    if (!isOpen) return null;

    const bKashNumber = "01857045449";

    const deliveryCharges = {
        mirsarai: 0,
        chattogram: 100,
        outside: 150
    };

    const calculateTotal = () => {
        return Number(product.price) + deliveryCharges[formData.deliveryArea];
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Validation for specific fields
        if (name === 'lastFourDigits') {
            const onlyNums = value.replace(/[^0-9]/g, '').slice(0, 4);
            setFormData(prev => ({ ...prev, [name]: onlyNums }));
            return;
        }

        if (name === 'phone') {
            const onlyNums = value.replace(/[^0-9+]/g, ''); // Allow digits and + for international
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
        // Regex: Optional 88, then 01, then 3-9, then 8 digits
        const bdRegex = /^(?:88)?01[3-9]\d{8}$/;
        return bdRegex.test(cleanNumber);
    };

    const handleNext = () => {
        if (step === 2) {
            if (!formData.name || !formData.phone || !formData.address) {
                setError("অনুগ্রহ করে সব তথ্য পূরণ করুন।");
                return;
            }
            if (!validateBDNumber(formData.phone)) {
                setError("সঠিক বাংলাদেশি মোবাইল নাম্বার দিন (যেমন: 017XXXXXXXX) ।");
                return;
            }
        }
        setError('');
        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        setError('');
        setStep(prev => prev - 1);
    };

    const handleConfirmOrder = async () => {
        if (formData.paymentMethod === 'bkash' && !formData.lastFourDigits) {
            setError("অর্ডার কনফার্ম করতে পেমেন্ট নাম্বারের শেষ ৪টি ডিজিট দিন।");
            return;
        }

        const charge = deliveryCharges[formData.deliveryArea];
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
            setError("অর্ডার সাবমিট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
            console.error("Supabase Error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const infoBlocks = [
        {
            icon: <MapPin className="text-[#ce112d]" />,
            title: "মীরসরাইয়ের মধ্যে",
            desc: "🎁 ফ্রি ডেলিভারি",
            bg: "bg-green-500/10"
        },
        {
            icon: <MapPin className="text-[#ce112d]" />,
            title: "চট্টগ্রাম জেলার মধ্যে",
            desc: "💰 ডেলিভারি চার্জ: ১০০ টাকা",
            bg: ""
        },
        {
            icon: <MapPin className="text-[#ce112d]" />,
            title: "চট্টগ্রামের বাইরে",
            desc: "💰 ডেলিভারি চার্জ: ১৫০ টাকা (শুরু)",
            bg: ""
        }
    ];

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
                        <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করবো।</p>
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
                className="fixed inset-0 z-[250] backdrop-blur-2xl flex items-center justify-center p-4 md:p-6"
                style={{ backgroundColor: 'var(--bg-overlay)' }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 40 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 40 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="relative w-full max-w-2xl border rounded-[40px] overflow-hidden"
                    style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', boxShadow: '0 0 80px rgba(0,0,0,0.2)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-5 md:p-8 border-b flex items-center justify-between bg-gradient-to-r from-[#ce112d]/10 to-transparent" style={{ borderColor: 'var(--border-color)' }}>
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-[#ce112d] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(206,17,45,0.4)]">
                                {step === 1 ? <Truck className="text-white" size={24} /> : (step === 2 ? <User className="text-white" size={24} /> : <CreditCard className="text-white" size={24} />)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black italic uppercase leading-none" style={{ color: 'var(--text-primary)' }}>
                                    {step === 1 ? "ডেলিভারি তথ্য" : (step === 2 ? "অর্ডার ফর্ম" : "কনফার্মেশন")}
                                </h2>
                                <p className="text-[#ce112d] text-[10px] font-black uppercase tracking-[0.3em] mt-2">
                                    {step === 1 ? "Step 1: Guidelines" : (step === 2 ? "Step 2: Checkout" : "Step 3: Payment")}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 rounded-full transition-all" style={{ color: 'var(--text-muted)' }}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-5 md:p-10 overflow-y-auto max-h-[70vh] md:max-h-[60vh] no-scrollbar">
                        {step === 1 && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                {/* Delivery Locations */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                                    {infoBlocks.map((block, i) => (
                                        <div key={i} className={`${block.bg} p-6 rounded-3xl border`} style={{ borderColor: 'var(--border-color)', backgroundColor: block.bg ? undefined : 'var(--bg-card)' }}>
                                            <div className="mb-4">{block.icon}</div>
                                            <h3 className="text-sm font-black mb-2 uppercase tracking-tight" style={{ color: 'var(--text-primary)' }}>{block.title}</h3>
                                            <p className="text-xs font-bold leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{block.desc}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Time and Address */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                    <div className="flex gap-4 items-start">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[#ce112d]" style={{ backgroundColor: 'var(--bg-badge)' }}><Clock size={20} /></div>
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-50" style={{ color: 'var(--text-primary)' }}>ডেলিভারি সময়</h4>
                                            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>৩–৪ দিন</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[#ce112d]" style={{ backgroundColor: 'var(--bg-badge)' }}><MapPin size={20} /></div>
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-50" style={{ color: 'var(--text-primary)' }}>শপ ঠিকানা</h4>
                                            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>বারইয়াহাট, মীরসরাই</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#ce112d]/5 border border-[#ce112d]/10 rounded-3xl p-6 mb-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <AlertCircle className="text-[#ce112d]" size={18} />
                                        <h4 className="text-sm font-black uppercase italic" style={{ color: 'var(--text-primary)' }}>গুরুত্বপূর্ণ নোট</h4>
                                    </div>
                                    <p className="text-xs leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>ডেলিভারি চার্জ অর্ডার কনফার্ম করার সময় অ্যাডভান্সে পরিশোধ করতে হবে। পণ্যের ওজন অনুযায়ী চার্জ বাড়তে পারে।</p>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        className="p-4 bg-[#ce112d]/10 border border-[#ce112d]/20 rounded-2xl flex items-center gap-3 text-[#ce112d] text-xs font-bold"
                                    >
                                        <AlertCircle size={16} />
                                        {error}
                                    </motion.div>
                                )}
                                <div className="space-y-4">
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                                        <input
                                            type="text"
                                            name="name"
                                            placeholder="আপনার নাম (Your Name)"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="w-full border rounded-2xl py-4 pl-12 pr-6 focus:border-[#ce112d] outline-none transition-all"
                                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                                        <input
                                            type="tel"
                                            name="phone"
                                            placeholder="মোবাইল নাম্বার (Phone Number)"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="w-full border rounded-2xl py-4 pl-12 pr-6 focus:border-[#ce112d] outline-none transition-all"
                                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <div className="relative">
                                        <Home className="absolute left-4 top-4 text-neutral-500" size={18} />
                                        <textarea
                                            name="address"
                                            placeholder="আপনার পূর্ণ ঠিকানা: গ্রাম, পোস্ট, থানা, জেলা (Full Address)"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            rows="2"
                                            className="w-full border rounded-2xl py-4 pl-12 pr-6 text-sm focus:border-[#ce112d] outline-none transition-all resize-none"
                                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                        />
                                    </div>

                                    <div className="relative">
                                        <Clock className="absolute left-4 top-4 text-neutral-500" size={18} />
                                        <textarea
                                            name="note"
                                            placeholder="অর্ডার সম্পর্কে কোনো বিশেষ তথ্য বা চাহিদা আছে? e.g. কালার, সাইজ রিপিট বা গিফট নোট (Special Demands/Note)"
                                            value={formData.note}
                                            onChange={handleInputChange}
                                            rows="3"
                                            className="w-full border rounded-2xl py-4 pl-12 pr-6 text-sm focus:border-[#ce112d] outline-none transition-all resize-none"
                                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-2" style={{ color: 'var(--text-primary)' }}>ডেলিভারি এরিয়া (Delivery Area)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {[
                                            { id: 'mirsarai', label: 'মীরসরাই', price: 'Free' },
                                            { id: 'chattogram', label: 'চট্টগ্রাম', price: '100৳' },
                                            { id: 'outside', label: 'চট্টগ্রামের বাইরে', price: '150৳+' }
                                        ].map((area) => (
                                            <button
                                                key={area.id}
                                                onClick={() => setFormData(prev => ({ ...prev, deliveryArea: area.id }))}
                                                className={`p-4 rounded-2xl border transition-all text-left ${formData.deliveryArea === area.id ? 'border-[#ce112d] bg-[#ce112d]/10' : ''}`}
                                                style={formData.deliveryArea !== area.id ? { borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' } : {}}
                                            >
                                                <p className={`text-xs font-black ${formData.deliveryArea === area.id ? 'text-[#ce112d]' : ''}`} style={formData.deliveryArea !== area.id ? { color: 'var(--text-primary)' } : {}}>{area.label}</p>
                                                <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--text-muted)' }}>{area.price}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        className="p-4 bg-[#ce112d]/10 border border-[#ce112d]/20 rounded-2xl flex items-center gap-3 text-[#ce112d] text-xs font-bold"
                                    >
                                        <AlertCircle size={16} />
                                        {error}
                                    </motion.div>
                                )}

                                <div className="p-8 rounded-[32px] border space-y-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                                    <div className="flex justify-between items-center pb-4 border-b text-[10px] font-black uppercase tracking-widest text-[#ce112d]" style={{ borderColor: 'var(--border-color)' }}>
                                        <span>Selected Variations</span>
                                        <div className="flex gap-2">
                                            {selectedSize && <span className="px-2 py-1 bg-[#ce112d]/10 rounded-md">Size: {selectedSize}</span>}
                                            {selectedColor && <span className="px-2 py-1 border rounded-md" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>Color: {selectedColor}</span>}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                                        <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>পণ্যের দাম (Product Price)</span>
                                        <span className="font-black" style={{ color: 'var(--text-primary)' }}>৳{product.price}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                                        <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>ডেলিভারি চার্জ (Delivery Charge)</span>
                                        <span className="font-black" style={{ color: 'var(--text-primary)' }}>৳{deliveryCharges[formData.deliveryArea]}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-xl font-black text-[#ce112d] italic">সর্বমোট (Total)</span>
                                        <span className="text-3xl font-black text-[#ce112d]">৳{calculateTotal()}</span>
                                    </div>
                                </div>

                                {/* Payment Method Selection */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-2" style={{ color: 'var(--text-primary)' }}>পেমেন্ট পদ্ধতি নির্বাচন করুন (Select Payment Method)</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setFormData(p => ({ ...p, paymentMethod: 'cod' }))}
                                            className={`p-6 rounded-[24px] border transition-all text-center flex flex-col items-center gap-3 ${formData.paymentMethod === 'cod' ? 'border-[#ce112d] bg-[#ce112d]/10 ring-1 ring-[#ce112d]/50' : ''}`}
                                            style={formData.paymentMethod !== 'cod' ? { borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' } : {}}
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.paymentMethod === 'cod' ? 'bg-[#ce112d] text-white' : ''}`} style={formData.paymentMethod !== 'cod' ? { backgroundColor: 'var(--bg-badge)', color: 'var(--text-muted)' } : {}}>
                                                <Truck size={20} />
                                            </div>
                                            <p className={`text-xs font-black uppercase ${formData.paymentMethod === 'cod' ? 'text-[#ce112d]' : ''}`} style={formData.paymentMethod !== 'cod' ? { color: 'var(--text-muted)' } : {}}>Cash on Delivery</p>
                                        </button>
                                        <button
                                            onClick={() => setFormData(p => ({ ...p, paymentMethod: 'bkash' }))}
                                            className={`p-6 rounded-[24px] border transition-all text-center flex flex-col items-center gap-3 ${formData.paymentMethod === 'bkash' ? 'border-[#ce112d] bg-[#ce112d]/10 ring-1 ring-[#ce112d]/50' : ''}`}
                                            style={formData.paymentMethod !== 'bkash' ? { borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' } : {}}
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.paymentMethod === 'bkash' ? 'bg-[#ce112d] text-white' : ''}`} style={formData.paymentMethod !== 'bkash' ? { backgroundColor: 'var(--bg-badge)', color: 'var(--text-muted)' } : {}}>
                                                <CreditCard size={20} />
                                            </div>
                                            <p className={`text-xs font-black uppercase ${formData.paymentMethod === 'bkash' ? 'text-[#ce112d]' : ''}`} style={formData.paymentMethod !== 'bkash' ? { color: 'var(--text-muted)' } : {}}>bKash Payment</p>
                                        </button>
                                    </div>
                                </div>

                                {formData.paymentMethod === 'cod' ? (
                                    deliveryCharges[formData.deliveryArea] === 0 ? (
                                        <div className="border rounded-[32px] p-8 space-y-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                                            <div className="flex flex-col items-center text-center gap-4">
                                                <div className="w-16 h-16 bg-[#ce112d]/10 rounded-full flex items-center justify-center text-[#ce112d]">
                                                    <CheckCircle2 size={32} />
                                                </div>
                                                <div>
                                                    <h4 className="text-xl font-black uppercase italic" style={{ color: 'var(--text-primary)' }}>অর্ডার কনফার্ম করুন</h4>
                                                    <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>পণ্য হাতে পেয়ে পেমেন্ট করতে পারবেন। কোনো অগ্রিম পেমেন্টের প্রয়োজন নেই। আমাদের প্রতিনিধি শীঘ্রই আপনাকে ফোন করবেন।</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-[#ce112d]/5 border border-[#ce112d]/10 rounded-[32px] p-8 space-y-8">
                                            <div className="flex flex-col items-center text-center gap-4">
                                                <div className="w-16 h-16 bg-[#ce112d]/10 rounded-full flex items-center justify-center text-[#ce112d]">
                                                    <Wallet size={32} />
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="text-xl font-black uppercase italic" style={{ color: 'var(--text-primary)' }}>ডেলিভারি চার্জ অগ্রিম দিন</h4>
                                                    <p className="text-[11px] leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>অর্ডার নিশ্চিত করতে শুধুমাত্র ডেলিভারি চার্জ (৳{deliveryCharges[formData.deliveryArea]}) অগ্রিম দিতে হবে। পণ্যের টাকা পণ্য হাতে পেয়ে দিবেন।</p>
                                                </div>
                                            </div>

                                            <div className="text-center space-y-4 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                                                <span className="font-black uppercase text-[10px] tracking-widest text-[#ce112d]">বিকাশ (পার্সোনাল) নাম্বার:</span>
                                                <div className="flex items-center justify-center gap-4">
                                                    <span className="text-2xl md:text-3xl font-black tracking-[0.2em]" style={{ color: 'var(--text-primary)' }}>{bKashNumber}</span>
                                                    <button
                                                        onClick={handleCopyNumber}
                                                        className={`p-3 rounded-xl transition-all ${copied ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'}`}
                                                    >
                                                        {copied ? <Check size={20} /> : <Copy size={20} />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-xs font-black text-neutral-400 uppercase tracking-widest ml-2 block">পেমেন্ট নাম্বারের শেষ ৪টি ডিজিট দিন:</label>
                                                <input
                                                    type="text"
                                                    name="lastFourDigits"
                                                    maxLength="4"
                                                    placeholder="e.g. 1234"
                                                    value={formData.lastFourDigits}
                                                    onChange={handleInputChange}
                                                    className="w-full border rounded-2xl py-3.5 px-6 text-center text-xl font-black focus:border-[#ce112d] outline-none transition-all"
                                                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                                />
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <div className="bg-[#ce112d]/5 border border-[#ce112d]/10 rounded-[32px] p-8 space-y-8">
                                        <div className="text-center space-y-4">
                                            <span className="font-black uppercase text-[10px] tracking-widest text-[#ce112d]">বিকাশ (পার্সোনাল) নাম্বারে সেন্ড মানি করুন:</span>
                                            <div className="flex items-center justify-center gap-4">
                                                <span className="text-2xl md:text-3xl font-black tracking-[0.2em]" style={{ color: 'var(--text-primary)' }}>{bKashNumber}</span>
                                                <button
                                                    onClick={handleCopyNumber}
                                                    className={`p-3 rounded-xl transition-all ${copied ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'}`}
                                                >
                                                    {copied ? <Check size={20} /> : <Copy size={20} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                                            <label className="text-xs font-black text-neutral-400 uppercase tracking-widest ml-2 block">পেমেন্ট নাম্বারের শেষ ৪টি ডিজিট দিন:</label>
                                            <input
                                                type="text"
                                                name="lastFourDigits"
                                                maxLength="4"
                                                placeholder="e.g. 1234"
                                                value={formData.lastFourDigits}
                                                onChange={handleInputChange}
                                                className="w-full border rounded-2xl py-3.5 px-6 text-center text-xl font-black focus:border-[#ce112d] outline-none transition-all"
                                                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                            />
                                        </div>

                                        <div className="flex gap-4 items-center p-5 bg-[#ce112d]/10 rounded-2xl">
                                            <AlertCircle className="text-[#ce112d]" size={20} />
                                            <p className="text-[11px] font-medium leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>বিকাশ সেন্ড মানি করার পর আপনার ট্রানজ্যাকশন নিশ্চিত করতে পেমেন্ট নাম্বারের শেষ ৪টি ডিজিট এখানে দিন এবং নিচের বাটনে ক্লিক করুন।</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 md:p-10 border-t" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                        <div className="flex gap-4">
                            {step > 1 && (
                                <button
                                    onClick={handleBack}
                                    disabled={isSubmitting}
                                    className="px-6 py-5 rounded-2xl font-black uppercase transition-all disabled:opacity-50"
                                    style={{ backgroundColor: 'var(--bg-badge)', color: 'var(--text-primary)' }}
                                >
                                    <ChevronLeft size={24} />
                                </button>
                            )}

                            {step < 3 ? (
                                <button
                                    onClick={handleNext}
                                    className="flex-1 flex items-center justify-center gap-3 py-5 bg-[#ce112d] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] shadow-[0_10px_40px_rgba(206,17,45,0.3)] transition-all active:scale-95"
                                >
                                    {step === 1 ? "অর্ডার করতে এগিয়ে যান" : "অর্ডার সামারি দেখুন"} <ChevronRight size={20} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleConfirmOrder}
                                    disabled={isSubmitting}
                                    className="flex-1 flex items-center justify-center gap-4 py-5 bg-[#ce112d] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] shadow-[0_10px_40px_rgba(206,17,45,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                                >
                                    {isSubmitting ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            অর্ডার সাবমিট হচ্ছে...
                                        </div>
                                    ) : (
                                        <>অর্ডারটি কনফার্ম করুন <ShoppingBag size={20} /></>
                                    )}
                                </button>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="w-full mt-6 font-black uppercase tracking-[0.3em] text-[10px] transition-colors"
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
