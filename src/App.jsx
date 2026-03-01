import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Admin from './pages/Admin';
import ErrorBoundary from './components/ErrorBoundary';

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

  useEffect(() => {
    // Increment visitor count only once per session so we don't spam the API on every click
    if (!sessionStorage.getItem('visited')) {
      fetch('https://api.counterapi.dev/v1/bigbazar_sheet/visits/up')
        .then(() => sessionStorage.setItem('visited', 'true'))
        .catch(err => console.log('Visitor tracking failed', err));
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar
        selectedCategory={category}
        onSelectCategory={setCategory}
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
        <Router>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<PublicLayout />} />
            <Route path="/product/:productId" element={<PublicLayout />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;