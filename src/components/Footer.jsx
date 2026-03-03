import { Facebook, Instagram, MessageCircle, Phone } from 'lucide-react';
import { useTheme } from '../ThemeContext';

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
    const { theme } = useTheme();
    const isRamadan = theme === 'ramadan';
    const accentColor = isRamadan ? '#fbbf24' : '#ce112d';

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
                        BIG<span style={{ color: accentColor }}>BAZAR</span>
                    </h1>
                </div>

                {/* Header */}
                <h3 className="font-black italic uppercase tracking-[0.2em] text-xs md:text-sm" style={{ color: 'var(--text-muted)' }}>
                    Connect With Us
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
                                className="w-12 h-12 md:w-16 md:h-16 rounded-[16px] md:rounded-[20px] border flex items-center justify-center transition-all duration-500 group-hover:text-white group-hover:scale-110 group-hover:bg-accent"
                                style={{
                                    borderColor: 'var(--border-hover)',
                                    color: 'var(--text-primary)',
                                    '--hover-bg': accentColor
                                }}
                            >
                                <social.icon size={18} strokeWidth={1.5} className="md:w-5 md:h-5 transition-colors group-hover:text-white" />
                            </div>
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-colors" style={{ color: 'var(--text-muted)' }}>
                                <span className="group-hover:text-[var(--accent-color)]">{social.label}</span>
                            </span>
                        </a>
                    ))}
                </div>

                {/* Footer Credit */}
                <div className="mt-4 md:mt-8 text-center space-y-3 md:space-y-4 opacity-60">
                    <h2 className="text-[10px] md:text-xs font-black italic uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                        ENGINEERED BY <span style={{ color: accentColor }}>ZIHAD</span> FOR <span style={{ color: accentColor }}>BIG BAZAR</span>
                    </h2>
                    <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] md:tracking-[0.4em]" style={{ color: 'var(--text-faint)' }}>
                        BARIARHAT, CHATTOGRAM | 2026
                    </p>
                </div>

            </div>
        </footer>
    );
}
