import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

const AlertModal = ({ isOpen, onClose, title, message, type = 'error' }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md bg-[#121215] border border-white/10 rounded-[32px] p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Background Glow */}
                        <div className={`absolute -top-20 -right-20 w-48 h-48 rounded-full blur-[100px] opacity-25 ${type === 'success' ? 'bg-emerald-500' : 'bg-[#ce112d]'}`} />

                        <div className="relative z-10 flex flex-col items-center text-center gap-4">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-1 shadow-2xl border ${
                              type === 'success'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-[#ce112d]/10 border-[#ce112d]/30 text-[#ce112d]'
                            }`}>
                                {type === 'success' ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
                            </div>

                            <h3 className="text-xl font-black uppercase italic tracking-wide text-white">
                                {title}
                            </h3>

                            <p className="text-xs font-medium leading-relaxed text-zinc-400 max-h-48 overflow-y-auto no-scrollbar">
                                {message}
                            </p>

                            <button
                                onClick={onClose}
                                className={`mt-2 w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl ${
                                  type === 'success'
                                    ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-900/30'
                                    : 'bg-[#ce112d] text-white hover:brightness-110 shadow-red-900/40'
                                }`}
                            >
                                {type === 'success' ? 'Continue ✓' : 'Dismiss'}
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 text-zinc-500 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AlertModal;
