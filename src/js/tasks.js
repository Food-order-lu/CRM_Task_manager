import '../style.css';
import { showConfirm } from './utils/confirm.js';
import { API_URL } from './config.js';
import { initSidebar, updateSidebarUser } from './shared-sidebar.js';

// State
let currentUser = 'Tiago';
let currentViewMode = 'list'; // 'list' or 'kanban'
let showArchived = false;

const validCategories = [
    '🏢 Administratif',
    '💰 Comptabilité',
    '🔧 Opérations',
    '📜 Procédures',
    '💼 Commercial',
    '🍴 Restaurants',
    '📋 Projets',
    'Autre'
];

export async function fetchAllTasks() {
    try {
        const [taskRes, commerceRes] = await Promise.all([
            fetch(`${API_URL}/tasks`),
            fetch(`${API_URL}/crm`)
        ]);
        const tasks = await taskRes.json();
        const commerces = await commerceRes.json();

        const viewContainer = document.getElementById('view-container');
        const filterSelect = document.getElementById('filter-category');
        const commerceFilter = document.getElementById('filter-commerce');
        const modalCommerceSelect = document.getElementById('task-commerce');

        // Populate selects
        if (commerceFilter) {
            const currentFilter = commerceFilter.value;
            commerceFilter.innerHTML = '<option value="all">Tous les Restaurants</option>';
            commerces.forEach(c => {
                commerceFilter.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
            commerceFilter.value = currentFilter;
        }

        if (modalCommerceSelect) {
            modalCommerceSelect.innerHTML = '<option value="">-- Aucun --</option>';
            commerces.forEach(c => {
                modalCommerceSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
        }

        function render(categoryFilter = 'all', restaurantFilter = 'all') {
            viewContainer.innerHTML = '';

            // 1. Filter by User and exclude Project/Commerce Tasks
            let userTasks = tasks.filter(t => {
                const matchesUser = currentUser === 'all' || (t.assignee && t.assignee.includes(currentUser));
                return matchesUser && !t.projectId && !t.commerceId;
            });

            // 1b. If a specific restaurant is selected, show its tasks (even if hidden from main list)
            if (restaurantFilter !== 'all') {
                userTasks = tasks.filter(t => {
                    const matchesUser = currentUser === 'all' || (t.assignee && t.assignee.includes(currentUser));
                    return matchesUser && t.commerceId === restaurantFilter;
                });
            }

            // 2. Archive Filtering
            if (showArchived) {
                userTasks = userTasks.filter(t => t.status === 'Archived');
            } else {
                userTasks = userTasks.filter(t => t.status !== 'Archived');
            }

            // 3. Filter by Valid Categories (Internal Only)
            userTasks = userTasks.filter(t => validCategories.includes(t.category));

            // 4. Filter by Selected Category
            if (categoryFilter !== 'all') {
                userTasks = userTasks.filter(t => t.category === categoryFilter);
            }

            updateUserUI();
            updateViewToggleUI();
            updateArchiveToggleUI();

            if (userTasks.length === 0) {
                viewContainer.innerHTML = `<div class="p-8 text-center text-gray-500">Aucune tâche trouvée pour ces filtres.</div>`;
                return;
            }

            if (currentViewMode === 'list') {
                renderListView(userTasks, viewContainer);
            } else {
                renderKanbanView(userTasks, viewContainer);
            }
        }

        function renderListView(tasks, container) {
            const todo = tasks.filter(t => t.status === 'To do');
            const progress = tasks.filter(t => t.status === 'In progress' || t.status === 'En cours');
            const done = tasks.filter(t => t.status === 'Done');
            const archived = tasks.filter(t => t.status === 'Archived');

            container.innerHTML = `
                ${todo.length ? `
                <section class="mb-8">
                    <h3 class="text-xl font-bold mb-4 flex items-center"><span class="bg-gray-500/10 text-gray-400 p-1.5 rounded-lg mr-2">📌</span>À Faire (${todo.length})</h3>
                    <div class="bg-liv-card/30 rounded-xl border border-white/5 overflow-hidden">
                        ${renderListHeader()}
                        <div class="divide-y divide-white/5">
                            ${todo.map(t => createListRow(t)).join('')}
                        </div>
                    </div>
                </section>` : ''}

                ${progress.length ? `
                <section class="mb-8">
                    <h3 class="text-xl font-bold mb-4 flex items-center"><span class="bg-blue-500/10 text-blue-400 p-1.5 rounded-lg mr-2">⚡</span>En Cours (${progress.length})</h3>
                    <div class="bg-liv-card/30 rounded-xl border border-white/5 overflow-hidden">
                        ${renderListHeader()}
                        <div class="divide-y divide-white/5">
                            ${progress.map(t => createListRow(t)).join('')}
                        </div>
                    </div>
                </section>` : ''}

                ${done.length ? `
                <section class="mb-8">
                    <h3 class="text-xl font-bold mb-4 flex items-center text-gray-400"><span class="bg-green-500/10 text-green-400 p-1.5 rounded-lg mr-2">✅</span>Terminées (${done.length})</h3>
                    <div class="bg-liv-card/30 rounded-xl border border-white/5 overflow-hidden opacity-60">
                         <div class="divide-y divide-white/5">
                            ${done.map(t => createListRow(t, true)).join('')}
                        </div>
                    </div>
                </section>` : ''}

                ${archived.length ? `
                <section>
                    <h3 class="text-xl font-bold mb-4 flex items-center text-gray-500"><span class="bg-white/5 text-gray-500 p-1.5 rounded-lg mr-2">📦</span>Archivées (${archived.length})</h3>
                    <div class="bg-liv-card/30 rounded-xl border border-white/5 overflow-hidden opacity-40">
                         <div class="divide-y divide-white/5">
                            ${archived.map(t => createListRow(t, true)).join('')}
                        </div>
                    </div>
                </section>` : ''}
                
                ${tasks.length === 0 ? '<div class="p-8 text-center text-gray-500">Rien à afficher.</div>' : ''}
            `;
        }

        function renderKanbanView(tasks, container) {
            if (showArchived) {
                container.innerHTML = `
                    <div class="flex space-x-6 h-full overflow-x-auto pb-4">
                        ${createKanbanColumn('📦 Archivées', 'Archived', tasks.filter(t => t.status === 'Archived'), 'border-white/10 bg-white/5')}
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="flex space-x-6 h-full overflow-x-auto pb-4">
                        ${createKanbanColumn('📌 À Faire', 'To do', tasks.filter(t => t.status === 'To do'), 'border-gray-500/20 bg-white/5')}
                        ${createKanbanColumn('⚡ En Cours', 'In progress', tasks.filter(t => t.status === 'In progress' || t.status === 'En cours'), 'border-blue-500/20 bg-blue-500/5')}
                        ${createKanbanColumn('✅ Terminées', 'Done', tasks.filter(t => t.status === 'Done'), 'border-green-500/20 bg-green-500/5')}
                    </div>
                `;
            }
        }

        function renderListHeader() {
            return `
                <div class="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-sm font-medium text-gray-400 bg-white/5">
                    <div class="col-span-1"></div>
                    <div class="col-span-5">Tâche</div>
                    <div class="col-span-2">Catégorie</div>
                    <div class="col-span-2">Échéance</div>
                    <div class="col-span-1 text-center">Assigné</div>
                    <div class="col-span-1 text-center">Actions</div>
                </div>
            `;
        }

        function createListRow(task, isDone = false) {
            const isProgress = task.status === 'In progress' || task.status === 'En cours';
            const commerceTag = task.commerceName ? `<span class="block text-[10px] text-orange-400 mt-0.5">🏪 ${task.commerceName}</span>` : '';
            const dateStatus = getDateStatus(task.dueDate);

            return `
                <div class="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors group">
                    <div class="col-span-1 flex justify-center">
                         <input type="checkbox" 
                            ${isDone ? 'checked disabled' : ''} 
                            ${task.status === 'Archived' ? 'checked disabled' : ''}
                            class="w-5 h-5 rounded border-gray-600 ${isDone ? 'text-green-500 bg-liv-main' : (isProgress ? 'text-blue-500 border-blue-500' : 'text-gray-500 bg-liv-main')} focus:ring-offset-0 cursor-pointer"
                            onchange="cycleTaskStatus('${task.id}', '${task.status}')">
                    </div>
                    <div class="col-span-5 font-medium flex flex-col ${isDone || task.status === 'Archived' ? 'line-through text-gray-500' : 'text-white'}">
                        <span>${task.name}</span>
                        ${commerceTag}
                    </div>
                    <div class="col-span-2">
                        <span class="text-xs px-2 py-1 rounded bg-white/5 text-gray-300 border border-white/5">${task.category}</span>
                    </div>
                    <div class="col-span-2 text-sm text-gray-400 flex items-center space-x-2">
                        ${dateStatus.dot ? `<span class="w-2 h-2 rounded-full ${dateStatus.dot}"></span>` : ''}
                        <span>${task.dueDate || '-'}</span>
                    </div>
                    <div class="col-span-1 flex items-center justify-center">
                        <span class="text-xs font-bold px-2 py-1 rounded bg-white/10 text-blue-400">${task.assignee.split(',')[0]}</span>
                    </div>
                    <div class="col-span-1 flex items-center justify-center space-x-2">
                        ${isDone && task.status !== 'Archived' ? `
                        <button class="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all p-1" onclick="archiveTask('${task.id}', true)" title="Archiver">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                            </svg>
                        </button>` : ''}
                        
                        ${task.status === 'Archived' ? `
                        <button class="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all p-1" onclick="archiveTask('${task.id}', false)" title="Désarchiver">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                            </svg>
                        </button>` : ''}

                        <button class="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1" onclick="deleteTask('${task.id}', '${task.name.replace(/'/g, "\\'")}')" title="Supprimer">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.177H8.082a2.25 2.25 0 01-2.244-2.177L7.103 5.42m11.021-3.112a1.65 1.65 0 00-1.803-1.67L10.5 2.5a1.65 1.65 0 00-1.803 1.67m9.914 0a1.65 1.65 0 00-1.803-1.67L10.5 2.5a1.65 1.65 0 00-1.803 1.67" />
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }

        function createKanbanColumn(title, statusKey, columnTasks, styleClass) {
            return `
                <div class="w-80 flex flex-col rounded-xl border ${styleClass} min-w-[300px]" ondragover="allowDrop(event)" ondrop="dropTask(event, '${statusKey}')">
                    <div class="p-4 border-b border-white/5 flex justify-between items-center">
                        <h3 class="font-bold text-gray-200">${title}</h3>
                        <span class="bg-white/10 text-xs px-2 py-0.5 rounded-full">${columnTasks.length}</span>
                    </div>
                    <div class="p-4 flex-1 space-y-3 min-h-[200px]">
                        ${columnTasks.map(t => {
                const dateStatus = getDateStatus(t.dueDate);
                return `
                            <div class="glass-card p-4 hover:border-white/30 cursor-move group" draggable="true" ondragstart="dragTask(event, '${t.id}')">
                                <div class="flex justify-between items-start mb-2">
                                    <h4 class="font-bold text-sm ${t.status === 'Archived' ? 'line-through opacity-50' : ''}">
                                        ${t.name}
                                        ${t.commerceName ? `<span class="block text-[10px] text-orange-400 mt-1">🏪 ${t.commerceName}</span>` : ''}
                                    </h4>
                                    <div class="flex items-center space-x-1">
                                        ${t.status === 'Done' ? `
                                        <button class="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all p-1" onclick="event.stopPropagation(); archiveTask('${t.id}', true)">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                            </svg>
                                        </button>` : ''}
                                        <button class="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1" onclick="event.stopPropagation(); deleteTask('${t.id}', '${t.name.replace(/'/g, "\\'")}')">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.177H8.082a2.25 2.25 0 01-2.244-2.177L7.103 5.42m11.021-3.112a1.65 1.65 0 00-1.803-1.67L10.5 2.5a1.65 1.65 0 00-1.803 1.67m9.914 0a1.65 1.65 0 00-1.803-1.67L10.5 2.5a1.65 1.65 0 00-1.803 1.67" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div class="flex justify-between items-center text-xs text-gray-400">
                                    <span>${t.category}</span>
                                    <div class="flex items-center space-x-1">
                                        ${dateStatus.dot ? `<span class="w-1.5 h-1.5 rounded-full ${dateStatus.dot}"></span>` : ''}
                                        <span>${t.dueDate || ''}</span>
                                    </div>
                                </div>
                            </div>
                        `;
            }).join('')}
                    </div>
                </div>
            `;
        }

        // Initialize Listeners
        filterSelect.addEventListener('change', () => render(filterSelect.value, commerceFilter.value));
        commerceFilter.addEventListener('change', () => render(filterSelect.value, commerceFilter.value));

        // Initial Render
        render();
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

// Helpers (exposed to window for HTML events)
window.allowDrop = (ev) => ev.preventDefault();
window.dragTask = (ev, id) => ev.dataTransfer.setData("text", id);
window.dropTask = (ev, newStatus) => {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text");
    updateTaskStatus(id, newStatus);
};

window.deleteTask = async (id, name) => {
    const confirmed = await showConfirm({
        title: 'Supprimer la tâche ?',
        message: `Êtes-vous sûr de vouloir supprimer "${name}" ?`,
        confirmText: 'Supprimer',
        type: 'danger'
    });

    if (confirmed) {
        try {
            const res = await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
            if (res.ok) fetchAllTasks();
            else alert('Erreur lors de la suppression');
        } catch (error) {
            console.error(error);
        }
    }
};

window.cycleTaskStatus = (id, currentStatus) => {
    let newStatus = 'In progress';
    if (currentStatus === 'To do') newStatus = 'In progress';
    else if (currentStatus === 'In progress' || currentStatus === 'En cours') newStatus = 'Done';
    else newStatus = 'To do';

    updateTaskStatus(id, newStatus);
};

// Global UI Logic
window.switchUser = (user) => {
    currentUser = user;
    if (user !== 'all') {
        updateSidebarUser(user);
    }
    fetchAllTasks();
};

window.setArchiveView = (archived) => {
    showArchived = archived;
    fetchAllTasks();
};

window.archiveTask = async (id, shouldArchive) => {
    if (shouldArchive) {
        const confirmed = await showConfirm({
            title: 'Archiver la tâche ?',
            message: 'La tâche sera masquée de votre vue principale mais restera consultable dans la section "Archivées".',
            confirmText: 'Archiver',
            type: 'warning'
        });
        if (!confirmed) return;
    }
    const newStatus = shouldArchive ? 'Archived' : 'Done';
    await updateTaskStatus(id, newStatus);
};

function getDateStatus(dueDate) {
    if (!dueDate) return { dot: null };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(dueDate);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { dot: 'priority-dot priority-urgent' };
    if (diffDays === 1) return { dot: 'priority-dot priority-warning' };
    if (diffDays < 0) return { dot: 'priority-dot bg-gray-600' }; // Past due

    return { dot: null };
}

function updateArchiveToggleUI() {
    const activeBtn = document.getElementById('tasks-view-active');
    const archivedBtn = document.getElementById('tasks-view-archived');
    if (!activeBtn || !archivedBtn) return;

    if (showArchived) {
        activeBtn.className = 'px-3 py-1.5 text-xs font-bold rounded-md transition-all text-gray-400 hover:text-white';
        archivedBtn.className = 'px-3 py-1.5 text-xs font-bold rounded-md transition-all bg-blue-500 text-white shadow-lg shadow-blue-500/20';
    } else {
        activeBtn.className = 'px-3 py-1.5 text-xs font-bold rounded-md transition-all bg-blue-500 text-white shadow-lg shadow-blue-500/20';
        archivedBtn.className = 'px-3 py-1.5 text-xs font-bold rounded-md transition-all text-gray-400 hover:text-white';
    }
}

function updateUserUI() {
    const tiagoBtn = document.getElementById('user-tiago');
    const daniBtn = document.getElementById('user-dani');
    const allBtn = document.getElementById('user-all');

    if (tiagoBtn) tiagoBtn.className = `user-switch px-3 py-1 text-sm rounded-md transition-all font-medium ${currentUser === 'Tiago' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`;
    if (daniBtn) daniBtn.className = `user-switch px-3 py-1 text-sm rounded-md transition-all font-medium ${currentUser === 'Dani' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'}`;
    if (allBtn) allBtn.className = `user-switch px-3 py-1 text-sm rounded-md transition-all font-medium ${currentUser === 'all' ? 'bg-liv-accent text-white' : 'text-gray-400 hover:text-white'}`;
}

function updateViewToggleUI() {
    const listBtn = document.getElementById('view-list');
    const kanbanBtn = document.getElementById('view-kanban');

    if (listBtn && kanbanBtn) {
        listBtn.className = `view-mode-switch px-2 py-1.5 transition-all rounded ${currentViewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-white/20'}`;
        kanbanBtn.className = `view-mode-switch px-2 py-1.5 transition-all rounded ${currentViewMode === 'kanban' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-white/20'}`;
    }
}

async function updateTaskStatus(taskId, newStatus) {
    try {
        const res = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (res.ok) fetchAllTasks();
    } catch (error) {
        console.error(error);
    }
}

// Modal Logic
const modal = document.getElementById('task-modal');
const btnNewTask = document.getElementById('btn-new-task');
const btnCloseModal = document.getElementById('close-modal');
const btnCancelModal = document.getElementById('cancel-modal');
const taskForm = document.getElementById('task-form');

function openModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('task-name').focus(), 100);
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    taskForm.reset();
}

btnNewTask?.addEventListener('click', openModal);
btnCloseModal?.addEventListener('click', closeModal);
btnCancelModal?.addEventListener('click', closeModal);

taskForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(taskForm);
    const assignees = Array.from(document.querySelectorAll('input[name="assignees"]:checked')).map(cb => cb.value);

    if (assignees.length === 0) {
        alert('Veuillez sélectionner au moins une personne (Tiago ou Dani) pour cette tâche.');
        return;
    }

    const taskData = {
        name: formData.get('name'),
        category: formData.get('category'),
        assignee: assignees.join(', '),
        dueDate: formData.get('dueDate') || null,
        status: formData.get('status'),
        commerceId: formData.get('commerceId') || null
    };

    try {
        const res = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });

        if (res.ok) {
            closeModal();
            fetchAllTasks();
        }
    } catch (error) {
        console.error('Error creating task:', error);
    }
});

// Initial Load
fetchAllTasks();
initSidebar(currentUser);

