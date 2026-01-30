import { API_URL } from './config.js';
import { initSidebar, updateSidebarUser } from './shared-sidebar.js';
import { showConfirm } from './utils/confirm.js';
import { toast } from './utils/notifications.js';

// State
let currentUser = 'Tiago';
let currentViewMode = 'list';
let showArchived = false;

// DOM Elements
let viewContainer, filterSelect, commerceFilter, modalCommerceSelect, taskModal, taskForm;

// Initialization
async function init() {
    viewContainer = document.getElementById('view-container');
    filterSelect = document.getElementById('filter-category');
    commerceFilter = document.getElementById('filter-commerce');
    modalCommerceSelect = document.getElementById('task-commerce');
    taskModal = document.getElementById('task-modal');
    taskForm = document.getElementById('task-form');

    // Setup event listeners
    document.getElementById('view-list')?.addEventListener('click', () => setViewMode('list'));
    document.getElementById('view-kanban')?.addEventListener('click', () => setViewMode('kanban'));
    document.getElementById('btn-new-task')?.addEventListener('click', () => {
        taskForm.reset();
        document.getElementById('editing-task-id').value = '';
        const modalTitle = taskModal.querySelector('h3');
        if (modalTitle) modalTitle.innerText = 'Nouvelle Tâche';
        const submitBtn = document.getElementById('submit-task-btn');
        if (submitBtn) submitBtn.innerText = 'Créer la tâche';
        taskModal?.classList.add('active');
    });

    const btnToggleNewCommerce = document.getElementById('btn-toggle-new-commerce');
    const commerceSelectContainer = document.getElementById('commerce-select-container');
    const newCommerceInputContainer = document.getElementById('new-commerce-input-container');
    const newCommerceInput = document.getElementById('new-commerce-name');

    if (btnToggleNewCommerce) {
        btnToggleNewCommerce.onclick = () => {
            const isAddingNew = newCommerceInputContainer.classList.contains('hidden');
            if (isAddingNew) {
                newCommerceInputContainer.classList.remove('hidden');
                commerceSelectContainer.classList.add('hidden');
                btnToggleNewCommerce.innerText = 'Annuler';
                newCommerceInput.focus();
            } else {
                newCommerceInputContainer.classList.add('hidden');
                commerceSelectContainer.classList.remove('hidden');
                btnToggleNewCommerce.innerText = '+ Nouveau';
                newCommerceInput.value = '';
            }
        };
    }

    // Modal Close logic
    document.querySelectorAll('#close-modal, #cancel-modal, .modal-overlay').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target === el || el.id === 'close-modal' || el.id === 'cancel-modal') {
                taskModal?.classList.remove('active');
                taskForm?.reset();
                newCommerceInputContainer?.classList.add('hidden');
                commerceSelectContainer?.classList.remove('hidden');
                if (btnToggleNewCommerce) btnToggleNewCommerce.innerText = '+ Nouveau';
            }
        });
    });

    // Form Submission
    taskForm?.addEventListener('submit', handleTaskSubmit);

    // Initial Fetch
    const userStr = localStorage.getItem('user');
    if (userStr) {
        currentUser = JSON.parse(userStr).name;
    }

    initSidebar();
    await fetchAllTasks();
}

