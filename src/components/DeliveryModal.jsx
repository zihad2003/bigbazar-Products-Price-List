import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, MapPin, Clock, CreditCard, AlertCircle, CheckCircle2, ShoppingBag, User, Phone, Home, ChevronRight, ChevronLeft, Copy, Check } from 'lucide-react';

const DeliveryModal = ({ isOpen, onClose, product, contactInfo }) => {
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
        lastFourDigits: ''
    });

    if (!isOpen) return null;

    const bKashNumber = "01857045449";
    const googleSheetAppUrl = "https://script.google.com/macros/s/AKfycbz_vU_TqM_3v-C1BwKqN4Q3E8b69_oR_f-q8-q8-q8/exec"; // Placeholder

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
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const handleCopyNumber = () => {
        navigator.clipboard.writeText(bKashNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleNext = () => {
        if (step === 2) {
            if (!formData.name || !formData.phone || !formData.address) {
                setError("অনুগ্রহ করে সব তথ্য পূরণ করুন।");
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
        if (!formData.lastFourDigits) {
            setError("অনুগ্রহ করে পেমেন্ট নাম্বারের শেষ ৪টি ডিজিট দিন।");
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const orderData = {
                date: new Date().toLocaleString(),
                productName: product.name,
                productPrice: product.price,
                customerName: formData.name,
                customerPhone: formData.phone,
                customerAddress: formData.address,
                deliveryArea: formData.deliveryArea,
                deliveryCharge: deliveryCharges[formData.deliveryArea],
                totalAmount: calculateTotal(),
                lastFourDigits: formData.lastFourDigits
            };

            // Using a generic way to find the endpoint or use a default one the user will set up
            const response = await fetch(googleSheetAppUrl, {
                method: 'POST',
                mode: 'no-cors', // Google Apps Script requires no-cors for simple POST or proper CORS setup
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            // Since no-cors doesn't allow reading the response, we assume success if no error is thrown
            setIsSuccess(true);
        } catch (err) {
            setError("অর্ডার সাবমিট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
            console.error(err);
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
            bg: "bg-white/5"
        },
        {
            icon: <MapPin className="text-[#ce112d]" />,
            title: "চট্টগ্রামের বাইরে",
            desc: "💰 ডেলিভারি চার্জ: ১৫০ টাকা (শুরু)",
            bg: "bg-white/5"
        }
    ];

    if (isSuccess) {
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[250] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-neutral-900 border border-white/10 rounded-[40px] p-10 max-w-md w-full text-center space-y-6 shadow-[0_0_100px_rgba(37,211,102,0.1)]"
                    >
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="text-green-500" size={40} />
                        </div>
                        <h2 className="text-3xl font-black italic uppercase text-white">Order Confirmed!</h2>
                        <p className="text-neutral-400 font-medium">আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করবো।</p>
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
                className="fixed inset-0 z-[250] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-6"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 40 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 40 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="relative w-full max-w-2xl bg-neutral-900 border border-white/10 rounded-[40px] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,0.9)]"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-[#ce112d]/10 to-transparent">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-[#ce112d] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(206,17,45,0.4)]">
                                {step === 1 ? <Truck className="text-white" size={24} /> : (step === 2 ? <User className="text-white" size={24} /> : <CreditCard className="text-white" size={24} />)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black italic uppercase text-white leading-none">
                                    {step === 1 ? "ডেলিভারি তথ্য" : (step === 2 ? "অর্ডার ফর্ম" : "কনফার্মেশন")}
                                </h2>
                                <p className="text-[#ce112d] text-[10px] font-black uppercase tracking-[0.3em] mt-2">
                                    {step === 1 ? "Step 1: Guidelines" : (step === 2 ? "Step 2: Checkout" : "Step 3: Payment")}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 rounded-full hover:bg-white/5 text-neutral-500 hover:text-white transition-all"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-6 md:p-10 overflow-y-auto max-h-[60vh] no-scrollbar">
                        {step === 1 && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                {/* Delivery Locations */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                                    {infoBlocks.map((block, i) => (
                                        <div key={i} className={`${block.bg} p-6 rounded-3xl border border-white/5`}>
                                            <div className="mb-4">{block.icon}</div>
                                            <h3 className="text-sm font-black text-white mb-2 uppercase tracking-tight">{block.title}</h3>
                                            <p className="text-xs font-bold text-neutral-400 leading-relaxed">{block.desc}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Time and Address */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                    <div className="flex gap-4 items-start">
                                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0 text-[#ce112d]"><Clock size={20} /></div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-1 opacity-50">ডেলিভারি সময়</h4>
                                            <p className="text-neutral-300 text-sm font-bold">৩–৪ দিন</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0 text-[#ce112d]"><MapPin size={20} /></div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-1 opacity-50">শপ ঠিকানা</h4>
                                            <p className="text-neutral-300 text-sm font-bold">বারইয়াহাট, মীরসরাই</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#ce112d]/5 border border-[#ce112d]/10 rounded-3xl p-6 mb-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <AlertCircle className="text-[#ce112d]" size={18} />
                                        <h4 className="text-sm font-black text-white uppercase italic">গুরুত্বপূর্ণ নোট</h4>
                                    </div>
                                    <p className="text-xs text-neutral-400 leading-relaxed italic">ডেলিভারি চার্জ অর্ডার কনফার্ম করার সময় অ্যাডভান্সে পরিশোধ করতে হবে। পণ্যের ওজন অনুযায়ী চার্জ বাড়তে পারে।</p>
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
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white focus:border-[#ce112d] outline-none transition-all placeholder:text-neutral-600"
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
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white focus:border-[#ce112d] outline-none transition-all placeholder:text-neutral-600"
                                        />
                                    </div>
                                    <div className="relative">
                                        <Home className="absolute left-4 top-4 text-neutral-500" size={18} />
                                        <textarea
                                            name="address"
                                            placeholder="পূর্ণ ঠিকানা: গ্রাম, পোস্ট, থানা, জেলা (Full Address)"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            rows="3"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white focus:border-[#ce112d] outline-none transition-all placeholder:text-neutral-600 resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest opacity-50 ml-2">ডেলিভারি এরিয়া (Delivery Area)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {[
                                            { id: 'mirsarai', label: 'মীরসরাই', price: 'Free' },
                                            { id: 'chattogram', label: 'চট্টগ্রাম', price: '100৳' },
                                            { id: 'outside', label: 'অন্যান্য', price: '150৳+' }
                                        ].map((area) => (
                                            <button
                                                key={area.id}
                                                onClick={() => setFormData(prev => ({ ...prev, deliveryArea: area.id }))}
                                                className={`p-4 rounded-2xl border transition-all text-left ${formData.deliveryArea === area.id ? 'border-[#ce112d] bg-[#ce112d]/10' : 'border-white/5 bg-white/5'}`}
                                            >
                                                <p className={`text-xs font-black ${formData.deliveryArea === area.id ? 'text-[#ce112d]' : 'text-white'}`}>{area.label}</p>
                                                <p className="text-[10px] text-neutral-500 font-bold mt-1">{area.price}</p>
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

                                <div className="p-8 bg-white/5 rounded-[32px] border border-white/10 space-y-6">
                                    <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                        <span className="text-neutral-400 font-bold">পণ্যের দাম (Product Price)</span>
                                        <span className="text-white font-black">৳{product.price}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                        <span className="text-neutral-400 font-bold">ডেলিভারি চার্জ (Delivery Charge)</span>
                                        <span className="text-white font-black">৳{deliveryCharges[formData.deliveryArea]}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-xl font-black text-[#ce112d] italic">সর্বমোট (Total)</span>
                                        <span className="text-3xl font-black text-[#ce112d] shadow-[0_0_30px_rgba(206,17,45,0.2)]">৳{calculateTotal()}</span>
                                    </div>
                                </div>

                                <div className="bg-[#ce112d]/5 border border-[#ce112d]/10 rounded-[32px] p-8 space-y-8">
                                    <div className="text-center space-y-4">
                                        <span className="text-neutral-400 font-black uppercase text-[10px] tracking-widest">বিকাশ (পার্সোনাল) নাম্বারে অগ্রিম চার্জ দিন:</span>
                                        <div className="flex items-center justify-center gap-4">
                                            <span className="text-3xl font-black text-white tracking-[0.2em]">{bKashNumber}</span>
                                            <button
                                                onClick={handleCopyNumber}
                                                className={`p-3 rounded-xl transition-all ${copied ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'}`}
                                            >
                                                {copied ? <Check size={20} /> : <Copy size={20} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-white/5">
                                        <label className="text-xs font-black text-neutral-400 uppercase tracking-widest ml-2 block">পেমেন্ট নাম্বারের শেষ ৪টি ডিজিট:</label>
                                        <input
                                            type="text"
                                            name="lastFourDigits"
                                            maxLength="4"
                                            placeholder="e.g. 1234"
                                            value={formData.lastFourDigits}
                                            onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-center text-2xl font-black text-white focus:border-[#ce112d] outline-none transition-all placeholder:text-neutral-700"
                                        />
                                    </div>

                                    <div className="flex gap-4 items-center p-5 bg-[#ce112d]/10 rounded-2xl">
                                        <AlertCircle className="text-[#ce112d]" size={20} />
                                        <p className="text-xs text-neutral-300 font-medium leading-relaxed italic">ডেলিভারি চার্জ পরিশোধ করার পর আপনার পেমেন্ট নাম্বারের শেষ ৪টি ডিজিট এখানে লিখে অর্ডারটি কনফার্ম করুন।</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-8 md:p-10 bg-black/40 border-t border-white/5">
                        <div className="flex gap-4">
                            {step > 1 && (
                                <button
                                    onClick={handleBack}
                                    disabled={isSubmitting}
                                    className="px-6 py-5 bg-white/5 text-white rounded-2xl font-black uppercase hover:bg-white/10 transition-all disabled:opacity-50"
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
                            className="w-full mt-6 text-neutral-500 font-black uppercase tracking-[0.3em] text-[10px] hover:text-white transition-colors"
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
