import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, ShoppingBag, Sparkles, ChevronDown, ChevronUp, ShoppingCart, MessageCircle, ExternalLink } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import { API_URL } from '../api/client';
import { trackMessengerClick } from '../utils/analytics';
import './ChatWidget.css';

const FB_PAGE_ID = '100063541603515';
const MESSENGER_URL = `https://m.me/${FB_PAGE_ID}?ref=ai_chat_hub`;

export default function ChatWidget() {
  const { cartCount, addToCart } = useCart();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});
  const messagesEndRef = useRef(null);

  // Clean API endpoint generator
  const getAssistantEndpoint = () => {
    if (!API_URL || API_URL === '/') return '/api/assistant';
    return `${API_URL.replace(/\/$/, '')}/api/assistant`;
  };

  // Generate & persist session_id
  const [sessionId] = useState(() => {
    let saved = localStorage.getItem('bb_ai_session_id');
    if (!saved) {
      saved = 'session-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
      localStorage.setItem('bb_ai_session_id', saved);
    }
    return saved;
  });

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: language === 'bn' 
            ? "আসসালামু আলাইকুম! 👋 **BigBazar AI** শপিং অ্যাসিস্ট্যান্টে স্বাগতম। আপনি আজ কী খুঁজছেন? আমাদের মেসেঞ্জারেও অর্ডার করতে পারেন।"
            : "Hello! 👋 Welcome to **BigBazar AI** Shopping Assistant. What are you looking for today? You can also message us directly on Messenger.",
          quick_replies: language === 'bn'
            ? ["শাড়ি কালেকশন", "বোরকা ও আবায়া", "পাঞ্জাবি", "💬 মেসেঞ্জারে অর্ডার করুন"]
            : ["Shop sarees", "Borka & Abaya", "Men's Panjabi", "💬 Order on Messenger"],
          products: []
        }
      ]);
    }
  }, [language, messages.length]);

  // Lock background body scroll when open on mobile viewports
  useEffect(() => {
    if (isOpen) {
      const prevStyle = document.body.style.overflow;
      if (window.innerWidth < 640) {
        document.body.style.overflow = 'hidden';
      }
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
  }, [messages, isOpen, isLoading]);

  const handleMessengerClick = () => {
    trackMessengerClick();
    window.open(MESSENGER_URL, '_blank', 'noopener,noreferrer');
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    // Handle quick reply for Messenger directly
    if (text.includes('মেসেঞ্জার') || text.includes('Messenger')) {
      handleMessengerClick();
      return;
    }

    const userMsg = { id: 'msg-' + Date.now(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const endpoint = getAssistantEndpoint();
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: text })
      });
      const data = await res.json();

      const assistantMsg = {
        id: 'reply-' + Date.now(),
        role: 'assistant',
        content: data.reply || (language === 'bn' ? "দুঃখিত, আমি উত্তর প্রস্তুত করতে পারিনি।" : "Sorry, I couldn't generate a response."),
        products: data.products || [],
        quick_replies: data.quick_replies || [],
        order_confirmation: data.order_confirmation || null
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: language === 'bn' ? "দুঃখিত, সংযোগে সমস্যা হয়েছে।" : "Sorry, connection error occurred.",
          products: [],
          quick_replies: ["💬 মেসেঞ্জারে অর্ডার করুন"]
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (msgId) => {
    setExpandedCards(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <>
      {/* Unified Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="chat-widget-fab fixed bottom-[76px] md:bottom-8 right-3 md:right-6 z-[1015] bg-[#ce112d] hover:bg-[#b00e26] text-white p-3.5 md:px-5 md:py-3.5 rounded-full shadow-[0_8px_25px_rgba(206,17,45,0.35)] flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all duration-300 min-h-[48px]"
          aria-label="Open BigBazar Shopping Assistant"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles size={18} className="animate-spin-slow shrink-0 text-white" />
            <MessageCircle size={18} className="shrink-0 text-white" />
          </div>
          <span className="hidden sm:inline text-xs font-black uppercase tracking-wider">
            {language === 'bn' ? 'অ্যাসিস্ট্যান্ট ও মেসেঞ্জার' : 'AI & Messenger'}
          </span>
        </button>
      )}

      {/* Backdrop overlay for Mobile view */}
      {isOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-[1018]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Responsive Chat Panel Window */}
      {isOpen && (
        <div className="chat-panel-container fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 md:bottom-8 md:right-8 w-full sm:w-[400px] md:w-[420px] h-[100dvh] sm:h-[600px] md:h-[640px] sm:max-h-[calc(100vh-5rem)] sm:max-w-[calc(100vw-3rem)] bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xl rounded-none sm:rounded-3xl flex flex-col z-[1020] overflow-hidden">
          
          {/* Header */}
          <div className="p-3 md:p-4 bg-white/95 dark:bg-zinc-900/95 border-b border-zinc-100 dark:border-zinc-800 flex flex-col shrink-0 backdrop-blur-md">
            {/* Drag handle pill for mobile */}
            <div className="sm:hidden w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-2" />

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#ce112d]/10 border border-[#ce112d]/20 flex items-center justify-center text-[#ce112d] shrink-0">
                  <Sparkles size={18} className="text-[#ce112d]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs sm:text-sm font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-1.5 brand-logo leading-none truncate">
                    <span className="text-[#ce112d]">BIG</span>
                    <span className="text-zinc-900 dark:text-white">BAZAR</span>
                    <span className="text-[9px] sm:text-[10px] font-bold not-italic px-1.5 py-0.5 rounded-md bg-red-50 text-[#ce112d] border border-red-100 dark:bg-red-950/40 dark:border-red-900/40">AI</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0 ml-0.5" />
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate mt-0.5">
                    {language === 'bn' ? 'স্মার্ট শピング সহকারী' : 'Shopping Assistant'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Direct Facebook Messenger Button in Header */}
                <button
                  onClick={handleMessengerClick}
                  title={language === 'bn' ? 'মেসেঞ্জারে নক দিন' : 'Message on Facebook'}
                  className="flex items-center gap-1 bg-[#0084FF] hover:bg-[#0073e6] active:scale-95 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <MessageCircle size={14} />
                  <span className="hidden sm:inline">Messenger</span>
                  <ExternalLink size={10} className="opacity-80" />
                </button>

                {/* Live Cart Count Badge */}
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-1.5 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200">
                  <ShoppingBag size={14} className="text-[#ce112d]" />
                  <span>{cartCount}</span>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-all active:scale-95"
                  aria-label="Close Assistant"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-4 text-sm chat-scroll-area bg-zinc-50/60 dark:bg-zinc-950/40">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const displayProducts = msg.products || [];
              const isExpanded = expandedCards[msg.id];
              const visibleProducts = isExpanded ? displayProducts : displayProducts.slice(0, 3);
              const hiddenCount = Math.max(0, displayProducts.length - 3);

              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}>
                  
                  {/* Text Bubble */}
                  <div
                    className={`max-w-[88%] md:max-w-[85%] px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[#ce112d] text-white rounded-br-xs shadow-xs font-medium'
                        : 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-800 rounded-bl-xs shadow-xs'
                    }`}
                  >
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i} className="mb-1 last:mb-0">
                        {line.split('**').map((chunk, idx) => 
                          idx % 2 === 1 ? (
                            <strong key={idx} className={`font-bold ${isUser ? 'text-white' : 'text-zinc-900 dark:text-white'}`}>
                              {chunk}
                            </strong>
                          ) : (
                            chunk
                          )
                        )}
                      </p>
                    ))}
                  </div>

                  {/* Inline Product Cards */}
                  {!isUser && displayProducts.length > 0 && (
                    <div className="w-full space-y-2.5 mt-2">
                      <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
                        {language === 'bn' ? 'জনপ্রিয় প্রোডাক্টসমূহ' : 'Featured Products'} ({displayProducts.length})
                      </p>
                      
                      <div className="grid grid-cols-1 gap-2.5">
                        {visibleProducts.map(product => (
                          <div
                            key={product.id}
                            className="p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex items-center gap-3 shadow-xs"
                          >
                            <img
                              src={getOptimizedUrl(product.image_url, mediaSizes.thumbnail)}
                              alt={product.name}
                              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0 bg-zinc-100 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">{product.name}</h4>
                              <p className="text-xs font-black text-[#ce112d] mt-0.5">৳{product.price}</p>
                              {product.description && (
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">{product.description}</p>
                              )}
                              <button
                                onClick={() => addToCart(product, null, null, 1)}
                                className="mt-1.5 w-full py-1.5 sm:py-2 bg-zinc-100 hover:bg-[#ce112d] active:scale-95 text-zinc-800 hover:text-white dark:bg-zinc-800 dark:hover:bg-[#ce112d] dark:text-zinc-200 dark:hover:text-white rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 min-h-[34px]"
                              >
                                <ShoppingCart size={13} />
                                {language === 'bn' ? 'কার্টে যোগ করুন' : 'Add to Cart'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Expand / Collapse Row */}
                      {displayProducts.length > 3 && (
                        <button
                          onClick={() => toggleExpand(msg.id)}
                          className="w-full py-2.5 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-300 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-98"
                        >
                          {isExpanded ? (
                            <>{language === 'bn' ? 'কম দেখান' : 'Show less'} <ChevronUp size={14} /></>
                          ) : (
                            <>{language === 'bn' ? `আরও ${hiddenCount} টি দেখুন` : `Show ${hiddenCount} more`} <ChevronDown size={14} /></>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Quick Reply Chips */}
                  {!isUser && msg.quick_replies && msg.quick_replies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                      {msg.quick_replies.map((chip, idx) => {
                        const isMessengerChip = chip.includes('মেসেঞ্জার') || chip.includes('Messenger');
                        return (
                          <button
                            key={idx}
                            onClick={() => isMessengerChip ? handleMessengerClick() : handleSendMessage(chip)}
                            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-xs transition-all active:scale-95 font-medium shadow-2xs flex items-center gap-1.5 ${
                              isMessengerChip
                                ? 'bg-[#0084FF] hover:bg-[#0073e6] text-white border border-[#0084FF]/80 font-bold'
                                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-[#ce112d]/60 hover:text-[#ce112d] dark:hover:text-[#ff4d6d] hover:bg-red-50/50 dark:hover:bg-red-950/20'
                            }`}
                          >
                            {isMessengerChip && <MessageCircle size={14} />}
                            {chip}
                          </button>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })}

            {/* Typing Bouncing Indicator */}
            {isLoading && (
              <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 w-fit shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#ce112d] typing-dot" />
                <span className="w-2 h-2 rounded-full bg-[#ce112d] typing-dot" />
                <span className="w-2 h-2 rounded-full bg-[#ce112d] typing-dot" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Form Input */}
          <div className="p-3 md:p-4 bg-white/95 dark:bg-zinc-900/95 border-t border-zinc-100 dark:border-zinc-800 shrink-0 space-y-2 backdrop-blur-md pb-[max(12px,env(safe-area-inset-bottom))]">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={language === 'bn' ? 'BigBazar AI-কে বার্তা লিখুন...' : 'Message BigBazar AI...'}
                className="flex-1 px-4 py-2.5 sm:py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#ce112d] focus:bg-white dark:focus:bg-zinc-950 transition-all"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#ce112d] hover:bg-[#b00e26] disabled:opacity-50 disabled:hover:bg-[#ce112d] text-white flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-md shadow-red-500/20"
                aria-label="Send Message"
              >
                <Send size={18} />
              </button>
            </form>
          </div>

        </div>
      )}
    </>
  );
}
