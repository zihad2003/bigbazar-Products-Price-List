// GA4 + Meta Pixel loader and funnel event helpers.
// Reads IDs from Vite env vars — set these in Cloudflare Pages
// project settings (Settings > Environment Variables):
//   VITE_GA_ID        e.g. G-XXXXXXXXXX
//   VITE_FB_PIXEL_ID   e.g. 123456789012345
// If either is unset, that provider is simply skipped (no errors).

const GA_ID = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_GA_ID : undefined;
const FB_PIXEL_ID = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_FB_PIXEL_ID : undefined;

let initialized = false;

function loadScript(src, attrs = {}) {
    const s = document.createElement('script');
    s.async = true;
    s.src = src;
    Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
    document.head.appendChild(s);
    return s;
}

export function initAnalytics() {
    if (initialized) return;
    initialized = true;

    // --- GA4 ---
    if (GA_ID) {
        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag() { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', GA_ID, { send_page_view: false }); // we send page_view manually per route
        loadScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);
    }

    // --- Meta Pixel ---
    if (FB_PIXEL_ID) {
        /* eslint-disable */
        !function (f, b, e, v, n, t, s) {
            if (f.fbq) return; n = f.fbq = function () {
                n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
            };
            if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
            n.queue = []; t = b.createElement(e); t.async = !0;
            t.src = v; s = b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t, s)
        }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        /* eslint-enable */
        window.fbq('init', FB_PIXEL_ID);
        window.fbq('track', 'PageView');
    }

    if (!GA_ID && !FB_PIXEL_ID) {
        console.warn('[analytics] VITE_GA_ID / VITE_FB_PIXEL_ID not set — tracking disabled.');
    }
}

// --- Page view (call on route change) ---
export function trackPageview(path) {
    if (window.gtag && GA_ID) window.gtag('event', 'page_view', { page_path: path });
    if (window.fbq && FB_PIXEL_ID) window.fbq('track', 'PageView');
}

// --- Product viewed ---
export function trackViewItem(product) {
    if (!product) return;
    if (window.fbq) window.fbq('track', 'ViewContent', {
        content_name: product.name,
        content_ids: [String(product.id)],
        content_type: 'product',
        value: product.price,
        currency: 'BDT',
    });
    if (window.gtag) window.gtag('event', 'view_item', {
        currency: 'BDT',
        value: product.price,
        items: [{ item_id: String(product.id), item_name: product.name }],
    });
}

// --- Added to cart ---
export function trackAddToCart(product, quantity = 1) {
    if (!product) return;
    if (window.fbq) window.fbq('track', 'AddToCart', {
        content_name: product.name,
        content_ids: [String(product.id)],
        content_type: 'product',
        value: (product.price || 0) * quantity,
        currency: 'BDT',
    });
    if (window.gtag) window.gtag('event', 'add_to_cart', {
        currency: 'BDT',
        value: (product.price || 0) * quantity,
        items: [{ item_id: String(product.id), item_name: product.name, quantity }],
    });
}

// --- Reached checkout page ---
export function trackInitiateCheckout(items = [], total = 0) {
    if (window.fbq) window.fbq('track', 'InitiateCheckout', {
        content_ids: items.map(i => String(i.id)),
        num_items: items.length,
        value: total,
        currency: 'BDT',
    });
    if (window.gtag) window.gtag('event', 'begin_checkout', {
        currency: 'BDT',
        value: total,
        items: items.map(i => ({ item_id: String(i.id), item_name: i.name, quantity: i.quantity })),
    });
}

// --- Order placed successfully ---
export function trackPurchase(orderId, items = [], total = 0) {
    if (window.fbq) window.fbq('track', 'Purchase', {
        content_ids: items.map(i => String(i.id)),
        num_items: items.length,
        value: total,
        currency: 'BDT',
    });
    if (window.gtag) window.gtag('event', 'purchase', {
        transaction_id: String(orderId),
        currency: 'BDT',
        value: total,
        items: items.map(i => ({ item_id: String(i.id), item_name: i.name, quantity: i.quantity })),
    });
}

// --- Clicked "Order on Messenger" ---
export function trackMessengerClick(product) {
    if (window.fbq) window.fbq('track', 'Contact', product ? {
        content_name: product.name,
        content_ids: [String(product.id)],
    } : undefined);
    if (window.gtag) window.gtag('event', 'contact_messenger', product ? {
        item_name: product.name,
    } : {});
}
