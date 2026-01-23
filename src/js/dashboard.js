import '../style.css';

export async function fetchStats() {
    try {
        const res = await fetch('http://localhost:3000/api/stats');
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
        const res = await fetch('http://localhost:3000/api/tasks');
        const tasks = await res.json();

        const tasksList = document.getElementById('tasks-list');
        const visitsList = document.getElementById('visits-list');

        tasksList.innerHTML = '';
        visitsList.innerHTML = '';

        // Urgent tasks (First 5 that are not done)
        const urgentTasks = tasks.filter(t => t.status !== 'Done').slice(0, 5);

        urgentTasks.forEach(task => {
            const div = document.createElement('div');
            div.className = 'bg-white/5 p-3 rounded-lg border border-white/5 flex justify-between items-center';
            div.innerHTML = `
                <div>
                    <h4 class="font-medium text-sm">${task.name}</h4>
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

// Init
fetchStats();
fetchTasks();
