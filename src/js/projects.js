import '../style.css';
import { showConfirm } from './utils/confirm.js';
import { API_URL } from './config.js';
import { initSidebar } from './shared-sidebar.js';

let allProjects = [];
let currentFilter = 'all';

const statusMap = {
    'planned': '🎯 Planifié',
    'in progress': '🔄 En cours',
    'completed': '✅ Terminé',
    'done': '✅ Terminé',
    'archived': '📁 Archivé'
};

const displayStatuses = ['🎯 Planifié', '🔄 En cours', '✅ Terminé', '📁 Archivé'];

export async function initProjects() {
    try {
        const res = await fetch(`${API_URL}/projects`);
        const rawProjects = await res.json();

        allProjects = rawProjects.map(p => {
            const raw = (p.status || '').toLowerCase();
            let mapped = '🔄 En cours'; // Default

            if (p.status && p.status.includes('🎯')) mapped = '🎯 Planifié';
            else if (p.status && p.status.includes('🔄')) mapped = '🔄 En cours';
            else if (p.status && p.status.includes('✅')) mapped = '✅ Terminé';
            else if (p.status && p.status.includes('📁')) mapped = '📁 Archivé';
            else {
                mapped = statusMap[raw] || p.status || '🔄 En cours';
            }
            return { ...p, status: mapped };
        });

        renderProjects();
    } catch (error) {
        console.error('Error fetching projects:', error);
    }
}

function renderProjects() {
    const grid = document.getElementById('projects-grid');
    grid.innerHTML = '';

    const filtered = currentFilter === 'all'
        ? allProjects.filter(p => p.status !== '📁 Archivé') // Hide archived from 'All' by default
        : allProjects.filter(p => p.status === currentFilter);

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full p-12 text-center text-gray-500 italic">Aucun projet "${currentFilter === 'all' ? '' : currentFilter}" pour le moment.</div>`;
        updateTabUI();
        return;
    }

    filtered.forEach(project => {
        const card = document.createElement('div');
        const isArchived = project.status === '📁 Archivé';
        card.className = `glass-card p-5 border-white/10 hover:border-blue-500/30 transition-all flex flex-col group relative ${isArchived ? 'opacity-60' : ''}`;

        const progress = project.progress !== undefined ? project.progress : 0;

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4 gap-2">
                <div class="min-w-0 flex-1">
                    <h3 class="text-lg font-bold text-white group-hover:text-blue-400 transition-colors truncate capitalize">${project.name}</h3>
                    <div class="flex items-center mt-1.5 space-x-2">
                         <span class="text-[10px] px-2 py-0.5 bg-blue-500/10 rounded text-blue-400 font-bold uppercase tracking-wider border border-blue-500/10">${project.status}</span>
                    </div>
                </div>
                <div class="flex items-center space-x-1 shrink-0 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                    <button class="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white border border-white/5" onclick="archiveProject('${project.id}', ${isArchived})" title="${isArchived ? 'Désarchiver' : 'Archiver'}">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                        </svg>
                    </button>
                    <button class="p-2 hover:bg-red-500/20 rounded-xl text-gray-400 hover:text-red-400 border border-white/5" onclick="deleteProject('${project.id}', '${project.name.replace(/'/g, "\\'")}')" title="Supprimer">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.177H8.082a2.25 2.25 0 01-2.244-2.177L7.103 5.42m11.021-3.112a1.65 1.65 0 00-1.803-1.67L10.5 2.5a1.65 1.65 0 00-1.803 1.67m9.914 0a1.65 1.65 0 00-1.803-1.67L10.5 2.5a1.65 1.65 0 00-1.803 1.67" />
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="mt-4">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs text-gray-500 font-medium">Progression</span>
                    <span class="text-xs font-bold text-blue-400">${progress}%</span>
                </div>
                <div class="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-1000" style="width: ${progress}%"></div>
                </div>
            </div>

            <div class="mt-auto pt-6">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                         <div class="flex -space-x-1.5">
                            <div class="w-6 h-6 rounded-full border border-liv-card bg-orange-400/80 flex items-center justify-center text-[8px] font-bold text-white">L</div>
                            <div class="w-6 h-6 rounded-full border border-liv-card bg-blue-500/80 flex items-center justify-center text-[8px] font-bold text-white">V</div>
                        </div>
                        <select class="bg-transparent text-[10px] font-bold text-gray-500 outline-none cursor-pointer hover:text-white transition-colors" 
                                onchange="updateStatus('${project.id}', this.value)">
                            ${displayStatuses.map(s => `<option value="${s}" ${project.status === s ? 'selected' : ''}>${s.split(' ')[1] || s}</option>`).join('')}
                        </select>
                    </div>
                    <a href="/project-tasks.html?id=${project.id}&name=${encodeURIComponent(project.name)}" 
                       class="text-xs font-bold bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-blue-500/20">
                        Ouvrir
                    </a>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    updateTabUI();
}

