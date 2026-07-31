import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { trackMessengerClick } from '../utils/analytics';

// Big Bazar Facebook Page ID (from Footer.jsx / JSON-LD)
const FB_PAGE_ID = '100063541603515';
const MESSENGER_URL = `https://m.me/${FB_PAGE_ID}?ref=website_fab`;

// Floating, always-visible Messenger button. Positioned above bottom navigation bar on mobile.
export default function MessengerFAB() {
    const { language } = useLanguage();

    const handleClick = () => {
        trackMessengerClick();
    };

    return (
        <a
            href={MESSENGER_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            aria-label={language === 'bn' ? 'মেসেঞ্জারে অর্ডার করুন' : 'Order on Messenger'}
            className="fixed bottom-[80px] md:bottom-6 right-4 md:right-6 z-[1005] flex items-center gap-2 bg-[#0084FF] text-white px-3.5 py-3 md:px-4 md:py-3 rounded-full shadow-[0_4px_20px_rgba(0,132,255,0.45)] hover:scale-105 active:scale-95 transition-all duration-300 text-xs md:text-sm font-semibold no-underline"
        >
            <MessageCircle size={20} className="shrink-0" />
            <span>{language === 'bn' ? 'মেসেঞ্জারে অর্ডার' : 'Order on Messenger'}</span>
        </a>
    );
}
