import { API_URL } from './config.js';
import { toast } from './utils/notifications.js';

let currentUserId = 'Tiago'; // Default

export async function checkGoogleStatus(userId = currentUserId) {
    const btn = document.getElementById('btn-google-auth');
    const dot = document.getElementById('google-dot');
    const label = document.querySelector('#google-status-card span.text-xs');

    if (!btn || !dot) return;

    if (label) label.innerText = `Google Calendar (${userId})`;

    try {
        const res = await fetch(`${API_URL}/auth/status?userId=${encodeURIComponent(userId)}`);
        const { googleConnected } = await res.json();

        if (googleConnected) {
            dot.className = 'w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]';
            btn.innerHTML = `
                <svg class="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Connecté</span>
            `;
            btn.className = 'w-full py-2 text-xs font-bold rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 flex items-center justify-center space-x-2';
            btn.onclick = () => alert(`${userId} est déjà connecté.`);
        } else {
            dot.className = 'w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
            btn.innerHTML = `
                <svg class="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12 s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                </svg>
                <span>Se connecter</span>
            `;
            btn.className = 'w-full py-2 text-xs font-bold rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all flex items-center justify-center space-x-2';
            btn.onclick = () => {
                window.open(`${API_URL}/auth/google?userId=${encodeURIComponent(userId)}`, '_blank', 'width=600,height=600');
            };
        }
    } catch (e) {
        console.error('Error checking Google status:', e);
    }
}

// Update the stored user and refresh UI
export function updateSidebarUser(userId) {
    currentUserId = userId;
    checkGoogleStatus(userId);
}

export function initSidebar(initialUser = 'Tiago') {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        currentUserId = user.name;
    } else {
        currentUserId = initialUser;
    }

    checkGoogleStatus(currentUserId);

    // Polling is fine, but we should use the currentUserId
    // Backup Button Logic
    const configSection = document.getElementById('google-status-card')?.parentElement;
    if (configSection && !document.getElementById('btn-backup-dl')) {
        const backupBtn = document.createElement('button');
        backupBtn.id = 'btn-backup-dl';
        backupBtn.className = 'w-full mt-2 py-2 text-xs font-bold rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-all flex items-center justify-center space-x-2 border border-white/5';
        backupBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Sauvegarde Locale</span>
        `;
        configSection.appendChild(backupBtn);

        backupBtn.onclick = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const res = await fetch(`${API_URL}/backup`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `rivego-backup-${new Date().toISOString().split('T')[0]}.db`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                } else {
                    alert('Erreur lors du téléchargement');
                }
            } catch (e) {
                console.error(e);
                alert('Erreur réseau');
            }
        };
    }

    setInterval(() => {
        const btn = document.getElementById('btn-google-auth');
        if (btn && btn.innerText.includes('Se connecter')) {
            checkGoogleStatus(currentUserId);
        }
    }, 10000);
    // Notifications
    toast.requestPermission();
    toast.initRealtime();

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.innerText = 'Se déconnecter'; // Ensure text is set
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            localStorage.removeItem('authToken');
            document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            window.location.href = '/login.html';
        };
    }
}
