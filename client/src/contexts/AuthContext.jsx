import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('internhub_token');
    const stored = localStorage.getItem('internhub_user');
    if (token && stored) {
      setUser(JSON.parse(stored));
      // Verify token still valid
      api.get('/auth/me')
        .then(res => setUser(res.data.user))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const { token, user, first_login } = res.data;
    // Include first_login flag in stored user
    const userWithFlag = { ...user, first_login: !!first_login };
    localStorage.setItem('internhub_token', token);
    localStorage.setItem('internhub_user', JSON.stringify(userWithFlag));
    setUser(userWithFlag);
    return userWithFlag;
  };

  const updateUser = (updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('internhub_user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    localStorage.removeItem('internhub_token');
    localStorage.removeItem('internhub_user');
    setUser(null);
  };

  const isAdmin = () => user?.role === 'admin';
  const isIT = () => user?.role === 'it_intern';
  const isBD = () => user?.role === 'bd_intern';
  const isRecruitment = () => user?.role === 'recruitment_intern';
  const isSite4People = () => user?.company === 'site4people';
  const isSIPlacements = () => user?.company === 'si_placements';

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser, isAdmin, isIT, isBD, isRecruitment, isSite4People, isSIPlacements }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
