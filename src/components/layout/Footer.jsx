import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Facebook, Instagram, Phone, Mail, MapPin } from 'lucide-react';
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
        <footer className="pt-16 pb-28 md:pb-8 border-t transition-all font-sans text-xs md:text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
            <div className="max-w-7xl mx-auto px-6 md:px-8">
                
                {/* Main Links Area */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 md:gap-12 pb-16">
                    
                    {/* Brand Info Column */}
                    <div className="col-span-2 md:col-span-4 lg:col-span-1 space-y-6">
                        <div className="space-y-2">
                            <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="inline-block group">
                                <h2 className="text-xl md:text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                                    <span className="text-[#ce112d]">BIG</span> BAZAR
                                </h2>
                                <div className="h-[2px] bg-[#ce112d] w-8 mt-1 transition-all duration-300 group-hover:w-full" />
                            </Link>
                            <p className="text-zinc-500 font-medium leading-relaxed max-w-xs text-xs mt-4">
                                Your one-stop destination for premium fashion from top brands. Quality clothing for the whole family.
                            </p>
                        </div>

                        {/* Contact details */}
                        <div className="space-y-4 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            <div className="flex items-center gap-3">
                                <Phone size={14} className="text-zinc-400" />
                                <a href="tel:01857045449" className="hover:text-[#ce112d] transition-colors">01857045449</a>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail size={14} className="text-zinc-400" />
                                <a href="mailto:infobigbazar01@gmail.com" className="hover:text-[#ce112d] transition-colors">infobigbazar01@gmail.com</a>
                            </div>
                            <div className="flex items-center gap-3">
                                <MapPin size={14} className="text-zinc-400 text-left shrink-0" />
                                <span className="text-justify leading-tight">Baraiyarhat, Mirsharai, Chattogram</span>
                            </div>
                        </div>

                        {/* Social media icons */}
                        <div className="flex items-center gap-3 pt-2">
                            {[
                                { icon: Facebook, url: 'https://www.facebook.com/profile.php?id=100063541603515' },
                                { icon: Instagram, url: 'https://www.instagram.com/big_bazar_25/' },
                                { icon: TikTokIcon, url: 'https://www.tiktok.com/@big.bazar2' }
                            ].map((social, index) => (
                                <a
                                    key={index}
                                    href={social.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-[#ce112d] hover:border-[#ce112d] hover:bg-[#ce112d]/5 transition-all duration-300"
                                >
                                    <social.icon size={13} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Columns 2-5 */}
                    
                    {/* SHOP Column */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest opacity-90" style={{ color: 'var(--text-primary)' }}>SHOP</h4>
                        <ul className="space-y-3 font-semibold text-zinc-500 text-xs flex flex-col items-start">
                            <li><button type="button" onClick={() => handleCategoryClick('Men')} className="hover:text-[#ce112d] hover:translate-x-1 transition-all duration-300">Men</button></li>
                            <li><button type="button" onClick={() => handleCategoryClick('Women')} className="hover:text-[#ce112d] hover:translate-x-1 transition-all duration-300">Women</button></li>
                            <li><button type="button" onClick={() => handleCategoryClick('Kids (Boys)')} className="hover:text-[#ce112d] hover:translate-x-1 transition-all duration-300">Kids (Boys)</button></li>
                            <li><button type="button" onClick={() => handleCategoryClick('Kids (Girls)')} className="hover:text-[#ce112d] hover:translate-x-1 transition-all duration-300">Kids (Girls)</button></li>
                            <li><button type="button" onClick={() => handleCategoryClick('New')} className="hover:text-[#ce112d] hover:translate-x-1 transition-all duration-300">New Collection</button></li>
                            <li><button type="button" onClick={() => handleCategoryClick('Sale')} className="hover:text-[#ce112d] hover:translate-x-1 transition-all duration-300 text-rose-500 font-bold uppercase tracking-wider">Sale</button></li>
                        </ul>
                    </div>

                    {/* HELP Column */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest opacity-90" style={{ color: 'var(--text-primary)' }}>HELP</h4>
                        <ul className="space-y-3 font-semibold text-zinc-500 text-xs">
                            <li><Link to="/contact-us" className="hover:text-[#ce112d] transition-colors">Contact Us</Link></li>
                            <li><Link to="/faq" className="hover:text-[#ce112d] transition-colors">FAQs</Link></li>
                            <li><Link to="/size-guide" className="hover:text-[#ce112d] transition-colors">Size Guide</Link></li>
                            <li><Link to="/shipping" className="hover:text-[#ce112d] transition-colors">Shipping Info</Link></li>
                            <li><Link to="/returns" className="hover:text-[#ce112d] transition-colors">Returns & Exchanges</Link></li>
                            <li>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (onTrackOrder) onTrackOrder();
                                        else navigate('/'); // Fallback
                                    }}
                                    className="hover:text-[#ce112d] transition-colors text-left"
                                >
                                    Track Order
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* COMPANY Column */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest opacity-90" style={{ color: 'var(--text-primary)' }}>COMPANY</h4>
                        <ul className="space-y-3 font-semibold text-zinc-500 text-xs">
                            <li><Link to="/about-us" className="hover:text-[#ce112d] transition-colors">About Us</Link></li>
                            <li><Link to="/store-locations" className="hover:text-[#ce112d] transition-colors">Store Locations</Link></li>
                        </ul>
                    </div>

                    {/* LEGAL Column */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest opacity-90" style={{ color: 'var(--text-primary)' }}>LEGAL</h4>
                        <ul className="space-y-3 font-semibold text-zinc-500 text-xs">
                            <li><Link to="/privacy-policy" className="hover:text-[#ce112d] transition-colors">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="hover:text-[#ce112d] transition-colors">Terms of Service</Link></li>
                            <li><Link to="/refund" className="hover:text-[#ce112d] transition-colors">Refund Policy</Link></li>
                        </ul>
                    </div>

                </div>

                {/* Bottom Credits & Payment Badges */}
                <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-6" style={{ borderColor: 'var(--border-color)' }}>
                    
                    {/* Copyright */}
                    <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider text-center md:text-left">
                        © 2026 BIG BAZAR. All rights reserved.
                    </div>

                    {/* Language Switcher */}
                    <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full p-1 h-10 w-44">
                        <button
                            type="button"
                            onClick={() => setLanguage('en')}
                            className={`flex-1 text-[10px] font-black uppercase tracking-widest h-full rounded-full transition-all duration-300 ${language === 'en' ? 'bg-[#ce112d] text-white shadow-md' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
                        >
                            ENGLISH
                        </button>
                        <button
                            type="button"
                            onClick={() => setLanguage('bn')}
                            className={`flex-1 text-[10px] font-black uppercase tracking-widest h-full rounded-full transition-all duration-300 ${language === 'bn' ? 'bg-[#ce112d] text-white shadow-md' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
                        >
                            বাংলা
                        </button>
                    </div>

                    {/* Payment methods */}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className="text-[10px] font-black tracking-wider uppercase text-zinc-400 mr-2">WE ACCEPT:</span>
                        
                        <div className="bg-white border border-rose-100 rounded-lg py-1 px-3 flex items-center justify-center font-bold text-[9px] tracking-wide text-rose-500 h-7 select-none">
                            → BKASH
                        </div>

                        <div className="bg-white border border-orange-100 rounded-lg py-1 px-3 flex items-center justify-center font-bold text-[9px] tracking-wide text-orange-600 h-7 select-none">
                            Or- NAGAD
                        </div>

                        <div className="bg-white border border-zinc-200 rounded-lg py-1 px-3 flex items-center justify-center font-bold text-[9px] tracking-wide text-zinc-650 h-7 select-none">
                            COD
                        </div>
                    </div>
                </div>

            </div>
        </footer>
    );
}
