import React, { useState, useEffect } from 'react';
import { Facebook, Instagram, MessageCircle, Music2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Footer = () => {
    const [contact, setContact] = useState({
        facebook: "https://facebook.com/zihad.bigbazar",
        instagram: "https://instagram.com/bigbazar",
        whatsapp: "8801335945351",
        tiktok: "https://tiktok.com/@bigbazar"
    });

    useEffect(() => {
        const fetchContact = async () => {
            const { data } = await supabase.from('site_settings').select('value').eq('key', 'contact_info').single();
            if (data?.value) {
                setContact(data.value);
            }
        };
        fetchContact();
    }, []);

    const CONTACT = contact;

    return (
        <footer className="w-full py-20 pb-40 bg-black mt-24 relative z-10 border-t border-white/5">
            <div className="text-center">
                <h3 className="text-neutral-500 font-black text-[11px] uppercase tracking-[0.5em] mb-12 italic opacity-50">Connect With Us</h3>

                <div className="flex justify-center gap-6 mb-24">
                    <a href={CONTACT.facebook} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-4 group">
                        <div className="w-16 h-16 rounded-3xl bg-neutral-900/50 flex items-center justify-center border border-white/5 shadow-2xl transition-all duration-300 group-hover:bg-[#1877F2]/10 group-hover:border-[#1877F2]/20 group-hover:-translate-y-2">
                            <Facebook size={26} className="text-neutral-600 transition-all duration-300 group-hover:text-[#1877F2] group-hover:scale-110" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-700 transition-colors group-hover:text-[#1877F2]">Facebook</span>
                    </a>

                    <a href={CONTACT.instagram} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-4 group">
                        <div className="w-16 h-16 rounded-3xl bg-neutral-900/50 flex items-center justify-center border border-white/5 shadow-2xl transition-all duration-300 group-hover:bg-[#E4405F]/10 group-hover:border-[#E4405F]/20 group-hover:-translate-y-2">
                            <Instagram size={26} className="text-neutral-600 transition-all duration-300 group-hover:text-[#E4405F] group-hover:scale-110" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-700 transition-colors group-hover:text-[#E4405F]">Instagram</span>
                    </a>

                    <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-4 group">
                        <div className="w-16 h-16 rounded-3xl bg-neutral-900/50 flex items-center justify-center border border-white/5 shadow-2xl transition-all duration-300 group-hover:bg-[#25D366]/10 group-hover:border-[#25D366]/20 group-hover:-translate-y-2">
                            <MessageCircle size={26} className="text-neutral-600 transition-all duration-300 group-hover:text-[#25D366] group-hover:scale-110" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-700 transition-colors group-hover:text-[#25D366]">WhatsApp</span>
                    </a>

                    <a href={CONTACT.tiktok} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-4 group">
                        <div className="w-16 h-16 rounded-3xl bg-neutral-900/50 flex items-center justify-center border border-white/5 shadow-2xl transition-all duration-300 group-hover:bg-white/10 group-hover:border-white/20 group-hover:-translate-y-2">
                            <Music2 size={26} className="text-neutral-600 transition-all duration-300 group-hover:text-white group-hover:scale-110" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-700 transition-colors group-hover:text-white">TikTok</span>
                    </a>
                </div>

                <div className="space-y-4 text-neutral-800 font-bold uppercase tracking-[0.2em] text-center">
                    <p className="text-[10px]">Engineered by <span className="text-[#ce112d]">Zihad</span> for Big Bazar</p>
                    <p className="text-[8px] text-neutral-800/60">Bariarhat, Chattogram • 2025</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
