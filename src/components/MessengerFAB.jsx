import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { trackMessengerClick } from '../utils/analytics';

// Big Bazar Facebook Page ID (from Footer.jsx / JSON-LD)
const FB_PAGE_ID = '100063541603515';
const MESSENGER_URL = `https://m.me/${FB_PAGE_ID}?ref=website_fab`;

// Floating, always-visible button. Most orders currently happen over
// Messenger chat rather than the website checkout — this makes that
// path obvious instead of forcing everyone through checkout.
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
            style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#0084FF',
                color: '#fff',
                padding: '12px 18px',
                borderRadius: '999px',
                boxShadow: '0 4px 16px rgba(0,132,255,0.4)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '14px',
            }}
        >
            <MessageCircle size={20} />
            <span>{language === 'bn' ? 'মেসেঞ্জারে অর্ডার করুন' : 'Order on Messenger'}</span>
        </a>
    );
}
