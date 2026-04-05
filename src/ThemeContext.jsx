import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const ThemeContext = createContext({ theme: 'light' });

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('light');
    
    useEffect(() => {
        setTheme('light');
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('site_theme', 'light');
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
