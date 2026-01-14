import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <Navbar selectedCategory={category} onSelectCategory={setCategory} />
      <main className="flex-grow pt-48 md:pt-56">
        <Home selectedCategory={category} />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<PublicLayout />} />
          <Route path="/product/:productId" element={<PublicLayout />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;