async function handleTaskSubmit(e) {
    e.preventDefault();
    const formData = new FormData(taskForm);
    const assignees = Array.from(taskForm.querySelectorAll('input[name="assignees"]:checked')).map(cb => cb.value);
    const editingTaskId = formData.get('editingTaskId');

    let commerceId = formData.get('commerceId');
    const newCommerceName = document.getElementById('new-commerce-name')?.value;

    try {
        if (newCommerceName) {
            const cRes = await fetch(`${API_URL}/crm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCommerceName, status: 'Lead' })
            });
            if (!cRes.ok) throw new Error('Erreur lors de la création du commerce');
            const newC = await cRes.json();
            commerceId = newC.id;
        }

        const taskData = {
            name: formData.get('name'),
            category: formData.get('category'),
            assignee: assignees.join(', '),
            dueDate: formData.get('dueDate') || null,
            status: formData.get('status'),
            commerceId: commerceId || null,
            notes: formData.get('notes') || null
        };

        const url = editingTaskId ? `${API_URL}/tasks/${editingTaskId}` : `${API_URL}/tasks`;
        const method = editingTaskId ? 'PATCH' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });

        if (res.ok) {
            taskModal?.classList.remove('active');
            taskForm.reset();
            // Reset commerce toggle
            document.getElementById('new-commerce-input-container')?.classList.add('hidden');
            document.getElementById('commerce-select-container')?.classList.remove('hidden');
            const btn = document.getElementById('btn-toggle-new-commerce');
            if (btn) btn.innerText = '+ Nouveau';

            const successMsg = editingTaskId ? 'Tâche mise à jour' : 'Tâche créée';
            toast.success(successMsg, `${taskData.name} a été enregistré.`);
            await fetchAllTasks();
        } else {
            let errMsg = editingTaskId ? 'Impossible de modifier la tâche' : 'Impossible de créer la tâche';
            try {
                const err = await res.json();
                errMsg = err.error || errMsg;
            } catch (e) {
                errMsg = `Erreur serveur (${res.status})`;
            }
            toast.error('Erreur', errMsg);
        }
    } catch (error) {
        console.error('Error submitting task:', error);
        toast.error('Erreur', error.message);
    }
}

function setViewMode(mode) {
    currentViewMode = mode;
    updateViewToggleUI();
    render();
}

export async function fetchAllTasks() {
    try {
        const [taskRes, commerceRes] = await Promise.all([
            fetch(`${API_URL}/tasks`),
            fetch(`${API_URL}/crm`)
        ]);
        const tasks = await taskRes.json();
        const commerces = await commerceRes.json();

        // Populate filters
        if (commerceFilter) {
            const currentFilter = commerceFilter.value;
            commerceFilter.innerHTML = '<option value="all">Tous les Commerces</option>';
            commerces.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
                commerceFilter.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
            commerceFilter.value = currentFilter;
        }

        if (modalCommerceSelect) {
            const currentSelected = modalCommerceSelect.value;
            modalCommerceSelect.innerHTML = '<option value="">-- Aucun --</option>';
            commerces.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
                modalCommerceSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
            modalCommerceSelect.value = currentSelected;
        }

        // Store data globally for re-rendering during filters
        window.allTasks = tasks;
        window.allCommerces = commerces;

        filterSelect?.removeEventListener('change', render);
        filterSelect?.addEventListener('change', render);

        commerceFilter?.removeEventListener('change', render);
        commerceFilter?.addEventListener('change', render);

        render();

    } catch (error) {
        console.error('Error fetching tasks:', error);
        if (viewContainer) viewContainer.innerHTML = `<div class="p-8 text-center text-red-400">Erreur lors de la récupération des tâches : ${error.message}</div>`;
    }
}

function render() {
    try {
        if (!viewContainer || !window.allTasks) return;

        const categoryFilter = filterSelect?.value || 'all';
        const restaurantFilter = commerceFilter?.value || 'all';
        viewContainer.innerHTML = '';

        let userTasks = window.allTasks.filter(t => {
            const matchesUser = currentUser === 'all' || (t.assignee && t.assignee.includes(currentUser));
            const matchesProject = !t.projectId;
            const matchesCommerce = restaurantFilter === 'all' || (t.commerceId === restaurantFilter);
            const matchesArchive = showArchived ? t.status === 'Archived' : t.status !== 'Archived';
            const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;

            return matchesUser && matchesProject && matchesCommerce && matchesArchive && matchesCategory;
        });

        updateUserUI();
        updateViewToggleUI();
        updateArchiveToggleUI();

        if (userTasks.length === 0) {
            viewContainer.innerHTML = `<div class="p-12 text-center text-gray-500 italic">Aucune tâche trouvée.</div>`;
            return;
        }

        if (currentViewMode === 'list') {
            renderListView(userTasks, viewContainer);
        } else {
            renderKanbanView(userTasks, viewContainer);
        }
    } catch (e) {
        console.error('Render error:', e);
        if (viewContainer) viewContainer.innerHTML = `<div class="p-8 text-center text-red-500">Erreur d'affichage : ${e.message}</div>`;
    }
}

function renderListView(tasks, container) {
    const todo = tasks.filter(t => t.status === 'To do');
    const progress = tasks.filter(t => t.status === 'In progress' || t.status === 'En cours');
    const done = tasks.filter(t => t.status === 'Done');

    container.innerHTML = `
        ${todo.length ? renderSection('📌 À Faire', todo, 'gray') : ''}
        ${progress.length ? renderSection('⚡ En Cours', progress, 'blue') : ''}
        ${done.length ? renderSection('✅ Terminées', done, 'green', 'opacity-60') : ''}
        ${tasks.length === 0 ? '<div class="p-8 text-center text-gray-500">Rien à afficher.</div>' : ''}
    `;
}

function renderSection(title, sectionTasks, color, extraClass = '') {
    return `
        <section class="mb-8 ${extraClass}">
            <h3 class="text-xl font-bold mb-4 flex items-center">
                <span class="bg-${color}-500/10 text-${color}-400 px-2 py-1 rounded-lg mr-2 text-sm">${sectionTasks.length}</span>
                ${title}
            </h3>
            <div class="bg-liv-card/50 rounded-xl border border-white/5 overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-white/5 text-[11px] uppercase tracking-wider text-gray-400 font-bold border-b border-white/5">
                            <th class="p-4 w-10 text-center">Statut</th>
                            <th class="p-4">Tâche</th>
                            <th class="p-4">Commerce</th>
                            <th class="p-4 hidden md:table-cell">Catégorie</th>
                            <th class="p-4">Note</th>
                            <th class="p-4">Date</th>
                            <th class="p-4 text-center">Resp.</th>
                            <th class="p-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">
                        ${sectionTasks.map(t => createListRow(t)).join('')}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function createListRow(task) {
    const isDone = task.status === 'Done' || task.status === 'Archived';
    const restaurantName = task.commerceName || '-';
    const dateStatus = getDateStatus(task.dueDate);
    const categoryName = task.category ? (task.category.includes(' ') ? task.category.split(' ').slice(1).join(' ') : task.category) : '-';

    return `
        <tr class="hover:bg-white/5 transition-all group">
            <td class="p-4 text-center">
                <input type="checkbox" ${isDone ? 'checked' : ''} 
                    class="w-5 h-5 rounded border-white/20 bg-black/20 text-blue-500 focus:ring-0 cursor-pointer"
                    onchange="window.cycleTaskStatus('${task.id}', '${task.status}')">
            </td>
            <td class="p-4">
                <div class="flex flex-col ${isDone ? 'line-through text-gray-500 italic' : 'text-white'}">
                    <span class="font-medium">${task.name}</span>
                </div>
            </td>
            <td class="p-4">
                <span class="text-sm font-bold text-orange-400/80">${restaurantName}</span>
            </td>
            <td class="p-4 hidden md:table-cell">
                <span class="text-[10px] bg-white/5 px-2 py-1 rounded text-gray-400 border border-white/5 whitespace-nowrap">${categoryName}</span>
            </td>
            <td class="p-4 text-center">
                ${task.notes ? `
                    <button class="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-all" 
                        onclick="window.showTaskNote('${task.id}')" title="Voir la note">
                        📝
                    </button>
                ` : '<span class="text-gray-600">-</span>'}
            </td>
            <td class="p-4">
                <div class="flex items-center text-xs text-gray-400 whitespace-nowrap">
                    ${dateStatus.dot ? `<span class="w-1.5 h-1.5 rounded-full ${dateStatus.dot} mr-2"></span>` : ''}
                    ${task.dueDate || '-'}
                </div>
            </td>
            <td class="p-4 text-center">
                <span class="text-[10px] font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">${task.assignee}</span>
            </td>
            <td class="p-4 text-center">
                <div class="flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button class="text-gray-400 hover:text-blue-400 p-1" onclick="window.openEditTaskModal('${task.id}')" title="Modifier">✏️</button>
                    ${isDone && task.status !== 'Archived' ? `
                        <button class="text-gray-400 hover:text-white p-1" onclick="window.archiveTask('${task.id}', true)" title="Archiver">📦</button>
                    ` : ''}
                    ${task.status === 'Archived' ? `
                        <button class="text-gray-400 hover:text-white p-1" onclick="window.archiveTask('${task.id}', false)" title="Désarchiver">↩</button>
                    ` : ''}
                    <button class="text-gray-400 hover:text-red-400 p-1" onclick="window.deleteTask('${task.id}', '${task.name.replace(/'/g, "\\'")}')" title="Supprimer">✕</button>
                </div>
            </td>
        </tr>
    `;
}

function renderKanbanView(tasks, container) {
    container.innerHTML = `<div class="flex space-x-6 h-full overflow-x-auto pb-4">
        ${showArchived ?
            createKanbanColumn('📦 Archivées', 'Archived', tasks, 'border-white/10 bg-white/5') :
            `
            ${createKanbanColumn('📌 À Faire', 'To do', tasks.filter(t => t.status === 'To do'), 'border-gray-500/20 bg-white/5')}
            ${createKanbanColumn('⚡ En Cours', 'In progress', tasks.filter(t => t.status === 'In progress' || t.status === 'En cours'), 'border-blue-500/20 bg-blue-500/5')}
            ${createKanbanColumn('✅ Terminées', 'Done', tasks.filter(t => t.status === 'Done'), 'border-green-500/20 bg-green-500/5')}
            `
        }
    </div>`;
}

function createKanbanColumn(title, statusKey, columnTasks, styleClass) {
    return `
        <div class="w-80 flex flex-col rounded-xl border ${styleClass} min-w-[300px]" ondragover="window.allowDrop(event)" ondrop="window.dropTask(event, '${statusKey}')">
            <div class="p-4 border-b border-white/5 flex justify-between items-center">
                <h3 class="font-bold text-gray-200">${title}</h3>
                <span class="bg-white/10 text-[10px] font-bold px-2 py-0.5 rounded-full">${columnTasks.length}</span>
            </div>
            <div class="p-4 flex-1 space-y-3 min-h-[300px]">
                ${columnTasks.map(t => `
                    <div class="glass-card p-4 hover:border-blue-500/30 transition-all cursor-move relative group" draggable="true" ondragstart="window.dragTask(event, '${t.id}')">
                        <div class="flex justify-between items-start mb-2">
                            <div class="font-bold text-sm ${t.status === 'Done' ? 'line-through text-gray-500' : ''}">${t.name}</div>
                            ${t.notes ? `
                                <button class="text-xs p-1 bg-orange-500/10 text-orange-400 rounded-md hover:bg-orange-500/20" onclick="window.showTaskNote('${t.id}')">📝</button>
                            ` : ''}
                        </div>
                        ${t.commerceName ? `<div class="text-[10px] text-orange-400 font-bold mb-3 flex items-center">🏪 ${t.commerceName}</div>` : ''}
                        <div class="flex justify-between items-center text-[10px] text-gray-400">
                            <span class="bg-white/5 px-2 py-0.5 rounded border border-white/5">${t.category ? (t.category.includes(' ') ? t.category.split(' ')[1] : t.category) : '-'}</span>
                            <span class="flex items-center">${getDateStatus(t.dueDate).dot ? `<span class="w-1.5 h-1.5 rounded-full ${getDateStatus(t.dueDate).dot} mr-1.5"></span>` : ''}${t.dueDate || ''}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Helpers
window.allowDrop = (ev) => ev.preventDefault();
window.dragTask = (ev, id) => ev.dataTransfer.setData("text", id);
window.dropTask = async (ev, newStatus) => {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text");
    if (newStatus === 'Archived') return;
    await updateTaskStatus(id, newStatus);
};

window.cycleTaskStatus = async (id, currentStatus) => {
    const sequence = { 'To do': 'In progress', 'In progress': 'Done', 'En cours': 'Done', 'Done': 'To do' };
    await updateTaskStatus(id, sequence[currentStatus] || 'To do');
};

window.switchUser = (user) => {
    currentUser = user;
    if (user !== 'all') updateSidebarUser(user);
    render();
};

window.setArchiveView = (archived) => {
    showArchived = archived;
    render();
};

window.archiveTask = async (id, shouldArchive) => {
    if (shouldArchive) {
        const confirmed = await showConfirm({
            title: 'Archiver la tâche ?',
            message: 'La tâche sera déplacée dans la section archives.',
            confirmText: 'Archiver',
            type: 'warning'
        });
        if (!confirmed) return;
    }
    await updateTaskStatus(id, shouldArchive ? 'Archived' : 'Done');
};

window.deleteTask = async (id, name) => {
    const confirmed = await showConfirm({ title: 'Supprimer ?', message: `Supprimer "${name}" ?`, confirmText: 'Supprimer', type: 'danger' });
    if (confirmed) {
        const res = await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
        if (res.ok) await fetchAllTasks();
    }
};

async function updateTaskStatus(taskId, newStatus) {
    const res = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
        await fetchAllTasks();
    }
}

function getDateStatus(dueDate) {
    if (!dueDate) return { dot: null };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(dueDate); target.setHours(0, 0, 0, 0);
    const diff = Math.floor((target - today) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return { dot: 'priority-urgent' };
    if (diff === 1) return { dot: 'priority-warning' };
    return { dot: null };
}

function updateArchiveToggleUI() {
    const activeBtn = document.getElementById('tasks-view-active');
    const archivedBtn = document.getElementById('tasks-view-archived');
    if (showArchived) {
        activeBtn?.classList.replace('bg-blue-500', 'text-gray-400');
        archivedBtn?.classList.replace('text-gray-400', 'bg-blue-500');
        archivedBtn?.classList.add('text-white');
    } else {
        archivedBtn?.classList.replace('bg-blue-500', 'text-gray-400');
        activeBtn?.classList.replace('text-gray-400', 'bg-blue-500');
        activeBtn?.classList.add('text-white');
    }
}

function updateUserUI() {
    ['tiago', 'dani', 'all'].forEach(u => {
        const btn = document.getElementById(`user-${u}`);
        if (!btn) return;
        const active = currentUser.toLowerCase() === u;
        btn.className = `user-switch px-3 py-1 text-sm rounded-md transition-all font-medium ${active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`;
    });
}

function updateViewToggleUI() {
    ['list', 'kanban'].forEach(m => {
        const btn = document.getElementById(`view-${m}`);
        if (btn) btn.className = `view-mode-switch px-2 py-1.5 transition-all rounded ${currentViewMode === m ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-400 hover:bg-white/10'}`;
    });
}

window.openEditTaskModal = async (taskId) => {
    try {
        const task = window.allTasks.find(t => t.id === taskId);
        if (!task) return;

        // Fill form
        taskForm.reset();
        document.getElementById('editing-task-id').value = task.id;
        const modalTitle = taskModal.querySelector('h3');
        if (modalTitle) modalTitle.innerText = 'Modifier la tâche';
        const submitBtn = document.getElementById('submit-task-btn');
        if (submitBtn) submitBtn.innerText = 'Mettre à jour';

        taskForm.querySelector('[name="name"]').value = task.name;
        taskForm.querySelector('[name="category"]').value = task.category || '🔧 Opérations';
        taskForm.querySelector('[name="status"]').value = task.status || 'To do';
        taskForm.querySelector('[name="dueDate"]').value = task.dueDate || '';
        taskForm.querySelector('[name="notes"]').value = task.notes || '';
        taskForm.querySelector('[name="commerceId"]').value = task.commerceId || '';

        // Assignees
        const assignees = (task.assignee || '').split(',').map(s => s.trim());
        taskForm.querySelectorAll('input[name="assignees"]').forEach(cb => {
            cb.checked = assignees.includes(cb.value);
        });

        taskModal.classList.add('active');
    } catch (e) {
        console.error(e);
        toast.error('Erreur', 'Impossible de charger les données de la tâche');
    }
};

window.showTaskNote = (taskId) => {
    const task = window.allTasks.find(t => t.id === taskId);
    if (task && task.notes) {
        showConfirm({
            title: `Note: ${task.name}`,
            message: task.notes,
            confirmText: 'Fermer',
            type: 'info'
        });
    }
};

// Global Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
