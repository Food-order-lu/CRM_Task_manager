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

        // Listen for new tasks
        supabase
            .channel('tasks-channel')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'tasks' },
                (payload) => {
                    const newTask = payload.new;
                    const assignees = newTask.assignee || '';
                    const isVisit = newTask.is_in_person || newTask.isInPerson;

                    // Case 1: Assigned to me
                    if (assignees.includes(userName)) {
                        this.info(
                            'Nouvelle tâche attribuée',
                            `Tâche: ${newTask.name}`
                        );
                    }
                    // Case 2: New Visit (Notify if it's a visit, maybe for everyone)
                    else if (isVisit) {
                        this.info(
                            'Nouvelle visite créée',
                            `Client: ${newTask.name}`
                        );
                    }
                }
            )
            .subscribe();

        console.log('Realtime notifications initialized for', userName);
    }
};
