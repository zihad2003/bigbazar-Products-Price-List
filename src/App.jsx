import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { CartProvider } from './contexts/CartContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Admin from './pages/Admin';
import StaticPage from './pages/StaticPage';
import ErrorBoundary from './components/ErrorBoundary';
import TrackOrderModal from './components/modals/TrackOrderModal';
import CartDrawer from './components/CartDrawer';
import CustomerMenu from './components/CustomerMenu';
import CategoryModal from './components/modals/CategoryModal';
import LoginModal from './components/modals/LoginModal';
import { bigBazarApi } from './api/client';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
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
  const location = useLocation();
  const staticPaths = ['/about-us', '/privacy-policy', '/terms', '/refund', '/contact-us', '/faq', '/size-guide', '/shipping', '/returns', '/store-locations'];
  const isStaticPage = staticPaths.includes(location.pathname);

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
  }, []);

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <TrackOrderModal isOpen={isTrackOpen} onClose={() => handleCloseModal(setIsTrackOpen)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => handleCloseModal(setIsCartOpen)} />
      <LoginModal isOpen={isAuthOpen} onClose={() => handleCloseModal(setIsAuthOpen)} />
      <CategoryModal
        isOpen={isCategoryOpen}
        onClose={() => handleCloseModal(setIsCategoryOpen)}
        selectedCategory={category}
        onSelectCategory={setCategory}
      />

      <header className="fixed top-0 left-0 right-0 z-[1000] flex flex-col">
        <Navbar
          selectedCategory={category}
          onSelectCategory={setCategory}
          onTrackOrder={() => openModal(setIsTrackOpen)}
          onOpenCart={() => openModal(setIsCartOpen)}
          onOpenAuth={() => openModal(setIsAuthOpen)}
        />
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-16 md:pt-20 pb-24 md:pb-0">
        {isStaticPage ? (
          <StaticPage path={location.pathname} />
        ) : (
          <Home
            selectedCategory={category}
            setSelectedCategory={setCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}
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
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider>
          <CartProvider>
            <Router>
              <ScrollToTop />
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
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </Router>
          </CartProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
