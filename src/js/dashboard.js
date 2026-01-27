import '../style.css';
import { API_URL } from './config.js';
import { initSidebar } from './shared-sidebar.js';

export async function fetchStats() {
    try {
        const res = await fetch(`${API_URL}/stats`);
        const data = await res.json();

        document.getElementById('stat-leads').innerText = data.leads;
        document.getElementById('stat-projects').innerText = data.projects;
        document.getElementById('stat-tasks').innerText = data.tasks;
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

export async function fetchTasks() {
    try {
        const res = await fetch(`${API_URL}/tasks`);
        const tasks = await res.json();

        const tasksList = document.getElementById('tasks-list');
        const visitsList = document.getElementById('visits-list');

        tasksList.innerHTML = '';
        visitsList.innerHTML = '';

        // Urgent tasks (First 5 that are not done and NOT project/commerce-linked)
        const urgentTasks = tasks.filter(t => t.status !== 'Done' && !t.projectId && !t.commerceId).slice(0, 5);

        urgentTasks.forEach(task => {
            const div = document.createElement('div');
            const commerceTag = task.commerceName ? `<span class="block text-[10px] text-orange-400 mt-1">🏪 ${task.commerceName}</span>` : '';
            div.className = 'bg-white/5 p-3 rounded-lg border border-white/5 flex justify-between items-center';
            div.innerHTML = `
                <div>
                    <h4 class="font-medium text-sm">
                        ${task.name}
                        ${commerceTag}
                    </h4>
                    <span class="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">${task.category}</span>
                </div>
                <span class="text-xs text-gray-400">${task.dueDate || 'No date'}</span>
            `;
            tasksList.appendChild(div);
        });

        // Visits (In-person only)
        const visits = tasks.filter(t => t.isInPerson).slice(0, 5);

        if (visits.length === 0) {
            visitsList.innerHTML = '<p class="text-gray-500 italic">Aucune visite prévue pour le moment.</p>';
        }

        visits.forEach(visit => {
            const div = document.createElement('div');
            div.className = 'bg-gradient-to-r from-blue-500/10 to-transparent p-4 rounded-lg border-l-2 border-blue-500 flex justify-between items-center';
            div.innerHTML = `
                <div>
                    <h4 class="font-medium">${visit.name}</h4>
                    <p class="text-sm text-gray-400">📅 ${visit.dueDate}</p>
                </div>
                <button class="text-sm bg-white/10 hover:bg-white/20 px-3 py-1 rounded transition-colors">Détails</button>
            `;
            visitsList.appendChild(div);
        });

    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

// --- Lead Modal Logic ---
const modal = document.getElementById('modal-overlay');
const btnOpen = document.getElementById('btn-open-lead-modal');
const btnClose = document.getElementById('btn-close-lead-modal');
const leadForm = document.getElementById('lead-form');

function openModal() {
    modal.classList.remove('hidden');
    setTimeout(() => {
        const input = leadForm.querySelector('input[name="name"]');
        if (input) input.focus();
    }, 100);
}

function closeModal() {
    modal.classList.add('hidden');
    leadForm.reset();
}

btnOpen?.addEventListener('click', openModal);
btnClose?.addEventListener('click', closeModal);

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
            fetchStats();
            fetchTasks();
        } else {
            alert('Erreur lors de la création du lead');
        }
    } catch (err) {
        console.error(err);
        alert('Erreur réseau');
    }
});

// Init
fetchStats();
fetchTasks();
initSidebar();
