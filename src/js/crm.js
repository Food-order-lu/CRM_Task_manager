import '../style.css';

export async function fetchLeads() {
    try {
        const res = await fetch('http://localhost:3000/api/crm');
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

        leads.forEach(lead => {
            const card = document.createElement('div');
            card.className = 'glass-card p-4 hover:border-white/30 transition-all cursor-move group';
            card.innerHTML = `
                <div class="flex justify-between items-start mb-2 pointer-events-none">
                    <h4 class="font-bold text-white">${lead.name}</h4>
                    <button class="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">⋮</button>
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

            card.addEventListener('dragend', () => {
                card.classList.remove('opacity-50');
            });

            if (cols[lead.status]) {
                cols[lead.status].appendChild(card);
            } else {
                cols['À démarcher'].appendChild(card);
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
        const res = await fetch(`http://localhost:3000/api/crm/${id}`, {
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

fetchLeads();

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
        const res = await fetch('http://localhost:3000/api/crm', {
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
