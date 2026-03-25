import React, { useState, useEffect } from 'react';
import { Timer, AlertTriangle, Clock } from 'lucide-react';

const StickyBanner = () => {
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [isExpired, setIsExpired] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Hardcoded target date: March 17, 2026, at 6:00 PM (18:00)
    const targetDate = new Date('2026-03-17T18:00:00');

    useEffect(() => {
        setIsMounted(true);
        const timer = setInterval(() => {
            const now = new Date();
            const difference = targetDate.getTime() - now.getTime();

            if (difference <= 0) {
                setIsExpired(true);
                clearInterval(timer);
            } else {
                const hours = Math.floor(difference / (1000 * 60 * 60));
                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((difference % (1000 * 60)) / 1000);
                setTimeLeft({ hours, minutes, seconds });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    if (!isMounted) return null;

    // Brand accent colors matching "LATEST DROPS" pinkish-red
    // Using a gradient for a more "subtle" and professional look
    const brandAccentBg = isExpired 
        ? 'bg-amber-600/95' 
        : 'bg-gradient-to-r from-[#ce112d] via-[#e52e4d] to-[#ce112d]';

    return (
        <div className={`relative z-[1100] transition-all duration-700 backdrop-blur-md ${brandAccentBg} shadow-[0_4px_30px_rgba(0,0,0,0.15)] border-b border-white/20`}>
            <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3.5">
                <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-8">
                    {!isExpired ? (
                        <>
                            <div className="flex items-center gap-3 text-white">
                                <div className="p-1.5 bg-white/10 rounded-lg animate-pulse">
                                    <Clock size={16} />
                                </div>
                                <span className="text-[13px] sm:text-[15px] font-black italic tracking-tight uppercase leading-none">
                                    🌙 ঈদের আগে পার্সেল হাতে পেতে অর্ডার কনফার্ম করুন আর মাত্র
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div className="flex gap-2">
                                    {[
                                        { val: timeLeft.hours, label: 'ঘণ্টা' },
                                        { val: timeLeft.minutes, label: 'মিনিট' },
                                        { val: timeLeft.seconds, label: 'সেকেন্ড' }
                                    ].map((unit, i) => (
                                        <div key={i} className="flex flex-col items-center">
                                            <div className="flex items-center gap-1.5">
                                                <div className="bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/5 min-w-[38px] flex items-center justify-center shadow-lg">
                                                    <span className="text-sm sm:text-base font-black text-white font-mono leading-none">
                                                        {unit.val.toString().padStart(2, '0')}
                                                    </span>
                                                </div>
                                                {i < 2 && (
                                                    <span className="text-white/40 font-black text-xs sm:text-sm animate-pulse">:</span>
                                                )}
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-white/50 mt-1">
                                                {unit.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <span className="text-[13px] sm:text-[15px] font-black italic text-white tracking-tight leading-none">
                                    -এর মধ্যে!
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-4 px-4 py-1 text-white animate-in fade-in slide-in-from-top-2 duration-700">
                            <div className="p-2 bg-amber-400/20 rounded-full text-amber-200 animate-bounce">
                                <AlertTriangle size={20} />
                            </div>
                            <p className="text-[13px] sm:text-[14px] font-bold leading-relaxed tracking-tight text-center sm:text-left">
                                ⚠️ কুরিয়ার সার্ভিসের ছুটির কারণে ঈদের আগের ডেলিভারির জন্য নতুন অর্ডার নেওয়া বন্ধ রয়েছে। এখনকার সকল অর্ডার ঈদের পর ডেলিভারি করা হবে।
                            </p>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Subtle bottom urgency line */}
            {!isExpired && (
                <div className="h-[2px] w-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-white/30 animate-[scan_2s_linear_infinite]" />
                </div>
            )}
            
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes scan {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}} />
        </div>
    );
};

export default StickyBanner;
