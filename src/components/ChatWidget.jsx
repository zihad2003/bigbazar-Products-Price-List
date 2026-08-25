import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Send, ShoppingBag, Sparkles, ChevronRight, 
  ShoppingCart, MessageCircle, ExternalLink, RefreshCw, 
  ShieldCheck, CheckCircle, Package, ArrowRight, Tag, Layers,
  Phone, Copy, Check, Info, HelpCircle, Truck, RotateCcw,
  Ruler, CreditCard, MapPin, Store, ChevronLeft, AlertCircle
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import { API_URL, getToken } from '../api/client';
import { trackMessengerClick } from '../utils/analytics';
import { allDistricts, chattogramUpazilas, FREE_UPAZILA, CHATTOGRAM_DISTRICT } from '../data/bdLocations';
import './ChatWidget.css';

const FB_PAGE_ID = '100063541603515';
const MESSENGER_URL = `https://m.me/${FB_PAGE_ID}?ref=ai_chat_hub`;
const WHATSAPP_URL = 'https://wa.me/8801824950082';
const HELPLINE_PHONE = '01857045449';
const BKASH_NUMBER = '01857045449';

// Core Categories & Subcategories Taxonomy
const CATEGORIES_TAXONOMY = [
  {
    id: 'Women',
    name: 'মেয়েদের কালেকশন',
    nameEn: 'Women Collection',
    icon: '👗',
    subcategories: [
      { id: 'SAREE', name: 'শাড়ি কালেকশন', query: 'saree' },
      { id: 'THREE_PIECE', name: 'থ্রি-পিস (Three Piece)', query: 'three piece' },
      { id: 'KURTI', name: 'কুর্তি ও টিউনিকা', query: 'kurti' },
      { id: 'BORKA', name: 'বোরকা ও আবায়া', query: 'borka' },
      { id: 'WESTERN', name: 'ওয়েস্টার্ন ২-পিস', query: 'western' },
      { id: 'LEHENGA', name: 'লেহেঙ্গা ও গাউন', query: 'lehenga' }
    ]
  },
  {
    id: 'Men',
    name: 'ছেলেদের কালেকশন',
    nameEn: 'Men Collection',
    icon: '👔',
    subcategories: [
      { id: 'PANJABI', name: 'প্রিমিয়াম পাঞ্জাবি', query: 'panjabi' },
      { id: 'KABLI', name: 'কাবলি সেট', query: 'kabli' },
      { id: 'SHIRT', name: 'ফরমাল ও ক্যাজুয়াল শার্ট', query: 'shirt' },
      { id: 'POLO', name: 'পোলো ও টি-শার্ট', query: 'polo' },
      { id: 'PANTS', name: 'প্যান্ট ও পায়জামা', query: 'pants' }
    ]
  },
  {
    id: 'Kids (Boys)',
    name: 'বাচ্চাদের (ছেলে)',
    nameEn: 'Kids (Boys)',
    icon: '👦',
    subcategories: [
      { id: 'KIDS_PANJABI', name: 'কিডস পাঞ্জাবি সেট', query: 'kids panjabi' },
      { id: 'KIDS_SHIRT', name: 'শার্ট ও জিন্স সেট', query: 'kids shirt' },
      { id: 'BABA_SUIT', name: 'বাবা স্যুট কালেকশন', query: 'baba suit' }
    ]
  },
  {
    id: 'Kids (Girls)',
    name: 'বাচ্চাদের (মেয়ে)',
    nameEn: 'Kids (Girls)',
    icon: '👧',
    subcategories: [
      { id: 'KIDS_FROCK', name: 'ফ্রক ও পার্টি ড্রেস', query: 'frock' },
      { id: 'KIDS_THREE_PIECE', name: 'কিডস থ্রি-পিস', query: 'kids three piece' },
      { id: 'KIDS_LEHENGA', name: 'কিডস লেহেঙ্গা', query: 'kids lehenga' }
    ]
  },
  {
    id: 'Biyer Sajani',
    name: 'বিয়ের সাজনি (Bridal)',
    nameEn: 'Biyer Sajani (Bridal)',
    icon: '👰',
    subcategories: [
      { id: 'KARCHUPI_JAMDANI', name: 'কারচুপি জামদানি', query: 'karchupi' },
      { id: 'KATAN_SILK', name: 'কাতান ও বেনারসি সিল্ক', query: 'katan' },
      { id: 'BRIDAL_SAREE', name: 'এক্সক্লুসিভ ব্রাইডাল শাড়ি', query: 'bridal' },
      { id: 'SHERWANI', name: 'বরের শেরওয়ানি ও স্যুট', query: 'sherwani' }
    ]
  }
];

