import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

console.log("Main.jsx executing");

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error("No root element found");

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  // Register Service Worker (needed for browser push + faster return visits)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    });
  }
} catch (e) {
  console.error("Render error:", e);
}
