import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import StaticPage from './pages/StaticPage';
import ErrorBoundary from './components/ErrorBoundary';
import TrackOrderModal from './components/modals/TrackOrderModal';
import CartDrawer from './components/CartDrawer';
import CustomerMenu from './components/CustomerMenu';
import CategoryModal from './components/modals/CategoryModal';
import LoginModal from './components/modals/LoginModal';
import TickerAnnouncement from './components/TickerAnnouncement';
import SEOHead from './components/SEOHead';
import MessengerFAB from './components/MessengerFAB';
import ChatWidget from './components/ChatWidget';
import { bigBazarApi, API_URL } from './api/client';
import { initAnalytics, trackPageview } from './utils/analytics';

// Lazy loaded page components for optimal initial bundle size
const Admin = lazy(() => import('./pages/Admin'));
const Products = lazy(() => import('./pages/Products'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const AccountPage = lazy(() => import('./pages/AccountPage'));

const PageLoadingFallback = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
    <div className="w-9 h-9 border-4 border-[#ce112d]/20 border-t-[#ce112d] rounded-full animate-spin" />
    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest animate-pulse">Loading...</span>
  </div>
);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageview(pathname);
  }, [pathname]);
  return null;
}

function PublicLayout() {
  const [category, setCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTrackOpen, setIsTrackOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [tickerSettings, setTickerSettings] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let sessionId = sessionStorage.getItem('bb_session_id');
    const isNewSession = !sessionId;
    if (!sessionId) {
      sessionId = 's-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
      sessionStorage.setItem('bb_session_id', sessionId);
    }

    const sendPing = (isNew) => {
      // Do not send recurring heartbeat pings when the browser tab is hidden/minimized
      if (!isNew && typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

      fetch(`${API_URL}/api/analytics/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, is_new: isNew })
      }).catch(() => { });
    };

    sendPing(isNewSession);

    // Heartbeat every 120s (2 minutes) instead of aggressive 30s
    const timer = setInterval(() => sendPing(false), 120000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendPing(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const staticPaths = ['/about-us', '/privacy-policy', '/terms', '/refund', '/contact-us', '/faq', '/size-guide', '/shipping', '/returns', '/store-locations'];
  const isStaticPage = staticPaths.includes(location.pathname);
  const isCheckoutPage = location.pathname === '/checkout';
  const isConfirmationPage = location.pathname.startsWith('/order-confirmation');
  const isProductPage = location.pathname.startsWith('/product/');
  const isProductsPage = location.pathname === '/products';
  const isAccountPage = location.pathname === '/account';

  // --- Back button support for modals ---
  const openModal = (setter) => {
    window.history.pushState({ modal: true }, '');
    setter(true);
  };

  const closeAllModals = () => {
    setIsTrackOpen(false);
    setIsCartOpen(false);
    setIsCategoryOpen(false);
    setIsAuthOpen(false);
  };

  useEffect(() => {
    const handlePopState = () => {
      if (isTrackOpen || isCartOpen || isCategoryOpen || isAuthOpen) {
        closeAllModals();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isTrackOpen, isCartOpen, isCategoryOpen, isAuthOpen]);

  const handleCloseModal = (setter) => {
    setter(false);
    // Pop the history entry we pushed when we opened
    if (window.history.state?.modal) {
      window.history.back();
    }
  };
  // --- End back button support ---

  useEffect(() => {
    // Increment visitor count only once per session
    if (!sessionStorage.getItem('visited')) {
      bigBazarApi.auth.onAuthStateChange((_event, session) => {
        sessionStorage.setItem('visited', 'true');
      });
    }

    // Fetch site settings for ticker announcement
    bigBazarApi.from('site_settings').select('*').then(({ data }) => {
      if (data) {
        const isArray = Array.isArray(data);
        const ticker = isArray ? data.find(s => s.key === 'ticker_announcement')?.value : data.ticker_announcement;
        if (ticker) setTickerSettings(ticker);
      }
    });
  }, []);

  const isTopTickerActive = tickerSettings?.enabled && tickerSettings?.text && (!tickerSettings?.position || tickerSettings?.position === 'top_navbar');

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-[#ce112d])' ? 'var(--text-primary)' : 'var(--text-primary)' }}>
      <SEOHead />
      <TrackOrderModal isOpen={isTrackOpen} onClose={() => handleCloseModal(setIsTrackOpen)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => handleCloseModal(setIsCartOpen)} />
      <LoginModal isOpen={isAuthOpen} onClose={() => handleCloseModal(setIsAuthOpen)} />
      <CategoryModal
        isOpen={isCategoryOpen}
        onClose={() => handleCloseModal(setIsCategoryOpen)}
        selectedCategory={category}
        onSelectCategory={setCategory}
        isTopTickerActive={isTopTickerActive}
      />

      <header className="fixed top-0 left-0 right-0 z-[1010] flex flex-col">
        {isTopTickerActive && (
          <TickerAnnouncement ticker={tickerSettings} />
        )}
        <Navbar
          selectedCategory={category}
          onSelectCategory={setCategory}
          onTrackOrder={() => openModal(setIsTrackOpen)}
          onOpenCart={() => openModal(setIsCartOpen)}
          onOpenAuth={() => openModal(setIsAuthOpen)}
          onOpenCategories={() => {
            if (isCategoryOpen) {
              handleCloseModal(setIsCategoryOpen);
            } else {
              openModal(setIsCategoryOpen);
            }
          }}
          isCategoryOpen={isCategoryOpen}
        />
      </header>

      {/* Main Content */}
      <main className={`flex-grow ${isTopTickerActive ? 'pt-24 md:pt-28' : 'pt-16 md:pt-20'} pb-24 md:pb-0`}>
        <Suspense fallback={<PageLoadingFallback />}>
          {isStaticPage ? (
            <StaticPage path={location.pathname} />
          ) : isCheckoutPage ? (
            <Checkout />
          ) : isConfirmationPage ? (
            <OrderConfirmation />
          ) : isProductPage ? (
            <ProductDetails />
          ) : isProductsPage ? (
            <Products />
          ) : isAccountPage ? (
            <AccountPage />
          ) : (
            <Home
              selectedCategory={category}
              setSelectedCategory={setCategory}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              tickerSettings={tickerSettings}
            />
          )}
        </Suspense>
      </main>

      <Footer onTrackOrder={() => openModal(setIsTrackOpen)} onSelectCategory={setCategory} />

      {/* Mobile Customer Menu */}
      <CustomerMenu
        onTrackOrder={() => openModal(setIsTrackOpen)}
        onOpenCart={() => openModal(setIsCartOpen)}
        onSelectCategory={setCategory}
        onOpenCategories={() => openModal(setIsCategoryOpen)}
        onOpenAuth={() => openModal(setIsAuthOpen)}
      />

      {!isCheckoutPage && (
        <MessengerFAB />
      )}
    </div>
  );
}

function App() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider>
          <CartProvider>
            <AuthProvider>
              <Router>
                <ScrollToTop />
                <Suspense fallback={<PageLoadingFallback />}>
                  <Routes>
                    <Route path="/" element={<PublicLayout />} />
                    <Route path="/product/:productId" element={<PublicLayout />} />
                    <Route path="/about-us" element={<PublicLayout />} />
                    <Route path="/privacy-policy" element={<PublicLayout />} />
                    <Route path="/terms" element={<PublicLayout />} />
                    <Route path="/refund" element={<PublicLayout />} />
                    <Route path="/contact-us" element={<PublicLayout />} />
                    <Route path="/faq" element={<PublicLayout />} />
                    <Route path="/size-guide" element={<PublicLayout />} />
                    <Route path="/shipping" element={<PublicLayout />} />
                    <Route path="/returns" element={<PublicLayout />} />
                    <Route path="/store-locations" element={<PublicLayout />} />
                    <Route path="/checkout" element={<PublicLayout />} />
                    <Route path="/order-confirmation/:orderId" element={<PublicLayout />} />
                    <Route path="/products" element={<PublicLayout />} />
                    <Route path="/account" element={<PublicLayout />} />
                    <Route path="/admin" element={<Admin />} />
                  </Routes>
                </Suspense>
              </Router>
            </AuthProvider>
          </CartProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
