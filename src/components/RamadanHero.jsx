import { motion } from 'framer-motion';
import { Moon, Stars, ArrowRight, Sparkles } from 'lucide-react';

export default function RamadanHero({ bannerUrl }) {
    return (
        <section className="relative w-full aspect-[16/9] md:aspect-[24/10] min-h-[400px] md:min-h-[600px] rounded-2xl md:rounded-[40px] overflow-hidden group">
            {/* Background Image */}
            <div className="absolute inset-0">
                <img
                    src={bannerUrl}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    alt="Ramadan Collection"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#022c22]/95 via-[#022c22]/60 md:via-[#022c22]/40 to-transparent" />
            </div>

            {/* Content Overlay */}
            <div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-20 py-10 md:py-20 max-w-4xl space-y-4 md:space-y-8">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-2 md:gap-3 bg-white/10 backdrop-blur-md w-fit px-3 md:px-5 py-1.5 md:py-2 rounded-full border border-white/20"
                >
                    <Moon size={14} className="text-[#fbbf24] md:w-[18px]" />
                    <span className="text-white text-[9px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.3em]">Ramadan Special 2026</span>
                    <Stars size={12} className="text-[#fbbf24] md:w-[14px]" />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="space-y-2 md:space-y-4"
                >
                    <h1 className="text-3xl md:text-7xl font-black italic uppercase leading-tight tracking-tighter text-white">
                        ELEGANCE <br />
                        <span className="text-[#fbbf24] flex items-center gap-3 md:gap-4">
                            FOR EID <Sparkles className="hidden md:block w-8 h-8 md:w-12 md:h-12" />
                        </span>
                    </h1>
                    <p className="text-sm md:text-xl text-neutral-300 font-medium max-w-sm md:max-w-xl leading-relaxed">
                        Explore our exclusive Ramadan collection featuring premium traditional wear and luxury contemporary styles.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-wrap gap-3 md:gap-5"
                >
                    <button className="bg-[#fbbf24] text-[#022c22] px-6 md:px-10 py-3 md:py-5 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-sm shadow-[0_10px_40px_rgba(251,191,36,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 md:gap-3">
                        Shop Collection <ArrowRight size={14} className="md:w-[18px]" />
                    </button>
                    <div className="px-5 md:px-8 py-3 md:py-5 rounded-xl md:rounded-2xl border border-white/20 backdrop-blur-md text-white font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-2 md:gap-3">
                        New Arrivals
                    </div>
                </motion.div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute bottom-10 right-10 flex gap-4 opacity-30">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse delay-75" />
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse delay-150" />
            </div>
        </section>
    );
}
