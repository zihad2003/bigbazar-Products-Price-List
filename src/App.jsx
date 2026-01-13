import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Lenis from '@studio-freight/lenis';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Admin from './pages/Admin';

function PublicLayout() {
  const [category, setCategory] = useState('All');

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <Navbar selectedCategory={category} onSelectCategory={setCategory} />
      <main className="flex-grow pt-48 md:pt-52">
        <Home selectedCategory={category} />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  console.log("App component rendering");

  useEffect(() => {
    console.log("App useEffect running");
    const lenis = new Lenis({
      duration: 2.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.2,
      touchMultiplier: 2,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'black', color: 'white', padding: '20px' }}>
      {/* Debug message - remove after fixing */}
      <div style={{ position: 'fixed', top: '10px', right: '10px', background: 'red', color: 'white', padding: '5px', zIndex: 9999 }}>
        App Loaded
      </div>

      <Router>
      <Routes>
        <Route path="/" element={<PublicLayout />} />
        <Route path="/product/:productId" element={<PublicLayout />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
    </div>
  );
}

export default App;