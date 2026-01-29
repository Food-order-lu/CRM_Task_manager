import { API_URL } from './config.js';
import { initSidebar } from './shared-sidebar.js';
import { showConfirm } from './utils/confirm.js';

// State
export let showArchived = false;
let allLeads = [];

// Initialization
async function init() {
    initSidebar();
    const activeBtn = document.getElementById('crm-view-active');
    const archivedBtn = document.getElementById('crm-view-archived');

    if (activeBtn) activeBtn.onclick = () => setShowArchived(false);
    if (archivedBtn) archivedBtn.onclick = () => setShowArchived(true);

    await fetchLeads();
}

window.setShowArchived = (value) => {
    showArchived = value;
    renderLeads();
    updateArchiveToggleUI();
};

function updateArchiveToggleUI() {
    const activeBtn = document.getElementById('crm-view-active');
    const archivedBtn = document.getElementById('crm-view-archived');
    if (activeBtn && archivedBtn) {
        if (showArchived) {
            activeBtn.classList.remove('bg-blue-500', 'text-white');
            activeBtn.classList.add('text-gray-400', 'hover:text-white');

            archivedBtn.classList.remove('text-gray-400', 'hover:text-white');
            archivedBtn.classList.add('bg-blue-500', 'text-white', 'shadow-lg', 'shadow-blue-500/20');
        } else {
            activeBtn.classList.remove('text-gray-400', 'hover:text-white');
            activeBtn.classList.add('bg-blue-500', 'text-white');

            archivedBtn.classList.remove('bg-blue-500', 'text-white', 'shadow-lg', 'shadow-blue-500/20');
            archivedBtn.classList.add('text-gray-400', 'hover:text-white');
        }
    }
}

export async function fetchLeads() {
    try {
        const res = await fetch(`${API_URL}/crm`);
        if (!res.ok) throw new Error('Failed to fetch leads');
        allLeads = await res.json();
        renderLeads();
    } catch (error) {
        console.error('Error fetching leads:', error);
    }
}

function renderLeads() {
    const cols = {
        'À démarcher': document.getElementById('col-todo'),
        'En cours': document.getElementById('col-progress'),
        'Gagné': document.getElementById('col-won')
    };

    const counts = {
        'À démarcher': document.getElementById('count-todo'),
        'En cours': document.getElementById('count-progress'),
        'Gagné': document.getElementById('count-won')
    };

    // Prepare columns
    Object.entries(cols).forEach(([status, col]) => {
        if (col) {
            col.innerHTML = '';
            // Setup Drop Zones
            col.addEventListener('dragover', (e) => {
                if (showArchived) return;
                e.preventDefault();
                col.classList.add('bg-white/5');
            });

            col.addEventListener('dragleave', () => {
                col.classList.remove('bg-white/5');
            });

            col.addEventListener('drop', async (e) => {
                e.preventDefault();
                col.classList.remove('bg-white/5');
                const leadId = e.dataTransfer.getData('text/plain');
                if (leadId) {
                    await updateLeadStatus(leadId, status);
                }
            });
        }
    });

    // Filtering
    const filteredLeads = allLeads.filter(l => {
        if (showArchived) return l.status === 'Archivé';
        return l.status !== 'Archivé';
    });

    filteredLeads.forEach(lead => {
        const card = document.createElement('div');
        card.className = 'glass-card p-4 hover:border-white/30 transition-all cursor-move group';

        let archiveBtn = '';
        if (lead.status === 'Gagné' && !showArchived) {
            archiveBtn = `
            <button class="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all p-1" onclick="window.archiveLead('${lead.id}', true)" title="Archiver">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
            </button>`;
        } else if (showArchived) {
            archiveBtn = `
            <button class="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all p-1" onclick="window.archiveLead('${lead.id}', false)" title="Désarchiver">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
            </button>`;
        }

        const nameSafe = lead.name ? lead.name.replace(/'/g, "\\'") : 'Nouveau Commerce';

        card.innerHTML = `
            <div class="flex justify-between items-start mb-2 pointer-events-none">
                <h4 class="font-bold text-white">${lead.name}</h4>
                <div class="flex items-center space-x-1 pointer-events-auto">
                    ${archiveBtn}
                    <button class="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1" onclick="window.deleteLead('${lead.id}', '${nameSafe}')" title="Supprimer">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.177H8.082a2.25 2.25 0 01-2.244-2.177L7.103 5.42m11.021-3.112a1.65 1.65 0 00-1.803-1.67L10.5 2.5a1.65 1.65 0 00-1.803 1.67m9.914 0a1.65 1.65 0 00-1.803-1.67L10.5 2.5a1.65 1.65 0 00-1.803 1.67" />
                        </svg>
                    </button>
                </div>
            </div>
            ${lead.contact ? `<p class="text-xs text-gray-400 mb-1 pointer-events-none">👤 ${lead.contact}</p>` : ''}
            ${lead.phone ? `<p class="text-xs text-gray-400 pointer-events-none">📞 ${lead.phone}</p>` : ''}
        `;

        card.draggable = true;
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', lead.id);
            e.dataTransfer.effectAllowed = 'move';
            card.classList.add('opacity-50');
        });
        card.addEventListener('dragend', () => card.classList.remove('opacity-50'));

        if (showArchived) {
            if (cols['Gagné']) cols['Gagné'].appendChild(card);
        } else {
            const targetCol = cols[lead.status] || cols['À démarcher'];
            if (targetCol) targetCol.appendChild(card);
        }
    });

    // Update counts
    Object.keys(counts).forEach(status => {
        if (counts[status] && cols[status]) {
            counts[status].innerText = cols[status].children.length;
        }
    });
}

async function updateLeadStatus(id, newStatus) {
    try {
        const res = await fetch(`${API_URL}/crm/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) await fetchLeads();
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

window.archiveLead = async (id, shouldArchive) => {
    const actionName = shouldArchive ? 'Archiver' : 'Restaurer';
    const confirmed = await showConfirm({
        title: `${actionName} le Commerce ?`,
        message: shouldArchive ? 'Déplacer vers les archives ?' : 'Restaurer en "Gagné" ?',
        confirmText: actionName,
        type: 'warning'
    });

    if (confirmed) {
        await updateLeadStatus(id, shouldArchive ? 'Archivé' : 'Gagné');
    }
};

window.deleteLead = async (id, name) => {
    const confirmed = await showConfirm({
        title: 'Supprimer ?',
        message: `Voulez-vous supprimer "${name}" ?`,
        confirmText: 'Supprimer',
        type: 'danger'
    });

    if (confirmed) {
        try {
            const res = await fetch(`${API_URL}/crm/${id}`, { method: 'DELETE' });
            if (res.ok) await fetchLeads();
        } catch (error) {
            console.error(error);
        }
    }
};

window.openModal = function () {
    const modal = document.getElementById('modal-overlay');
    modal?.classList.add('active');
    setTimeout(() => {
        const input = document.getElementById('lead-form')?.querySelector('input[name="name"]');
        if (input) input.focus();
    }, 100);
}

window.closeModal = function () {
    const modal = document.getElementById('modal-overlay');
    modal?.classList.remove('active');
    document.getElementById('lead-form')?.reset();
}

document.getElementById('lead-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const res = await fetch(`${API_URL}/crm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            window.closeModal();
            await fetchLeads();
        } else {
            alert('Erreur lors de la création');
        }
    } catch (error) {
        console.error('Error:', error);
    }
});

// Global Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
