import React from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { CheckCircle2, ShoppingBag, Truck, MapPin, Phone, User, Receipt, ArrowRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function OrderConfirmation() {
    const { orderId } = useParams();
    const location = useLocation();
    const { t, language } = useLanguage();
    const orderDetails = location.state?.orderDetails;

    return (
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="text-green-500" size={44} />
            </div>

            <h1 className="text-3xl font-black italic uppercase text-neutral-800 leading-none tracking-tight">
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
                        ID: {orderId}
                    </span>
                </div>

                {orderDetails && (
                    <>
                        <div className="space-y-3">
                            <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest block">📦 ITEMS ORDERED</span>
                            <div className="space-y-2">
                                {orderDetails.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-neutral-800">
                                            {item.quantity}x {item.name}
                                            {item.selectedSize ? ` (${item.selectedSize})` : ''}
                                            {item.selectedColor ? ` (${item.selectedColor})` : ''}
                                        </span>
                                        <span className="font-extrabold text-neutral-900">৳{parseFloat(item.price) * item.quantity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-neutral-100 pt-4 space-y-2">
                            <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest block">📍 DELIVERY & BILLING INFO</span>
                            <div className="space-y-1.5 text-xs text-neutral-600 font-bold">
                                <div className="flex items-center gap-2">
                                    <User size={12} className="text-neutral-400" />
                                    <span>{orderDetails.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone size={12} className="text-neutral-400" />
                                    <span>{orderDetails.phone}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin size={12} className="text-neutral-400" />
                                    <span>{orderDetails.address} | {orderDetails.upazila ? `${orderDetails.upazila}, ` : ''}{orderDetails.district}</span>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-neutral-100 pt-4 space-y-1 text-xs">
                            <div className="flex justify-between text-neutral-500 font-bold">
                                <span>{t('subtotal')}</span>
                                <span>৳{orderDetails.subtotal}</span>
                            </div>
                            <div className="flex justify-between text-neutral-500 font-bold">
                                <span>{t('delivery_charge')}</span>
                                <span>৳{orderDetails.deliveryCharge}</span>
                            </div>
                            <div className="flex justify-between items-end border-t border-neutral-100 pt-3 text-sm">
                                <span className="font-black uppercase text-[#ce112d] italic tracking-wide">{language === 'bn' ? 'পরিশোধযোগ্য মোট' : 'Amount Paid / Due'}</span>
                                <span className="text-xl font-black text-[#ce112d]">৳{orderDetails.finalTotal}</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="flex flex-col gap-3">
                <Link to="/" className="w-full bg-[#ce112d] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2.5 shadow-lg active:scale-95 transition-all">
                    <span>{language === 'bn' ? 'শপিং চালিয়ে যান' : 'Continue Shopping'}</span>
                    <ArrowRight size={16} />
                </Link>
                <div className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">
                    {language === 'bn' ? 'অর্ডার ট্র্যাকিং কোড দিয়ে পরবর্তীতে স্ট্যাটাস চেক করতে পারবেন।' : 'Save the Order ID to track your order later.'}
                </div>
            </div>
        </div>
    );
}
