const KEY = 'bb_guest_orders';
const MAX_ORDERS = 20;

const BN_DIGITS = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };

export function toAsciiDigits(value) {
    return String(value || '').replace(/[০-৯]/g, (d) => BN_DIGITS[d] || d);
}

export function readGuestOrders() {
    try {
        const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
        return Array.isArray(raw) ? raw.filter((row) => row && row.id) : [];
    } catch (_) {
        return [];
    }
}

export function rememberGuestOrder(order) {
    if (!order?.id) return;
    try {
        const next = [
            {
                id: String(order.id),
                phone: toAsciiDigits(order.phone || '').replace(/[^\d+]/g, ''),
                code: toAsciiDigits(order.code || '').replace(/\D/g, '').slice(0, 6),
                name: String(order.name || '').slice(0, 120),
                total: order.total ?? null,
                at: Date.now(),
            },
            ...readGuestOrders().filter((row) => row.id !== order.id),
        ].slice(0, MAX_ORDERS);
        localStorage.setItem(KEY, JSON.stringify(next));
    } catch (_) {}
}
