import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { API_URL, getToken } from '../api/client';
import { Package, LogOut, Phone, ChevronRight, ShoppingBag, Clock, CheckCircle2, Truck, XCircle, User, Bell } from 'lucide-react';

// Google Identity Services script loader
function useGoogleScript() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setLoaded(true);
      return;
    }
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setLoaded(true));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);
  return loaded;
}

const ORDER_STATUS_CONFIG = {
  'Pending': { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Pending', labelBn: 'অপেক্ষমান' },
  'Confirmed': { icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Confirmed', labelBn: 'নিশ্চিত' },
  'Shipped': { icon: Truck, color: 'text-violet-500', bg: 'bg-violet-500/10', label: 'Shipped', labelBn: 'শিপড' },
  'Delivered': { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Delivered', labelBn: 'ডেলিভারড' },
  'Cancelled': { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Cancelled', labelBn: 'বাতিল' },
  'Deleted': { icon: XCircle, color: 'text-zinc-500', bg: 'bg-zinc-500/10', label: 'Deleted', labelBn: 'মুছে ফেলা' },
};

export default function AccountPage() {
  const { user, isLoggedIn, loading: authLoading, loginWithGoogle, logout } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const googleScriptLoaded = useGoogleScript();
  const googleBtnRef = useRef(null);

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loginError, setLoginError] = useState('');
  const [phone, setPhone] = useState('');
  const [editingPhone, setEditingPhone] = useState(false);
  const { updatePhone } = useAuth();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Initialize Google Sign-In button
  useEffect(() => {
    if (!googleScriptLoaded || isLoggedIn || !googleClientId || !googleBtnRef.current) return;

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (response) => {
        setLoginError('');
        const result = await loginWithGoogle(response.credential);
        if (result.error) {
          setLoginError(result.error);
        }
      }
    });

    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: Math.min(320, Math.max(260, (typeof window !== 'undefined' ? window.innerWidth : 320) - 64)),
    });
  }, [googleScriptLoaded, isLoggedIn, googleClientId, loginWithGoogle]);

  // Fetch orders when logged in
  const fetchOrders = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoadingOrders(true);
    try {
      const res = await fetch(`${API_URL}/api/account/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || []);
      }
    } catch (_) { /* ignore */ }
    finally { setLoadingOrders(false); }
  }, []);

  const fetchNotifications = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/account/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (!res.ok || !text) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      let data = {};
      try { data = JSON.parse(text); } catch { return; }
      setNotifications(data.data || []);
      setUnreadCount(data.unread || 0);
    } catch (_) { /* ignore */ }
  }, []);

  const markNotificationsRead = async (notificationId) => {
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/account/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(notificationId ? { notification_id: notificationId } : { all: true }),
      });
      await fetchNotifications();
    } catch (_) { /* ignore */ }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchOrders();
      fetchNotifications();
      if (user?.phone) setPhone(user.phone);
    }
  }, [isLoggedIn, fetchOrders, fetchNotifications, user]);

  const handleSavePhone = async () => {
    const result = await updatePhone(phone);
    if (!result.error) setEditingPhone(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-zinc-300 border-t-[#ce112d] rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in — show sign-in page
  if (!isLoggedIn) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-md text-center space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <div className="w-20 h-20 mx-auto rounded-full bg-zinc-100 flex items-center justify-center">
              <User size={36} className="text-zinc-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-content-primary">
              {language === 'bn' ? 'আপনার একাউন্টে লগ ইন করুন' : 'Sign in to your account'}
            </h1>
            <p className="text-sm text-content-secondary px-2">
              {language === 'bn'
                ? 'আপনার অর্ডার ট্র্যাক করুন এবং সহজে কেনাকাটা করুন'
                : 'Track your orders and shop with ease'}
            </p>
          </div>

          {/* Google Sign-In Button */}
          <div className="flex justify-center w-full">
            {googleClientId ? (
              <div ref={googleBtnRef} className="min-h-[44px] w-full max-w-[320px] flex justify-center" />
            ) : (
              <div className="w-full max-w-[320px] text-sm text-content-muted p-4 bg-zinc-100 rounded-xl">
                {language === 'bn' ? 'গুগল লগইন এখনও কনফিগার করা হয়নি।' : 'Google login is not configured yet.'}
              </div>
            )}
          </div>

          {loginError && (
            <p className="text-sm text-red-500 bg-red-50 p-3 rounded-xl">{loginError}</p>
          )}

          {/* Continue as guest */}
          <button
            onClick={() => navigate('/')}
            className="text-sm text-content-tertiary hover:text-content-primary transition-colors"
          >
            {language === 'bn' ? '← কেনাকাটা চালিয়ে যান' : '← Continue shopping'}
          </button>
        </div>
      </div>
    );
  }

  // Logged in — show account page
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Profile Card */}
      <div className="bg-surface-card border border-[var(--border-color)] rounded-2xl p-6 shadow-card">
        <div className="flex items-center gap-4">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-zinc-200"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#ce112d] flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-content-primary truncate">{user?.name}</h2>
            <p className="text-sm text-content-secondary truncate">{user?.email}</p>

            {/* Phone number */}
            {editingPhone ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))}
                  placeholder="01XXXXXXXXX"
                  className="text-sm px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-surface-input text-content-primary w-40"
                />
                <button onClick={handleSavePhone} className="text-xs font-bold text-[#ce112d] hover:underline">
                  {language === 'bn' ? 'সেভ' : 'Save'}
                </button>
                <button onClick={() => setEditingPhone(false)} className="text-xs text-content-muted hover:underline">
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <Phone size={14} className="text-content-muted" />
                <span className="text-sm text-content-tertiary">
                  {user?.phone || (language === 'bn' ? 'ফোন নম্বর যোগ করুন' : 'Add phone number')}
                </span>
                <button onClick={() => setEditingPhone(true)} className="text-xs text-[#ce112d] hover:underline ml-1">
                  {language === 'bn' ? 'সম্পাদনা' : 'Edit'}
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => { logout(); navigate('/'); }}
          className="mt-4 flex items-center gap-2 text-sm text-content-muted hover:text-red-500 transition-colors"
        >
          <LogOut size={16} />
          {language === 'bn' ? 'লগ আউট' : 'Sign out'}
        </button>
      </div>

      {/* Notifications */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-bold text-content-primary flex items-center gap-2">
            <Bell size={20} />
            {language === 'bn' ? 'বিজ্ঞপ্তি' : 'Notifications'}
            {unreadCount > 0 && (
              <span className="text-[10px] font-black bg-[#ce112d] text-white px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h3>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markNotificationsRead(null)}
              className="text-[11px] font-bold text-[#ce112d] hover:underline"
            >
              {language === 'bn' ? 'সব পঠিত' : 'Mark all read'}
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-8 text-sm text-content-muted border border-dashed border-[var(--border-color)] rounded-xl">
            {language === 'bn' ? 'কোনো বিজ্ঞপ্তি নেই' : 'No notifications yet'}
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  if (!n.is_read) markNotificationsRead(n.id);
                  if (n.product_id) navigate(`/product/${n.product_id}`);
                }}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  n.is_read
                    ? 'bg-surface-card border-[var(--border-color)]'
                    : 'bg-[#ce112d]/5 border-[#ce112d]/20'
                }`}
              >
                <p className="text-sm font-bold text-content-primary">{n.title}</p>
                <p className="text-xs text-content-secondary mt-1">{n.body}</p>
                <p className="text-[10px] text-content-muted mt-2">
                  {formatDate(n.created_at)}
                  {!n.is_read && (
                    <span className="ml-2 text-[#ce112d] font-bold">
                      {language === 'bn' ? 'নতুন' : 'New'}
                    </span>
                  )}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Orders Section */}
      <div>
        <h3 className="text-lg font-bold text-content-primary mb-4 flex items-center gap-2">
          <Package size={20} />
          {language === 'bn' ? 'আপনার অর্ডারসমূহ' : 'Your Orders'}
        </h3>

        {loadingOrders ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-zinc-300 border-t-[#ce112d] rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <ShoppingBag size={48} className="mx-auto text-content-faint" />
            <p className="text-content-muted">
              {language === 'bn' ? 'আপনার কোনো অর্ডার নেই' : 'No orders yet'}
            </p>
            <button
              onClick={() => navigate('/products')}
              className="px-6 py-2.5 bg-[#ce112d] text-white rounded-xl text-sm font-bold hover:bg-[#b00e26] transition-colors"
            >
              {language === 'bn' ? 'কেনাকাটা শুরু করুন' : 'Start Shopping'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const statusConfig = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG['Pending'];
              const StatusIcon = statusConfig.icon;
              return (
                <div key={order.id} className="bg-surface-card border border-[var(--border-color)] rounded-xl p-4 shadow-sm hover:shadow-card transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-content-primary truncate">
                        {order.product_name?.split(' + ')[0]?.replace(/\s*\(PID:\s*[^)]*\)/gi, '') || 'Order'}
                      </p>
                      <p className="text-xs text-content-muted mt-0.5">
                        {formatDate(order.created_at)} • ID: {order.id?.substring(0, 8)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusConfig.bg} ${statusConfig.color} flex items-center gap-1`}>
                        <StatusIcon size={12} />
                        {language === 'bn' ? statusConfig.labelBn : statusConfig.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-color)]">
                    <span className="text-sm font-bold text-content-primary">
                      ৳{Number(order.total_amount || 0).toLocaleString()}
                    </span>
                    <span className="text-xs text-content-muted">
                      {order.delivery_area === 'mirsarai'
                        ? (language === 'bn' ? 'ফ্রি ডেলিভারি' : 'Free Delivery')
                        : `${language === 'bn' ? 'ডেলিভারি' : 'Delivery'}: ৳${order.delivery_charge || 0}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
