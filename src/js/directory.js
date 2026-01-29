import { API_URL } from './config.js';
import { initSidebar } from './shared-sidebar.js';

let allCommerces = [];
let allTasks = [];
let selectedCommerceId = null;

let listContainer, detailContainer, detailEmpty, searchInput;

async function init() {
    listContainer = document.getElementById('directory-list');
    detailContainer = document.getElementById('directory-detail');
    detailEmpty = document.getElementById('directory-detail-empty');
    searchInput = document.getElementById('directory-search');

    if (!listContainer || !detailContainer) {
        console.error('Critical DOM elements missing');
        return;
    }

    initSidebar();
    await fetchData();
    renderList();

    searchInput?.addEventListener('input', (e) => {
        renderList(e.target.value);
    });
}

async function fetchData() {
    try {
        const [commRes, taskRes] = await Promise.all([
            fetch(`${API_URL}/crm`),
            fetch(`${API_URL}/tasks`)
        ]);
        if (!commRes.ok || !taskRes.ok) throw new Error('Data fetch failed');
        allCommerces = await commRes.json();
        allTasks = await taskRes.json();
    } catch (e) {
        console.error('Fetch error:', e);
        if (listContainer) listContainer.innerHTML = `<div class="p-8 text-center text-red-400">Erreur réseau : ${e.message}</div>`;
    }
}

function renderList(search = '') {
    try {
        if (!listContainer) return;
        listContainer.innerHTML = '';
        const filtered = allCommerces.filter(c =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.contact && c.contact.toLowerCase().includes(search.toLowerCase()))
        );

        if (filtered.length === 0) {
            listContainer.innerHTML = '<div class="p-8 text-center text-gray-500">Aucun résultat</div>';
            return;
        }

        filtered.forEach(c => {
            const item = document.createElement('div');
            item.className = `p-4 cursor-pointer transition-all border-l-4 ${selectedCommerceId === c.id ? 'bg-blue-500/10 border-blue-500' : 'border-transparent hover:bg-white/5'}`;
            item.innerHTML = `
                <div class="flex justify-between items-start mb-1">
                    <span class="font-bold text-white">${c.name}</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded ${getStatusColor(c.status)}">${c.status}</span>
                </div>
                <div class="text-xs text-gray-500 truncate">${c.contact || 'Pas de contact'}</div>
            `;
            item.onclick = () => selectCommerce(c.id);
            listContainer.appendChild(item);
        });
    } catch (e) {
        console.error('RenderList error:', e);
    }
}

function selectCommerce(id) {
    selectedCommerceId = id;
    renderList(searchInput?.value || '');
    renderDetail();

    // On mobile, hide list and show detail
    if (window.innerWidth < 768) {
        if (detailContainer) detailContainer.parentElement.classList.remove('hidden');
        if (listContainer) listContainer.parentElement.classList.add('hidden');
    }
}

window.backToList = function () {
    if (detailContainer) detailContainer.classList.add('hidden');
    if (detailEmpty) detailEmpty.classList.remove('hidden');

    if (window.innerWidth < 768) {
        if (detailContainer) detailContainer.parentElement.classList.add('hidden');
        if (listContainer) listContainer.parentElement.classList.remove('hidden');
    }
}

function renderDetail() {
    try {
        const commerce = allCommerces.find(c => c.id === selectedCommerceId);
        if (!commerce || !detailContainer) return;

        detailEmpty?.classList.add('hidden');
        detailContainer.classList.remove('hidden');

        const nameEl = document.getElementById('detail-name');
        const contactEl = document.getElementById('detail-contact');
        const statusPill = document.getElementById('detail-status-pill');

        if (nameEl) nameEl.innerText = commerce.name;
        if (contactEl) contactEl.innerText = `Contact: ${commerce.contact || '-'} | Email: ${commerce.email || '-'} | Tel: ${commerce.phone || '-'}`;

        if (statusPill) {
            statusPill.innerText = commerce.status;
            statusPill.className = `text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusColor(commerce.status)}`;
        }

        const commerceTasks = allTasks.filter(t => t.commerceId === commerce.id);

        const active = commerceTasks.filter(t => t.status !== 'Done' && t.status !== 'Archived');
        const history = commerceTasks.filter(t => t.status === 'Done' || t.status === 'Archived');

        const activeContainer = document.getElementById('detail-active-tasks');
        const historyContainer = document.getElementById('detail-history-tasks');

        if (activeContainer) {
            activeContainer.innerHTML = active.length
                ? active.map(t => createTaskItem(t)).join('')
                : '<div class="p-4 bg-white/2 rounded-lg text-gray-500 text-sm italic">Aucune tâche en cours</div>';
        }

        if (historyContainer) {
            historyContainer.innerHTML = history.length
                ? history.map(t => createTaskItem(t)).join('')
                : '<div class="p-4 bg-white/2 rounded-lg text-gray-500 text-sm italic">Historique vide</div>';
        }

        const exportBtn = document.getElementById('btn-export-pdf');
        if (exportBtn) exportBtn.onclick = () => exportToPDF(commerce, active, history);
    } catch (e) {
        console.error('RenderDetail error:', e);
    }
}

