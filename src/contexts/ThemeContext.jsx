import React, { createContext, useContext, useState, useEffect } from 'react';
import { bigBazarApi } from '../api/client';

const ThemeContext = createContext({ theme: 'light' });

function lockLightColorScheme() {
    try {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.style.colorScheme = 'only light';
        localStorage.setItem('site_theme', 'light');
        // Meta tag for browsers that read it dynamically
        let meta = document.querySelector('meta[name="color-scheme"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'color-scheme');
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', 'light only');
    } catch (_) {}
}

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        bigBazarApi.auth.getSession().then(({ data: { session } }) => {
            setTheme('light');
        });
    }, []);

    useEffect(() => {
        lockLightColorScheme();
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
