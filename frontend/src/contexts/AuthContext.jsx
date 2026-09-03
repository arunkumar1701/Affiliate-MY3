import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const cachedUser = localStorage.getItem('user');
    if (token && cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
        fetchMe(token);
      } catch {}
    } else {
      setLoading(false);
    }
  }, []);

  const fetchMe = async (token) => {
    try {
      const { data } = await api.get('/auth/me', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setUser(data.data);
      localStorage.setItem('user', JSON.stringify(data.data));
    } catch (e) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    let supabaseToken = null;
    if (supabase) {
      try {
        const { data } = await supabase.auth.signInWithPassword({ email, password });
        if (data?.session?.access_token) supabaseToken = data.session.access_token;
      } catch {}
    }
    const { data } = await api.post('/auth/login', { email, password, supabaseToken });
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    setUser(data.data.user);
    return data.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const hasRole = (role) => user?.role === role;
  const isAdmin = () => user?.role === 'ADMIN';
  const isAffiliate = () => user?.role === 'AFFILIATE' || (user?.affiliateId && user?.role !== 'ADMIN');

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser, hasRole, isAdmin, isAffiliate }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