// Quick Info / Policy Cards
const QUICK_INFO_TOPICS = [
  { id: 'delivery', label: 'ডেলিভারি চার্জ ও সময়', icon: <Truck size={14} className="text-[#ce112d]" />, query: 'delivery charge' },
  { id: 'return', label: 'রিটার্ন ও এক্সচেঞ্জ পলিসি', icon: <RotateCcw size={14} className="text-amber-600" />, query: 'return policy' },
  { id: 'size', label: 'সাইজ গাইড ও মেজারমেন্ট', icon: <Ruler size={14} className="text-blue-600" />, query: 'size guide' },
  { id: 'payment', label: 'পেমেন্ট ও অগ্রিম পদ্ধতি', icon: <CreditCard size={14} className="text-emerald-600" />, query: 'payment method' },
  { id: 'location', label: 'শোরুম লোকেশন ও সময়', icon: <Store size={14} className="text-purple-600" />, query: 'showroom location' }
];

export default function ChatWidget() {
  const { addToCart } = useCart();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [copiedNumber, setCopiedNumber] = useState(false);
  
  // In-Chat Active Order State
  const [orderModalProduct, setOrderModalProduct] = useState(null);
  const [orderForm, setOrderForm] = useState({
    name: '',
    phone: '',
    district: CHATTOGRAM_DISTRICT,
    upazila: FREE_UPAZILA,
    address: '',
    size: '',
    color: '',
    quantity: 1,
    senderNumber: '',
    notes: ''
  });
  const [orderStep, setOrderStep] = useState('details'); // 'details' | 'payment' | 'submitting'
  const [orderError, setOrderError] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const getAssistantEndpoint = () => {
    if (!API_URL || API_URL === '/') return '/api/assistant';
    return `${API_URL.replace(/\/$/, '')}/api/assistant`;
  };

  const [sessionId] = useState(() => {
    let saved = localStorage.getItem('bb_ai_session_id');
    if (!saved) {
      saved = 'session-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
      localStorage.setItem('bb_ai_session_id', saved);
    }
    return saved;
  });

  const getWelcomeMessage = () => ({
    id: 'welcome-' + Date.now(),
    role: 'assistant',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    content: "আসসালামু আলাইকুম! **Big Bazar AI Shopping Assistant**-এ আপনাকে স্বাগতম। 🛍️\n\nআপনি কী ধরনের পোশাক দেখতে চান বা কী তথ্য জানতে চান? নিচে আমাদের কালেকশন বা হেল্প অপশন থেকে বেছে নিন অথবা সরাসরি লিখে জানান:",
    type: 'welcome',
    products: []
  });

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([getWelcomeMessage()]);
    }
  }, [messages.length]);

  useEffect(() => {
    if (isOpen) {
      const prevStyle = document.body.style.overflow;
      if (window.innerWidth < 640) {
        document.body.style.overflow = 'hidden';
      }
      setTimeout(() => inputRef.current?.focus(), 300);
      return () => {
        document.body.style.overflow = prevStyle;
      };
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading, selectedCategory, orderModalProduct]);

  const handleMessengerClick = () => {
    trackMessengerClick();
    window.open(MESSENGER_URL, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsAppClick = () => {
    window.open(WHATSAPP_URL, '_blank', 'noopener,noreferrer');
  };

  const handleResetChat = () => {
    setSelectedCategory(null);
    setOrderModalProduct(null);
    setMessages([getWelcomeMessage()]);
  };

  const handleCopyNumber = (num) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  // Calculate delivery charge based on district & upazila
  const calculateDelivery = (district, upazila) => {
    if (district === CHATTOGRAM_DISTRICT && upazila === FREE_UPAZILA) {
      return { charge: 0, isFree: true, note: 'মীরসরাইয়ে ফ্রি ডেলিভারি (১০০ টাকা কনফার্মেশন ফি অগ্রিম, যা মোট বিল থেকে বাদ যাবে)' };
    }
    if (district === CHATTOGRAM_DISTRICT) {
      return { charge: 100, isFree: false, note: 'চট্টগ্রাম জেলা ডেলিভারি চার্জ ১০০ টাকা (১-২ দিন)' };
    }
    return { charge: 150, isFree: false, note: 'সারা বাংলাদেশ ডেলিভারি চার্জ ১৫০ টাকা (২-৫ দিন)' };
  };

  const handleSendMessage = async (textToSend, options = {}) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    if (text.includes('মেসেঞ্জার') || text.includes('Messenger')) {
      handleMessengerClick();
      return;
    }
    if (text.includes('হোয়াটসঅ্যাপ') || text.includes('WhatsApp')) {
      handleWhatsAppClick();
      return;
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: 'msg-' + Date.now(), role: 'user', content: text, timestamp: timeStr };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const endpoint = getAssistantEndpoint();
      const headers = { 'Content-Type': 'application/json' };
      const token = getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const payload = {
        session_id: sessionId,
        message: text,
        language: 'bn',
        offset: options.offset || 0,
        category_query: options.category_query || null
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      const assistantMsg = {
        id: 'reply-' + Date.now(),
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: data.reply || "আমি বুঝতে পেরেছি! আর কীভাবে আপনাকে সহায়তা করতে পারি?",
        products: data.products || [],
        total_count: data.total_count || 0,
        has_more: data.has_more || false,
        current_offset: data.current_offset || 0,
        category_query: data.category_query || '',
        quick_replies: data.quick_replies || [],
        handoff: data.handoff || false
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: "সাময়িক সমস্যার কারণে উত্তর পেতে দেরি হচ্ছে। সরাসরি আমাদের সাথে WhatsApp বা ফোনে যোগাযোগ করতে পারেন।",
          products: [],
          handoff: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger conversational ordering flow for a specific product
  const startInChatOrder = (product) => {
    const initialColor = product.available_colors?.[0]?.name || (typeof product.available_colors?.[0] === 'string' ? product.available_colors[0] : '');
    const initialSize = product.available_sizes?.[0] || '';
    
    setOrderModalProduct(product);
    setOrderForm({
      name: '',
      phone: '',
      district: CHATTOGRAM_DISTRICT,
      upazila: FREE_UPAZILA,
      address: '',
      size: initialSize,
      color: initialColor,
      quantity: 1,
      senderNumber: '',
      notes: ''
    });
    setOrderStep('details');
    setOrderError('');
  };

  // Submit in-chat order to database
  const handleCompleteOrder = async () => {
    if (!orderForm.name.trim()) {
      setOrderError('অনুগ্রহ করে আপনার পুরো নাম লিখুন।');
      return;
    }
    const cleanPhone = orderForm.phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 11) {
      setOrderError('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।');
      return;
    }
    if (!orderForm.address.trim()) {
      setOrderError('অনুগ্রহ করে বিস্তারিত ডেলিভারি ঠিকানা দিন।');
      return;
    }
    if (orderStep === 'payment' && !orderForm.senderNumber.trim()) {
      setOrderError('অনুগ্রহ করে যে নম্বর থেকে টাকা পাঠিয়েছেন তা লিখুন।');
      return;
    }

    if (orderStep === 'details') {
      setOrderError('');
      setOrderStep('payment');
      return;
    }

    // Submit Order
    setIsLoading(true);
    setOrderStep('submitting');
    setOrderError('');

    const deliveryInfo = calculateDelivery(orderForm.district, orderForm.upazila);
    const productPrice = parseFloat(orderModalProduct.price) || 0;
    const subtotal = productPrice * orderForm.quantity;
    const totalAmount = subtotal + deliveryInfo.charge;

    const orderPayload = {
      product_id: orderModalProduct.id,
      product_name: orderModalProduct.name,
      product_price: productPrice,
      customer_name: orderForm.name.trim(),
      customer_phone: cleanPhone,
      customer_address: `${orderForm.address.trim()}, ${orderForm.upazila}, ${orderForm.district}`,
      delivery_area: orderForm.district === CHATTOGRAM_DISTRICT ? (orderForm.upazila === FREE_UPAZILA ? 'mirsarai' : 'chittagong') : 'outside',
      delivery_charge: deliveryInfo.charge,
      total_amount: totalAmount,
      last_four_digits: orderForm.senderNumber.trim(),
      status: 'Pending',
      size: orderForm.size || null,
      color: orderForm.color || null,
      is_advance_paid: true,
      payment_status: 'Advance Paid',
      items: [{
        id: orderModalProduct.id,
        quantity: orderForm.quantity,
        selectedColor: orderForm.color || null,
        selectedSize: orderForm.size || null
      }]
    };

    try {
      const orderEndpoint = (!API_URL || API_URL === '/') ? '/api/orders' : `${API_URL.replace(/\/$/, '')}/api/orders`;
      const res = await fetch(orderEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      const data = await res.json();

      if (data.success || data.order_id) {
        const confirmedId = data.order_id || 'BB-' + Math.floor(100000 + Math.random() * 900000);
        
        // Add order confirmation message to chat
        const successMessage = {
          id: 'order-success-' + Date.now(),
          role: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'order_success',
          orderData: {
            orderId: confirmedId,
            product: orderModalProduct,
            form: orderForm,
            deliveryInfo,
            totalAmount
          }
        };

        setMessages(prev => [...prev, successMessage]);
        setOrderModalProduct(null);
      } else {
        setOrderError(data.error || 'অর্ডার সাবমিট করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
        setOrderStep('payment');
      }
    } catch (err) {
      console.error('Order submission error:', err);
      setOrderError('সার্ভারে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে WhatsApp-এ সরাসরি যোগাযোগ করুন।');
      setOrderStep('payment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger FAB Button - Light Theme with Crimson Accent */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="chat-widget-fab bg-white text-zinc-900 px-4 py-3 sm:px-5 sm:py-3.5 rounded-full flex items-center gap-3 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border border-zinc-200/80 group"
          aria-label="Open Big Bazar Shopping Assistant"
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#ce112d] text-white shadow-md group-hover:rotate-12 transition-transform">
            <Sparkles size={16} className="text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-black tracking-tight leading-none text-zinc-900">
              AI শপিং সহকারী
            </span>
            <span className="text-[10px] font-bold text-[#ce112d] leading-none mt-1">
              Big Bazar Assistant
            </span>
          </div>
        </button>
      )}

      {/* Backdrop overlay for Mobile */}
      {isOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[1018] transition-opacity animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Chat Panel Container - Clean Modern Light Theme */}
      {isOpen && (
        <div className="chat-panel-container flex flex-col bg-white text-zinc-900 border border-zinc-200 shadow-2xl overflow-hidden font-sans">
          
          {/* Header */}
          <div className="px-4 py-3.5 bg-white/95 border-b border-zinc-100 flex items-center justify-between gap-2 shrink-0 backdrop-blur-md z-10">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-br from-[#ce112d] to-[#990017] flex items-center justify-center text-white shadow-sm shrink-0">
                <Sparkles size={18} />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black italic tracking-tighter leading-none">
                    <span className="text-[#ce112d]">BIG</span>
                    <span className="text-zinc-900 ml-0.5">BAZAR</span>
                  </h3>
                  <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-red-50 text-[#ce112d] border border-red-100">
                    AI PRO
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 font-medium truncate mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping" />
                  <span>স্মার্ট শপিং সহকারী • অ্যাক্টিভ</span>
                </p>
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleWhatsAppClick}
                title="WhatsApp এ কথা বলুন"
                className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 active:scale-95 transition-all"
              >
                <MessageCircle size={16} />
              </button>
              <button
                onClick={handleResetChat}
                title="চ্যাট ক্লিয়ার করুন"
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 active:scale-95 transition-all"
              >
                <RefreshCw size={15} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 active:scale-95 transition-all ml-0.5"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Canvas */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70 chat-scrollbar">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-message-in`}
              >
                {/* Assistant Message Bubble */}
                {msg.role === 'assistant' && (
                  <div className="max-w-[92%] space-y-3">
                    <div className="bg-white border border-slate-200/80 text-zinc-800 p-3.5 rounded-2xl rounded-tl-sm shadow-sm text-xs leading-relaxed font-medium">
                      {msg.type === 'order_success' ? (
                        /* Order Success Summary Card */
                        <div className="space-y-3 text-zinc-800">
                          <div className="flex items-center gap-2 text-emerald-600 font-black text-sm pb-2 border-b border-zinc-100">
                            <CheckCircle size={20} className="shrink-0" />
                            <span>অর্ডার সফলভাবে গৃহীত হয়েছে!</span>
                          </div>

                          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-zinc-500 font-bold">অর্ডার আইডি:</span>
                              <span className="font-mono font-black text-emerald-700">#{msg.orderData.orderId.slice(0, 8)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500 font-bold">পণ্য:</span>
                              <span className="font-bold text-zinc-800 truncate max-w-[170px]">{msg.orderData.product.name}</span>
                            </div>
                            {msg.orderData.form.size && (
                              <div className="flex justify-between">
                                <span className="text-zinc-500">সাইজ:</span>
                                <span className="font-bold">{msg.orderData.form.size}</span>
                              </div>
                            )}
                            {msg.orderData.form.color && (
                              <div className="flex justify-between">
                                <span className="text-zinc-500">কালার:</span>
                                <span className="font-bold">{msg.orderData.form.color}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-zinc-500">পরিমাণ:</span>
                              <span className="font-bold">{msg.orderData.form.quantity} টি</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-emerald-200/60 font-black text-zinc-900">
                              <span>সর্বমোট বিল:</span>
                              <span className="text-[#ce112d]">৳{msg.orderData.totalAmount}</span>
                            </div>
                          </div>

                          <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100 text-[11px] leading-relaxed text-amber-900 font-semibold">
                            💬 <strong>বিগ বাজার টিম থেকে খুব শীঘ্রই আপনার সাথে ফোনে যোগাযোগ করা হবে।</strong> অনুগ্রহ করে আপনার মোবাইল নম্বরটি এক্টিভ রাখবেন।
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={handleResetChat}
                              className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 text-white text-center font-bold text-xs hover:bg-zinc-800 transition-all shadow-sm"
                            >
                              আরও শপিং করুন
                            </button>
                            <button
                              onClick={handleWhatsAppClick}
                              className="py-2 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition-all shadow-sm"
                            >
                              <MessageCircle size={14} /> WhatsApp
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Standard Text Message with Markdown line breaks */
                        <div className="space-y-2 whitespace-pre-line">
                          {msg.content}
                        </div>
                      )}
                    </div>

                    {/* Welcoming Interactive Category Grid */}
                    {msg.type === 'welcome' && (
                      <div className="space-y-3 pt-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block px-1">
                          ক্যাটাগরি অনুযায়ী দেখুন
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {CATEGORIES_TAXONOMY.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => {
                                setSelectedCategory(cat);
                                handleSendMessage(`${cat.name} দেখতে চাই`);
                              }}
                              className="p-2.5 bg-white hover:bg-red-50/50 hover:border-[#ce112d]/40 border border-zinc-200/80 rounded-2xl text-left transition-all group flex items-center gap-2.5 shadow-sm active:scale-95"
                            >
                              <span className="text-lg group-hover:scale-110 transition-transform">{cat.icon}</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-zinc-800 group-hover:text-[#ce112d] transition-colors leading-tight truncate">
                                  {cat.name}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Quick Policy / Info Chips */}
                        <div className="pt-2">
                          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block px-1 mb-2">
                            প্রয়োজনীয় তথ্য ও সেবা
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {QUICK_INFO_TOPICS.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => handleSendMessage(item.label)}
                                className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 hover:text-zinc-900 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                              >
                                {item.icon}
                                <span>{item.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Subcategories Pills if Category is active */}
                    {selectedCategory && (
                      <div className="p-3 bg-white rounded-2xl border border-zinc-200/80 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-black text-zinc-700 flex items-center gap-1">
                            <span>{selectedCategory.icon}</span>
                            <span>{selectedCategory.name} সাব-ক্যাটাগরি:</span>
                          </p>
                          <button
                            onClick={() => setSelectedCategory(null)}
                            className="text-[10px] text-zinc-400 hover:text-zinc-600 font-bold underline"
                          >
                            বন্ধ করুন
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedCategory.subcategories.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => handleSendMessage(`${sub.name} কালেকশন দেখান`, { category_query: sub.query })}
                              className="px-2.5 py-1 bg-red-50/80 hover:bg-[#ce112d] text-[#ce112d] hover:text-white border border-red-200 hover:border-[#ce112d] rounded-lg text-[11px] font-bold transition-all active:scale-95"
                            >
                              {sub.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Product Cards Carousel / Grid inside Chat */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="space-y-2.5 pt-1 w-full">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                            পণ্য তালিকা ({msg.products.length} টি)
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          {msg.products.map((p) => (
                            <div
                              key={p.id}
                              className="p-2.5 bg-white border border-zinc-200/90 rounded-2xl flex gap-3 shadow-xs hover:shadow-md transition-all group"
                            >
                              <div className="w-16 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0 relative border border-zinc-100">
                                <img
                                  src={getOptimizedUrl(p.image_url || p.images?.[0], { w: 120, h: 150 })}
                                  alt={p.name}
                                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform"
                                  onError={(e) => { e.target.src = 'https://placehold.co/120x150/ffffff/ce112d?text=BigBazar'; }}
                                />
                              </div>

                              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                <div>
                                  <h4 className="text-xs font-bold text-zinc-900 truncate group-hover:text-[#ce112d] transition-colors">
                                    {p.name}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-black text-[#ce112d]">
                                      ৳{p.price}
                                    </span>
                                    {p.original_price && p.original_price > p.price && (
                                      <span className="text-[10px] text-zinc-400 line-through">
                                        ৳{p.original_price}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 mt-2">
                                  <button
                                    onClick={() => startInChatOrder(p)}
                                    className="flex-1 py-1.5 px-2 bg-[#ce112d] hover:bg-[#b30e25] text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
                                  >
                                    <ShoppingBag size={11} /> অর্ডার করুন
                                  </button>
                                  <a
                                    href={`/product/${p.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all"
                                    title="বিস্তারিত দেখুন"
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Replies Pills */}
                    {msg.quick_replies && msg.quick_replies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.quick_replies.map((reply, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendMessage(reply)}
                            className="px-3 py-1 bg-white hover:bg-red-50 text-zinc-700 hover:text-[#ce112d] border border-zinc-200/80 rounded-full text-[11px] font-bold transition-all shadow-2xs active:scale-95"
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* User Message Bubble */}
                {msg.role === 'user' && (
                  <div className="max-w-[85%] bg-zinc-900 text-white p-3 rounded-2xl rounded-tr-sm shadow-sm text-xs leading-relaxed font-medium">
                    {msg.content}
                  </div>
                )}

                <span className="text-[9px] text-zinc-400 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* In-Chat Interactive Order Form Wizard */}
            {orderModalProduct && (
              <div className="bg-white border-2 border-[#ce112d]/30 rounded-2xl p-3.5 shadow-lg space-y-3 animate-message-in">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                  <div className="flex items-center gap-1.5 text-xs font-black text-zinc-900">
                    <ShoppingBag size={14} className="text-[#ce112d]" />
                    <span>অর্ডার কনফার্মেশন</span>
                  </div>
                  <button
                    onClick={() => setOrderModalProduct(null)}
                    className="text-zinc-400 hover:text-zinc-600 p-1"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Selected Product Summary */}
                <div className="flex gap-2.5 p-2 bg-slate-50 rounded-xl border border-zinc-100">
                  <img
                    src={getOptimizedUrl(orderModalProduct.image_url || orderModalProduct.images?.[0], { w: 80, h: 100 })}
                    alt=""
                    className="w-12 h-14 object-cover rounded-lg shrink-0 border border-zinc-200"
                  />
                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <h5 className="text-xs font-bold text-zinc-900 truncate">{orderModalProduct.name}</h5>
                    <p className="text-xs font-black text-[#ce112d] mt-0.5">৳{orderModalProduct.price}</p>
                  </div>
                </div>

                {orderStep === 'details' ? (
                  /* Step 1: Customer & Product Options Form */
                  <div className="space-y-2.5 text-xs">
                    {/* Size Selector */}
                    {orderModalProduct.available_sizes && orderModalProduct.available_sizes.length > 0 && (
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 block mb-1">সাইজ নির্বাচন করুন:</label>
                        <div className="flex flex-wrap gap-1.5">
                          {orderModalProduct.available_sizes.map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => setOrderForm(prev => ({ ...prev, size: sz }))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                orderForm.size === sz
                                  ? 'bg-zinc-900 text-white'
                                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                              }`}
                            >
                              {sz}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Color Selector */}
                    {orderModalProduct.available_colors && orderModalProduct.available_colors.length > 0 && (
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 block mb-1">কালার নির্বাচন করুন:</label>
                        <div className="flex flex-wrap gap-1.5">
                          {orderModalProduct.available_colors.map((c, i) => {
                            const colorName = typeof c === 'string' ? c : (c.name || `Color ${i+1}`);
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setOrderForm(prev => ({ ...prev, color: colorName }))}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                  orderForm.color === colorName
                                    ? 'bg-[#ce112d] text-white'
                                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                                }`}
                              >
                                {colorName}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Customer Inputs */}
                    <div className="space-y-2 pt-1">
                      <input
                        type="text"
                        placeholder="আপনার পুরো নাম *"
                        value={orderForm.name}
                        onChange={e => setOrderForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#ce112d]"
                      />
                      <input
                        type="tel"
                        placeholder="মোবাইল নম্বর (১১ ডিজিট) *"
                        value={orderForm.phone}
                        onChange={e => setOrderForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#ce112d]"
                      />
                      
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={orderForm.district}
                          onChange={e => {
                            const newDist = e.target.value;
                            setOrderForm(prev => ({
                              ...prev,
                              district: newDist,
                              upazila: newDist === CHATTOGRAM_DISTRICT ? FREE_UPAZILA : 'সদর'
                            }));
                          }}
                          className="w-full px-2.5 py-2 bg-slate-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#ce112d]"
                        >
                          {allDistricts.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>

                        {orderForm.district === CHATTOGRAM_DISTRICT ? (
                          <select
                            value={orderForm.upazila}
                            onChange={e => setOrderForm(prev => ({ ...prev, upazila: e.target.value }))}
                            className="w-full px-2.5 py-2 bg-slate-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#ce112d]"
                          >
                            {chattogramUpazilas.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="উপজেলা / থানা"
                            value={orderForm.upazila}
                            onChange={e => setOrderForm(prev => ({ ...prev, upazila: e.target.value }))}
                            className="w-full px-2.5 py-2 bg-slate-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#ce112d]"
                          />
                        )}
                      </div>

                      <textarea
                        rows={2}
                        placeholder="বিস্তারিত ঠিকানা (বাসা/রোড/এলাকা) *"
                        value={orderForm.address}
                        onChange={e => setOrderForm(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#ce112d] resize-none"
                      />
                    </div>

                    {orderError && (
                      <p className="text-[11px] font-bold text-red-600 bg-red-50 p-2 rounded-lg">
                        {orderError}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleCompleteOrder}
                      className="w-full py-2.5 bg-[#ce112d] hover:bg-[#b30e25] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      পরবর্তী ধাপ: পেমেন্ট তথ্য <ChevronRight size={14} />
                    </button>
                  </div>
                ) : (
                  /* Step 2: Advance Payment Instructions & Sender Number */
                  <div className="space-y-3 text-xs">
                    {(() => {
                      const deliveryInfo = calculateDelivery(orderForm.district, orderForm.upazila);
                      const subtotal = (parseFloat(orderModalProduct.price) || 0) * orderForm.quantity;
                      const advanceCharge = deliveryInfo.charge > 0 ? deliveryInfo.charge : 100;
                      return (
                        <>
                          <div className="p-3 bg-red-50/70 border border-red-200/80 rounded-xl space-y-1.5">
                            <div className="flex justify-between items-center text-zinc-700 font-bold">
                              <span>পণ্য মূল্য:</span>
                              <span>৳{subtotal}</span>
                            </div>
                            <div className="flex justify-between items-center text-zinc-700 font-bold">
                              <span>ডেলিভারি চার্জ:</span>
                              <span>{deliveryInfo.isFree ? '৳০ (ফ্রি)' : `৳${deliveryInfo.charge}`}</span>
                            </div>
                            <div className="flex justify-between items-center pt-1.5 border-t border-red-200 font-black text-sm text-[#ce112d]">
                              <span>সর্বমোট বিল:</span>
                              <span>৳{subtotal + deliveryInfo.charge}</span>
                            </div>
                          </div>

                          <div className="p-3 bg-zinc-900 text-white rounded-xl space-y-2 shadow-inner">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                                বিকাশ / নগদ সেন্ড মানি
                              </span>
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-md">
                                অগ্রিম: ৳{advanceCharge}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between bg-zinc-800/90 p-2.5 rounded-lg border border-zinc-700">
                              <span className="font-mono text-sm font-black text-amber-400 tracking-wider">
                                {BKASH_NUMBER}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyNumber(BKASH_NUMBER)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-md text-[10px] font-bold transition-all"
                              >
                                {copiedNumber ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                <span>{copiedNumber ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                              </button>
                            </div>

                            <p className="text-[10px] text-zinc-400 leading-tight">
                              * অর্ডার কনফার্মেশনের জন্য অগ্রিম ৳{advanceCharge} পাঠিয়ে নিচের বক্সে প্রেরকের নম্বরটি দিন।
                            </p>
                          </div>

                          <input
                            type="tel"
                            placeholder="যে নম্বর থেকে টাকা পাঠিয়েছেন (প্রেরকের নম্বর) *"
                            value={orderForm.senderNumber}
                            onChange={e => setOrderForm(prev => ({ ...prev, senderNumber: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#ce112d]"
                          />

                          {orderError && (
                            <p className="text-[11px] font-bold text-red-600 bg-red-50 p-2 rounded-lg">
                              {orderError}
                            </p>
                          )}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setOrderStep('details')}
                              className="px-3 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition-all"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={handleCompleteOrder}
                              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle size={14} /> অর্ডার নিশ্চিত করুন
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Assistant Typing Indicator */}
            {isLoading && !orderModalProduct && (
              <div className="flex items-center gap-2 p-3 bg-white border border-zinc-200 rounded-2xl rounded-tl-sm w-20 shadow-xs">
                <span className="w-2 h-2 bg-[#ce112d] rounded-full typing-dot" />
                <span className="w-2 h-2 bg-[#ce112d] rounded-full typing-dot" />
                <span className="w-2 h-2 bg-[#ce112d] rounded-full typing-dot" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Area */}
          <div className="p-3 bg-white border-t border-zinc-100 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="পোশাক বা অর্ডার সম্পর্কে লিখুন..."
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-zinc-200 rounded-2xl text-xs font-medium focus:outline-none focus:border-[#ce112d] focus:bg-white transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="w-10 h-10 bg-[#ce112d] hover:bg-[#b30e25] text-white rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:pointer-events-none shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium px-1 mt-2">
              <span>জরুরি সাহায্য: <a href={`tel:${HELPLINE_PHONE}`} className="text-zinc-600 hover:text-[#ce112d] font-bold">{HELPLINE_PHONE}</a></span>
              <span>Big Bazar AI • 24/7</span>
            </div>
          </div>

        </div>
      )}
    </>
  );
}
