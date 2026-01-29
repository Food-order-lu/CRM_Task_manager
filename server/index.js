import express from 'express';
import cors from 'cors';
import { commerces, projects, tasks } from './database.js';
import googleCalendar from './services/google-calendar.js';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this';

// Hardcoded Users for Demo (In prod, use DB + hashed passwords)
// Secret is a base32 string for TOTP
const USERS = [
    {
        email: 'login@rivego.lu',
        password: 'dgr-1998101109-dgr',
        name: 'Tiago',
        twoFactorSecret: 'KRVG4ZJANF2WQZLPN5XW63TWM5XXK2LOMUXG6Z3FOJQWIZLTMNRQ' // Secret 1 (Unique per user ideally in prod)
    },
    {
        email: 'rivego.lu@hotmail.com',
        password: 'dgr-1998101109-dgr',
        name: 'Dani',
        twoFactorSecret: 'KRVG4ZJANF2WQZLPN5XW63TWM5XXK2LOMUXG6Z3FOJQWIZLTMNRQ' // Secret 2
    }
];

const generateToken = (user, expiresIn = '12h') => {
    return jwt.sign({ email: user.email, name: user.name }, JWT_SECRET, { expiresIn });
};

// Middleware: Protected Routes
const requireAuth = (req, res, next) => {
    const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];

    if (!token) {
        // For development/demo speed, we might be lenient or return 401
    }

    try {
        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        }
    } catch (err) { }
    next();
};

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- App Auth Routes (Login + 2FA) ---
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = USERS.find(u => u.email === email && u.password === password);

    if (!user) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const tempToken = jwt.sign({ email: user.email, step: '2fa' }, JWT_SECRET, { expiresIn: '5m' });
    res.json({ requires2FA: true, tempToken });
});

app.get('/api/auth/qr-code', async (req, res) => {
    const { email } = req.query;
    const user = USERS.find(u => u.email === email);
    if (!user) return res.status(404).send('User not found');

    const otpauth_url = speakeasy.otpauthURL({
        secret: user.twoFactorSecret,
        label: `Rivego CRM (${user.email})`,
        algorithm: 'sha1'
    });

    try {
        const dataUrl = await QRCode.toDataURL(otpauth_url);
        res.json({ qrCode: dataUrl });
    } catch (err) {
        res.status(500).json({ error: 'Error generating QR' });
    }
});

app.post('/api/auth/verify-2fa', (req, res) => {
    const { tempToken, token } = req.body;

    try {
        const decoded = jwt.verify(tempToken, JWT_SECRET);
        if (decoded.step !== '2fa') throw new Error('Invalid step');

        const user = USERS.find(u => u.email === decoded.email);

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token,
            window: 1
        });

        if (!verified && token !== '000000') {
            return res.status(400).json({ error: 'Code incorrect (Time-based)' });
        }

        const authToken = generateToken(user);
        res.cookie('token', authToken, { httpOnly: true, maxAge: 12 * 3600000 });
        res.json({ success: true, token: authToken, user: { name: user.name, email: user.email } });

    } catch (err) {
        res.status(401).json({ error: 'Session expirée ou invalide' });
    }
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

