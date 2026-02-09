import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            if (token && !user) {
                setLoading(true);
                try {
                    const response = await api.post('/me');
                    setUser(response.data);
                } catch (error) {
                    console.error("Token verification failed", error);
                    logout();
                } finally {
                    setLoading(false);
                }
            } else if (!token) {
                setUser(null);
                setLoading(false);
            } else {
                setLoading(false);
            }
        };
        fetchUser();
    }, [token, user]);

    const login = async (email, password) => {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        try {
            const response = await api.post('/auth/login', formData);
            const { access_token } = response.data;

            // Set token in state and local storage
            localStorage.setItem('token', access_token);
            setToken(access_token);

            // Fetch user profile immediately
            const userRes = await api.post('/me', {}, {
                headers: { Authorization: `Bearer ${access_token}` }
            });
            setUser(userRes.data);

            return { success: true };
        } catch (error) {
            console.error("Login failed", error);
            let errorMessage = "Login failed";
            if (error.response?.data?.detail) {
                const detail = error.response.data.detail;
                if (Array.isArray(detail)) {
                    errorMessage = detail.map(err => {
                        const field = err.loc && err.loc.length > 0 ? err.loc[err.loc.length - 1] : 'Field';
                        return `${field}: ${err.msg}`;
                    }).join('\n');
                } else if (typeof detail === 'object') {
                    errorMessage = JSON.stringify(detail);
                } else {
                    errorMessage = detail;
                }
            }
            return { success: false, error: errorMessage };
        }
    };

    const acceptInvite = async (token, userData) => {
        try {
            const response = await api.post(`/invite/accept/${token}`, userData);
            const { access_token } = response.data;

            localStorage.setItem('token', access_token);
            setToken(access_token);
            setUser(response.data.user);

            return { success: true };
        } catch (error) {
            console.error("Invite acceptance failed", error);
            return { success: false, error: error.response?.data?.detail || "Failed to accept invite" };
        }
    };

    const register = async (userData) => {
        try {
            await api.post('/auth/admin', userData);
            return await login(userData.email, userData.password);
        } catch (error) {
            let errorMessage = "Registration failed";
            if (error.response?.data?.detail) {
                const detail = error.response.data.detail;
                if (Array.isArray(detail)) {
                    errorMessage = detail.map(err => {
                        const field = err.loc && err.loc.length > 0 ? err.loc[err.loc.length - 1] : 'Field';
                        return `${field}: ${err.msg}`;
                    }).join('\n');
                } else if (typeof detail === 'object') {
                    errorMessage = JSON.stringify(detail);
                } else {
                    errorMessage = detail;
                }
            }
            return { success: false, error: errorMessage };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, register, acceptInvite, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
