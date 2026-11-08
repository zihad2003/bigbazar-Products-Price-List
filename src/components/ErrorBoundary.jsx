import React from 'react';

const STORE_TITLE = 'Big Bazar Baraiyarhat | Family Fashion and Bridal Wear';
const STORE_DESC =
  'Family fashion and bridal wear at fixed prices. Visit Jomidar Plaza, Baraiyarhat, Mirsharai or order online with free Mirsharai delivery and COD nationwide.';

function setMeta(name, content, attr = 'name') {
  try {
    let el = document.querySelector(`meta[${attr}="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  } catch (_) { /* ignore */ }
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Keep store SEO in the head; never let the crash UI become Google's snippet.
    try {
      document.title = STORE_TITLE;
      setMeta('description', STORE_DESC);
      setMeta('og:title', STORE_TITLE, 'property');
      setMeta('og:description', STORE_DESC, 'property');
    } catch (_) { /* ignore */ }
  }

  render() {
    if (this.state.hasError) {
      // Inline critical styles are intentional: if the app crashes before the
      // Tailwind stylesheet loads (or on a stale cached bundle), the fallback
      // must still render centered and proportional instead of as unstyled text.
      const fontStack =
        "'Outfit', 'Inter', 'Noto Sans Bengali', ui-sans-serif, system-ui, sans-serif";
      const buttonBase = {
        display: 'block',
        width: '100%',
        height: '3rem',
        borderRadius: '0.75rem',
        fontSize: '0.875rem',
        fontWeight: 600,
        fontFamily: fontStack,
        cursor: 'pointer',
        lineHeight: 1,
      };
      return (
        <div
          className="min-h-screen bg-[#f8fafc] text-zinc-900 flex items-center justify-center p-6 text-center"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            backgroundColor: '#f8fafc',
            textAlign: 'center',
            fontFamily: fontStack,
          }}
        >
          {/* Crawlable store copy — not nosnippet, so Google can use a real description */}
          <div
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            <h1>Big Bazar Baraiyarhat</h1>
            <p>{STORE_DESC}</p>
            <p>
              Visit Big Bazar on the 2nd Floor of Jomidar Plaza, Baraiyarhat Pouroshoba, Mirsharai,
              Chattogram. Free Home Delivery within Mirsharai Upazila.
            </p>
          </div>

          <div
            data-nosnippet
            className="max-w-md w-full bg-white border border-zinc-200/80 p-6 sm:p-8 rounded-3xl shadow-xl shadow-zinc-200/60"
            style={{
              maxWidth: '28rem',
              width: '100%',
              backgroundColor: '#ffffff',
              border: '1px solid rgba(228,228,231,0.8)',
              borderRadius: '1.5rem',
              padding: '2rem 1.5rem',
              boxShadow: '0 20px 25px -5px rgba(228,228,231,0.6)',
            }}
          >
            <div
              className="w-14 h-14 bg-[#ce112d]/10 border border-[#ce112d]/20 rounded-2xl flex items-center justify-center mx-auto text-[#ce112d]"
              style={{
                width: '3.5rem',
                height: '3.5rem',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(206,17,45,0.1)',
                border: '1px solid rgba(206,17,45,0.2)',
                borderRadius: '1rem',
                color: '#ce112d',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h1
              className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 mt-5"
              style={{ fontSize: '1.375rem', fontWeight: 700, margin: '1.25rem 0 0', lineHeight: 1.3, color: '#18181b' }}
            >
              পেজটা এখন খোলেনি
            </h1>
            <p
              className="text-sm text-neutral-500 leading-relaxed mt-2.5"
              style={{ fontSize: '0.875rem', color: '#737373', lineHeight: 1.65, margin: '0.625rem 0 0' }}
            >
              দোকান চালু আছে। নিচের লাল বাটনে একবার চাপুন, পেজটা আবার খুলবে।
            </p>
            <p
              className="text-xs text-neutral-400 leading-relaxed mt-1.5"
              style={{ fontSize: '0.75rem', color: '#a3a3a3', lineHeight: 1.6, margin: '0.375rem 0 0' }}
            >
              The shop is open. Tap the red button once to open this page again.
            </p>

            <div
              className="flex flex-col gap-3 mt-7"
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.75rem' }}
            >
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full h-12 bg-[#ce112d] hover:bg-[#b00e26] text-white text-sm font-semibold rounded-xl shadow-lg shadow-red-600/20 active:scale-95 transition-all"
                style={{
                  ...buttonBase,
                  backgroundColor: '#ce112d',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgba(220,38,38,0.2)',
                }}
              >
                আবার খুলুন
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = '/'; }}
                className="w-full h-12 bg-white hover:bg-zinc-50 text-zinc-700 text-sm font-semibold rounded-xl border border-zinc-300 transition-all"
                style={{
                  ...buttonBase,
                  backgroundColor: '#ffffff',
                  color: '#3f3f46',
                  border: '1px solid #d4d4d8',
                }}
              >
                হোমে যান
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
