import React, { useState, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, CheckCircle2, AlertCircle, ShoppingBag, Truck } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { allDistricts } from '../data/bdLocations';

export default function ModeratorEntry({ products, onSuccess, onCancel }) {
    const [step, setStep] = useState(1); // 1: Customer & Moderator, 2: Products, 3: Review
    const [formData, setFormData] = useState({
        moderatorName: '',
        name: '',
        phone: '',
        address: '',
        district: '',
        note: '',
        deliveryCharge: 0
    });

    const [cart, setCart] = useState([]);
    const [search, setSearch] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const moderators = ["Orpa", "Zerin", "Farin", "Sanjina"]; // Updated moderators

    const filteredProducts = useMemo(() => {
        return products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.serial_no?.toString() === search);
    }, [products, search]);

    const addToCart = (product) => {
        // If it has variants, we should ideally ask, but for simplicity we can just add and let them edit,
        // or we can auto-pick the first available variant.
        const defaultColor = product.available_colors?.[0]?.name || product.available_colors?.[0] || '';
        const defaultSize = product.available_colors?.[0]?.sizes?.[0]?.name || product.available_sizes?.[0] || '';

        setCart([...cart, {
            ...product,
            cartId: Date.now() + Math.random(),
            quantity: 1,
            selectedColor: typeof defaultColor === 'object' ? defaultColor.name : defaultColor,
            selectedSize: typeof defaultSize === 'object' ? defaultSize.name : defaultSize,
        }]);
    };

    const updateCartItem = (cartId, updates) => {
        setCart(cart.map(item => item.cartId === cartId ? { ...item, ...updates } : item));
    };

    const removeCartItem = (cartId) => {
        setCart(cart.filter(item => item.cartId !== cartId));
    };

    const cartTotal = cart.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
    const finalTotal = cartTotal + parseFloat(formData.deliveryCharge || 0);
    const isExclusiveOrder = cart.some(item => item.is_exclusive);

    const handleSubmit = async () => {
        if (!formData.moderatorName) return setError("Please select a Moderator Name.");
        if (!formData.name || !formData.phone || !formData.address) return setError("Please fill all customer details.");
        if (cart.length === 0) return setError("Cart is empty.");

        setIsSubmitting(true);
        setError('');

        const combinedName = cart.map(item => {
            const parts = [item.name];
            if (item.selectedColor) parts.push(`${item.selectedColor}`);
            if (item.selectedSize) parts.push(`${item.selectedSize}`);
            parts.push(`${item.quantity}pc`);
            return parts.join(' ');
        }).join(' + ');

        const combinedSizes = cart.map(item => item.selectedSize).filter(Boolean).join(', ');
        const combinedColors = cart.map(item => item.selectedColor).filter(Boolean).join(', ');

        try {
            const { error: insertError } = await supabase.from('orders').insert([{
                product_id: cart[0].id,
                product_name: combinedName.substring(0, 1000),
                product_price: cartTotal,
                customer_name: formData.name,
                customer_phone: formData.phone,
                customer_address: `${formData.address} | ${formData.district}`,
                delivery_area: formData.district,
                delivery_charge: parseFloat(formData.deliveryCharge || 0),
                total_amount: finalTotal,
                last_four_digits: 'Manual',
                status: 'Confirmed', // Defaulting to Confirmed for moderator entries
                size: combinedSizes.substring(0, 250) || null,
                color: combinedColors.substring(0, 250) || null,
                is_exclusive_order: isExclusiveOrder || false,
                customer_note: `Mod: ${formData.moderatorName} | Note: ${formData.note}`.substring(0, 500),
                moderator_reference: formData.moderatorName // Ensure to mention error handling if column doesn't exist
            }]);

            if (insertError) {
                if (insertError.message.includes("moderator_reference")) {
                    throw new Error("Column 'moderator_reference' does not exist in 'orders' table. Please add it to your database.");
                }
                throw insertError;
            }

            // Ideally we subtract stock here too
            for (const item of cart) {
                let updatedGlobalStock = item.stock_count;
                if (updatedGlobalStock !== null && updatedGlobalStock !== undefined) {
                    updatedGlobalStock = Math.max(0, updatedGlobalStock - item.quantity);
                    await supabase.from('products').update({
                        stock_count: updatedGlobalStock,
                        is_sold_out: updatedGlobalStock <= 0
                    }).eq('id', item.id);
                }
            }

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
            }, 2000);
        } catch (err) {
            setError(err.message || "Failed to create order.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-neutral-950 border border-white/5 rounded-3xl m-6">
                <CheckCircle2 size={64} className="text-green-500 mb-4" />
                <h2 className="text-2xl font-black italic uppercase text-white mb-2">Order Created!</h2>
                <p className="text-neutral-500 text-sm font-bold uppercase tracking-widest">Redirecting to orders...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-black italic uppercase">Moderator <span className="text-[#ce112d]">Entry</span></h2>
                    <p className="text-neutral-500 text-xs mt-2 uppercase font-bold tracking-widest">Create offline order manually</p>
                </div>
                <button onClick={onCancel} className="px-6 py-3 border border-white/5 rounded-2xl hover:bg-white/5 transition-all text-xs font-black uppercase tracking-widest text-neutral-400">Cancel</button>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-bold">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {isExclusiveOrder && (
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center gap-3 text-orange-500 text-sm font-bold">
                    <AlertCircle size={18} className="shrink-0" />
                    MODERATOR ALERT: This cart contains an exclusive product. Please ensure you collect the required 500 TK advance payment from the customer to confirm this order.
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Form & Search */}
                <div className="lg:col-span-2 space-y-6">

                    <div className="bg-neutral-950 border border-white/5 rounded-3xl p-6 space-y-4">
                        <h3 className="text-xs font-black uppercase text-neutral-500 tracking-widest mb-4">1. Moderator & Customer Info</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-neutral-500 block tracking-widest mb-2">Moderator Name <span className="text-red-500">*</span></label>
                                <input
                                    list="moderators"
                                    value={formData.moderatorName}
                                    onChange={e => setFormData({ ...formData, moderatorName: e.target.value })}
                                    className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-sm outline-none focus:border-[#ce112d] transition-all"
                                    placeholder="Enter or select name"
                                />
                                <datalist id="moderators">
                                    {moderators.map(m => <option key={m} value={m} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-neutral-500 block tracking-widest mb-2">Customer Phone <span className="text-red-500">*</span></label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-sm outline-none focus:border-[#ce112d] transition-all"
                                    placeholder="017XXXXXXXX"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-neutral-500 block tracking-widest mb-2">Customer Name <span className="text-red-500">*</span></label>
                                <input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-sm outline-none focus:border-[#ce112d] transition-all"
                                    placeholder="Customer Name"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-neutral-500 block tracking-widest mb-2">District <span className="text-red-500">*</span></label>
                                <select
                                    value={formData.district}
                                    onChange={e => setFormData({ ...formData, district: e.target.value })}
                                    className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-sm outline-none focus:border-[#ce112d] transition-all"
                                >
                                    <option value="">Select District</option>
                                    {allDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-neutral-500 block tracking-widest mb-2">Full Address <span className="text-red-500">*</span></label>
                            <textarea
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-sm outline-none focus:border-[#ce112d] transition-all resize-none"
                                rows="2"
                                placeholder="House, Road, Area..."
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-neutral-500 block tracking-widest mb-2">Order Note (Optional)</label>
                            <input
                                value={formData.note}
                                onChange={e => setFormData({ ...formData, note: e.target.value })}
                                className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-sm outline-none focus:border-[#ce112d] transition-all"
                                placeholder="Any special instructions"
                            />
                        </div>
                    </div>

                    <div className="bg-neutral-950 border border-white/5 rounded-3xl p-6 space-y-4">
                        <h3 className="text-xs font-black uppercase text-neutral-500 tracking-widest mb-4">2. Select Products</h3>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search product by name or serial..."
                                className="w-full bg-black border border-white/10 py-3.5 pl-11 pr-4 rounded-xl text-sm outline-none focus:border-[#ce112d] transition-all"
                            />
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {filteredProducts.map(product => (
                                <div key={product.id} className="flex items-center justify-between p-3 bg-black border border-white/5 rounded-2xl hover:border-[#ce112d]/50 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-neutral-900 rounded-lg overflow-hidden shrink-0">
                                            {(product.image_url || product.images?.[0]) && (
                                                <img src={product.image_url || product.images[0]} className="w-full h-full object-cover" alt="" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black truncate max-w-[200px]">{product.name}</p>
                                            <p className="text-[10px] text-[#ce112d] font-bold">৳{product.price} {product.serial_no && `• SL: #${product.serial_no}`}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => addToCart(product)}
                                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#ce112d] hover:text-white transition-all text-neutral-400"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            ))}
                            {filteredProducts.length === 0 && <p className="text-center text-xs text-neutral-500 py-4">No products found.</p>}
                        </div>
                    </div>
                </div>

                {/* Right Column: Cart & Submit */}
                <div className="space-y-6">
                    <div className="bg-neutral-950 border border-white/5 rounded-3xl p-6 flex flex-col h-full min-h-[400px]">
                        <h3 className="text-xs font-black uppercase text-neutral-500 tracking-widest mb-4 flex items-center justify-between">
                            3. Order Summary
                            <span className="bg-[#ce112d] text-white px-2 py-0.5 rounded text-[8px] font-black">{cart.length} items</span>
                        </h3>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar mb-6">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-2 py-10">
                                    <ShoppingBag size={32} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Cart is empty</p>
                                </div>
                            ) : (
                                cart.map((item) => (
                                    <div key={item.cartId} className="p-3 bg-black border border-white/5 rounded-2xl space-y-3 relative group">
                                        <button
                                            onClick={() => removeCartItem(item.cartId)}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        >
                                            <X size={12} />
                                        </button>

                                        <p className="text-xs font-black truncate pr-4">{item.name}</p>

                                        <div className="grid grid-cols-2 gap-2">
                                            {item.available_colors && item.available_colors.length > 0 && (
                                                <select
                                                    value={item.selectedColor}
                                                    onChange={(e) => updateCartItem(item.cartId, { selectedColor: e.target.value })}
                                                    className="bg-neutral-900 border border-white/10 rounded-lg p-1.5 text-[10px] outline-none"
                                                >
                                                    <option value="">Color</option>
                                                    {item.available_colors.map((c, i) => {
                                                        const cName = typeof c === 'object' ? c.name : c;
                                                        return <option key={i} value={cName}>{cName}</option>;
                                                    })}
                                                </select>
                                            )}

                                            {/* Need to fetch sizes based on selected color ideally, but simple for now */}
                                            <input
                                                value={item.selectedSize}
                                                onChange={(e) => updateCartItem(item.cartId, { selectedSize: e.target.value })}
                                                placeholder="Size/Var"
                                                className="bg-neutral-900 border border-white/10 rounded-lg p-1.5 text-[10px] outline-none w-full"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                            <div className="flex items-center gap-2 bg-neutral-900 rounded-lg px-2 py-1">
                                                <button onClick={() => updateCartItem(item.cartId, { quantity: Math.max(1, item.quantity - 1) })} className="text-neutral-500 hover:text-white"><Minus size={12} /></button>
                                                <span className="text-[10px] font-black w-4 text-center">{item.quantity}</span>
                                                <button onClick={() => updateCartItem(item.cartId, { quantity: item.quantity + 1 })} className="text-neutral-500 hover:text-white"><Plus size={12} /></button>
                                            </div>
                                            <span className="text-[10px] font-black text-[#ce112d]">৳{item.price * item.quantity}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="border-t border-white/5 pt-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Subtotal</span>
                                <span className="text-sm font-black text-white">৳{cartTotal}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Delivery Charge</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-neutral-500">৳</span>
                                    <input
                                        type="number"
                                        value={formData.deliveryCharge}
                                        onChange={e => setFormData({ ...formData, deliveryCharge: e.target.value })}
                                        className="w-20 bg-black border border-white/10 py-1.5 pl-6 pr-2 rounded-lg text-xs font-black text-right outline-none focus:border-[#ce112d]"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-white/5 pt-3">
                                <span className="text-xs font-black text-white uppercase tracking-widest">Total</span>
                                <span className="text-2xl font-black text-[#ce112d]">৳{finalTotal}</span>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full py-4 bg-[#ce112d] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-[0_10px_40px_rgba(206,17,45,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                {isSubmitting ? 'Processing...' : 'Place Order'}
                            </button>
                            <p className="text-[8px] text-center text-neutral-600 font-bold uppercase tracking-widest">Double check before submitting</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
