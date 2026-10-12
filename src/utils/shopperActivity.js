import { API_URL } from '../api/client';

const KEY = 'bb_shopper';
const DEBOUNCE_MS = 2000;

function apiBase() {
    return (!API_URL || API_URL === '/') ? '' : String(API_URL).replace(/\/$/, '');
}

export function getShopperId() {
    try {
        let id = localStorage.getItem(KEY);
        if (id && id.length >= 8) return id;
        id = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem(KEY, id);
        return id;
    } catch (_) {
        return '';
    }
}

function itemImage(item) {
    const color = String(item.selectedColor || item.color || '').trim().toLowerCase();
    if (color && Array.isArray(item.available_colors)) {
        const matched = item.available_colors.find((entry) => {
            const name = typeof entry === 'object' ? entry.name : entry;
            return String(name || '').trim().toLowerCase() === color;
        });
        if (matched && typeof matched === 'object' && (matched.image || matched.image_url)) {
            return matched.image || matched.image_url;
        }
    }
    if (item.image_url) return item.image_url;
    if (item.image) return item.image;
    if (Array.isArray(item.images) && item.images[0]) return item.images[0];
    return '';
}

function slimItems(items = []) {
    return (Array.isArray(items) ? items : []).slice(0, 8).map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        selectedColor: item.selectedColor || item.color || '',
        selectedSize: item.selectedSize || item.size || '',
        image: String(itemImage(item) || '').slice(0, 400),
    }));
}

let timer = null;
let pending = {};

export function reportShopperActivity(payload = {}) {
    const browserId = getShopperId();
    if (!browserId) return;
    pending = { ...pending, ...payload, browser_id: browserId };
    if (Object.prototype.hasOwnProperty.call(payload, 'cart')) pending.cart = payload.cart;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flushShopperActivity, payload.order_id ? 0 : DEBOUNCE_MS);
}

export function flushShopperActivity() {
    if (timer) {
        clearTimeout(timer);
        timer = null;
    }
    const body = pending;
    pending = {};
    if (!body.browser_id) return;
    fetch(`${apiBase()}/api/shopper/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            browser_id: body.browser_id,
            cart: Array.isArray(body.cart) ? slimItems(body.cart) : undefined,
            checkout_source: body.checkout_source || null,
            checkout_items: Array.isArray(body.checkout_items) ? slimItems(body.checkout_items) : undefined,
            phone: body.phone || '',
            name: body.name || '',
            order_id: body.order_id || null,
        }),
        keepalive: true,
    }).catch(() => {});
}

export function reportCart(cartItems) {
    reportShopperActivity({ cart: cartItems });
}

export function reportCheckout({ source, items, phone, name }) {
    reportShopperActivity({
        checkout_source: source,
        checkout_items: items,
        phone,
        name,
        cart: source === 'cart' ? items : undefined,
    });
}

export function reportShopperOrder(orderId, extra = {}) {
    reportShopperActivity({ order_id: orderId, ...extra });
}
