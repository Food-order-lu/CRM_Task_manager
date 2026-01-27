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
    document.getElementById('qr-container').classList.add('hidden');
    hideError();
});

document.getElementById('show-qr-btn')?.addEventListener('click', async () => {
    // We need the email from the tempToken (or state)
    // For simplicity, we use the value from the form input since we just logged in
    const email = document.getElementById('email').value;

    try {
        const res = await fetch(`${API_URL}/auth/qr-code?email=${encodeURIComponent(email)}`);
        if (res.ok) {
            const data = await res.json();
            document.getElementById('qr-image').src = data.qrCode;
            document.getElementById('qr-container').classList.remove('hidden');
        } else {
            showError('Impossible de charger le QR Code');
        }
    } catch (e) {
        showError('Erreur réseau');
    }
});

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
}

function hideError() {
    errorMsg.classList.add('hidden');
}
