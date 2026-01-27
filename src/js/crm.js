import '../style.css';
import { showConfirm } from './utils/confirm.js';
import { API_URL } from './config.js';
import { initSidebar } from './shared-sidebar.js';

export let showArchived = false;

window.setShowArchived = (value) => {
    showArchived = value;
    fetchLeads();
    updateArchiveToggleUI();
};

function updateArchiveToggleUI() {
    const activeBtn = document.getElementById('crm-view-active');
    const archivedBtn = document.getElementById('crm-view-archived');
    if (activeBtn && archivedBtn) {
        if (showArchived) {
            activeBtn.classList.replace('bg-blue-500', 'text-gray-400');
            activeBtn.classList.add('hover:text-white');
            activeBtn.classList.remove('text-white');

            archivedBtn.classList.remove('text-gray-400', 'hover:text-white');
            archivedBtn.classList.add('bg-blue-500', 'text-white', 'shadow-lg', 'shadow-blue-500/20');
        } else {
            activeBtn.classList.remove('text-gray-400', 'hover:text-white');
            activeBtn.classList.add('bg-blue-500', 'text-white');

            archivedBtn.classList.replace('bg-blue-500', 'text-gray-400');
            archivedBtn.classList.remove('text-white', 'shadow-lg', 'shadow-blue-500/20');
            archivedBtn.classList.add('hover:text-white');
        }
    }
}

export async function fetchLeads() {
    try {
        const res = await fetch(`${API_URL}/crm`);
        const leads = await res.json();

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

        // Setup Drop Zones
        Object.entries(cols).forEach(([status, col]) => {
            col.innerHTML = '';

            col.addEventListener('dragover', (e) => {
                if (showArchived) return; // Disable drop in archive mode
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
        });

        // Filtering
        const filteredLeads = leads.filter(l => {
            if (showArchived) return l.status === 'Archivé';
            return l.status !== 'Archivé';
        });

        filteredLeads.forEach(lead => {
            const card = document.createElement('div');
            card.className = 'glass-card p-4 hover:border-white/30 transition-all cursor-move group';
            // Status-specific Actions
            let archiveBtn = '';
            if (lead.status === 'Gagné' && !showArchived) {
                archiveBtn = `
                <button class="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all p-1" onclick="archiveLead('${lead.id}', true)" title="Archiver">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                </button>`;
            } else if (showArchived) {
                archiveBtn = `
                <button class="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all p-1" onclick="archiveLead('${lead.id}', false)" title="Désarchiver (Restaurer en Gagné)">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                    </svg>
                </button>`;
            }

            card.innerHTML = `
                <div class="flex justify-between items-start mb-2 pointer-events-none">
                    <h4 class="font-bold text-white">${lead.name}</h4>
                    <div class="flex items-center space-x-1 pointer-events-auto">
                        ${archiveBtn}
                        <button class="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1" onclick="deleteLead('${lead.id}', '${lead.name.replace(/'/g, "\\'")}')" title="Supprimer">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.177H8.082a2.25 2.25 0 01-2.244-2.177L7.103 5.42m11.021-3.112a1.65 1.65 0 00-1.803-1.67L10.5 2.5a1.65 1.65 0 00-1.803 1.67m9.914 0a1.65 1.65 0 00-1.803-1.67L10.5 2.5a1.65 1.65 0 00-1.803 1.67" />
                            </svg>
                        </button>
                    </div>
                </div>
                ${lead.contact ? `<p class="text-xs text-gray-400 mb-1 pointer-events-none">👤 ${lead.contact}</p>` : ''}
                ${lead.phone ? `<p class="text-xs text-gray-400 pointer-events-none">📞 ${lead.phone}</p>` : ''}
            `;

            // Allow drag
            card.draggable = true;
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', lead.id);
                e.dataTransfer.effectAllowed = 'move';
                card.classList.add('opacity-50');
            });
            card.addEventListener('dragend', () => card.classList.remove('opacity-50'));

            if (showArchived) {
                // In Archived mode, put everything in the last column or a specially designated active column for visibility
                // We'll put them in 'Gagné' column (visually 3rd col) for now as a container
                cols['Gagné'].appendChild(card);
            } else {
                if (cols[lead.status]) cols[lead.status].appendChild(card);
                else cols['À démarcher'].appendChild(card);
            }
        });

        // Update counts
        Object.keys(cols).forEach(status => {
            counts[status].innerText = cols[status].children.length;
        });

    } catch (error) {
        console.error('Error fetching leads:', error);
    }
}

async function updateLeadStatus(id, newStatus) {
    try {
        // Optimistic update done by drag/drop conceptually, but we refresh for simplicity
        const res = await fetch(`${API_URL}/crm/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (res.ok) {
            fetchLeads(); // Refresh to confirm position and trigger any side effects
        } else {
            console.error('Failed to update status');
            alert('Erreur lors de la mise à jour du statut');
        }
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

window.archiveLead = async (id, shouldArchive) => {
    const actionName = shouldArchive ? 'Archiver' : 'Restaurer';
    const confirmed = await showConfirm({
        title: `${actionName} le Commerce ?`,
        message: shouldArchive ?
            'Le commerce sera déplacé vers les archives et masqué du tableau actif.' :
            'Le commerce retournera dans la colonne "Gagné".',
        confirmText: actionName,
        type: 'warning'
    });

    if (confirmed) {
        const newStatus = shouldArchive ? 'Archivé' : 'Gagné';
        await updateLeadStatus(id, newStatus);
    }
};

window.deleteLead = async (id, name) => {
    const confirmed = await showConfirm({
        title: 'Supprimer le Lead ?',
        message: `Êtes-vous sûr de vouloir supprimer "${name}" ? Cette action est irréversible.`,
        confirmText: 'Supprimer',
        type: 'danger'
    });

    if (confirmed) {
        try {
            const res = await fetch(`${API_URL}/crm/${id}`, { method: 'DELETE' });
            if (res.ok) fetchLeads();
            else alert('Erreur lors de la suppression');
        } catch (error) {
            console.error(error);
        }
    }
};

fetchLeads();
initSidebar();

// Modal Management
window.openModal = function () {
    document.getElementById('modal-overlay').classList.remove('hidden');
}

window.closeModal = function () {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('lead-form').reset();
}

// Close modal on overlay click
document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
});

// Form submission
document.getElementById('lead-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        contact: formData.get('contact'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        status: formData.get('status')
    };

    try {
        const res = await fetch(`${API_URL}/crm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            closeModal();
            fetchLeads(); // Refresh the board
        } else {
            alert('Erreur lors de la création du lead');
        }
    } catch (error) {
        console.error('Error creating lead:', error);
        alert('Erreur de connexion au serveur');
    }
});
