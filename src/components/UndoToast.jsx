import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function UndoToast({ isOpen, message, onUndo, onComplete, duration = 10000 }) {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (!isOpen) {
            setProgress(100);
            return;
        }

        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remaining);

            if (remaining === 0) {
                clearInterval(interval);
                onComplete();
            }
        }, 50);

        return () => clearInterval(interval);
    }, [isOpen, duration, onComplete]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-[100] flex items-center justify-center pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="pointer-events-auto relative bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex items-center p-4 gap-4 min-w-[320px]"
                    >
                        {/* Progress Bar Background */}
                        <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full" />
                        {/* Active Progress Bar */}
                        <motion.div
                            className="absolute bottom-0 left-0 h-1 bg-[#ce112d]"
                            style={{ width: `${progress}%` }}
                        />

                        <div className="flex-1">
                            <p className="text-white font-medium">{message}</p>
                        </div>

                        <button
                            onClick={onUndo}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#ce112d] hover:text-red-400 text-sm font-bold transition-colors"
                        >
                            <RotateCcw size={16} />
                            Undo
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
