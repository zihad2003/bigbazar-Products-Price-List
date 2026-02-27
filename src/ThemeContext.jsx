import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const ThemeContext = createContext({ theme: 'dark' });

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        supabase.from('site_settings').select('value').eq('key', 'site_theme').single()
            .then(({ data }) => {
                if (data?.value?.mode) {
                    setTheme(data.value.mode);
                }
            });
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
