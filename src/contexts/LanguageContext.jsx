import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const translations = {
    bn: {
        // Navbar & Categories
        all: 'সব',
        men: 'ছেলেদের',
        women: 'মেয়েদের',
        boys: 'বাচ্চাদের (ছেলে)',
        girls: 'বাচ্চাদের (মেয়ে)',
        track: 'ট্র্যাক করুন',
        tracking: 'ট্র্যাকিং',
        cart: 'কার্ট',
        search: 'খুঁজুন',

        // Product Section
        buy_now: 'অর্ডার করুন',
        add_to_cart: 'কার্টে যোগ করুন',
        add_to_bag: 'ব্যাগে যোগ করুন',
        out_of_stock: 'স্টক নেই',
        sold_out: 'বিক্রি হয়ে গেছে',
        size: 'সাইজ',
        color: 'কালার',
        price: 'মূল্য',
        delivery_charge: 'ডেলিভারি চার্জ',
        order_now: 'এখনই কিনুন',

        // Multi Order Modal
        checkout: 'চেকআউট',
        order_summary: 'অর্ডার সামারি',
        items: 'আইটেম',
        subtotal: 'সাব-টোটাল',
        name: 'আপনার নাম',
        phone: 'ফোন নাম্বার',
        address: 'আপনার ঠিকানা (বিস্তারিত)',
        district: 'জেলা নির্বাচন করুন',
        upazila: 'উপজেলা নির্বাচন করুন',
        note: 'অর্ডার নোট (ঐচ্ছিক)',
        cod: 'ক্যাশ অন ডেলিভারি',
        advance_payment: 'অগ্রিম পেমেন্ট',
        confirm_order: 'অর্ডার কনফার্ম করুন',
        placeholder_name: 'আপনার নাম...',
        placeholder_phone: 'ফোন নাম্বার...',
        placeholder_address: 'বাসা নং, রোড নং, এলাকা...',

        // Tracking
        track_order: 'অর্ডার ট্র্যাক করুন',
        track_status: 'আপনার অর্ডারের অবস্থা জানুন',
        track_placeholder: 'আপনার মোবাইল নম্বর লিখুন...',
        no_order_found: 'দুঃখিত! এই নম্বরে কোনো অর্ডার পাওয়া যায়নি।',
        track_loading: 'অর্ডার খোঁজা হচ্ছে...',
        all_orders: 'আপনার সকল অর্ডার',

        // Footer
        quick_links: 'দ্রুত লিংক',
        contact: 'যোগাযোগ',
        rights: 'সর্বস্বত্ব সংরক্ষিত',
        location: 'উত্তরা, ঢাকা, বাংলাদেশ',
        developed_by: 'ডেভেলপড বাই',
    },
    en: {
        // Navbar & Categories
        all: 'All',
        men: 'Men',
        women: 'Women',
        boys: 'Kids (Boys)',
        girls: 'Kids (Girls)',
        track: 'Track Order',
        tracking: 'Tracking',
        cart: 'Cart',
        search: 'Search',

        // Product Section
        buy_now: 'Buy Now',
        add_to_cart: 'Add to Cart',
        add_to_bag: 'Add to Bag',
        out_of_stock: 'Out of Stock',
        sold_out: 'Sold Out',
        size: 'Size',
        color: 'Color',
        price: 'Price',
        delivery_charge: 'Delivery Charge',
        order_now: 'Order Now',

        // Multi Order Modal
        checkout: 'Checkout',
        order_summary: 'Order Summary',
        items: 'items',
        subtotal: 'Sub-total',
        name: 'Your Name',
        phone: 'Phone Number',
        address: 'Your Address (Details)',
        district: 'Select District',
        upazila: 'Select Upazila',
        note: 'Order Note (Optional)',
        cod: 'Cash on Delivery',
        advance_payment: 'Advance Payment',
        confirm_order: 'Confirm Order',
        placeholder_name: 'Your name...',
        placeholder_phone: 'Phone number...',
        placeholder_address: 'House, Road, Area...',

        // Tracking
        track_order: 'Track Order',
        track_status: 'Check your order status',
        track_placeholder: 'Enter your phone number...',
        no_order_found: 'Sorry! No order found with this number.',
        track_loading: 'Finding order...',
        all_orders: 'All your orders',

        // Footer
        quick_links: 'Quick Links',
        contact: 'Contact',
        rights: 'All rights reserved',
        location: 'Uttara, Dhaka, Bangladesh',
        developed_by: 'Developed by',
    }
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(localStorage.getItem('language') || 'bn');

    useEffect(() => {
        localStorage.setItem('language', language);
        document.documentElement.lang = language;
    }, [language]);

    const t = (key) => {
        return translations[language][key] || key;
    };

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'bn' ? 'en' : 'bn');
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