window.filterByStatus = (status) => {
    currentFilter = status;
    renderProjects();
};

window.archiveProject = async (id, unarchive = false) => {
    if (!unarchive) {
        const confirmed = await showConfirm({
            title: 'Archiver le projet ?',
            message: 'Le projet sera déplacé dans l\'onglet "Archivées". Vous pourrez le restaurer à tout moment.',
            confirmText: 'Archiver',
            type: 'warning'
        });
        if (!confirmed) return;
    }

    const nextStatus = unarchive ? '🔄 En cours' : '📁 Archivé';
    await window.updateStatus(id, nextStatus);
};

window.updateStatus = async (id, nextStatus) => {
    try {
        const res = await fetch(`${API_URL}/projects/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus })
        });
        if (res.ok) {
            initProjects();
        } else {
            const err = await res.json();
            alert(`Erreur : ${err.error || 'Impossible de mettre à jour'}`);
        }
    } catch (e) {
        console.error(e);
    }
};

function updateTabUI() {
    const tabs = {
        'all': document.getElementById('filter-all'),
        '🎯 Planifié': document.getElementById('filter-planned'),
        '🔄 En cours': document.getElementById('filter-progress'),
        '✅ Terminé': document.getElementById('filter-done'),
        '📁 Archivé': document.getElementById('filter-archived')
    };

    Object.entries(tabs).forEach(([status, el]) => {
        if (!el) return;
        if (status === currentFilter) {
            el.className = 'project-tab px-4 py-2 rounded-lg text-sm font-medium transition-all bg-blue-500 text-white shadow-lg shadow-blue-500/20';
        } else {
            el.className = 'project-tab px-4 py-2 rounded-lg text-sm font-medium transition-all text-gray-400 hover:text-white hover:bg-white/5';
        }
    });
}

window.deleteProject = async (id, name) => {
    const confirmed = await showConfirm({
        title: 'Supprimer le projet ?',
        message: `Êtes-vous sûr de vouloir supprimer "${name}" ?`,
        confirmText: 'Supprimer',
        type: 'danger'
    });

    if (confirmed) {
        try {
            const res = await fetch(`${API_URL}/projects/${id}`, { method: 'DELETE' });
            if (res.ok) initProjects();
            else alert('Erreur lors de la suppression');
        } catch (error) {
            console.error(error);
        }
    }
};

// CRM Leads Loading Logic
async function loadLeads() {
    try {
        const res = await fetch(`${API_URL}/crm`);
        const leads = await res.json();
        const select = document.getElementById('project-lead-select');

        // Filter for leads that are 'En cours' or 'Gagné'
        // Note: Check EXACT status strings from your CRM usage
        const relevantLeads = leads.filter(l =>
            l.status === 'En cours' ||
            l.status === 'Gagné' ||
            l.status === 'In Progress'
        );

        select.innerHTML = '<option value="">Sélectionner un lead...</option>' +
            relevantLeads.map(l => `<option value="${l.name}">${l.name}</option>`).join('');

        // Auto-fill Project Name on selection
        select.addEventListener('change', (e) => {
            const nameInput = document.getElementById('project-name');
            if (e.target.value) {
                nameInput.value = `Projet - ${e.target.value}`;
            } else {
                nameInput.value = '';
            }
        });

    } catch (error) {
        console.error('Error loading leads:', error);
    }
}

// Modal Logic
const modal = document.getElementById('project-modal');
const btnNewProject = document.getElementById('btn-new-project');
const btnCloseModal = document.getElementById('close-project-modal');
const btnCancelModal = document.getElementById('cancel-project-modal');
const projectForm = document.getElementById('project-form');

function openModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    loadLeads(); // Refresh leads when opening
    setTimeout(() => document.getElementById('project-name').focus(), 100);
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    projectForm.reset();
}

// Event listeners
btnNewProject?.addEventListener('click', openModal);
btnCloseModal?.addEventListener('click', closeModal);
btnCancelModal?.addEventListener('click', closeModal);

modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('active')) {
        closeModal();
    }
});

// Form submission
projectForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(projectForm);
    const projectData = {
        name: formData.get('name'),
        description: formData.get('description') || '',
        status: formData.get('status'),
        priority: formData.get('priority'),
        startDate: formData.get('startDate') || null,
        endDate: formData.get('endDate') || null
    };

    try {
        const res = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData)
        });

        if (res.ok) {
            closeModal();
            initProjects();
        } else {
            const error = await res.json();
            alert('Erreur: ' + (error.message || 'Impossible de créer le projet'));
        }
    } catch (error) {
        console.error('Error creating project:', error);
        alert('Erreur réseau. Vérifiez que le serveur est en marche.');
    }
});

initProjects();
initSidebar();

