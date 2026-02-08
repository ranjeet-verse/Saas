import axios from 'axios';

const API_URL = 'http://localhost:8000'; // Adjust if needed

const api = axios.create({
    baseURL: API_URL,
    // Don't set Content-Type here - let axios handle it automatically
    // This allows FormData to set the correct content-type with boundary
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle 401s (optional auto-logout)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Logic to handle token expiration or invalidity
            // For now, we might just letting the UI handle the redirect
            // or clear local storage here
            // localStorage.removeItem('token');
            // window.location.href = '/login'; 
        }
        return Promise.reject(error);
    }
);

export default api;
