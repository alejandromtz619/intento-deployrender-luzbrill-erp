import React, { createContext, useContext, useState, useEffect } from 'react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AppContext = createContext(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [primaryColor, setPrimaryColor] = useState(localStorage.getItem('primaryColor') || 'blue');
  const [loading, setLoading] = useState(true);

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Apply primary color
  useEffect(() => {
    document.documentElement.setAttribute('data-theme-color', primaryColor);
    localStorage.setItem('primaryColor', primaryColor);
  }, [primaryColor]);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const userData = JSON.parse(localStorage.getItem('user') || '{}');
          if (userData.id) {
            setUser(userData);
            // Fetch empresa
            const res = await fetch(`${API_URL}/empresas/${userData.empresa_id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              const empresaData = await res.json();
              setEmpresa(empresaData);
            }
          }
        } catch (e) {
          console.error('Auth check failed:', e);
          logout();
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Error de autenticación');
    }
    
    const data = await res.json();
    setToken(data.access_token);
    setUser(data.usuario);
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.usuario));
    
    // Fetch empresa
    const empresaRes = await fetch(`${API_URL}/empresas/${data.usuario.empresa_id}`, {
      headers: { 'Authorization': `Bearer ${data.access_token}` }
    });
    if (empresaRes.ok) {
      const empresaData = await empresaRes.json();
      setEmpresa(empresaData);
    }
    
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setEmpresa(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const api = async (endpoint, options = {}) => {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };
    
    const res = await fetch(`${API_URL}${endpoint}`, config);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Error de servidor' }));
      throw new Error(error.detail || 'Error en la solicitud');
    }
    
    return res.json();
  };

  const value = {
    user,
    empresa,
    token,
    theme,
    primaryColor,
    loading,
    login,
    logout,
    setTheme,
    setPrimaryColor,
    api,
    API_URL
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
