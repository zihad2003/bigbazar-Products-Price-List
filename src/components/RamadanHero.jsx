import { motion } from 'framer-motion';
import { Moon, Stars, ArrowRight, Sparkles } from 'lucide-react';

export default function RamadanHero({ bannerUrl }) {
    return (
        <section className="relative w-full min-h-[500px] md:min-h-[700px] rounded-[40px] overflow-hidden group">
            {/* Background Image */}
            <div className="absolute inset-0">
                <img
                    src={bannerUrl}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    alt="Ramadan Collection"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#022c22]/95 via-[#022c22]/40 to-transparent" />
            </div>

            {/* Content Overlay */}
            <div className="relative z-10 h-full flex flex-col justify-center px-8 md:px-20 py-20 max-w-4xl space-y-8">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-3 bg-white/10 backdrop-blur-md w-fit px-5 py-2 rounded-full border border-white/20"
                >
                    <Moon size={18} className="text-[#fbbf24]" />
                    <span className="text-white text-xs font-black uppercase tracking-[0.3em]">Ramadan Special 2026</span>
                    <Stars size={14} className="text-[#fbbf24]" />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                >
                    <h1 className="text-5xl md:text-8xl font-black italic uppercase leading-tight tracking-tighter text-white">
                        ELEGANCE <br />
                        <span className="text-[#fbbf24] flex items-center gap-4">
                            FOR EID <Sparkles className="hidden md:block w-12 h-12" />
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-neutral-300 font-medium max-w-xl leading-relaxed">
                        Explore our exclusive Ramadan collection featuring premium traditional wear and luxury contemporary styles.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-wrap gap-5"
                >
                    <button className="bg-[#fbbf24] text-[#022c22] px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-[0_10px_40px_rgba(251,191,36,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                        Shop Collection <ArrowRight size={18} />
                    </button>
                    <div className="px-8 py-5 rounded-2xl border border-white/20 backdrop-blur-md text-white font-black uppercase tracking-widest text-xs flex items-center gap-3">
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
