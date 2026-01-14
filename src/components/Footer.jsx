import React from 'react';
import { Facebook, Instagram, MessageCircle, Phone } from 'lucide-react';

const TikTokIcon = ({ size = 12, className }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
);

export default function Footer() {
    const socialLinks = [
        {
            label: 'FACEBOOK',
            icon: Facebook,
            url: 'https://www.facebook.com/profile.php?id=100063541603515'
        },
        {
            label: 'INSTAGRAM',
            icon: Instagram,
            url: 'https://www.instagram.com/big_bazar_25/'
        },
        {
            label: 'WHATSAPP',
            icon: MessageCircle,
            url: 'https://wa.me/8801335945351'
        },
        {
            label: 'TIKTOK',
            icon: TikTokIcon,
            url: 'https://www.tiktok.com/@big.bazar2'
        }
    ];

    return (
        <footer className="bg-black py-24 px-6 border-t border-white/5">
            <div className="max-w-7xl mx-auto flex flex-col items-center gap-16">

                {/* Brand Logo */}
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-black italic text-white tracking-tighter">
                        BIG<span className="text-[#ce112d]">BAZAR</span>
                    </h1>
                </div>

                {/* Header */}
                <h3 className="text-neutral-500 font-black italic uppercase tracking-[0.2em] text-sm">
                    Connect With Us
                </h3>

                {/* Social Icons Grid */}
                <div className="flex flex-wrap justify-center gap-10 md:gap-16">
                    {socialLinks.map((social) => (
                        <a
                            key={social.label}
                            href={social.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col items-center gap-6"
                        >
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-[30px] border border-white/20 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black group-hover:scale-110 transition-all duration-500">
                                <social.icon size={24} strokeWidth={1.5} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 group-hover:text-white transition-colors">
                                {social.label}
                            </span>
                        </a>
                    ))}
                </div>

                {/* Footer Credit */}
                <div className="mt-8 text-center space-y-4 opacity-60">
                    <h2 className="text-xs font-black italic uppercase tracking-widest text-neutral-400">
                        ENGINEERED BY <span className="text-[#ce112d]">ZIHAD</span> FOR <span className="text-[#ce112d]">BIG BAZAR</span>
                    </h2>
                    <p className="text-[10px] font-bold text-neutral-700 uppercase tracking-[0.4em]">
                        BARIARHAT, CHATTOGRAM | 2026
                    </p>
                </div>

            </div>
        </footer>
    );
}
