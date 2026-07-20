import React, { useState, useEffect } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { CheckCircle2, ShoppingBag, MapPin, Phone, User, Receipt, ArrowRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { bigBazarApi } from '../api/client';

export default function OrderConfirmation() {
    const { orderId } = useParams();
    const location = useLocation();
    const { t, language } = useLanguage();
    const [order, setOrder] = useState(location.state?.orderDetails || null);
    const [loading, setLoading] = useState(!order && !!orderId);

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

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-32 text-center flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-[#ce112d] border-t-transparent rounded-full animate-spin" />
                <p className="font-bold text-xs uppercase tracking-widest text-[#ce112d] animate-pulse">
                    {language === 'bn' ? 'অর্ডার বিবরণ লোড হচ্ছে...' : 'Loading order details...'}
                </p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingBag className="text-red-500" size={44} />
                </div>
                <h1 className="text-2xl font-black italic uppercase text-neutral-800 leading-none tracking-tight">
                    {language === 'bn' ? 'অর্ডারটি পাওয়া যায়নি' : 'Order Not Found'}
                </h1>
                <p className="text-neutral-500 text-sm max-w-md mx-auto">
                    {language === 'bn'
                        ? 'দুঃখিত, আমরা এই আইডি দিয়ে কোনো অর্ডার খুঁজে পাইনি। অনুগ্রহ করে সঠিক অর্ডার আইডি ব্যবহার করুন।'
                        : 'Sorry, we could not find any order with this ID. Please make sure the order ID is correct.'}
                </p>
                <div className="pt-4">
                    <Link to="/" className="inline-flex bg-[#ce112d] text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all">
                        {language === 'bn' ? 'হোমে ফিরে যান' : 'Back to Home'}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="text-green-500" size={44} />
            </div>

            <h1 className="text-2xl md:text-3xl font-black italic uppercase text-neutral-800 leading-none tracking-tight">
                {language === 'bn' ? 'অর্ডার সফল হয়েছে!' : 'Order Placed Successfully!'}
            </h1>
            <p className="text-[#ce112d] text-[10px] font-black uppercase tracking-[0.3em] mt-2 mb-8">
                {language === 'bn' ? 'আমাদের সাথে কেনাকাটার জন্য ধন্যবাদ' : 'Thank you for shopping with us'}
            </p>

            <div className="bg-zinc-50 border border-neutral-100 rounded-3xl p-6 md:p-8 text-left space-y-6 shadow-sm mb-8">
                <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
                    <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1.5">
                        <Receipt size={14} /> ORDER RECEIVED
                    </span>
                    <span className="text-xs font-black text-[#ce112d] tracking-wide select-all bg-[#ce112d]/5 px-2.5 py-1 rounded-md">
                        ID: {order.id}
                    </span>
                </div>

                <div className="space-y-3">
                    <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest block">📦 ITEMS ORDERED</span>
                    <div className="space-y-2">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                                <span className="font-bold text-neutral-800">
                                    {item.quantity}x {item.name}
                                    {item.selectedSize ? ` (${item.selectedSize})` : ''}
                                    {item.selectedColor ? ` (${item.selectedColor})` : ''}
                                </span>
                                <span className="font-extrabold text-neutral-900">৳{parseFloat(item.price || 0) * item.quantity}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t border-neutral-100 pt-4 space-y-2">
                    <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest block">📍 DELIVERY & BILLING INFO</span>
                    <div className="space-y-1.5 text-xs text-neutral-600 font-bold">
                        <div className="flex items-center gap-2">
                            <User size={12} className="text-neutral-400" />
                            <span>{order.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone size={12} className="text-neutral-400" />
                            <span>{order.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin size={12} className="text-neutral-400" />
                            <span>{order.address} {order.district ? `| ${order.upazila ? `${order.upazila}, ` : ''}${order.district}` : ''}</span>
                        </div>
                    </div>
                </div>

                <div className="border-t border-neutral-100 pt-4 space-y-1 text-xs">
                    <div className="flex justify-between text-neutral-500 font-bold">
                        <span>{t('subtotal')}</span>
                        <span>৳{order.subtotal}</span>
                    </div>
                    <div className="flex justify-between text-neutral-500 font-bold">
                        <span>{t('delivery_charge')}</span>
                        <span>৳{order.deliveryCharge}</span>
                    </div>
                    <div className="flex justify-between items-end border-t border-neutral-100 pt-3 text-sm">
                        <span className="font-black uppercase text-[#ce112d] italic tracking-wide">{language === 'bn' ? 'পরিশোধযোগ্য মোট' : 'Amount Paid / Due'}</span>
                        <span className="text-xl font-black text-[#ce112d]">৳{order.finalTotal}</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <Link to="/" className="w-full bg-[#ce112d] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2.5 shadow-lg active:scale-95 transition-all">
                    <span>{language === 'bn' ? 'শপিং চালিয়ে যান' : 'Continue Shopping'}</span>
                    <ArrowRight size={16} />
                </Link>
                <div className="text-[9px] uppercase tracking-widest text-[#ce112d] font-bold">
                    {language === 'bn' ? 'অর্ডার ট্র্যাকিং কোড দিয়ে পরবর্তীতে স্ট্যাটাস চেক করতে পারবেন।' : 'Save the Order ID to track your order later.'}
                </div>
            </div>
        </div>
    );
}
