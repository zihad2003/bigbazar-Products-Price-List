import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import { CartProvider } from './CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Admin from './pages/Admin';
import ErrorBoundary from './components/ErrorBoundary';
import TrackOrderModal from './components/TrackOrderModal';
import CartDrawer from './components/CartDrawer';
import { supabase } from './supabaseClient';

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

  useEffect(() => {
    // Increment visitor count only once per session in Supabase
    if (!sessionStorage.getItem('visited')) {
      supabase.from('site_settings').select('value').eq('key', 'visitor_count').single()
        .then(({ data }) => {
          const currentCount = data?.value || 0;
          return supabase.from('site_settings').upsert({ key: 'visitor_count', value: currentCount + 1 });
        })
        .then(() => sessionStorage.setItem('visited', 'true'))
        .catch(err => console.log('Visitor tracking failed', err));
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <TrackOrderModal isOpen={isTrackOpen} onClose={() => setIsTrackOpen(false)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <Navbar
        selectedCategory={category}
        onSelectCategory={setCategory}
        onTrackOrder={() => setIsTrackOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
      />
      <main className="flex-grow pt-48 md:pt-56">
        <Home
          selectedCategory={category}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <CartProvider>
          <Router>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<PublicLayout />} />
              <Route path="/product/:productId" element={<PublicLayout />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </Router>
        </CartProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;