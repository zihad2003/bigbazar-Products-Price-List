import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, MapPin, Clock, CreditCard, AlertCircle, CheckCircle2, MessageCircle, ShoppingBag } from 'lucide-react';
import { generateWhatsAppLink } from '../utils/messageTemplates';

const DeliveryModal = ({ isOpen, onClose, product, contactInfo, onMessengerOrder }) => {
    if (!isOpen) return null;

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
                    <div className="p-8 md:p-10 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-[#ce112d]/10 to-transparent">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-[#ce112d] rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(206,17,45,0.4)]">
                                <Truck className="text-white" size={28} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black italic uppercase text-white leading-none">ডেলিভারি তথ্য</h2>
                                <p className="text-[#ce112d] text-[10px] font-black uppercase tracking-[0.3em] mt-2">Delivery Guidelines</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 rounded-full hover:bg-white/5 text-neutral-500 hover:text-white transition-all"
                        >
                            <X size={28} />
                        </button>
                    </div>

                    <div className="p-8 md:p-10 overflow-y-auto max-h-[60vh] no-scrollbar">
                        {/* Delivery Locations */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                            {infoBlocks.map((block, i) => (
                                <div key={i} className={`${block.bg} p-6 rounded-3xl border border-white/5 hover:border-[#ce112d]/40 transition-all group`}>
                                    <div className="mb-4 transform group-hover:scale-110 transition-transform">{block.icon}</div>
                                    <h3 className="text-sm font-black text-white mb-2 uppercase tracking-tight">{block.title}</h3>
                                    <p className="text-xs font-bold text-neutral-400 leading-relaxed">{block.desc}</p>
                                </div>
                            ))}
                        </div>

                        {/* Time and Address */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                            <div className="flex gap-5 items-start">
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center flex-shrink-0 text-[#ce112d]">
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2 opacity-50">ডেলিভারি সময়</h4>
                                    <p className="text-neutral-300 text-sm font-bold leading-relaxed">অর্ডার কনফার্ম হওয়ার পর সাধারণত ৩–৪ দিনের মধ্যে পণ্য পৌঁছে দেওয়া হয়।</p>
                                </div>
                            </div>
                            <div className="flex gap-5 items-start">
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center flex-shrink-0 text-[#ce112d]">
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2 opacity-50">শপ ঠিকানা</h4>
                                    <p className="text-neutral-300 text-sm font-bold leading-relaxed">বারইয়াহাট, মীরসরাই, চট্টগ্রাম</p>
                                </div>
                            </div>
                        </div>

                        {/* Important Notes */}
                        <div className="bg-[#ce112d]/5 border border-[#ce112d]/10 rounded-[32px] p-8 md:p-10 space-y-8">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="h-px w-8 bg-[#ce112d]"></div>
                                <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">গুরুত্বপূর্ণ নোট</h4>
                            </div>

                            <ul className="space-y-6">
                                <li className="flex gap-4 text-sm">
                                    <CheckCircle2 className="text-[#ce112d] flex-shrink-0" size={20} />
                                    <span className="text-neutral-300 font-medium">ডেলিভারি চার্জ অর্ডার কনফার্ম করার সময় অ্যাডভান্সে পরিশোধ করতে হবে।</span>
                                </li>
                                <li className="flex gap-4 text-sm">
                                    <CreditCard className="text-[#ce112d] flex-shrink-0" size={20} />
                                    <div className="space-y-2">
                                        <span className="text-neutral-400 font-black uppercase text-[10px] tracking-widest">বিকাশ (পার্সোনাল) নাম্বার:</span>
                                        <span className="text-2xl font-black text-white tracking-[0.2em] block">01877765535</span>
                                    </div>
                                </li>
                                <li className="flex gap-4 text-sm">
                                    <CheckCircle2 className="text-[#ce112d] flex-shrink-0" size={20} />
                                    <span className="text-neutral-300 font-medium">অনুগ্রহ করে <strong className="text-white italic underline underline-offset-4 decoration-[#ce112d]">Send Money</strong> অপশন ব্যবহার করে পেমেন্ট করবেন।</span>
                                </li>
                                <li className="flex gap-4 text-sm items-center p-4 bg-[#ce112d]/10 rounded-2xl border border-[#ce112d]/20">
                                    <AlertCircle className="text-[#ce112d] flex-shrink-0" size={20} />
                                    <span className="text-[#ce112d] font-black uppercase text-[10px] tracking-wider italic">ভুল করে Recharge করলে সেই টাকা ফেরত দেওয়া সম্ভব নয়</span>
                                </li>
                                <li className="flex gap-4 text-sm">
                                    <CheckCircle2 className="text-[#ce112d] flex-shrink-0" size={20} />
                                    <span className="text-neutral-400 text-xs italic">পণ্যের ওজন অনুযায়ী ডেলিভারি চার্জ বাড়তে পারে (প্রতি কেজি হিসেবে হিসাব করা হবে)।</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Footer Action */}
                    <div className="p-8 md:p-10 bg-black/40 border-t border-white/5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <a
                                href={generateWhatsAppLink(product, contactInfo?.whatsapp || "8801335945351")}
                                target="_blank"
                                className="flex items-center justify-center gap-4 py-5 bg-[#25D366] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] shadow-[0_10px_40px_rgba(37,211,102,0.3)] transition-all active:scale-95"
                            >
                                <MessageCircle size={24} /> WhatsApp
                            </a>
                            <button
                                onClick={() => {
                                    onClose();
                                    onMessengerOrder();
                                }}
                                className="flex items-center justify-center gap-4 py-5 bg-[#0084FF] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] shadow-[0_10px_40px_rgba(0,132,255,0.3)] transition-all active:scale-95"
                            >
                                <ShoppingBag size={24} /> Messenger
                            </button>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-full mt-4 py-3 text-neutral-500 font-black uppercase tracking-[0.3em] text-[10px] hover:text-white transition-colors"
                        >
                            Close Guidelines
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default DeliveryModal;
