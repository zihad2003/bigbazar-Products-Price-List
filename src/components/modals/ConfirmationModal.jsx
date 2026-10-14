import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete' }) {
    useBodyScrollLock(!!isOpen);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 overscroll-none">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/55"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        className="relative w-full max-w-sm bg-[#121215] border border-white/10 rounded-2xl p-5 shadow-xl"
                    >
                        <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                                <AlertTriangle size={20} />
                            </div>
                            <h3 className="text-base font-semibold text-white leading-snug pt-2 flex-1">{title}</h3>
                            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5" aria-label="Close">
                                <X size={16} />
                            </button>
                        </div>

                        <p className="text-sm text-zinc-400 leading-relaxed mb-5">{message}</p>

                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl text-sm font-semibold text-zinc-400 bg-white/5 hover:bg-white/10">
                                Cancel
                            </button>
                            <button type="button" onClick={() => { onConfirm(); onClose(); }} className="flex-1 h-11 rounded-xl text-sm font-semibold bg-[#ce112d] hover:bg-red-700 text-white">
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
