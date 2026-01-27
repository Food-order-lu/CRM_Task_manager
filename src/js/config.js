// Check Auth
const token = localStorage.getItem('authToken');
if (!token && !window.location.pathname.includes('login.html')) {
    window.location.href = '/login.html';
}

export const API_URL = '/api';
