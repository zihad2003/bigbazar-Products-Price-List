import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const ThemeContext = createContext({ theme: 'light' });

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem('site_theme') || 'light';
        } catch (e) {
            return 'light';
        }
    });

    useEffect(() => {
        supabase.from('site_settings').select('value').eq('key', 'site_theme').single()
            .then(({ data }) => {
                if (data?.value?.mode && data.value.mode !== theme) {
                    setTheme(data.value.mode);
                    localStorage.setItem('site_theme', data.value.mode);
                }
            });
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('site_theme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
