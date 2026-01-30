import '../style.css';
import { API_URL } from './config.js';
import { initSidebar, updateSidebarUser } from './shared-sidebar.js';

// Get project info from URL
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('id');
const projectName = urlParams.get('name') || 'Projet';

// State
let taskTree = [];
let currentUser = 'all'; // 'Tiago', 'Dani', or 'all'

// DOM Elements
const treeContainer = document.getElementById('tasks-tree-container');
const breadcrumb = document.getElementById('breadcrumb-project');
const titleEl = document.getElementById('project-title');
const modal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');

// Init
breadcrumb.textContent = projectName;
titleEl.textContent = projectName;

async function fetchProjectTasks() {
    try {
        const res = await fetch(`${API_URL}/projects/${projectId}/tasks`);
        taskTree = await res.json();
        renderTree();
    } catch (error) {
        console.error('Error fetching tasks:', error);
        treeContainer.innerHTML = `<div class="p-8 text-center text-red-400 bg-red-400/10 rounded-xl">Erreur lors du chargement des tâches.</div>`;
    }
}

function renderTree() {
    treeContainer.innerHTML = '';

    // Filter tree recursively
    const filteredTree = filterTasks(taskTree, currentUser);

    if (filteredTree.length === 0) {
        treeContainer.innerHTML = `
            <div class="p-12 text-center bg-white/5 border border-dashed border-white/10 rounded-2xl">
                <p class="text-gray-500 italic">Aucune tâche trouvée pour ce filtre.</p>
                ${currentUser === 'all' ? `
                <button class="mt-4 text-blue-400 font-bold hover:underline" onclick="openAddTaskModal(null)">
                    + Créer la première tâche
                </button>
                ` : ''}
            </div>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();
    filteredTree.forEach(task => {
        fragment.appendChild(createTaskNode(task, 0));
    });
    treeContainer.appendChild(fragment);
    updateUserUI();
}

function filterTasks(nodes, user) {
    if (user === 'all') return nodes;

    return nodes.map(node => {
        const subTasks = node.subTasks ? filterTasks(node.subTasks, user) : [];
        const isMatch = node.assignee && node.assignee.includes(user);

        // Include if the task itself matches OR if it has visible children
        if (isMatch || subTasks.length > 0) {
            return { ...node, subTasks };
        }
        return null;
    }).filter(node => node !== null);
}

window.switchUser = (user) => {
    currentUser = user;
    if (user !== 'all') {
        updateSidebarUser(user);
    }
    renderTree();
};

function updateUserUI() {
    ['tiago', 'dani', 'all'].forEach(u => {
        const btn = document.getElementById(`user-${u}`);
        if (!btn) return;
        if (currentUser === u) {
            btn.className = `user-switch px-3 py-1 text-sm rounded-md transition-all font-medium ${u === 'tiago' ? 'bg-blue-500' : (u === 'dani' ? 'bg-purple-500' : 'bg-white/20')} text-white`;
        } else {
            btn.className = `user-switch px-3 py-1 text-sm rounded-md text-gray-400 hover:text-white transition-all`;
        }
    });
}

function createTaskNode(task, level) {
    const container = document.createElement('div');
    container.className = `task-tree-node mt-3`;

    const isDone = task.status === 'Done' || task.status === 'Terminé';

    container.innerHTML = `
        <div class="task-item glass-card p-3 md:p-4 flex items-center justify-between group/item transition-all hover:border-white/20">
            <div class="flex items-center space-x-3 md:space-x-4 flex-1 min-w-0">
                <input type="checkbox" ${isDone ? 'checked' : ''} 
                    class="w-5 h-5 md:w-6 md:h-6 rounded border-gray-600 text-blue-500 bg-liv-main cursor-pointer shrink-0"
                    onchange="toggleTask('${task.id}', this.checked)">
                
                <div class="flex-1 min-w-0">
                    <div class="level-${level} ${isDone ? 'line-through opacity-50 text-gray-500 font-normal text-sm md:text-base' : 'text-white text-sm md:text-base'} truncate pr-2">${task.name}</div>
                    <div class="flex items-center space-x-2 mt-1">
                        <span class="text-[9px] px-1.5 py-0.5 bg-blue-500/10 rounded text-blue-400 font-bold uppercase border border-blue-500/10">${task.assignee}</span>
                        <span class="text-[9px] text-gray-500 font-medium">${task.category}</span>
                        ${task.notes ? `
                            <button onclick="window.showTaskNote('${task.id}')" class="text-[10px] text-orange-400 hover:text-orange-300 flex items-center">
                                <span class="mr-1">📝</span> Note
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <div class="task-actions flex items-center space-x-1 shrink-0 lg:opacity-0 lg:group-hover/item:opacity-100 transition-all">
                <button class="p-2 hover:bg-blue-500/10 rounded-lg text-blue-400" onclick="openAddTaskModal('${task.id}', '${task.name.replace(/'/g, "\\'")}')" title="Ajouter une sous-tâche">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </button>
                <button class="p-2 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400" onclick="deleteTask('${task.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.177H8.082a2.25 2.25 0 01-2.244-2.177L7.103 5.42m11.021-3.112a1.65 1.65 0 00-1.803-1.67L10.5 2.5a1.65 1.65 0 00-1.803 1.67m9.914 0a1.65 1.65 0 00-1.803-1.67L10.5 2.5a1.65 1.65 0 00-1.803 1.67" />
                    </svg>
                </button>
            </div>
        </div>
    `;

    if (task.subTasks && task.subTasks.length > 0) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'task-tree-children';
        task.subTasks.forEach(sub => {
            childrenContainer.appendChild(createTaskNode(sub, level + 1));
        });
        container.appendChild(childrenContainer);
    }

    return container;
}

// Global Actions
window.openAddTaskModal = (parentId = null, parentName = '') => {
    const parentIdInput = document.getElementById('task-parent-id');
    const modalTitle = document.getElementById('modal-title');

    parentIdInput.value = parentId || '';
    modalTitle.textContent = parentId ? `Ajouter une sous-tâche à "${parentName}"` : 'Nouvelle Tâche Racine';

    modal.classList.add('active');
    document.getElementById('task-name').focus();
};

window.toggleTask = async (id, isChecked) => {
    try {
        await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: isChecked ? 'Done' : 'To do' })
        });
        fetchProjectTasks(); // Refresh
    } catch (e) {
        console.error(e);
    }
};

