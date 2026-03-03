import React from 'react';
import { Facebook, Instagram, MessageCircle, Phone } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

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
    const { t, language } = useLanguage();
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
        <footer className="py-16 md:py-24 px-4 md:px-6 border-t" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <div className="max-w-7xl mx-auto flex flex-col items-center gap-10 md:gap-16">

                {/* Brand Logo */}
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter" style={{ color: 'var(--text-primary)' }}>
                        BIG<span className="text-[#ce112d]">BAZAR</span>
                    </h1>
                </div>

                {/* Header */}
                <h3 className="font-black italic uppercase tracking-[0.2em] text-xs md:text-sm" style={{ color: 'var(--text-muted)' }}>
                    {language === 'bn' ? 'আমাদের সাথে যুক্ত হোন' : 'Connect With Us'}
                </h3>

                {/* Social Icons Grid */}
                <div className="flex flex-wrap justify-center gap-6 md:gap-16">
                    {socialLinks.map((social) => (
                        <a
                            key={social.label}
                            href={social.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col items-center gap-4 md:gap-6"
                        >
                            <div
                                className="w-12 h-12 md:w-16 md:h-16 rounded-[16px] md:rounded-[20px] border flex items-center justify-center group-hover:bg-[#ce112d] group-hover:text-white group-hover:border-[#ce112d] group-hover:scale-110 transition-all duration-500"
                                style={{ borderColor: 'var(--border-hover)', color: 'var(--text-primary)' }}
                            >
                                <social.icon size={18} strokeWidth={1.5} className="md:w-5 md:h-5" />
                            </div>
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-[#ce112d] transition-colors" style={{ color: 'var(--text-muted)' }}>
                                {social.label}
                            </span>
                        </a>
                    ))}
                </div>

                {/* Footer Credit */}
                <div className="mt-4 md:mt-8 text-center space-y-3 md:space-y-4 opacity-60">
                    <h2 className="text-[10px] md:text-xs font-black italic uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                        {language === 'bn' ? 'ডেভেলপড বাই' : 'ENGINEERED BY'} <span className="text-[#ce112d]">ZIHAD</span> {language === 'bn' ? 'এর জন্য' : 'FOR'} <span className="text-[#ce112d]">BIG BAZAR</span>
                    </h2>
                    <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] md:tracking-[0.4em]" style={{ color: 'var(--text-faint)' }}>
                        {t('location')} | 2026
                    </p>
                </div>

            </div>
        </footer>
    );
}
