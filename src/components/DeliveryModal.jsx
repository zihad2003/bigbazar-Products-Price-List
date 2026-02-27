import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, MapPin, Clock, CreditCard, AlertCircle, CheckCircle2, MessageCircle, ShoppingBag, User, Phone, Home, ChevronRight, ChevronLeft } from 'lucide-react';
import { generateWhatsAppLink, generateOrderMessage } from '../utils/messageTemplates';

const DeliveryModal = ({ isOpen, onClose, product, contactInfo, onMessengerOrder }) => {
    const [step, setStep] = useState(1); // 1: Info, 2: Form, 3: Confirmation
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        deliveryArea: 'mirsarai' // Default
    });

    if (!isOpen) return null;

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

    const handleBack = () => setStep(prev => prev - 1);

    const handleFinalOrder = (platform) => {
        if (platform === 'whatsapp') {
            const link = generateWhatsAppLink(product, contactInfo?.whatsapp || "8801335945351", formData);
            window.open(link, '_blank');
        } else {
            // For Messenger, we copy the message and then open the link
            const message = generateOrderMessage(product, formData);
            navigator.clipboard.writeText(message).then(() => {
                onMessengerOrder();
                onClose();
            });
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
                                {step === 1 ? <Truck className="text-white" size={24} /> : (step === 2 ? <User className="text-white" size={24} /> : <CheckCircle2 className="text-white" size={24} />)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black italic uppercase text-white leading-none">
                                    {step === 1 ? "ডেলিভারি তথ্য" : (step === 2 ? "অর্ডার ফর্ম" : "কনফার্মেশন")}
                                </h2>
                                <p className="text-[#ce112d] text-[10px] font-black uppercase tracking-[0.3em] mt-2">
                                    {step === 1 ? "Step 1: Guidelines" : (step === 2 ? "Step 2: Checkout" : "Step 3: Finalize")}
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

                                <div className="bg-[#ce112d]/5 border border-[#ce112d]/10 rounded-3xl p-8 space-y-6">
                                    <div className="space-y-2">
                                        <span className="text-neutral-400 font-black uppercase text-[10px] tracking-widest">বিকাশ (পার্সোনাল) নাম্বার:</span>
                                        <span className="text-2xl font-black text-white tracking-[0.2em] block">01877765535</span>
                                    </div>
                                    <div className="flex gap-4 items-center p-4 bg-[#ce112d]/10 rounded-2xl">
                                        <AlertCircle className="text-[#ce112d]" size={20} />
                                        <p className="text-xs text-neutral-300 font-medium">নিচের বাটনে ক্লিক করে অর্ডারটি কনফার্ম করুন।</p>
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
                                    className="px-6 py-5 bg-white/5 text-white rounded-2xl font-black uppercase hover:bg-white/10 transition-all"
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
                                <div className="flex-1 grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleFinalOrder('whatsapp')}
                                        className="flex items-center justify-center gap-4 py-5 bg-[#25D366] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] shadow-[0_10px_40px_rgba(37,211,102,0.3)] transition-all active:scale-95"
                                    >
                                        <MessageCircle size={24} /> WhatsApp
                                    </button>
                                    <button
                                        onClick={() => handleFinalOrder('messenger')}
                                        className="flex items-center justify-center gap-4 py-5 bg-[#0084FF] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] shadow-[0_10px_40px_rgba(0,132,255,0.3)] transition-all active:scale-95"
                                    >
                                        <ShoppingBag size={24} /> Messenger
                                    </button>
                                </div>
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
