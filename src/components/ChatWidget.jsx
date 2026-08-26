import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Send, ShoppingBag, Sparkles, ChevronRight, 
  ShoppingCart, ExternalLink, RefreshCw, 
  ShieldCheck, CheckCircle, Package, ArrowRight, Tag, Layers,
  Phone, Copy, Check, Info, HelpCircle, Truck, RotateCcw,
  Ruler, CreditCard, MapPin, Store, ChevronLeft, AlertCircle,
  Shirt, User, Users
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import { API_URL, getToken, bigBazarApi } from '../api/client';
import { allDistricts, chattogramUpazilas, FREE_UPAZILA, CHATTOGRAM_DISTRICT } from '../data/bdLocations';
import { TOP_CATEGORIES, getSubcategoriesForCategory } from '../data/categories';
import './ChatWidget.css';

const BKASH_NUMBER = '01857045449';

// Quick Info / Policy Cards (Zero Emojis, Clean Lucide Icons)
const QUICK_INFO_TOPICS = [
  { id: 'delivery', label: 'ডেলিভারি চার্জ ও সময়', icon: <Truck size={14} className="text-[#ce112d]" />, query: 'delivery charge' },
  { id: 'size', label: 'সাইজ গাইড ও মেজারমেন্ট', icon: <Ruler size={14} className="text-zinc-600" />, query: 'size guide' },
  { id: 'payment', label: 'পেমেন্ট ও অগ্রিম পদ্ধতি', icon: <CreditCard size={14} className="text-zinc-600" />, query: 'payment method' },
  { id: 'location', label: 'শোরুম লোকেশন ও সময়', icon: <Store size={14} className="text-zinc-600" />, query: 'showroom location' }
];

