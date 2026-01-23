import '../style.css';

export async function initProjects() {
    try {
        const res = await fetch('http://localhost:3000/api/projects');
        const projects = await res.json();

        const grid = document.getElementById('projects-grid');
        grid.innerHTML = '';

        if (projects.length === 0) {
            grid.innerHTML = '<div class="col-span-full p-12 text-center text-gray-500 italic">Aucun projet actif pour le moment.</div>';
            return;
        }

        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'glass-card p-6 hover:border-blue-500/30 transition-all flex flex-col group';

            // Random progress for demo, in real it should be calculated from tasks
            const progress = project.progress !== undefined ? project.progress : Math.floor(Math.random() * 101);

            card.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <h3 class="text-xl font-bold text-white group-hover:text-blue-400 transition-colors capitalize">${project.name}</h3>
                    <span class="text-xs px-2 py-1 bg-white/5 rounded text-gray-400">${project.status || 'Actif'}</span>
                </div>
                
                <div class="mt-auto">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm text-gray-400">Progression</span>
                        <span class="text-sm font-bold text-blue-400">${progress}%</span>
                    </div>
                    <div class="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                        <div class="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-1000" style="width: 0%" id="bar-${project.id}"></div>
                    </div>
                </div>

                <div class="mt-6 flex justify-between items-center border-t border-white/5 pt-4">
                    <div class="flex -space-x-2">
                        <div class="w-7 h-7 rounded-full border-2 border-liv-card bg-orange-500"></div>
                        <div class="w-7 h-7 rounded-full border-2 border-liv-card bg-blue-500"></div>
                    </div>
                    <button class="text-xs font-medium text-gray-400 hover:text-white transition-colors">Voir détails →</button>
                </div>
            `;
            grid.appendChild(card);

            // Trigger animation
            setTimeout(() => {
                const bar = document.getElementById(`bar-${project.id}`);
                if (bar) bar.style.width = `${progress}%`;
            }, 100);
        });

    } catch (error) {
        console.error('Error fetching projects:', error);
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
        const res = await fetch('http://localhost:3000/api/projects', {
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

