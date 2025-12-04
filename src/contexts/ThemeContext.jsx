import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getMyBusiness } from '../services/dbService';
import { THEMES } from '../config/themes';

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const { currentUser } = useAuth();
  const [currentTheme, setCurrentTheme] = useState(THEMES.dark);


  const refreshTheme = useCallback(async () => {
    if (currentUser) {
      const business = await getMyBusiness(currentUser.uid, currentUser.email);
      if (business && business.theme && THEMES[business.theme]) {
        setCurrentTheme(THEMES[business.theme]);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    refreshTheme();
  }, [refreshTheme]);

  const value = {
    theme: currentTheme,
    refreshTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}