import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

const AlertModal = ({ isOpen, onClose, title, message, type = 'error' }) => {
    useBodyScrollLock(!!isOpen);
    const success = type === 'success';
    const warning = type === 'warning';

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[3000] bg-slate-950/55 flex items-center justify-center p-4 overscroll-none"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        className="relative w-full max-w-sm bg-[#121215] border border-white/10 rounded-2xl shadow-xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`h-1 ${success ? 'bg-emerald-500' : warning ? 'bg-amber-500' : 'bg-[#ce112d]'}`} />
                        <div className="p-5">
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                  success
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                                    : warning
                                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                                      : 'bg-[#ce112d]/10 border-[#ce112d]/30 text-[#ce112d]'
                                }`}>
                                    {success ? <CheckCircle2 size={20} /> : warning ? <AlertTriangle size={20} /> : <AlertCircle size={20} />}
                                </div>
                                <div className="min-w-0 flex-1 pt-0.5 pr-6">
                                    <h3 className="text-base font-semibold text-white leading-snug">{title}</h3>
                                    <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">{message}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="absolute top-4 right-3 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5"
                                    aria-label="Close"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className={`mt-5 w-full h-11 rounded-xl text-sm font-semibold ${
                                  success
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                    : 'bg-[#ce112d] text-white hover:brightness-110'
                                }`}
                            >
                                {success ? 'Continue' : 'Dismiss'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AlertModal;
