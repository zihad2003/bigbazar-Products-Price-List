import React, { useState, useEffect } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { CheckCircle2, ShoppingBag, MapPin, Phone, User, Receipt, ArrowRight, Copy, Check, Package } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { bigBazarApi } from '../api/client';

export default function OrderConfirmation() {
    const { orderId } = useParams();
    const location = useLocation();
    const { t, language } = useLanguage();
    const [order, setOrder] = useState(location.state?.orderDetails || null);
    const [loading, setLoading] = useState(!order && !!orderId);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!order && orderId) {
            setLoading(true);
            bigBazarApi.from('orders').select('*').eq('id', orderId).single()
                .then(res => {
                    if (res && res.data) {
                        const dbOrder = res.data;

                        // Parse address
                        const addressParts = (dbOrder.customer_address || '').split(' | ');
                        const address = addressParts[0] || '';
                        const locationParts = addressParts[1] ? addressParts[1].split(', ') : [];
                        const district = locationParts[locationParts.length - 1] || '';
                        const upazila = locationParts.length > 1 ? locationParts[0] : '';

                        // Parse items
                        const parseLine = (str) => {
                            const resItem = { name: str, selectedSize: null, selectedColor: null, quantity: 1, price: 0 };
                            const colorMatch = str.match(/\((?:Color|রঙ):\s*([^)]*)\)/i);
                            const sizeMatch = str.match(/\((?:Size|সাইজ):\s*([^)]*)\)/i);
                            const qtyMatch = str.match(/\((?:Qty|পরিমাণ):\s*(\d+)\)/i);
                            if (colorMatch) resItem.selectedColor = colorMatch[1].trim();
                            if (sizeMatch) resItem.selectedSize = sizeMatch[1].trim();
                            if (qtyMatch) resItem.quantity = parseInt(qtyMatch[1], 10);
                            resItem.name = str.split('(')[0].trim();
                            return resItem;
                        };

                        const parsedItems = (dbOrder.product_name || '').split(' + ').map(parseLine);
                        // Approximate item price if needed
                        if (parsedItems.length === 1) {
                            parsedItems[0].price = dbOrder.product_price / parsedItems[0].quantity;
                        } else {
                            parsedItems.forEach(item => {
                                item.price = dbOrder.product_price / parsedItems.reduce((acc, i) => acc + i.quantity, 0);
                            });
                        }

                        setOrder({
                            id: dbOrder.id,
                            items: parsedItems,
                            name: dbOrder.customer_name,
                            phone: dbOrder.customer_phone,
                            address,
                            upazila,
                            district,
                            subtotal: dbOrder.product_price,
                            deliveryCharge: dbOrder.delivery_charge,
                            finalTotal: dbOrder.total_amount
                        });
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch order confirmation details:", err);
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [orderId, order]);

    const handleCopyId = () => {
        if (order?.id) {
            navigator.clipboard.writeText(order.id);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (loading) {
        return (
            <div className="max-w-xl mx-auto px-4 py-28 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-3 border-[#ce112d] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 animate-pulse">
                    {language === 'bn' ? 'অর্ডার বিবরণ লোড হচ্ছে...' : 'Loading order details...'}
                </p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="max-w-md mx-auto px-4 py-16 text-center space-y-5">
                <div className="w-16 h-16 bg-red-50 text-[#ce112d] rounded-2xl flex items-center justify-center mx-auto border border-red-100 shadow-sm">
                    <ShoppingBag size={28} />
                </div>
                <div className="space-y-1.5">
                    <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
                        {language === 'bn' ? 'অর্ডারটি পাওয়া যায়নি' : 'Order Not Found'}
                    </h1>
                    <p className="text-zinc-500 text-xs leading-relaxed max-w-sm mx-auto">
                        {language === 'bn'
                            ? 'দুঃখিত, আমরা এই আইডি দিয়ে কোনো অর্ডার খুঁজে পাইনি। অনুগ্রহ করে সঠিক অর্ডার আইডি ব্যবহার করুন।'
                            : 'Sorry, we could not find any order with this ID. Please make sure the order ID is correct.'}
                    </p>
                </div>
                <div className="pt-2">
                    <Link to="/" className="inline-flex items-center gap-2 bg-[#ce112d] hover:bg-[#b00e26] text-white px-6 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm active:scale-95">
                        {language === 'bn' ? 'হোমে ফিরে যান' : 'Back to Home'}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
            {/* Header / Icon */}
            <div className="text-center mb-8">
                <div className="relative inline-flex items-center justify-center mb-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100/80 shadow-sm">
                        <CheckCircle2 size={36} className="sm:w-10 sm:h-10 text-emerald-600" />
                    </div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
                    {language === 'bn' ? 'অর্ডার সফল হয়েছে!' : 'Order Placed Successfully!'}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-1.5">
                    {language === 'bn' ? 'আমাদের সাথে কেনাকাটার জন্য আপনাকে ধন্যবাদ' : 'Thank you for shopping with us'}
                </p>
            </div>

            {/* Main Order Card */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 sm:p-7 space-y-6 shadow-sm">
                {/* Order ID Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                        <Receipt size={16} className="text-zinc-400" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            {language === 'bn' ? 'অর্ডার বিস্তারিত' : 'Order Received'}
                        </span>
                    </div>
                    <button
                        onClick={handleCopyId}
                        title="Click to copy Order ID"
                        className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs font-mono text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 px-2.5 py-1 rounded-lg transition-colors group cursor-pointer"
                    >
                        <span className="text-[11px] font-sans font-medium text-zinc-400">ID:</span>
                        <span className="truncate max-w-[180px] sm:max-w-[220px]">{order.id}</span>
                        {copied ? (
                            <Check size={13} className="text-emerald-600 shrink-0" />
                        ) : (
                            <Copy size={13} className="text-zinc-400 group-hover:text-zinc-600 shrink-0" />
                        )}
                    </button>
                </div>

                {/* Items Section */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        <Package size={14} />
                        <span>{language === 'bn' ? 'অর্ডার করা পণ্য' : 'Items Ordered'}</span>
                    </div>
                    <div className="space-y-2.5">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start text-xs sm:text-sm gap-3 py-1">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="bg-zinc-100 text-zinc-800 font-semibold px-2 py-0.5 rounded text-[11px] border border-zinc-200/60">
                                            {item.quantity}x
                                        </span>
                                        <span className="font-semibold text-zinc-800">
                                            {item.name}
                                        </span>
                                    </div>
                                    {(item.selectedSize || item.selectedColor) && (
                                        <div className="flex items-center gap-1.5 pl-7">
                                            {item.selectedSize && (
                                                <span className="text-[11px] font-medium text-zinc-600 bg-zinc-50 border border-zinc-200/50 px-2 py-0.5 rounded-md">
                                                    {language === 'bn' ? 'সাইজ' : 'Size'}: {item.selectedSize}
                                                </span>
                                            )}
                                            {item.selectedColor && (
                                                <span className="text-[11px] font-medium text-zinc-600 bg-zinc-50 border border-zinc-200/50 px-2 py-0.5 rounded-md">
                                                    {language === 'bn' ? 'রঙ' : 'Color'}: {item.selectedColor}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <span className="font-bold text-zinc-900 whitespace-nowrap pt-0.5">
                                    ৳{(parseFloat(item.price || 0) * item.quantity).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Delivery & Billing Info */}
                <div className="pt-4 border-t border-zinc-100 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        <MapPin size={14} />
                        <span>{language === 'bn' ? 'ডেলিভারি ও ঠিকানা' : 'Delivery & Billing Info'}</span>
                    </div>
                    <div className="bg-zinc-50/70 border border-zinc-100 rounded-xl p-3.5 space-y-2 text-xs sm:text-sm text-zinc-700 font-medium">
                        <div className="flex items-center gap-2.5">
                            <User size={14} className="text-zinc-400 shrink-0" />
                            <span className="font-semibold text-zinc-900">{order.name}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <Phone size={14} className="text-zinc-400 shrink-0" />
                            <span className="text-zinc-700">{order.phone}</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <MapPin size={14} className="text-zinc-400 shrink-0 mt-0.5" />
                            <span className="text-zinc-600 leading-relaxed">
                                {order.address} {order.district ? `| ${order.upazila ? `${order.upazila}, ` : ''}${order.district}` : ''}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Financial Breakdown */}
                <div className="pt-4 border-t border-zinc-100 space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between text-zinc-500 font-medium">
                        <span>{t('subtotal')}</span>
                        <span className="text-zinc-800 font-semibold">৳{order.subtotal}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500 font-medium">
                        <span>{t('delivery_charge')}</span>
                        <span className="text-zinc-800 font-semibold">৳{order.deliveryCharge}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-zinc-200/80 pt-3.5 mt-2">
                        <span className="text-sm font-bold text-zinc-900">
                            {language === 'bn' ? 'পরিশোধযোগ্য মোট' : 'Amount Paid / Due'}
                        </span>
                        <span className="text-xl sm:text-2xl font-extrabold text-[#ce112d]">
                            ৳{order.finalTotal}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer Action */}
            <div className="mt-6 space-y-3">
                <Link
                    to="/"
                    className="w-full bg-[#ce112d] hover:bg-[#b00e26] text-white py-3.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-200 active:scale-[0.99]"
                >
                    <span>{language === 'bn' ? 'শপিং চালিয়ে যান' : 'Continue Shopping'}</span>
                    <ArrowRight size={16} />
                </Link>

                <p className="text-[11px] text-zinc-400 text-center font-medium">
                    {language === 'bn'
                        ? 'অর্ডার ট্র্যাকিং কোড ব্যবহার করে পরবর্তীতে আপনার অর্ডারের অবস্থা দেখতে পারবেন।'
                        : 'Save the Order ID to track your order status later.'}
                </p>
            </div>
        </div>
    );
}