window.deleteTask = async (id) => {
    if (!confirm('Voulez-vous vraiment supprimer cette tâche ?')) return;
    try {
        await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
        fetchProjectTasks();
    } catch (e) {
        console.error(e);
    }
};

// Event Listeners
document.getElementById('close-modal').onclick = () => modal.classList.remove('active');
document.getElementById('btn-add-root-task').onclick = () => window.openAddTaskModal(null);

taskForm.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('task-name').value;
    const assignees = Array.from(document.querySelectorAll('input[name="assignees"]:checked')).map(cb => cb.value);
    const parentId = document.getElementById('task-parent-id').value;

    const taskData = {
        name,
        assignee: assignees.length > 0 ? assignees.join(', ') : 'Unassigned',
        projectId,
        parentId: parentId || null,
        status: 'To do',
        category: '🔧 Opérations',
        notes: document.getElementById('task-notes').value || null
    };

    try {
        const res = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        if (res.ok) {
            modal.classList.remove('active');
            taskForm.reset();
            fetchProjectTasks();
        }
    } catch (error) {
        console.error(error);
    }
};

// Initial Load
fetchProjectTasks();
initSidebar();

window.showTaskNote = (id) => {
    const findTask = (nodes, id) => {
        for (const n of nodes) {
            if (n.id === id) return n;
            if (n.subTasks) {
                const found = findTask(n.subTasks, id);
                if (found) return found;
            }
        }
        return null;
    };
    const t = findTask(taskTree, id);
    if (t && t.notes) {
        alert(`Note pour "${t.name}":\n\n${t.notes}`);
    }
};
