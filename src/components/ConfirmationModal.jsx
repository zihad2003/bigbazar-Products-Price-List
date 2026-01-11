import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">{title}</h3>
                            </div>
                            <button onClick={onClose} className="ml-auto text-neutral-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <p className="text-neutral-400 mb-8">{message}</p>

                        <div className="flex gap-3">
                            <button onClick={onClose} className="flex-1 py-3 px-4 rounded-xl font-bold text-neutral-400 hover:bg-white/5 transition-colors">
                                Cancel
                            </button>
                            <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 px-4 rounded-xl font-bold bg-[#ce112d] hover:bg-red-700 text-white shadow-lg shadow-red-900/20 transition-all">
                                Delete
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