export default function ChatWidget() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [subcategoriesData, setSubcategoriesData] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  const [loadingMoreMsgId, setLoadingMoreMsgId] = useState(null);
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

  // Fetch dynamic active subcategories from site_settings
  useEffect(() => {
    const fetchSubcategories = async () => {
      try {
        const { data, error } = await bigBazarApi.from('site_settings').select('*');
        if (!error && data) {
          const isArray = Array.isArray(data);
          const subcats = isArray 
            ? data.find(s => s.key === 'subcategories')?.value 
            : data.subcategories;
          let parsedSubcats = subcats;
          if (typeof parsedSubcats === 'string') {
            try { parsedSubcats = JSON.parse(parsedSubcats); } catch (_) {}
          }
          if (parsedSubcats && typeof parsedSubcats === 'object') {
            setSubcategoriesData(parsedSubcats);
          }
        }
      } catch (_) {}
    };
    fetchSubcategories();
  }, []);

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
    content: "আসসালামু আলাইকুম। Big Bazar শপিং অ্যাসিস্ট্যান্টে স্বাগতম। আপনি কোন ক্যাটাগরির কালেকশন দেখতে চান বা কী জানতে চান?",
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
      return { charge: 0, isFree: true, note: 'মীরসরাই উপজেলায় ফ্রি ডেলিভারি (১০০ টাকা কনফার্মেশন ফি অগ্রিম, যা মোট বিল থেকে বাদ যাবে)' };
    }
    if (district === CHATTOGRAM_DISTRICT) {
      return { charge: 100, isFree: false, note: 'চট্টগ্রাম জেলা ডেলিভারি চার্জ ১০০ টাকা (১-২ দিন)' };
    }
    return { charge: 150, isFree: false, note: 'সারা বাংলাদেশ ডেলিভারি চার্জ ১৫০ টাকা (২-৫ দিন)' };
  };

  const handleSendMessage = async (textToSend, options = {}) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

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
        category_query: options.category_query || null,
        current_product: activeProduct || orderModalProduct || options.current_product || null
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.order_intent && data.order_intent.product) {
        startInChatOrder(data.order_intent.product, data.order_intent.quantity || 1);
      }

      const assistantMsg = {
        id: 'reply-' + Date.now(),
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: data.reply || "আমি বুঝতে পেরেছি। আর কীভাবে সহায়তা করতে পারি?",
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
          content: "সাময়িক সংযোগে সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন বা হেল্পলাইনে কল দিন।",
          products: [],
          handoff: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Seamlessly load 5 more products and append directly to the existing collection list
  const handleLoadMoreProducts = async (msgId, categoryQuery, currentCount) => {
    if (loadingMoreMsgId) return;
    setLoadingMoreMsgId(msgId);

    try {
      const endpoint = getAssistantEndpoint();
      const headers = { 'Content-Type': 'application/json' };
      const token = getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const payload = {
        session_id: sessionId,
        message: 'আরও কালেকশন দেখাও',
        language: 'bn',
        offset: currentCount,
        category_query: categoryQuery || null
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.products && data.products.length > 0) {
        setMessages(prev => prev.map(m => {
          if (m.id === msgId) {
            const existingIds = new Set((m.products || []).map(p => p.id));
            const freshProducts = data.products.filter(p => !existingIds.has(p.id));
            return {
              ...m,
              products: [...(m.products || []), ...freshProducts],
              has_more: data.has_more,
              total_count: data.total_count
            };
          }
          return m;
        }));
      } else {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, has_more: false } : m));
      }
    } catch (err) {
      console.error('Failed to load more collection:', err);
    } finally {
      setLoadingMoreMsgId(null);
    }
  };

  const getSubcategories = (catId) => {
    let dynamic = subcategoriesData?.[catId];
    if (typeof dynamic === 'string') {
      try { dynamic = JSON.parse(dynamic); } catch (_) {}
    }
    if (Array.isArray(dynamic) && dynamic.length > 0) {
      return dynamic.map(s => ({
        id: s.id || s.name_en || s.name || '',
        name: s.name_bn || s.bn || s.name || s.name_en || s.id
      })).filter(s => s.id && s.name);
    }
    return [];
  };

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    const subs = getSubcategories(cat.id);

    const userMsg = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: `${cat.bn} কালেকশন`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (subs.length > 0) {
      const assistantMsg = {
        id: 'subcats-' + Date.now(),
        role: 'assistant',
        type: 'subcategory_picker',
        category: cat,
        subcategories: subs,
        content: `${cat.bn} কালেকশনের কোন ধরনের পোশাক দেখতে চান? নিচের সাব-ক্যাটাগরি বেছে নিন:`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, userMsg, assistantMsg]);
    } else {
      const assistantMsg = {
        id: 'subcats-empty-' + Date.now(),
        role: 'assistant',
        content: `আমাদের শপে এই মুহূর্তে ${cat.bn} বিভাগের অনলাইন কালেকশন আপডেট করা হচ্ছে। খুব শীঘ্রই নতুন কালেকশন যুক্ত করা হবে। আপনি আমাদের শোরুমে (২য় তলা, জমিদারের প্লাজা, বারইয়ারহাট) সরাসরি ভিজিট করে পণ্যগুলো নিতে পারবেন অথবা অন্য কোনো কালেকশন দেখতে পারেন।`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, userMsg, assistantMsg]);
    }
  };

  const handleSelectSubcategory = (cat, sub) => {
    const subName = sub.name || sub.id;
    handleSendMessage(`${subName} কালেকশন দেখাও`, {
      category_query: sub.id || subName
    });
  };

  // Trigger conversational ordering flow for a specific product
  const startInChatOrder = (product, customQuantity = 1) => {
    setActiveProduct(product);
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
      quantity: Math.max(1, customQuantity || 1),
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
      setOrderError('সার্ভারে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
      setOrderStep('payment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger FAB Button - Minimalist Clean Light Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="chat-widget-fab bg-white text-zinc-900 px-4 py-3 sm:px-4.5 sm:py-3.5 rounded-full flex items-center gap-2.5 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 border border-zinc-200"
          aria-label="Open Big Bazar Shopping Assistant"
        >
          <div className="w-7 h-7 rounded-full bg-[#ce112d] flex items-center justify-center text-white shrink-0">
            <Sparkles size={14} />
          </div>
          <span className="text-xs font-bold text-zinc-900 leading-none">
            শপিং সহকারী
          </span>
        </button>
      )}

      {/* Backdrop overlay for Mobile */}
      {isOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-[1045] transition-opacity animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Chat Panel Container - Strict Pure Light Theme */}
      {isOpen && (
        <div className="chat-panel-container flex flex-col bg-white text-zinc-900 border border-zinc-200 shadow-2xl overflow-hidden font-sans">
          
          {/* Mobile Sheet Drag Handle Bar */}
          <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto my-1.5 sm:hidden shrink-0" />

          {/* Header - Ultra Modern Minimalist with Clear Website Branding */}
          <div className="px-4 py-2.5 sm:py-3 bg-white border-b border-zinc-100 flex items-center justify-between gap-2 shrink-0 z-10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#ce112d] shrink-0">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black italic tracking-tight leading-none brand-logo">
                  <span className="text-[#ce112d]">BIG</span>
                  <span className="text-zinc-900 ml-0.5">BAZAR</span>
                </h3>
                <p className="text-[10px] text-zinc-500 font-bold mt-1 leading-none">
                  শপিং সহকারী
                </p>
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleResetChat}
                title="চ্যাট রিসেট করুন"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 active:scale-95 transition-all"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="বন্ধ করুন"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 active:scale-95 transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Canvas - Strict Light Theme */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-canvas-bg chat-scrollbar bg-[#f8fafc]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-message-in`}
              >
                {/* Assistant Message Bubble */}
                {msg.role === 'assistant' && (
                  <div className="max-w-[94%] space-y-3">
                    <div className="bg-white border border-zinc-200/90 text-zinc-800 p-3.5 rounded-2xl rounded-tl-xs shadow-xs text-xs leading-relaxed font-medium">
                      {msg.type === 'order_success' ? (
                        /* Order Success Summary Card */
                        <div className="space-y-3 text-zinc-800">
                          <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm pb-2 border-b border-zinc-100">
                            <CheckCircle size={18} className="shrink-0" />
                            <span>অর্ডার সফলভাবে গৃহীত হয়েছে</span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-zinc-200/80 space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-zinc-500 font-bold">অর্ডার আইডি:</span>
                              <span className="font-mono font-bold text-zinc-900">#{msg.orderData.orderId.slice(0, 8)}</span>
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
                            <div className="flex justify-between pt-1.5 border-t border-zinc-200 font-black text-zinc-900">
                              <span>সর্বমোট বিল:</span>
                              <span className="text-[#ce112d]">৳{msg.orderData.totalAmount}</span>
                            </div>
                          </div>

                          <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-[11px] leading-relaxed text-zinc-700 font-medium">
                            ধন্যবাদ! আপনার অর্ডারটি সফলভাবে গৃহীত হয়েছে। বিগ বাজার টিম থেকে খুব শীঘ্রই আপনার সাথে ফোনে যোগাযোগ করা হবে। অনুগ্রহ করে আপনার মোবাইল নম্বরটি এক্টিভ রাখবেন।
                          </div>

                          <div className="pt-1">
                            <button
                              onClick={handleResetChat}
                              className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-center font-bold text-xs transition-all shadow-xs"
                            >
                              আরও শপিং করুন
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

                    {/* Welcoming Category Grid — Only Real Active Categories on the Site */}
                    {msg.type === 'welcome' && (
                      <div className="space-y-3 pt-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block px-1">
                          ক্যাটাগরি
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {TOP_CATEGORIES.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => handleSelectCategory(cat)}
                              className="p-2.5 bg-white hover:bg-red-50/60 hover:border-[#ce112d]/40 border border-zinc-200/90 rounded-xl text-left transition-all group flex items-center gap-2 shadow-2xs active:scale-95"
                            >
                              <div className="w-6 h-6 rounded-lg bg-zinc-100 group-hover:bg-[#ce112d]/10 text-zinc-600 group-hover:text-[#ce112d] flex items-center justify-center shrink-0 transition-colors">
                                {cat.id === 'Women' ? <Shirt size={14} /> : cat.id === 'Men' ? <User size={14} /> : <Users size={14} />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-zinc-800 group-hover:text-[#ce112d] transition-colors leading-tight truncate">
                                  {cat.bn}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Quick Policy & Info Chips */}
                        <div className="pt-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block px-1 mb-2">
                            প্রয়োজনীয় তথ্য
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {QUICK_INFO_TOPICS.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => handleSendMessage(item.label)}
                                className="px-2.5 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 hover:text-zinc-900 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                              >
                                {item.icon}
                                <span>{item.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Subcategory Picker Chips */}
                    {msg.type === 'subcategory_picker' && msg.subcategories && msg.subcategories.length > 0 && (
                      <div className="space-y-2 pt-1 w-full animate-message-in">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block px-1">
                          সাব-ক্যাটাগরি বেছে নিন
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.subcategories.map((sub, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSelectSubcategory(msg.category, sub)}
                              className="py-2 px-3 bg-white hover:bg-[#ce112d] hover:text-white border border-zinc-200/90 hover:border-[#ce112d] rounded-xl text-xs font-bold text-zinc-800 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 group"
                            >
                              <Tag size={12} className="text-[#ce112d] group-hover:text-white transition-colors" />
                              <span>{sub.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Product Cards Carousel / Grid inside Chat */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="space-y-2.5 pt-1 w-full">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            পণ্য তালিকা ({msg.products.length} টি)
                          </span>
                        </div>
                        
                        <div className="space-y-2.5">
                          {msg.products.map((p) => (
                            <div
                              key={p.id}
                              className="p-3 bg-white border border-zinc-200/90 rounded-2xl flex gap-3 shadow-2xs hover:shadow-sm transition-all group"
                            >
                              <div className="w-20 h-26 sm:w-24 sm:h-30 bg-slate-100 rounded-xl overflow-hidden shrink-0 relative border border-zinc-100">
                                <img
                                  src={getOptimizedUrl(p.image_url || p.images?.[0], { w: 200, h: 260 })}
                                  alt={p.name}
                                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => { e.target.src = 'https://placehold.co/200x260/ffffff/ce112d?text=BigBazar'; }}
                                />
                              </div>

                              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                <div>
                                  <h4 className="text-xs sm:text-sm font-bold text-zinc-900 line-clamp-2 group-hover:text-[#ce112d] transition-colors leading-snug">
                                    {p.name}
                                  </h4>
                                  <div className="flex items-baseline gap-2 mt-1.5">
                                    <span className="text-xs sm:text-sm font-black text-[#ce112d]">
                                      ৳{p.price}
                                    </span>
                                    {p.original_price && p.original_price > p.price && (
                                      <span className="text-[10px] sm:text-xs text-zinc-400 line-through">
                                        ৳{p.original_price}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 mt-2.5">
                                  <button
                                    onClick={() => startInChatOrder(p)}
                                    className="flex-1 py-2 px-2.5 bg-[#ce112d] hover:bg-[#b30e25] text-white rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-2xs active:scale-95 transition-all"
                                  >
                                    <ShoppingBag size={12} /> অর্ডার করুন
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigate(`/product/${p.id}`);
                                      setIsOpen(false);
                                    }}
                                    className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95"
                                    title="বিস্তারিত দেখুন"
                                  >
                                    <span>বিস্তারিত</span>
                                    <ChevronRight size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Append 5 More Products Button directly into this collection */}
                        {msg.has_more !== false && (
                          <div className="pt-2">
                            <button
                              type="button"
                              disabled={loadingMoreMsgId === msg.id}
                              onClick={() => handleLoadMoreProducts(msg.id, msg.category_query, (msg.products || []).length)}
                              className="w-full py-2.5 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-zinc-200 active:scale-95 disabled:opacity-60"
                            >
                              {loadingMoreMsgId === msg.id ? (
                                <>
                                  <div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-[#ce112d] rounded-full animate-spin" />
                                  <span>লোড হচ্ছে...</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-sm font-black text-[#ce112d]">＋</span>
                                  <span>আরও কালেকশন দেখুন</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* User Message Bubble */}
                {msg.role === 'user' && (
                  <div className="max-w-[85%] bg-zinc-900 text-white p-3 rounded-2xl rounded-tr-xs shadow-xs text-xs leading-relaxed font-medium">
                    {msg.content}
                  </div>
                )}

                <span className="text-[9px] text-zinc-400 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* In-Chat Direct Order Form Drawer */}
            {orderModalProduct && (
              <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 shadow-lg space-y-3 animate-message-in">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                  <div className="flex items-center gap-1.5 text-xs font-black text-zinc-900">
                    <ShoppingBag size={15} className="text-[#ce112d]" />
                    <span>চ্যাটে সরাসরি অর্ডার</span>
                  </div>
                  <button
                    onClick={() => setOrderModalProduct(null)}
                    className="text-zinc-400 hover:text-zinc-700 w-6 h-6 rounded-lg bg-zinc-100 flex items-center justify-center transition-all"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Product Snapshot */}
                <div className="flex gap-3 p-2 bg-slate-50 rounded-xl border border-zinc-100">
                  <div className="w-14 h-16 bg-white rounded-lg overflow-hidden shrink-0 border border-zinc-200">
                    <img
                      src={getOptimizedUrl(orderModalProduct.image_url || orderModalProduct.images?.[0], { w: 100, h: 120 })}
                      alt=""
                      className="w-full h-full object-cover object-top"
                      onError={(e) => { e.target.src = 'https://placehold.co/100x120/ffffff/ce112d?text=BB'; }}
                    />
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <h5 className="text-xs font-bold text-zinc-900 truncate">{orderModalProduct.name}</h5>
                      <p className="text-xs font-black text-[#ce112d] mt-0.5">৳{orderModalProduct.price}</p>
                    </div>

                    {/* Quantity Increment/Decrement Counter */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-bold text-zinc-500">পরিমাণ:</span>
                      <div className="flex items-center border border-zinc-200 rounded-lg bg-white overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setOrderForm(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                          className="w-6 h-6 flex items-center justify-center hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-all"
                        >
                          -
                        </button>
                        <span className="w-7 text-center text-xs font-black text-zinc-900 select-none">
                          {orderForm.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setOrderForm(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                          className="w-6 h-6 flex items-center justify-center hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-all"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Size Selector */}
                {orderModalProduct.available_sizes && orderModalProduct.available_sizes.length > 0 && (
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">সাইজ বেছে নিন:</label>
                    <div className="flex flex-wrap gap-1.5">
                      {orderModalProduct.available_sizes.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setOrderForm(prev => ({ ...prev, size: sz }))}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            orderForm.size === sz
                              ? 'bg-zinc-900 text-white shadow-2xs'
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
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">কালার বেছে নিন:</label>
                    <div className="flex flex-wrap gap-1.5">
                      {orderModalProduct.available_colors.map((c, i) => {
                        const colorName = typeof c === 'string' ? c : (c.name || `Color ${i+1}`);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setOrderForm(prev => ({ ...prev, color: colorName }))}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              orderForm.color === colorName
                                ? 'bg-[#ce112d] text-white shadow-2xs'
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

                {/* In-Chat Customer Information Inputs */}
                <div className="space-y-2 pt-1 border-t border-zinc-100">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                    ডেলিভারির ঠিকানা ও তথ্য
                  </label>
                  
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
                      className="w-full px-2 py-2 bg-slate-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#ce112d]"
                    >
                      {allDistricts.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    {orderForm.district === CHATTOGRAM_DISTRICT ? (
                      <select
                        value={orderForm.upazila}
                        onChange={e => setOrderForm(prev => ({ ...prev, upazila: e.target.value }))}
                        className="w-full px-2 py-2 bg-slate-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#ce112d]"
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

                {/* Delivery Note & Bill Calculation */}
                {(() => {
                  const deliveryInfo = calculateDelivery(orderForm.district, orderForm.upazila);
                  const subtotal = (parseFloat(orderModalProduct.price) || 0) * orderForm.quantity;
                  const total = subtotal + deliveryInfo.charge;
                  return (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-zinc-100 text-xs space-y-1">
                      <div className="flex justify-between items-center text-zinc-600 font-medium">
                        <span>পণ্য মূল্য:</span>
                        <span>৳{subtotal}</span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-600 font-medium">
                        <span>ডেলিভারি চার্জ:</span>
                        <span className={deliveryInfo.isFree ? "text-emerald-600 font-bold" : ""}>
                          {deliveryInfo.isFree ? '৳০ (ফ্রি)' : `৳${deliveryInfo.charge}`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-zinc-200 font-black text-[#ce112d]">
                        <span>সর্বমোট বিল:</span>
                        <span className="text-sm">৳{total}</span>
                      </div>
                    </div>
                  );
                })()}

                {orderError && (
                  <p className="text-[11px] font-bold text-red-600 bg-red-50 p-2 rounded-lg">
                    {orderError}
                  </p>
                )}

                {/* Two Action Buttons: Add to Bag & Direct Confirm In-Chat Order */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      addToCart(orderModalProduct, orderForm.color, orderForm.size, orderForm.quantity);
                      setOrderModalProduct(null);
                      setMessages(prev => [
                        ...prev,
                        {
                          id: 'cart-added-' + Date.now(),
                          role: 'assistant',
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                          content: `${orderModalProduct.name} সফলভাবে ব্যাগে যুক্ত করা হয়েছে! আপনি আরও পোশাক দেখতে পারেন বা সরাসরি চেকআউট করতে পারেন।`
                        }
                      ]);
                    }}
                    className="py-2.5 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 border border-zinc-200"
                  >
                    <ShoppingCart size={14} />
                    <span>ব্যাগে যোগ করুন</span>
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleCompleteOrder}
                    className="py-2.5 px-3 bg-[#ce112d] hover:bg-[#b00e26] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-red-900/20 flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShoppingBag size={14} />
                        <span>অর্ডার নিশ্চিত করুন</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Assistant Typing Indicator */}
            {isLoading && !orderModalProduct && (
              <div className="flex items-center gap-2 p-3 bg-white border border-zinc-200 rounded-2xl rounded-tl-xs w-20 shadow-2xs">
                <span className="w-2 h-2 bg-[#ce112d] rounded-full typing-dot" />
                <span className="w-2 h-2 bg-[#ce112d] rounded-full typing-dot" />
                <span className="w-2 h-2 bg-[#ce112d] rounded-full typing-dot" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Area - Ultra Minimalist Clean with Mobile Safe Area */}
          <div className="p-3 bg-white border-t border-zinc-100 shrink-0 chat-panel-footer">
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
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-zinc-200 rounded-full text-xs font-medium focus:outline-none focus:border-[#ce112d] focus:bg-white transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="w-10 h-10 bg-[#ce112d] hover:bg-[#b30e25] text-white rounded-full flex items-center justify-center transition-all shadow-2xs active:scale-95 disabled:opacity-40 disabled:pointer-events-none shrink-0"
              >
                <Send size={15} />
              </button>
            </form>
          </div>

        </div>
      )}
    </>
  );
}
