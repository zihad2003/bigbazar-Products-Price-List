import React, { createContext, useContext, useState, useEffect } from 'react';
import { bigBazarApi } from '../api/client';

const ThemeContext = createContext({ theme: 'light' });

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('light');
    
    useEffect(() => {
        bigBazarApi.auth.getSession().then(({ data: { session } }) => {
            setTheme('light');
        });
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
