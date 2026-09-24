import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Facebook, Instagram, Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const TikTokIcon = ({ size = 16, className }) => (
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

export default function Footer({ onTrackOrder, onSelectCategory }) {
    const { language, setLanguage } = useLanguage();
    const navigate = useNavigate();

    const handleCategoryClick = (category) => {
        if (onSelectCategory) {
            onSelectCategory(category);
        }
        navigate('/');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer className="pt-16 pb-40 sm:pb-36 lg:pb-12 border-t transition-all font-sans text-xs md:text-sm bg-white border-zinc-200 text-zinc-900">
            <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 md:px-12">
                
                {/* Main Links Area — 12 Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 pb-16">
                    
                    {/* Brand Info Column (4 Cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="space-y-3">
                            <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="inline-block group">
                                <span className="text-2xl md:text-3xl font-black italic tracking-tighter cursor-pointer select-none leading-none brand-logo block">
                                    <span className="text-[#ce112d]">BIG</span>
                                    <span className="text-zinc-900 ml-1">BAZAR</span>
                                </span>
                                <div className="h-[2px] bg-[#ce112d] w-10 mt-2 transition-all duration-300 group-hover:w-full" />
                            </Link>
                            <p className="text-zinc-600 font-medium leading-relaxed text-sm max-w-sm">
                                Big Bazar — Your Ultimate Family Fashion Destination.
                            </p>
                        </div>

                        {/* Contact details */}
                        <div className="space-y-3 text-sm font-medium text-zinc-700">
                            <div className="flex items-center gap-3">
                                <Phone size={16} className="text-[#ce112d] shrink-0" />
                                <a href="tel:01857045449" className="hover:text-[#ce112d] transition-colors py-0.5">01857045449</a>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail size={16} className="text-[#ce112d] shrink-0" />
                                <a href="mailto:infobigbazar01@gmail.com" className="hover:text-[#ce112d] transition-colors py-0.5">infobigbazar01@gmail.com</a>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin size={16} className="text-[#ce112d] shrink-0 mt-0.5" />
                                <a
                                    href="https://maps.app.goo.gl/nTyss67XVkuZRLwy9"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="leading-snug text-zinc-600 hover:text-[#ce112d] transition-colors"
                                >
                                    {language === 'bn' 
                                        ? '২য় তলা, জমিদারের প্লাজা, বারইয়ারহাট, মীরসরাই, চট্টগ্রাম' 
                                        : '2nd Floor, Jomidar Plaza, Baraiyarhat, Mirsharai, Chattogram'}
                                </a>
                            </div>
                        </div>

                        {/* Social media icons */}
                        <div className="flex items-center gap-3 pt-2">
                            {[
                                { icon: MessageCircle, url: 'https://wa.me/8801824950082' },
                                { icon: Facebook, url: 'https://www.facebook.com/profile.php?id=100063541603515' },
                                { icon: Instagram, url: 'https://www.instagram.com/big_bazar_25/' },
                                { icon: TikTokIcon, url: 'https://www.tiktok.com/@big.bazar2' }
                            ].map((social, index) => (
                                <a
                                    key={index}
                                    href={social.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-9 h-9 rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-[#ce112d] hover:border-[#ce112d] transition-all duration-300 shadow-sm active:scale-95"
                                >
                                    <social.icon size={14} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Columns 2-5 (8 Cols divided evenly) */}
                    <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8 md:gap-12">
                        
                        {/* SHOP Column */}
                        <div className="space-y-4">
                            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-900 border-b border-zinc-200 pb-2.5">
                                {language === 'bn' ? 'কেনাকাটা' : 'SHOP'}
                            </h2>
                            <ul className="space-y-3 font-semibold text-zinc-600 text-xs sm:text-sm flex flex-col items-start">
                                <li><button type="button" onClick={() => handleCategoryClick('Men')} className="hover:text-[#ce112d] hover:translate-x-1 transition-all duration-300">{language === 'bn' ? 'ছেলেদের' : 'Men'}</button></li>
                                <li><button type="button" onClick={() => handleCategoryClick('Women')} className="hover:text-[#ce112d] hover:translate-x-1 transition-all duration-300">{language === 'bn' ? 'মেয়েদের' : 'Women'}</button></li>
                                <li><button type="button" onClick={() => handleCategoryClick('Kids (Boys)')} className="hover:text-[#ce112d] hover:translate-x-1 transition-all duration-300">{language === 'bn' ? 'বাচ্চাদের (ছেলে)' : 'Kids (Boys)'}</button></li>
                                <li><button type="button" onClick={() => handleCategoryClick('Kids (Girls)')} className="hover:text-[#ce112d] hover:translate-x-1 transition-all duration-300">{language === 'bn' ? 'বাচ্চাদের (মেয়ে)' : 'Kids (Girls)'}</button></li>
                            </ul>
                        </div>

                        {/* HELP Column */}
                        <div className="space-y-4">
                            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-900 border-b border-zinc-200 pb-2.5">
                                {language === 'bn' ? 'সহায়তা' : 'HELP'}
                            </h2>
                            <ul className="space-y-3 font-semibold text-zinc-600 text-xs sm:text-sm flex flex-col items-start">
                                <li><Link to="/contact-us" className="hover:text-[#ce112d] transition-colors">{language === 'bn' ? 'যোগাযোগ করুন' : 'Contact Us'}</Link></li>
                                <li><Link to="/faq" className="hover:text-[#ce112d] transition-colors">{language === 'bn' ? 'প্রশ্নোত্তর (FAQs)' : 'FAQs'}</Link></li>
                                <li><Link to="/size-guide" className="hover:text-[#ce112d] transition-colors">{language === 'bn' ? 'সাইজ গাইড' : 'Size Guide'}</Link></li>
                                <li><Link to="/shipping" className="hover:text-[#ce112d] transition-colors">{language === 'bn' ? 'শিপিং তথ্য' : 'Shipping Info'}</Link></li>
                                <li><Link to="/returns" className="hover:text-[#ce112d] transition-colors">{language === 'bn' ? 'রিটার্ন ও এক্সচেঞ্জ' : 'Returns & Exchanges'}</Link></li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (onTrackOrder) onTrackOrder();
                                            else navigate('/');
                                        }}
                                        className="hover:text-[#ce112d] transition-colors flex items-center gap-1.5 text-left font-medium"
                                    >
                                        <Phone size={14} className="text-[#ce112d] shrink-0" />
                                        <span>{language === 'bn' ? 'অর্ডার ট্র্যাকিং' : 'Track Order'}</span>
                                    </button>
                                </li>
                            </ul>
                        </div>

                        {/* COMPANY Column */}
                        <div className="space-y-4">
                            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-900 border-b border-zinc-200 pb-2.5">
                                {language === 'bn' ? 'প্রতিষ্ঠান' : 'COMPANY'}
                            </h2>
                            <ul className="space-y-3 font-semibold text-zinc-600 text-xs sm:text-sm flex flex-col items-start">
                                <li><Link to="/about-us" className="hover:text-[#ce112d] transition-colors">{language === 'bn' ? 'আমাদের পরিচিতি' : 'About Us'}</Link></li>
                                <li><Link to="/store-locations" className="hover:text-[#ce112d] transition-colors">{language === 'bn' ? 'শোরুমের ঠিকানা' : 'Store Locations'}</Link></li>
                            </ul>
                        </div>

                        {/* LEGAL Column */}
                        <div className="space-y-4">
                            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-900 border-b border-zinc-200 pb-2.5">
                                {language === 'bn' ? 'পলিসি ও শর্তাবলী' : 'LEGAL'}
                            </h2>
                            <ul className="space-y-3 font-semibold text-zinc-600 text-xs sm:text-sm flex flex-col items-start">
                                <li><Link to="/privacy-policy" className="hover:text-[#ce112d] transition-colors">{language === 'bn' ? 'প্রাইভেসি পলিসি' : 'Privacy Policy'}</Link></li>
                                <li><Link to="/terms" className="hover:text-[#ce112d] transition-colors">{language === 'bn' ? 'সেবার শর্তাবলী' : 'Terms of Service'}</Link></li>
                                <li><Link to="/refund" className="hover:text-[#ce112d] transition-colors">{language === 'bn' ? 'রিফান্ড পলিসি' : 'Refund Policy'}</Link></li>
                            </ul>
                        </div>

                    </div>

                </div>

                {/* Bottom Credits & Payment Badges */}
                <div className="border-t border-zinc-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    
                    {/* Copyright + developer credit */}
                    <div className="text-center md:text-left space-y-1.5">
                        <div className="text-xs font-medium text-zinc-500">
                            {language === 'bn' ? '© ২০২৬ বিগ বাজার। সর্বস্বত্ব সংরক্ষিত।' : '© 2026 BIG BAZAR. All rights reserved.'}
                        </div>
                        <a
                            href={`https://wa.me/8801857045449?text=${encodeURIComponent(
                                language === 'bn'
                                    ? 'হ্যালো Zihad, onlinebigbazar.com দেখেছি। আমিও এরকম একটি ওয়েবসাইট বানাতে আগ্রহী।'
                                    : "Hi Zihad, I saw onlinebigbazar.com and I'm interested in getting a similar website built."
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-[#ce112d] transition-colors"
                            title={language === 'bn' ? 'ওয়েবসাইট বানাতে আগ্রহী? মেসেজ করুন' : 'Interested in a website? Message on WhatsApp'}
                        >
                            <span className="font-medium tracking-wide">
                                {language === 'bn' ? 'ওয়েবসাইট তৈরি' : 'Website by'}
                            </span>
                            <span className="font-outfit text-[13px] italic font-semibold tracking-tight text-zinc-500 group-hover:text-[#ce112d] transition-colors underline decoration-zinc-300 underline-offset-2 group-hover:decoration-[#ce112d]/60">
                                Zihad
                            </span>
                            <MessageCircle
                                size={12}
                                className="text-[#128C7E] opacity-70 group-hover:opacity-100 transition-opacity shrink-0"
                                aria-hidden
                            />
                        </a>
                    </div>

                    {/* Payment methods */}
                    <div className="flex flex-wrap items-center justify-center gap-2.5">
                        <span className="text-[10px] font-black tracking-wider uppercase text-zinc-400 mr-1 w-full sm:w-auto text-center sm:text-left">
                            {language === 'bn' ? 'পেমেন্ট মাধ্যম:' : 'WE ACCEPT:'}
                        </span>
                        {[
                            { src: '/img/payments/bkash.png', alt: 'bKash' },
                            { src: '/img/payments/nagad.png', alt: 'Nagad' },
                            { src: '/img/payments/bangla-qr.png', alt: 'Bangla QR', imgClass: 'h-7 w-auto' },
                            { src: '/img/payments/dbbl.png', alt: 'Dutch-Bangla Bank', imgClass: 'h-7 w-auto max-w-[140px]' },
                            { src: '/img/payments/visa.png', alt: 'Visa' },
                            { src: '/img/payments/mastercard.png', alt: 'Mastercard' },
                        ].map((p) => (
                            <span
                                key={p.alt}
                                title={p.alt}
                                className="inline-flex items-center justify-center h-10 px-2.5 rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden"
                            >
                                <img
                                    src={`${p.src}?v=7`}
                                    alt={p.alt}
                                    className={p.imgClass || 'h-6 w-auto max-w-[88px] object-contain'}
                                    loading="lazy"
                                    decoding="async"
                                />
                            </span>
                        ))}
                        <span className="inline-flex items-center justify-center h-10 px-3 rounded-lg border border-zinc-200 bg-white text-[10px] font-black tracking-wide text-zinc-700 shadow-sm select-none">
                            COD
                        </span>
                    </div>
                </div>

            </div>
        </footer>
    );
}