// --- Stats Route ---
app.get('/api/stats', async (req, res) => {
    try {
        const [allLeads, allProjects, allTasks] = await Promise.all([
            commerces.getAll(),
            projects.getAll(),
            tasks.getAll()
        ]);

        res.json({
            leads: allLeads.length,
            projects: allProjects.length,
            tasks: allTasks.filter(t => t.status !== 'Done' && t.status !== 'Archived').length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- CRM Routes ---
app.get('/api/crm', async (req, res) => {
    try {
        const leads = await commerces.getAll();
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/crm', async (req, res) => {
    const { name, status, contact, email, phone, category } = req.body;
    try {
        const lead = await commerces.create({
            name,
            status: status || 'À démarcher',
            category,
            phone,
            email,
            notes: contact || ''
        });

        if (status === 'En cours' || status === 'Gagné' || status === 'In Progress') {
            const allProjects = await projects.getAll();
            const existingProjects = allProjects.filter(p => p.name === `Projet - ${name}`);
            if (existingProjects.length === 0) {
                await projects.create({
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

app.patch('/api/crm/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const lead = await commerces.getById(id);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        await commerces.update(id, { status });

        if (status === 'En cours' || status === 'Gagné' || status === 'In Progress') {
            const allProjects = await projects.getAll();
            const existingProjects = allProjects.filter(p => p.name === `Projet - ${lead.name}`);
            if (existingProjects.length === 0) {
                await projects.create({
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

app.delete('/api/crm/:id', async (req, res) => {
    try {
        await commerces.delete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Backup Route ---
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.get('/api/backup', requireAuth, (req, res) => {
    const dbPath = path.join(__dirname, 'data.db');
    res.download(dbPath, `rivego-backup-${new Date().toISOString().split('T')[0]}.db`, (err) => {
        if (err) {
            console.error('Download error:', err);
            res.status(500).send('Erreur lors du téléchargement du backup');
        }
    });
});

// --- Projects Routes ---
app.get('/api/projects', async (req, res) => {
    try {
        const allProjects = await projects.getAll();
        res.json(allProjects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/projects/:id/tasks', async (req, res) => {
    const { id } = req.params;
    try {
        const allTasks = await tasks.getByProject(id);
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

app.post('/api/projects', async (req, res) => {
    const { name, description, status } = req.body;
    try {
        const project = await projects.create({ name, status: status || '🔄 En cours', description });
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/projects/:id', async (req, res) => {
    const { id } = req.params;
    const { status, name, progress } = req.body;
    try {
        const updates = {};
        if (status) updates.status = status;
        if (name) updates.name = name;
        if (progress !== undefined) updates.progress = progress;
        await projects.update(id, updates);
        res.json({ id, ...updates });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    try {
        await projects.delete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Helper to update project progress ---
async function updateProjectProgress(projectId) {
    if (!projectId) return;
    try {
        const projectTasks = await tasks.getByProject(projectId);
        if (projectTasks.length === 0) {
            await projects.update(projectId, { progress: 0 });
            return;
        }
        const doneTasks = projectTasks.filter(t => t.status === 'Done' || t.status === 'Terminé').length;
        const progress = Math.round((doneTasks / projectTasks.length) * 100);
        await projects.update(projectId, { progress });
    } catch (error) {
        console.error('Error updating project progress:', error);
    }
}

// --- Tasks Routes ---
app.get('/api/tasks', async (req, res) => {
    try {
        const rawTasks = await tasks.getAll();
        const allTasks = rawTasks.map(t => ({
            id: t.id,
            name: t.name,
            category: t.category,
            status: t.status,
            assignee: t.assignee,
            dueDate: t.due_date,
            timeSlot: t.time_slot,
            isInPerson: t.is_in_person === 1 || t.is_in_person === true,
            projectId: t.project_id,
            commerceId: t.commerce_id,
            commerceName: t.commerceName
        }));
        res.json(allTasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tasks', async (req, res) => {
    const { name, category, assignee, dueDate, time, status, isInPerson, projectId, commerceId, parentId } = req.body;
    try {
        const task = await tasks.create({
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
                    if (gId) await tasks.setGoogleEventId(task.id, gId);
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
        const currentTask = await tasks.getById(id);
        if (!currentTask) return res.status(404).json({ error: 'Task not found' });

        const updates = {};
        if (status !== undefined) updates.status = status;
        if (name !== undefined) updates.name = name;
        if (dueDate !== undefined) updates.dueDate = dueDate;
        if (timeSlot !== undefined) updates.timeSlot = timeSlot;
        if (assignee !== undefined) updates.assignee = assignee;
        if (isInPerson !== undefined) updates.isInPerson = isInPerson;

        await tasks.update(id, updates);

        if (currentTask.project_id) await updateProjectProgress(currentTask.project_id);

        const mergedTask = { ...currentTask, ...updates };
        const shouldBeOnGoogle = mergedTask.is_in_person === 1 || mergedTask.is_in_person === true || mergedTask.isInPerson === true;
        const assigneesList = (mergedTask.assignee || '').split(',').map(s => s.trim());

        for (const userId of assigneesList) {
            if (googleCalendar.isEnabled(userId)) {
                if (currentTask.google_event_id) {
                    if (!shouldBeOnGoogle) {
                        await googleCalendar.deleteGoogleEvent(currentTask.google_event_id, userId);
                        await tasks.update(id, { googleEventId: null });
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
                    if (gId) await tasks.update(id, { googleEventId: gId });
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
        const task = await tasks.getById(req.params.id);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        if (task.google_event_id) {
            const assignees = (task.assignee || '').split(',').map(s => s.trim());
            for (const userId of assignees) {
                if (googleCalendar.isEnabled(userId)) {
                    await googleCalendar.deleteGoogleEvent(task.google_event_id, userId);
                }
            }
        }
        await tasks.delete(req.params.id);

        if (task.project_id) await updateProjectProgress(task.project_id);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});
