import '../style.css';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

// State
let currentUser = 'Tiago'; // Default user
let currentView = 'mine'; // 'mine' or 'all'

export async function initVisits() {
    try {
        const res = await fetch('http://localhost:3000/api/tasks');
        const tasks = await res.json();

        const container = document.getElementById('visits-container');
        const calendarEl = document.getElementById('calendar');

        container.innerHTML = '';

        // 1. Filter In-Person visits only
        let visits = tasks.filter(t => t.isInPerson);

        // 2. Apply "My Visits" filter if needed
        if (currentView === 'mine') {
            visits = visits.filter(v => v.assignee && v.assignee.includes(currentUser));
        }

        if (visits.length === 0) {
            container.innerHTML = `<p class="text-gray-500 italic text-center p-4">Aucune visite pour ${currentUser} en ce moment.</p>`;
        }

        // 3. Render Side List
        visits.forEach(visit => {
            const isMine = visit.assignee && visit.assignee.includes(currentUser);
            const card = document.createElement('div');
            card.className = `p-4 rounded-xl border flex justify-between items-center transition-colors cursor-pointer group ${isMine ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`;

            card.innerHTML = `
                <div class="flex items-center space-x-4">
                    <div class="flex-shrink-0 w-12 h-12 ${isMine ? 'bg-blue-500' : 'bg-white/10'} rounded-lg flex items-center justify-center text-xl font-bold text-white">
                        ${visit.dueDate ? new Date(visit.dueDate).getDate() : '?'}
                    </div>
                    <div>
                        <h4 class="font-bold text-lg group-hover:text-blue-400 transition-colors">${visit.name}</h4>
                        <p class="text-sm ${isMine ? 'text-blue-300' : 'text-gray-400'}">
                            ${visit.assignee} • ${visit.category}
                        </p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="block text-sm text-gray-400 mb-1">
                        ${visit.dueDate || 'Date non définie'}
                    </span>
                    <span class="inline-block px-2 py-1 ${isMine ? 'bg-blue-500/20 text-blue-300' : 'bg-white/10 text-gray-400'} text-xs rounded">
                        ${isMine ? 'Moi' : 'Autre'}
                    </span>
                </div>
            `;
            container.appendChild(card);
        });

        // 4. Render FullCalendar
        if (window.calendarInstance) {
            window.calendarInstance.destroy(); // Destroy previous instance to avoid duplicates
        }

        window.calendarInstance = new Calendar(calendarEl, {
            plugins: [dayGridPlugin, interactionPlugin],
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,dayGridWeek'
            },
            themeSystem: 'Standard',
            events: visits.map(v => ({
                title: v.name,
                start: v.dueDate,
                color: v.assignee.includes(currentUser) ? '#3b82f6' : (v.assignee.includes('Dani') ? '#a855f7' : '#64748b'), // Blue for me, Purple for Dani, Gray for others
                allDay: true,
                extendedProps: { assignee: v.assignee }
            })),
            eventClick: function (info) {
                alert(`Visite : ${info.event.title}\nAssigné à : ${info.event.extendedProps.assignee}`);
            },
            height: '100%',
            eventTextColor: '#ffffff',
            dayMaxEvents: true
        });

        window.calendarInstance.render();

        // Update UI States
        updateUI();

    } catch (error) {
        console.error('Error fetching visits:', error);
    }
}

// Global styles for FullCalendar (dark mode)
const style = document.createElement('style');
style.textContent = `
    .fc { font-family: 'Inter', sans-serif; color: #fff; }
    .fc-theme-standard td, .fc-theme-standard th { border: 1px solid rgba(255, 255, 255, 0.05); }
    .fc .fc-button-primary { background-color: rgba(255, 255, 255, 0.05); border: none; font-size: 0.8rem; }
    .fc .fc-button-primary:not(:disabled):active, .fc .fc-button-primary:not(:disabled).fc-button-active { background-color: #3b82f6; }
    .fc .fc-button-primary:hover { background-color: rgba(255, 255, 255, 0.1); }
    .fc .fc-toolbar-title { font-size: 1rem; font-weight: 700; }
    .fc-daygrid-day-number { font-size: 0.8rem; padding: 4px; color: #94a3b8; }
    .fc-day-today { background: rgba(59, 130, 246, 0.05) !important; }
    .fc-col-header-cell-cushion { font-size: 0.75rem; text-transform: uppercase; color: #64748b; text-decoration: none !important; }
    .fc-daygrid-event { font-size: 0.75rem; border-radius: 4px; padding: 2px 4px; border: none; }
    .fc-h-event { background-color: #3b82f6; }
    .fc-scrollgrid { border: none !important; }
    .fc-view-harness { background: transparent; }
`;
document.head.appendChild(style);

// Modal Logic for Visits
const modal = document.getElementById('visit-modal');
const btnNewVisit = document.getElementById('btn-new-visit');
const btnCloseModal = document.getElementById('close-visit-modal');
const btnCancelModal = document.getElementById('cancel-visit-modal');
const visitForm = document.getElementById('visit-form');

function openModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('visit-date').value = today;
    setTimeout(() => document.getElementById('visit-name').focus(), 100);
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    visitForm.reset();
}

// Event listeners
btnNewVisit?.addEventListener('click', openModal);
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
visitForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(visitForm);

    // Get selected calendars (multi-select)
    const selectedCalendars = Array.from(
        document.querySelectorAll('input[name="calendars"]:checked')
    ).map(cb => cb.value);

    const visitData = {
        name: formData.get('name'),
        category: formData.get('category'),
        dueDate: formData.get('date'),
        time: formData.get('time') || null,
        assignee: selectedCalendars.length > 0 ? selectedCalendars.join(', ') : 'Non assigné',
        calendars: selectedCalendars, // For future Google Calendar sync
        notes: formData.get('notes') || '',
        isInPerson: true,
        status: 'To do'
    };

    try {
        const res = await fetch('http://localhost:3000/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(visitData)
        });

        if (res.ok) {
            closeModal();
            // Refresh the visits list and calendar
            initVisits();
        } else {
            const error = await res.json();
            alert('Erreur: ' + (error.message || 'Impossible de créer la visite'));
        }
    } catch (error) {
        console.error('Error creating visit:', error);
        alert('Erreur réseau. Vérifiez que le serveur est en marche.');
    }
});

// User Switching Logic
window.switchUser = (user) => {
    currentUser = user;
    initVisits();
};

function updateUI() {
    // Update User Buttons
    document.getElementById('user-tiago').className = `user-switch px-3 py-1 text-sm rounded-md transition-all font-medium ${currentUser === 'Tiago' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`;
    document.getElementById('user-dani').className = `user-switch px-3 py-1 text-sm rounded-md transition-all font-medium ${currentUser === 'Dani' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'}`;

    // Update Filter Buttons
    document.getElementById('view-mine').className = `view-filter px-3 py-1.5 text-sm rounded-md transition-all font-medium ${currentView === 'mine' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`;
    document.getElementById('view-all').className = `view-filter px-3 py-1.5 text-sm rounded-md transition-all font-medium ${currentView === 'all' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`;
}

// View Switching Logic
document.getElementById('view-mine')?.addEventListener('click', () => {
    currentView = 'mine';
    initVisits();
});

document.getElementById('view-all')?.addEventListener('click', () => {
    currentView = 'all';
    initVisits();
});

initVisits();

