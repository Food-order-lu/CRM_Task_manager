import express from 'express';
import cors from 'cors';
import { commerces, projects, tasks } from './database.js';
import googleCalendar from './services/google-calendar.js';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- Google Auth Routes ---
app.get('/api/auth/google', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId manquant' });

    const url = googleCalendar.getAuthUrl(userId);
    if (!url) return res.status(500).json({ error: 'Config Google non disponible' });
    res.redirect(url);
});

app.get('/api/auth/google/callback', async (req, res) => {
    const { code, state: userId } = req.query;
    if (!userId) return res.status(400).send('<h1>Error</h1><p>UserId manquant dans le state Google.</p>');

    const success = await googleCalendar.handleCallback(code, userId);
    if (success) {
        res.send(`<h1>Success!</h1><p>Connexion Google Calendar réussie pour ${userId}. Vous pouvez fermer cette fenêtre.</p><script>setTimeout(() => window.close(), 3000)</script>`);
    } else {
        res.status(500).send('<h1>Error</h1><p>Échec de la connexion Google Calendar.</p>');
    }
});

app.get('/api/auth/status', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId manquant' });
    res.json({ googleConnected: googleCalendar.isEnabled(userId) });
});

// --- CRM Routes ---
app.get('/api/crm', (req, res) => {
    try {
        const leads = commerces.getAll();
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/crm', (req, res) => {
    const { name, status, contact, email, phone, category } = req.body;
    try {
        const lead = commerces.create({
            name,
            status: status || 'À démarcher',
            category,
            phone,
            email,
            notes: contact || ''
        });

        if (status === 'En cours' || status === 'Gagné' || status === 'In Progress') {
            const existingProjects = projects.getAll().filter(p => p.name === `Projet - ${name}`);
            if (existingProjects.length === 0) {
                projects.create({
                    name: `Projet - ${name}`,
                    status: status === 'Gagné' ? '🔄 En cours' : '🎯 Planifié',
                    description: `Projet généré automatiquement depuis le lead CRM: ${name}`
                });
            }
        }

        res.json(lead);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/crm/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const lead = commerces.getById(id);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        commerces.update(id, { status });

        if (status === 'En cours' || status === 'Gagné' || status === 'In Progress') {
            const existingProjects = projects.getAll().filter(p => p.name === `Projet - ${lead.name}`);
            if (existingProjects.length === 0) {
                projects.create({
                    name: `Projet - ${lead.name}`,
                    status: status === 'Gagné' ? '🔄 En cours' : '🎯 Planifié',
                    description: `Projet généré automatiquement depuis le lead CRM: ${lead.name}`
                });
            }
        }

        res.json({ id, status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/crm/:id', (req, res) => {
    try {
        commerces.delete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Projects Routes ---
app.get('/api/projects', (req, res) => {
    try {
        const allProjects = projects.getAll();
        res.json(allProjects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/projects/:id/tasks', (req, res) => {
    const { id } = req.params;
    try {
        const allTasks = tasks.getByProject(id);
        const taskMap = {};
        allTasks.forEach(t => taskMap[t.id] = { ...t, parentId: t.parent_id, dueDate: t.due_date, subTasks: [] });
        const rootTasks = [];
        allTasks.forEach(t => {
            if (t.parent_id && taskMap[t.parent_id]) taskMap[t.parent_id].subTasks.push(taskMap[t.id]);
            else rootTasks.push(taskMap[t.id]);
        });
        res.json(rootTasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/projects', (req, res) => {
    const { name, description, status } = req.body;
    try {
        const project = projects.create({ name, status: status || '🔄 En cours', description });
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/projects/:id', (req, res) => {
    const { id } = req.params;
    const { status, name, progress } = req.body;
    try {
        const updates = {};
        if (status) updates.status = status;
        if (name) updates.name = name;
        if (progress !== undefined) updates.progress = progress;
        projects.update(id, updates);
        res.json({ id, ...updates });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/projects/:id', (req, res) => {
    try {
        projects.delete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Helper to update project progress ---
async function updateProjectProgress(projectId) {
    if (!projectId) return;
    try {
        const projectTasks = tasks.getByProject(projectId);
        if (projectTasks.length === 0) {
            projects.update(projectId, { progress: 0 });
            return;
        }
        const doneTasks = projectTasks.filter(t => t.status === 'Done' || t.status === 'Terminé').length;
        const progress = Math.round((doneTasks / projectTasks.length) * 100);
        projects.update(projectId, { progress });
    } catch (error) {
        console.error('Error updating project progress:', error);
    }
}

// --- Tasks Routes ---
app.get('/api/tasks', (req, res) => {
    try {
        const allTasks = tasks.getAll().map(t => ({
            id: t.id,
            name: t.name,
            category: t.category,
            status: t.status,
            assignee: t.assignee,
            dueDate: t.due_date,
            timeSlot: t.time_slot,
            isInPerson: t.is_in_person === 1,
            projectId: t.project_id,
            commerceId: t.commerce_id,
            commerceName: t.commerce_name
        }));
        res.json(allTasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tasks', async (req, res) => {
    const { name, category, assignee, dueDate, time, status, isInPerson, projectId, commerceId, parentId } = req.body;
    try {
        const task = tasks.create({
            name,
            category: category || '🔧 Opérations',
            assignee: assignee || 'Unassigned',
            dueDate,
            timeSlot: time,
            status: status || 'To do',
            isInPerson: isInPerson || false,
            projectId,
            commerceId,
            parentId
        });

        if (projectId) await updateProjectProgress(projectId);

        if (isInPerson) {
            const assigneesList = (assignee || '').split(',').map(s => s.trim());
            for (const userId of assigneesList) {
                if (googleCalendar.isEnabled(userId)) {
                    const gId = await googleCalendar.createGoogleEvent({ name, date: dueDate, time, assignee }, userId);
                    if (gId) tasks.setGoogleEventId(task.id, gId);
                }
            }
        }
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { status, name, dueDate, timeSlot, assignee, isInPerson } = req.body;
    try {
        const currentTask = tasks.getById(id);
        if (!currentTask) return res.status(404).json({ error: 'Task not found' });

        const updates = {};
        if (status !== undefined) updates.status = status;
        if (name !== undefined) updates.name = name;
        if (dueDate !== undefined) updates.dueDate = dueDate;
        if (timeSlot !== undefined) updates.timeSlot = timeSlot;
        if (assignee !== undefined) updates.assignee = assignee;
        if (isInPerson !== undefined) updates.isInPerson = isInPerson;

        tasks.update(id, updates);

        if (currentTask.project_id) await updateProjectProgress(currentTask.project_id);

        const mergedTask = { ...currentTask, ...updates };
        const shouldBeOnGoogle = mergedTask.is_in_person === 1 || mergedTask.isInPerson === true;
        const assigneesList = (mergedTask.assignee || '').split(',').map(s => s.trim());

        for (const userId of assigneesList) {
            if (googleCalendar.isEnabled(userId)) {
                if (currentTask.google_event_id) {
                    if (!shouldBeOnGoogle) {
                        await googleCalendar.deleteGoogleEvent(currentTask.google_event_id, userId);
                        tasks.update(id, { googleEventId: null });
                    } else {
                        await googleCalendar.updateGoogleEvent(currentTask.google_event_id, {
                            name: mergedTask.name,
                            date: mergedTask.due_date || mergedTask.dueDate,
                            time: mergedTask.time_slot || mergedTask.timeSlot,
                            assignee: mergedTask.assignee
                        }, userId);
                    }
                } else if (shouldBeOnGoogle) {
                    const gId = await googleCalendar.createGoogleEvent({
                        name: mergedTask.name,
                        date: mergedTask.due_date || mergedTask.dueDate,
                        time: mergedTask.time_slot || mergedTask.timeSlot,
                        assignee: mergedTask.assignee
                    }, userId);
                    if (gId) tasks.update(id, { googleEventId: gId });
                }
            }
        }
        res.json({ id, ...updates });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const task = tasks.getById(req.params.id);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        if (task.google_event_id) {
            const assignees = (task.assignee || '').split(',').map(s => s.trim());
            for (const userId of assignees) {
                if (googleCalendar.isEnabled(userId)) {
                    await googleCalendar.deleteGoogleEvent(task.google_event_id, userId);
                }
            }
        }
        tasks.delete(req.params.id);

        if (task.project_id) await updateProjectProgress(task.project_id);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stats', (req, res) => {
    try {
        const allLeads = commerces.getAll();
        const allProjects = projects.getAll();
        const allTasks = tasks.getAll();
        res.json({
            leads: allLeads.length,
            projects: allProjects.filter(p => !p.status.includes('📁')).length,
            tasks: allTasks.filter(t => t.status !== 'Done' && !t.project_id && !t.commerce_id).length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});
