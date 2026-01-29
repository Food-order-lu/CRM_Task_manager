import '../style.css';
import { API_URL } from './config.js';
import { initSidebar } from './shared-sidebar.js';
import { toast } from './utils/notifications.js';

// Initialization
async function init() {
    initSidebar();
    await fetchStats();
    await fetchTasks();
}

export async function fetchStats() {
    try {
        const res = await fetch(`${API_URL}/stats`);
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();

        const leadsEl = document.getElementById('stat-leads');
        const projectsEl = document.getElementById('stat-projects');
        const tasksEl = document.getElementById('stat-tasks');

        if (leadsEl) leadsEl.innerText = data.leads || 0;
        if (projectsEl) projectsEl.innerText = data.projects || 0;
        if (tasksEl) tasksEl.innerText = data.tasks || 0;
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

export async function fetchTasks() {
    try {
        const res = await fetch(`${API_URL}/tasks`);
        if (!res.ok) throw new Error('Failed to fetch tasks');
        const tasks = await res.json();

        const tasksList = document.getElementById('tasks-list');
        const visitsList = document.getElementById('visits-list');

        if (tasksList) {
            tasksList.innerHTML = '';
            // Urgent tasks (First 5 that are not done and NOT project-linked)
            const urgentTasks = tasks.filter(t => t.status !== 'Done' && t.status !== 'Archived' && !t.projectId).slice(0, 5);

            if (urgentTasks.length === 0) {
                tasksList.innerHTML = '<p class="text-gray-500 italic p-4 text-center">Aucune tâche urgente.</p>';
            }

            urgentTasks.forEach(task => {
                const div = document.createElement('div');
                const commerceTag = task.commerceName ? `<span class="block text-[10px] text-orange-400 mt-1 font-bold">🏪 ${task.commerceName}</span>` : '';
                div.className = 'bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center hover:bg-white/10 transition-all';
                div.innerHTML = `
                    <div>
                        <h4 class="font-medium text-sm text-white">
                            ${task.name}
                            ${commerceTag}
                        </h4>
                        <span class="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/10 mt-1 inline-block">${task.category || '-'}</span>
                    </div>
                    <span class="text-xs text-gray-400 font-mono">${task.dueDate || '-'}</span>
                `;
                tasksList.appendChild(div);
            });
        }

        if (visitsList) {
            visitsList.innerHTML = '';
            // Visits (In-person only)
            const visits = tasks.filter(t => t.isInPerson && t.status !== 'Done' && t.status !== 'Archived').slice(0, 5);

            if (visits.length === 0) {
                visitsList.innerHTML = '<p class="text-gray-500 italic p-4 text-center">Aucune visite prévue.</p>';
            }

            visits.forEach(visit => {
                const div = document.createElement('div');
                div.className = 'bg-gradient-to-r from-blue-600/10 to-transparent p-4 rounded-xl border-l-4 border-blue-500 flex justify-between items-center hover:bg-white/5 transition-all';
                div.innerHTML = `
                    <div>
                        <h4 class="font-medium text-white">${visit.name}</h4>
                        <div class="flex items-center space-x-2 mt-1">
                            <span class="text-xs text-blue-400">📅 ${visit.dueDate || '-'}</span>
                            ${visit.commerceName ? `<span class="text-xs text-orange-400 font-bold">🏪 ${visit.commerceName}</span>` : ''}
                        </div>
                    </div>
                    <button class="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-colors text-gray-300">Détails</button>
                `;
                visitsList.appendChild(div);
            });
        }

    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

// --- Lead Modal Logic ---
const modal = document.getElementById('modal-overlay');
const btnOpen = document.getElementById('btn-open-lead-modal');
const btnClose = document.getElementById('btn-close-lead-modal');
const btnCancel = document.getElementById('btn-cancel-lead-modal');
const leadForm = document.getElementById('lead-form');

function openModal() {
    modal?.classList.add('active');
    setTimeout(() => {
        const input = leadForm?.querySelector('input[name="name"]');
        if (input) input.focus();
    }, 100);
}

function closeModal() {
    modal?.classList.remove('active');
    leadForm?.reset();
}

btnOpen?.addEventListener('click', openModal);
btnClose?.addEventListener('click', closeModal);
btnCancel?.addEventListener('click', closeModal);

modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

leadForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(leadForm);
    const data = {
        name: formData.get('name'),
        status: formData.get('status'),
        contact: formData.get('contact'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        category: 'Quick Add'
    };

    try {
        const res = await fetch(`${API_URL}/crm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            closeModal();
            toast.success('Lead créé', `"${data.name}" a été ajouté.`);
            await fetchStats();
            await fetchTasks();
        } else {
            toast.error('Erreur', 'Impossible de créer le lead');
        }
    } catch (err) {
        console.error(err);
        toast.error('Erreur Réseau', 'Le serveur est injoignable');
    }
});

// Global Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
