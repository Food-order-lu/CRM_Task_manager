import { API_URL } from './config.js';

const loginForm = document.getElementById('login-form');
const otpForm = document.getElementById('otp-form');
const errorMsg = document.getElementById('error-msg');
const backBtn = document.getElementById('back-to-login');

// State
let tempToken = null;

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            if (data.requires2FA) {
                // Switch to 2FA screen
                tempToken = data.tempToken;
                loginForm.classList.add('hidden');
                otpForm.classList.remove('hidden');
                document.getElementById('otp-code').focus();
            } else {
                // Should not happen if 2FA is enforced, but safe fallback
                window.location.href = '/';
            }
        } else {
            showError(data.error || 'Erreur de connexion');
        }
    } catch (err) {
        showError('Impossible de contacter le serveur');
    }
});

otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const code = document.getElementById('otp-code').value;

    try {
        const res = await fetch(`${API_URL}/auth/verify-2fa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tempToken, token: code })
        });

        const data = await res.json();

        if (res.ok) {
            // Save token and redirect
            localStorage.setItem('authToken', data.token);
            window.location.href = '/';
        } else {
            showError(data.error || 'Code incorrect');
        }
    } catch (err) {
        showError('Erreur de validation');
    }
});

backBtn.addEventListener('click', () => {
    otpForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    document.getElementById('password').value = '';
    hideError();
});

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
}

function hideError() {
    errorMsg.classList.add('hidden');
}
