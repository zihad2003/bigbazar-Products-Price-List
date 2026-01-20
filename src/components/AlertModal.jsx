import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

const AlertModal = ({ isOpen, onClose, title, message, type = 'error' }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden"
                    >
                        {/* Background Glow */}
                        <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[100px] opacity-20 ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />

                        <div className="relative z-10 flex flex-col items-center text-center gap-4">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                {type === 'success' ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
                            </div>

                            <h3 className="text-xl font-black uppercase italic text-white tracking-wide">
                                {title}
                            </h3>

                            <p className="text-neutral-400 text-sm font-medium leading-relaxed">
                                {message}
                            </p>

                            <button
                                onClick={onClose}
                                className={`mt-4 w-full py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all ${type === 'success'
                                        ? 'bg-green-500 text-black hover:bg-green-400'
                                        : 'bg-red-600 text-white hover:bg-red-500'
                                    }`}
                            >
                                {type === 'success' ? 'Continue' : 'Try Again'}
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AlertModal;
