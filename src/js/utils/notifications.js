import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';

let container = null;
let supabase = null;

function getContainer() {
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

export const toast = {
    show({ title, message, type = 'info', icon = '🔔', duration = 5000 }) {
        const toastEl = document.createElement('div');
        toastEl.className = `toast ${type}`;

        const icons = {
            success: '✅',
            info: '🔔',
            warning: '⚠️',
            error: '❌'
        };

        toastEl.innerHTML = `
            <div class="toast-icon">${icon || icons[type]}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;

        getContainer().appendChild(toastEl);

        // Trigger animation
        setTimeout(() => toastEl.classList.add('active'), 10);

        // Auto remove
        setTimeout(() => {
            toastEl.classList.remove('active');
            setTimeout(() => toastEl.remove(), 400);
        }, duration);

        // System notification
        if ("Notification" in window && Notification.permission === "granted") {
            try {
                new Notification(title, {
                    body: message,
                    icon: '/logo.png'
                });
            } catch (e) {
                console.warn('System Notification error', e);
            }
        }
    },

    success(title, message) { this.show({ title, message, type: 'success', icon: '✅' }); },
    info(title, message) { this.show({ title, message, type: 'info', icon: '🔔' }); },
    warning(title, message) { this.show({ title, message, type: 'warning', icon: '⚠️' }); },
    error(title, message) { this.show({ title, message, type: 'error', icon: '❌' }); },

    async requestPermission() {
        if (!("Notification" in window)) return;
        if (Notification.permission === "default") {
            await Notification.requestPermission();
        }
    },

    initRealtime() {
        if (supabase) return;

        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        const user = JSON.parse(userStr);
        const userName = user.name;

        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        // Shared channel for all app-wide changes
        supabase
            .channel('app-notifications')
            // 1. Tasks & Visits
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'tasks' },
                (payload) => {
                    const newTask = payload.new;
                    if (!newTask) return;
                    const assignees = (newTask.assignee || '').toLowerCase();
                    const me = userName.toLowerCase();
                    const isVisit = !!(newTask.is_in_person || newTask.isInPerson);

                    if (assignees.includes(me)) {
                        this.info('Nouvelle tâche', newTask.name);
                    } else if (isVisit) {
                        this.info('Nouvelle visite', newTask.name);
                    }
                }
            )
            // 2. New Projects
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'projects' },
                (payload) => {
                    const p = payload.new;
                    if (!p) return;
                    this.success('Nouveau projet', p.name);
                }
            )
            // 3. New Leads (Commerces)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'commerces' },
                (payload) => {
                    const c = payload.new;
                    if (!c) return;
                    // We notify if it's a Lead
                    if (c.status === 'Lead') {
                        this.success('Nouveau lead', c.name);
                    }
                }
            )
            .subscribe((status) => {
                console.log('[Realtime] Connection status:', status);
            });

        console.log('Realtime notifications initialized for', userName);
    }
};
