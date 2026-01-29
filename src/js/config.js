// Check Auth
const token = localStorage.getItem('authToken');
if (!token && !window.location.pathname.includes('login.html')) {
    window.location.href = '/login.html';
}

export const API_URL = '/api';

// Exposed for Realtime notifications if needed (Public anon key is safe in browser)
export const SUPABASE_URL = 'https://kajxjvjckgwykxzrraej.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthanhqdmpja2d3eWt4enJyYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2ODIwNTYsImV4cCI6MjA4NTI1ODA1Nn0.9Z4tPSkjrpdFsapz-dKM4yD4F5LONJeUaNPYcFv0vFU';
