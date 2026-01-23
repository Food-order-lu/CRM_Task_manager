import '../style.css';

// State
let currentUser = 'Tiago';
let currentViewMode = 'list'; // 'list' or 'kanban'

const validCategories = [
    '🏢 Administratif',
    '💰 Comptabilité',
    '🔧 Opérations',
    '📜 Procédures',
    'Autre'
];

export async function fetchAllTasks() {
    try {
        const res = await fetch('http://localhost:3000/api/tasks');
        const tasks = await res.json();

        const viewContainer = document.getElementById('view-container');
        const filterSelect = document.getElementById('filter-category');

        function render(categoryFilter = 'all') {
            viewContainer.innerHTML = '';

            // 1. Filter by User
            let userTasks = tasks.filter(t => t.assignee && t.assignee.includes(currentUser));

            // 2. Filter by Valid Categories (Internal Only)
            userTasks = userTasks.filter(t => validCategories.includes(t.category));

            // 3. Filter by Selected Category
            if (categoryFilter !== 'all') {
                userTasks = userTasks.filter(t => t.category === categoryFilter);
            }

            if (userTasks.length === 0) {
                viewContainer.innerHTML = `<div class="p-8 text-center text-gray-500">Aucune tâche interne pour ${currentUser}.</div>`;
                return;
            }

            if (currentViewMode === 'list') {
                renderListView(userTasks, viewContainer);
            } else {
                renderKanbanView(userTasks, viewContainer);
            }

            updateUserUI();
            updateViewToggleUI();
        }

        function renderListView(tasks, container) {
            // Split by Status
            const todo = tasks.filter(t => t.status === 'To do');
            const progress = tasks.filter(t => t.status === 'In progress' || t.status === 'En cours');
            const done = tasks.filter(t => t.status === 'Done');

            container.innerHTML = `
                <!-- To Do -->
                <section class="mb-8">
                    <h3 class="text-xl font-bold mb-4 flex items-center"><span class="bg-gray-500/10 text-gray-400 p-1.5 rounded-lg mr-2">📌</span>À Faire (${todo.length})</h3>
                    <div class="bg-liv-card/30 rounded-xl border border-white/5 overflow-hidden">
                        ${todo.length ? renderListHeader() : ''}
                        <div class="divide-y divide-white/5">
                            ${todo.length ? todo.map(t => createListRow(t)).join('') : '<div class="p-4 text-center text-gray-500 italic">Rien à faire.</div>'}
                        </div>
                    </div>
                </section>

                <!-- In Progress -->
                <section class="mb-8">
                    <h3 class="text-xl font-bold mb-4 flex items-center"><span class="bg-blue-500/10 text-blue-400 p-1.5 rounded-lg mr-2">⚡</span>En Cours (${progress.length})</h3>
                    <div class="bg-liv-card/30 rounded-xl border border-white/5 overflow-hidden">
                        ${progress.length ? renderListHeader() : ''}
                        <div class="divide-y divide-white/5">
                            ${progress.length ? progress.map(t => createListRow(t)).join('') : '<div class="p-4 text-center text-gray-500 italic">Rien en cours.</div>'}
                        </div>
                    </div>
                </section>

                <!-- Done -->
                <section>
                    <h3 class="text-xl font-bold mb-4 flex items-center text-gray-400"><span class="bg-green-500/10 text-green-400 p-1.5 rounded-lg mr-2">✅</span>Terminées (${done.length})</h3>
                    <div class="bg-liv-card/30 rounded-xl border border-white/5 overflow-hidden opacity-60">
                         <div class="divide-y divide-white/5">
                            ${done.length ? done.map(t => createListRow(t, true)).join('') : '<div class="p-4 text-center text-gray-500 italic">Rien terminé récemment.</div>'}
                        </div>
                    </div>
                </section>
            `;
        }

        function renderKanbanView(tasks, container) {
            container.innerHTML = `
                <div class="flex space-x-6 h-full overflow-x-auto pb-4">
                    ${createKanbanColumn('📌 À Faire', 'To do', tasks.filter(t => t.status === 'To do'), 'border-gray-500/20 bg-white/5')}
                    ${createKanbanColumn('⚡ En Cours', 'In progress', tasks.filter(t => t.status === 'In progress' || t.status === 'En cours'), 'border-blue-500/20 bg-blue-500/5')}
                    ${createKanbanColumn('✅ Terminées', 'Done', tasks.filter(t => t.status === 'Done'), 'border-green-500/20 bg-green-500/5')}
                </div>
            `;
        }

        function renderListHeader() {
            return `
                <div class="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-sm font-medium text-gray-400 bg-white/5">
                    <div class="col-span-1"></div>
                    <div class="col-span-5">Tâche</div>
                    <div class="col-span-2">Catégorie</div>
                    <div class="col-span-2">Date</div>
                    <div class="col-span-2 text-center">Assigné à</div>
                </div>
            `;
        }

        function createListRow(task, isDone = false) {
            const isProgress = task.status === 'In progress' || task.status === 'En cours';
            return `
                <div class="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors group">
                    <div class="col-span-1 flex justify-center">
                         <input type="checkbox" 
                            ${isDone ? 'checked disabled' : ''} 
                            class="w-5 h-5 rounded border-gray-600 ${isDone ? 'text-green-500 bg-liv-main' : (isProgress ? 'text-blue-500 border-blue-500' : 'text-gray-500 bg-liv-main')} focus:ring-offset-0 cursor-pointer"
                            onchange="cycleTaskStatus('${task.id}', '${task.status}')">
                    </div>
                    <div class="col-span-5 font-medium flex items-center ${isDone ? 'line-through text-gray-500' : 'text-white'}">
                        ${task.name}
                    </div>
                    <div class="col-span-2">
                        <span class="text-xs px-2 py-1 rounded bg-white/5 text-gray-300 border border-white/5">${task.category}</span>
                    </div>
                    <div class="col-span-2 text-sm text-gray-400">${task.dueDate || '-'}</div>
                    <div class="col-span-2 flex items-center justify-center">
                        <span class="text-xs font-bold px-2 py-1 rounded bg-white/10 text-blue-400">${task.assignee}</span>
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
                        ${columnTasks.map(t => `
                            <div class="glass-card p-4 hover:border-white/30 cursor-move" draggable="true" ondragstart="dragTask(event, '${t.id}')">
                                <h4 class="font-bold text-sm mb-2">${t.name}</h4>
                                <div class="flex justify-between items-center text-xs text-gray-400">
                                    <span>${t.category}</span>
                                    <span>${t.dueDate || ''}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Helpers (exposed to window for HTML events)
        window.allowDrop = (ev) => ev.preventDefault();
        window.dragTask = (ev, id) => ev.dataTransfer.setData("text", id);
        window.dropTask = (ev, newStatus) => {
            ev.preventDefault();
            const id = ev.dataTransfer.getData("text");
            updateTaskStatus(id, newStatus);
        };

        window.cycleTaskStatus = (id, currentStatus) => {
            let newStatus = 'In progress';
            if (currentStatus === 'To do') newStatus = 'In progress';
            else if (currentStatus === 'In progress' || currentStatus === 'En cours') newStatus = 'Done';
            else newStatus = 'To do'; // Loop back if needed

            updateTaskStatus(id, newStatus);
        };

        // Initialize Listeners
        filterSelect.addEventListener('change', (e) => render(e.target.value));

        // Initial Render
        render();
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

// Global UI Logic
window.switchUser = (user) => {
    currentUser = user;
    fetchAllTasks();
};

document.getElementById('view-list')?.addEventListener('click', () => {
    currentViewMode = 'list';
    fetchAllTasks();
});

document.getElementById('view-kanban')?.addEventListener('click', () => {
    currentViewMode = 'kanban';
    fetchAllTasks();
});

function updateUserUI() {
    document.getElementById('user-tiago').className = `user-switch px-3 py-1 text-sm rounded-md transition-all font-medium ${currentUser === 'Tiago' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`;
    document.getElementById('user-dani').className = `user-switch px-3 py-1 text-sm rounded-md transition-all font-medium ${currentUser === 'Dani' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'}`;
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
        console.log(`Updating task ${taskId} to ${newStatus}`);
        const res = await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (res.ok) fetchAllTasks();
        else alert('Erreur mise à jour');
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

// Event listeners
btnNewTask?.addEventListener('click', openModal);
btnCloseModal?.addEventListener('click', closeModal);
btnCancelModal?.addEventListener('click', closeModal);

// Close modal on overlay click
modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('active')) {
        closeModal();
    }
});

// Form submission
taskForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(taskForm);

    // Get assignees from checkboxes
    const assignees = Array.from(document.querySelectorAll('input[name="assignees"]:checked'))
        .map(cb => cb.value);

    const taskData = {
        name: formData.get('name'),
        category: formData.get('category'),
        assignee: assignees.length > 0 ? assignees.join(', ') : 'Non assigné',
        dueDate: formData.get('dueDate') || null,
        status: formData.get('status')
    };

    try {
        const res = await fetch('http://localhost:3000/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });

        if (res.ok) {
            closeModal();
            fetchAllTasks();
        } else {
            const error = await res.json();
            alert('Erreur: ' + (error.message || 'Impossible de créer la tâche'));
        }
    } catch (error) {
        console.error('Error creating task:', error);
        alert('Erreur réseau. Vérifiez que le serveur est en marche.');
    }
});

// Initial Load
fetchAllTasks();
