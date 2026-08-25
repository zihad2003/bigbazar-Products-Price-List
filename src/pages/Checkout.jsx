import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Truck, MapPin, CreditCard, AlertCircle, ShoppingBag, User, Phone, Home, Copy, Check, ChevronDown, Package, QrCode } from 'lucide-react';
import { bigBazarApi } from '../api/client';
import { allDistricts, chattogramUpazilas, CHATTOGRAM_DISTRICT, getDeliveryInfo } from '../data/bdLocations';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import BanglaQRPayment from '../components/BanglaQRPayment';
import { trackInitiateCheckout, trackPurchase } from '../utils/analytics';

export default function Checkout() {
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { cartItems, cartTotal, clearCart } = useCart();

    const productIdQuery = searchParams.get('product');
    const colorQuery = searchParams.get('color') || '';
    const sizeQuery = searchParams.get('size') || '';
    const qtyQuery = parseInt(searchParams.get('qty') || '1', 10);

    const [singleProduct, setSingleProduct] = useState(null);
    const [loadingProduct, setLoadingProduct] = useState(false);
    const [error, setError] = useState('');
    const errorRef = useRef(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [paymentOption, setPaymentOption] = useState('advance');

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        district: '',
        upazila: '',
        senderNumber: '',
        note: '',
        paymentMethod: 'cod'
    });

    const bKashNumber = "01857045449";

    // Fetch product detail if direct checkout
    useEffect(() => {
        if (productIdQuery) {
            setLoadingProduct(true);
            bigBazarApi.from('products').select('*').eq('id', productIdQuery)
                .then(({ data, error }) => {
                    const prod = Array.isArray(data) ? data[0] : data;
                    if (prod) {
                        setSingleProduct(prod);
                    } else {
                        setError(language === 'bn' ? "পণ্যটি পাওয়া যায়নি।" : "Product not found.");
                    }
                })
                .catch(() => {
                    setError(language === 'bn' ? "পণ্য লোড করতে ব্যর্থ হয়েছে।" : "Failed to load product.");
                })
                .finally(() => {
                    setLoadingProduct(false);
                });
        }
    }, [productIdQuery, language]);

    // Determine checkout items
    const items = productIdQuery
        ? (singleProduct ? [{
            ...singleProduct,
            quantity: qtyQuery,
            selectedColor: colorQuery,
            selectedSize: sizeQuery
        }] : [])
        : cartItems;

    const subtotal = productIdQuery
        ? (singleProduct ? parseFloat(singleProduct.price) * qtyQuery : 0)
        : cartTotal;

    const needsUpazila = formData.district === CHATTOGRAM_DISTRICT;
    const isLocationComplete = formData.district && (!needsUpazila || formData.upazila);

    const deliveryInfo = isLocationComplete
        ? getDeliveryInfo(formData.district, formData.upazila)
        : null;

    const deliveryCharge = deliveryInfo?.charge ?? 0;
    const finalTotal = subtotal + deliveryCharge;
    const isExclusiveOrder = items.some(item => item.is_exclusive);
    const advanceAmount = isExclusiveOrder ? 500 : (deliveryInfo?.advance ?? deliveryCharge);
    const isConfirmationFee = !isExclusiveOrder && deliveryCharge === 0 && advanceAmount > 0;

    const checkoutTrackedRef = useRef(false);
    useEffect(() => {
        if (!checkoutTrackedRef.current && items.length > 0) {
            checkoutTrackedRef.current = true;
            trackInitiateCheckout(items, subtotal);
        }
    }, [items, subtotal]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'senderNumber' || name === 'phone') {
            setFormData(prev => ({ ...prev, [name]: value.replace(/[^0-9+]/g, '') }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const handleCopyNumber = () => {
        navigator.clipboard.writeText(bKashNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const validateBDNumber = (number) => {
        const cleanNumber = number.replace(/[+]/g, '');
        return /^(?:88)?01[3-9]\d{8}$/.test(cleanNumber);
    };

    const handleConfirmOrder = async () => {
        if (items.length === 0) {
            setError(language === 'bn' ? "আপনার ব্যাগটি খালি আছে। কিছু পণ্য ব্যাগে যুক্ত করুন।" : "Your shopping bag is empty. Please add items to proceed.");
            return;
        }
        if (!formData.name || !formData.phone || !formData.address) {
            setError(language === 'bn' ? "অনুগ্রহ করে সব তথ্য পূরণ করুন (নাম, ফোন, ঠিকানা)।" : "Please fill in all info (Name, Phone, Address).");
            return;
        }
        if (!validateBDNumber(formData.phone)) {
            setError(language === 'bn' ? "সটীক মোবাইল নাম্বার দিন (যেমন: 017XXXXXXXX)।" : "Please enter a valid phone number.");
            return;
        }
        if (!formData.district) {
            setError(language === 'bn' ? "অনুগ্রহ করে আপনার জেলা নির্বাচন করুন।" : "Please select your district.");
            return;
        }
        if (needsUpazila && !formData.upazila) {
            setError(language === 'bn' ? "অনুগ্রহ করে আপনার উপজেলা নির্বাচন করুন।" : "Please select your upazila.");
            return;
        }
        if (formData.paymentMethod === 'bkash' && !formData.senderNumber) {
            setError(language === 'bn' ? "যে নম্বর থেকে টাকা পাঠিয়েছেন সেই নম্বরটি দিন।" : "Please enter the sender number.");
            return;
        }
        if (formData.paymentMethod === 'bangla_qr' && !formData.senderNumber) {
            setError(language === 'bn' ? "প্রেরকের অ্যাকাউন্ট নাম অথবা ট্রানজেকশন আইডি দিন।" : "Please enter the sender account name or transaction ID.");
            return;
        }
        if (formData.paymentMethod === 'cod' && advanceAmount > 0 && !formData.senderNumber) {
            const prefix = isExclusiveOrder ? (language === 'bn' ? 'অগ্রিম' : 'Advance') : 
                          (isConfirmationFee ? (language === 'bn' ? 'অর্ডার কনফার্মেশন ফি' : 'Order Confirmation Fee') : (language === 'bn' ? 'ডেলিভারি চার্জ' : 'Delivery Charge'));
            setError(language === 'bn' ? `${prefix} ৳${advanceAmount} বিকাশে পাঠিয়ে প্রেরকের নম্বরটি দিন।` : `Please send ৳${advanceAmount} ${prefix} and enter sender number.`);
            return;
        }

        setIsSubmitting(true);
        setError('');

        const locationStr = formData.upazila
            ? `${formData.upazila}, ${formData.district}`
            : formData.district;

        try {
            const isSingleItem = items.length === 1;
            const combinedName = items.map(item => {
                let name = item.name || 'Item';
                if (item.selectedColor) name += ` (Color: ${item.selectedColor})`;
                if (item.selectedSize) name += ` (Size: ${item.selectedSize})`;
                
                let vSKU = item.platform_id || null;
                if (item.selectedColor && item.available_colors) {
                    const cObj = item.available_colors.find(c => (typeof c === 'object' ? c.name : c) === item.selectedColor);
                    if (cObj && cObj.sizes) {
                        const sObj = cObj.sizes.find(s => (typeof s === 'object' ? s.name : s) === item.selectedSize);
                        if (sObj && sObj.sku) vSKU = sObj.sku;
                    }
                }
                if (vSKU) name += ` (SKU: ${vSKU})`;
                name += ` (Qty: ${item.quantity})`;
                return name;
            }).join(' + ');

            const combinedSizes = items.map(item => item.selectedSize).filter(Boolean).join(', ');
            const combinedColors = items.map(item => item.selectedColor).filter(Boolean).join(', ');
            const primaryProductId = items[0].id;

            const { data: insertedData, error: insertError } = await bigBazarApi
                .from('orders')
                .insert([{
                    product_id: primaryProductId,
                    product_name: combinedName.substring(0, 1000),
                    product_price: subtotal,
                    customer_name: formData.name,
                    customer_phone: formData.phone,
                    customer_address: `${formData.address} | ${locationStr}`,
                    delivery_area: deliveryInfo.area,
                    delivery_charge: deliveryCharge,
                    total_amount: finalTotal,
                    last_four_digits: formData.senderNumber
                        ? (formData.paymentMethod === 'bkash'
                            ? `bKash: ${formData.senderNumber}`
                            : formData.paymentMethod === 'bangla_qr'
                                ? `Bangla QR (${paymentOption === 'full' ? 'Full ৳' + finalTotal : 'Advance ৳' + advanceAmount}): ${formData.senderNumber}`
                                : `COD: ${formData.senderNumber}`)
                        : (formData.paymentMethod === 'cod' ? 'COD' : ''),
                    status: 'Pending',
                    size: combinedSizes.substring(0, 250) || null,
                    color: combinedColors.substring(0, 250) || null,
                    is_exclusive_order: isExclusiveOrder || false,
                    customer_note: (formData.note ? `${formData.note} | Cart Items: ${combinedName}` : `Cart Items: ${combinedName}`).substring(0, 500),
                    items: items.map(item => ({
                        id: item.id,
                        quantity: item.quantity,
                        selectedColor: item.selectedColor || null,
                        selectedSize: item.selectedSize || null
                    }))
                }]);

            if (insertError) throw insertError;

            // Clear Cart if checking out from Cart
            if (!productIdQuery) {
                clearCart();
            }

            const newOrderId = insertedData?.order_id || insertedData?.id || (Array.isArray(insertedData) ? (insertedData[0]?.order_id || insertedData[0]?.id) : null) || `ORD-${Date.now().toString().slice(-6)}`;
            trackPurchase(newOrderId, items, finalTotal);
            // Navigate to dedicated confirmation route
            navigate(`/order-confirmation/${newOrderId}`, { state: { orderDetails: { ...formData, id: newOrderId, items, subtotal, deliveryCharge, finalTotal } } });
        } catch (err) {
            const errorMsg = err?.message || (language === 'bn' ? "অর্ডার সাবমিট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।" : "Order submission failed. Please try again.");
            setError(errorMsg);
            console.error("Order submission Error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const needsAdvancePayment = formData.paymentMethod === 'bkash' ||
        (formData.paymentMethod === 'cod' && deliveryInfo && advanceAmount > 0);

    if (loadingProduct) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-[#ce112d] border-t-transparent rounded-full animate-spin" />
                <p className="font-bold text-xs uppercase tracking-widest text-[#ce112d] animate-pulse">Loading items details...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
            <Link to="/" className="inline-flex items-center gap-2 mb-6 md:mb-8 text-xs font-black uppercase tracking-widest text-neutral-500 hover:text-neutral-900 transition-colors">
                <ArrowLeft size={16} />
                <span>{language === 'bn' ? 'শপে ফিরে যান' : 'Back to Shop'}</span>
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Form Billing */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-[#ce112d] rounded-2xl flex items-center justify-center shadow-lg rotate-[-5deg]">
                            <ShoppingBag className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black italic uppercase leading-none tracking-tight">
                                {language === 'bn' ? 'অর্ডার ফর্ম' : 'Checkout Billing'}
                            </h2>
                            <p className="text-[#ce112d] text-[10px] font-black uppercase tracking-[0.4em] mt-1">
                                {language === 'bn' ? 'দ্রুত চেকআউট' : 'Quick Checkout'}
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div ref={errorRef} className="p-4 bg-[#ce112d]/10 border border-[#ce112d]/20 rounded-2xl flex items-center gap-3 text-[#ce112d] text-xs font-bold">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{typeof error === 'object' ? (error?.message || JSON.stringify(error)) : String(error)}</span>
                        </div>
                    )}

                    {/* Customer form inputs */}
                    <div className="space-y-4 bg-zinc-50/50 p-6 rounded-3xl border border-neutral-100">
                        <h4 className="text-[10px] font-black uppercase tracking-widest ml-1 text-neutral-400 flex items-center gap-1.5">
                            <User size={13} className="text-neutral-400" />
                            <span>{language === 'bn' ? 'আপনার তথ্য' : 'Customer Info'}</span>
                        </h4>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                            <input type="text" name="name" placeholder={t('placeholder_name')} value={formData.name} onChange={handleInputChange}
                                className="w-full border border-neutral-200 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:border-[#ce112d] outline-none transition-all bg-white" />
                        </div>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                            <input type="tel" name="phone" placeholder={t('placeholder_phone')} value={formData.phone} onChange={handleInputChange}
                                className="w-full border border-neutral-200 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:border-[#ce112d] outline-none transition-all bg-white" />
                        </div>
                        <div className="relative">
                            <Home className="absolute left-4 top-4 text-neutral-400" size={16} />
                            <textarea name="address" placeholder={t('placeholder_address')} value={formData.address} onChange={handleInputChange} rows="2"
                                className="w-full border border-neutral-200 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:border-[#ce112d] outline-none transition-all resize-none bg-white" />
                        </div>
                    </div>

                    {/* Location selector */}
                    <div className="space-y-3 bg-zinc-50/50 p-6 rounded-3xl border border-neutral-100">
                        <h4 className="text-[10px] font-black uppercase tracking-widest ml-1 text-neutral-400 flex items-center gap-1.5">
                            <MapPin size={13} className="text-neutral-400" />
                            <span>{language === 'bn' ? 'ডেলিভারি এরিয়া' : 'Delivery Area'} <span className="text-[#ce112d]">*</span></span>
                        </h4>
                        <div className={`grid gap-3 ${needsUpazila ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            <div className="relative">
                                <select value={formData.district} onChange={(e) => setFormData(p => ({ ...p, district: e.target.value, upazila: '' }))}
                                    className="w-full border border-neutral-200 rounded-xl py-3.5 pl-4 pr-10 text-sm focus:border-[#ce112d] outline-none transition-all appearance-none cursor-pointer bg-white">
                                    <option value="">{language === 'bn' ? 'জেলা নির্বাচন করুন' : 'Select District'}</option>
                                    {allDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
                            </div>
                            {needsUpazila && (
                                <div className="relative">
                                    <select value={formData.upazila} onChange={(e) => setFormData(p => ({ ...p, upazila: e.target.value }))}
                                        className="w-full border border-neutral-200 rounded-xl py-3.5 pl-4 pr-10 text-sm focus:border-[#ce112d] outline-none transition-all appearance-none cursor-pointer bg-white">
                                        <option value="">{language === 'bn' ? 'উপজেলা নির্বাচন করুন' : 'Select Upazila'}</option>
                                        {chattogramUpazilas.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
                                </div>
                            )}
                        </div>

                        {deliveryInfo && (
                            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#ce112d]/5 border border-[#ce112d]/10">
                                <MapPin size={14} className="text-[#ce112d]" />
                                <span className="text-xs font-black text-[#ce112d]">{deliveryInfo.label}</span>
                            </div>
                        )}

                        <div className="pt-2">
                            <input type="text" name="note" placeholder={language === 'bn' ? "বিশেষ নোট (ঐচ্ছিক)" : "Special Note (Optional)"} value={formData.note} onChange={handleInputChange}
                                className="w-full border border-neutral-200 rounded-xl py-3.5 px-4 text-sm focus:border-[#ce112d] outline-none transition-all bg-white" />
                        </div>
                    </div>
                </div>

                {/* Sidebar details */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Order items listing */}
                    <div className="p-6 rounded-3xl border border-neutral-200 bg-white space-y-4 shadow-sm">
                        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                            <Package size={16} className="text-[#ce112d]" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{t('order_summary')} ({items.length} {t('items')})</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-3 pr-2">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs">
                                    <span className="truncate max-w-[220px] font-bold text-neutral-800">
                                        {item.quantity}x {item.name} 
                                        {item.selectedSize ? ` (${item.selectedSize})` : ''}
                                        {item.selectedColor ? ` (${item.selectedColor})` : ''}
                                    </span>
                                    <span className="font-extrabold text-neutral-900">৳{parseFloat(item.price) * item.quantity}</span>
                                </div>
                            ))}
                        </div>

                        {isExclusiveOrder && (
                            <div className="bg-[#ce112d]/10 border border-[#ce112d]/20 rounded-xl p-3 flex items-start gap-2.5">
                                <AlertCircle className="text-[#ce112d] shrink-0 mt-0.5" size={16} />
                                <p className="text-[#ce112d] text-[10px] font-extrabold leading-relaxed">
                                    {language === 'bn'
                                        ? "এটি একটি এক্সক্লুসিভ প্রোডাক্ট। অরডার টি নিশ্চিত করতে ৫০০ টাকা বিকাশ অগ্রিম পরিশোধ করতে হবে।"
                                        : "This is an Exclusive order. An advance payment of 500 TK is required."}
                                </p>
                            </div>
                        )}

                        <div className="border-t border-neutral-100 pt-4 space-y-2">
                            <div className="flex justify-between text-xs font-bold text-neutral-500">
                                <span>{t('subtotal')}</span>
                                <span>৳{subtotal}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-neutral-500">
                                <span>{t('delivery_charge')}</span>
                                <span>{deliveryCharge > 0 ? `৳${deliveryCharge}` : (language === 'bn' ? 'ফ্রি' : 'Free')}</span>
                            </div>
                            <div className="flex justify-between items-end border-t border-neutral-100 pt-3">
                                <span className="text-xs font-black uppercase text-[#ce112d] tracking-wider italic">{language === 'bn' ? 'সর্বমোট' : 'Total Payable'}</span>
                                <span className="text-2xl font-black text-[#ce112d]">৳{finalTotal}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment methods choice */}
                    <div className="p-6 rounded-3xl border border-neutral-200 bg-white space-y-4 shadow-sm">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                            <CreditCard size={13} className="text-neutral-400" />
                            <span>{language === 'bn' ? 'পেমেন্ট পদ্ধতি' : 'Payment Method'}</span>
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'cod', label: language === 'bn' ? 'ক্যাশ অন ক্যাশ' : 'Cash on Delivery', icon: <Truck size={16} /> },
                                { id: 'bkash', label: language === 'bn' ? 'বিকাশ পেমেন্ট' : 'bKash Payment', icon: <CreditCard size={16} /> },
                                { id: 'bangla_qr', label: language === 'bn' ? 'বাংলা কিউআর' : 'Bangla QR', icon: <QrCode size={16} /> }
                            ].map(m => (
                                <button key={m.id} type="button" onClick={() => setFormData(p => ({ ...p, paymentMethod: m.id, senderNumber: '' }))}
                                    className={`p-3 rounded-2xl border-2 transition-all text-center flex flex-col items-center gap-1.5 ${formData.paymentMethod === m.id ? 'border-[#ce112d]/80 bg-[#ce112d]/5' : 'bg-white border-neutral-200'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.paymentMethod === m.id ? 'bg-[#ce112d] text-white' : 'bg-neutral-100 text-neutral-400'}`}>{m.icon}</div>
                                    <p className={`text-[9px] font-black uppercase tracking-tight leading-none ${formData.paymentMethod === m.id ? 'text-[#ce112d]' : 'text-neutral-500'}`}>{m.label}</p>
                                </button>
                            ))}
                        </div>

                        {formData.paymentMethod === 'bangla_qr' && (
                            <BanglaQRPayment
                                advanceAmount={advanceAmount}
                                finalTotal={finalTotal}
                                paymentOption={paymentOption}
                                setPaymentOption={setPaymentOption}
                                senderNumber={formData.senderNumber}
                                onSenderNumberChange={handleInputChange}
                            />
                        )}

                        {formData.paymentMethod !== 'bangla_qr' && needsAdvancePayment && (
                            <div className="bg-[#ce112d]/5 border border-[#ce112d]/10 rounded-2xl p-4 space-y-3">
                                <p className="text-[11px] leading-relaxed font-bold text-neutral-600">
                                    {formData.paymentMethod === 'cod'
                                        ? <>{isExclusiveOrder ? (language === 'bn' ? 'অগ্রিম পেমেন্ট' : 'Advance Payment') : (isConfirmationFee ? (language === 'bn' ? 'কনফার্মেশন ফি' : 'Confirmation Fee') : (language === 'bn' ? 'ডেলিভারি চার্জ' : 'Delivery Charge'))} <strong className="text-[#ce112d]">৳{advanceAmount}</strong> {language === 'bn' ? `বিকাশে সেন্ড মানি করুন। বাকি ৳${finalTotal - advanceAmount} হাতে পেয়ে দিবেন।` : `Send money via bKash. Pay due ৳${finalTotal - advanceAmount} on delivery.`}</>
                                        : <>{language === 'bn' ? 'সর্বমোট' : 'Total'} <strong className="text-[#ce112d]">৳{finalTotal}</strong> {language === 'bn' ? 'আজই সেন্ড মানি করুন।' : 'Send Money to below number.'}</>}
                                </p>
                                <div className="flex items-center gap-3 bg-white border border-neutral-200 p-2.5 rounded-lg justify-between">
                                    <span className="text-sm font-black tracking-widest text-[#ce112d]">{bKashNumber}</span>
                                    <button onClick={handleCopyNumber} className={`p-1.5 rounded-md ${copied ? 'bg-green-500 text-white' : 'bg-neutral-50 text-neutral-400 border border-neutral-100'}`}>
                                        {copied ? <Check size={12} /> : <Copy size={12} />}
                                    </button>
                                </div>
                                <input type="tel" name="senderNumber" placeholder={language === 'bn' ? "বিকাশ নম্বর (যেখান থেকে টাকা পাঠিয়েছেন)" : "Sender bKash number"} value={formData.senderNumber} onChange={handleInputChange}
                                    className="w-full border border-neutral-200 rounded-xl py-2.5 px-4 text-xs focus:border-[#ce112d] outline-none bg-white font-bold" />
                            </div>
                        )}
                    </div>

                    {/* Submit order */}
                    <button onClick={handleConfirmOrder} disabled={isSubmitting || items.length === 0}
                        className="w-full flex items-center justify-center gap-3 py-5 bg-[#ce112d] text-white rounded-3xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] shadow-[0_15px_45px_rgba(206,17,45,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:scale-100">
                        {isSubmitting ? (
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>{language === 'bn' ? "অর্ডার সাবমিট হচ্ছে..." : "Placing Order..."}</span>
                            </div>
                        ) : (
                            <>{t('confirm_order')} <ShoppingBag size={20} /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