function createTaskItem(t) {
    const isDone = t.status === 'Done' || t.status === 'Archived';
    return `
        <div class="p-3 bg-white/5 border border-white/5 rounded-lg flex justify-between items-center group">
            <div>
                <h5 class="font-medium text-sm ${isDone ? 'text-gray-500 line-through' : 'text-white'}">${t.name}</h5>
                <div class="flex items-center space-x-2 mt-1">
                    <span class="text-[10px] text-gray-500">${t.category || '-'}</span>
                    <span class="text-[10px] text-blue-400">Assigné: ${t.assignee || '-'}</span>
                </div>
            </div>
            <div class="text-right">
                <span class="text-xs text-gray-500">${t.dueDate || '-'}</span>
                <span class="block text-[10px] ${t.status === 'Done' ? 'text-green-400' : 'text-orange-400'}">${t.status}</span>
            </div>
        </div>
    `;
}

function getStatusColor(status) {
    switch (status) {
        case 'Gagné': return 'bg-green-500/20 text-green-400 border-green-500/20';
        case 'En cours': return 'bg-blue-500/20 text-blue-400 border-blue-500/20';
        case 'Perdu': return 'bg-red-500/20 text-red-400 border-red-500/20';
        default: return 'bg-white/10 text-gray-400 border-white/10';
    }
}

function exportToPDF(commerce, active, history) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const today = new Date().toLocaleDateString('fr-FR');

    const html = `
        <html>
        <head>
            <title>Rapport - ${commerce.name}</title>
            <style>
                body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; }
                .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
                .client-name { font-size: 28px; font-weight: bold; margin: 0; }
                .meta { color: #64748b; font-size: 14px; margin-top: 5px; }
                h3 { font-size: 18px; color: #3b82f6; border-left: 4px solid #3b82f6; padding-left: 10px; margin-top: 30px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { background: #f8fafc; text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
                td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
                .status { font-weight: bold; font-size: 11px; text-transform: uppercase; }
                .footer { margin-top: 50px; font-size: 10px; color: #94a3b8; text-align: center; }
            </style>
        </head>
        <body>
            <div class="header">
                <p class="meta">Rivego CRM Manager - Rapport d'activité du ${today}</p>
                <h1 class="client-name">${commerce.name}</h1>
                <p class="meta">Contact: ${commerce.contact || '-'} | Email: ${commerce.email || '-'} | Tél: ${commerce.phone || '-'}</p>
            </div>

            <h3>Tâches en Cours</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 40%">Tâche</th>
                        <th style="width: 20%">Catégorie</th>
                        <th style="width: 20%">Échéance</th>
                        <th style="width: 20%">Assigné</th>
                    </tr>
                </thead>
                <tbody>
                    ${active.length ? active.map(t => `
                        <tr>
                            <td><b>${t.name}</b></td>
                            <td>${t.category || '-'}</td>
                            <td>${t.dueDate || '-'}</td>
                            <td>${t.assignee || '-'}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="4" style="text-align: center; color: #94a3b8 italic;">Aucune tâche en cours</td></tr>'}
                </tbody>
            </table>

            <h3>Historique des Interventions</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 40%">Tâche</th>
                        <th style="width: 20%">Catégorie</th>
                        <th style="width: 20%">Finie le</th>
                        <th style="width: 20%">Statut</th>
                    </tr>
                </thead>
                <tbody>
                    ${history.length ? history.map(t => `
                        <tr>
                            <td style="color: #64748b;">${t.name}</td>
                            <td>${t.category || '-'}</td>
                            <td>${t.dueDate || '-'}</td>
                            <td><span class="status">${t.status}</span></td>
                        </tr>
                    `).join('') : '<tr><td colspan="4" style="text-align: center; color: #94a3b8 italic;">Historique vide</td></tr>'}
                </tbody>
            </table>

            <div class="footer">
                Document généré par Rivego CRM Manager v1.0 - Page 1/1
            </div>

            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
}

// Global Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
