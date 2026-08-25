import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState(() => {
        try {
            const savedCart = localStorage.getItem('bigbazar_cart');
            if (!savedCart) return [];
            const parsed = JSON.parse(savedCart);
            if (!Array.isArray(parsed)) return [];
            // Sanitize any NaN or invalid items from previous sessions
            return parsed.map(item => ({
                ...item,
                price: typeof item.price === 'number' && !isNaN(item.price) ? item.price : (parseFloat(item.price) || 0),
                quantity: typeof item.quantity === 'number' && !isNaN(item.quantity) ? Math.max(1, item.quantity) : (parseInt(item.quantity, 10) || 1),
                selectedColor: typeof item.selectedColor === 'string' ? item.selectedColor : '',
                selectedSize: typeof item.selectedSize === 'string' ? item.selectedSize : ''
            })).filter(item => item.id && item.price > 0);
        } catch (error) {
            console.error('Error parsing cart from localStorage:', error);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('bigbazar_cart', JSON.stringify(cartItems));
        } catch (error) {
            console.error('Error saving cart to localStorage:', error);
        }
    }, [cartItems]);

    const addToCart = (product, arg2, arg3, arg4) => {
        if (!product) return;
        const price = typeof product.price === 'number' && !isNaN(product.price) 
            ? product.price 
            : (parseFloat(product.price) || 0);

        let color = '';
        let size = '';
        let quantity = 1;

        // Flexible argument handling to prevent any NaN errors
        if (typeof arg2 === 'number') {
            quantity = Math.max(1, parseInt(arg2, 10) || 1);
            size = typeof arg3 === 'string' ? arg3 : '';
            color = typeof arg4 === 'string' ? arg4 : '';
        } else {
            color = typeof arg2 === 'string' ? arg2 : '';
            size = typeof arg3 === 'string' ? arg3 : '';
            quantity = typeof arg4 === 'number' ? Math.max(1, parseInt(arg4, 10) || 1) : 1;
        }

        setCartItems(prev => {
            const existingItemIndex = prev.findIndex(item =>
                item.id === product.id &&
                item.selectedColor === color &&
                item.selectedSize === size
            );

            if (existingItemIndex > -1) {
                const newItems = [...prev];
                const currentQty = parseInt(newItems[existingItemIndex].quantity, 10) || 1;
                newItems[existingItemIndex] = {
                    ...newItems[existingItemIndex],
                    price,
                    quantity: currentQty + quantity
                };
                return newItems;
            }

            return [...prev, {
                ...product,
                price,
                selectedColor: color,
                selectedSize: size,
                quantity,
                cartId: `${product.id}-${color}-${size}`
            }];
        });
    };

    const removeFromCart = (cartId) => {
        setCartItems(prev => prev.filter(item => item.cartId !== cartId));
    };

    const updateQuantity = (cartId, delta) => {
        setCartItems(prev => prev.map(item => {
            if (item.cartId === cartId) {
                const currentQty = parseInt(item.quantity, 10) || 1;
                const newQuantity = Math.max(1, currentQty + delta);
                return { ...item, quantity: newQuantity };
            }
            return item;
        }));
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const cartTotal = cartItems.reduce((total, item) => {
        const p = typeof item.price === 'number' && !isNaN(item.price) ? item.price : (parseFloat(item.price) || 0);
        const q = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : (parseInt(item.quantity, 10) || 1);
        return total + (p * q);
    }, 0);

    const cartCount = cartItems.reduce((total, item) => {
        const q = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : (parseInt(item.quantity, 10) || 1);
        return total + q;
    }, 0);

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            cartTotal,
            cartCount
        }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
