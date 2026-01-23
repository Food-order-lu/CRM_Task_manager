import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Client } from '@notionhq/client';

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const DB = {
    CRM: process.env.NOTION_CRM_DB_ID,
    PROJECTS: process.env.NOTION_PROJECTS_DB_ID,
    TASKS: process.env.NOTION_TASKS_DB_ID
};

// --- CRM Routes ---
app.get('/api/crm', async (req, res) => {
    try {
        const response = await notion.databases.query({
            database_id: DB.CRM,
            sorts: [{ property: 'Status', direction: 'ascending' }]
        });

        const leads = response.results.map(page => ({
            id: page.id,
            name: page.properties['Business Name']?.title[0]?.plain_text || 'Sans nom',
            status: page.properties['Status']?.select?.name || 'À démarcher',
            contact: page.properties['Contact Person']?.rich_text[0]?.plain_text || '',
            email: page.properties['Contact Email']?.email || '',
            phone: page.properties['Contact Phone']?.phone_number || ''
        }));

        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/crm', async (req, res) => {
    const { name, status, contact, email, phone } = req.body;
    try {
        const response = await notion.pages.create({
            parent: { database_id: DB.CRM },
            properties: {
                'Business Name': { title: [{ text: { content: name } }] },
                'Status': { select: { name: status || 'À démarcher' } },
                'Contact Person': { rich_text: [{ text: { content: contact || '' } }] },
                'Contact Email': { email: email || null },
                'Contact Phone': { phone_number: phone || null }
            }
        });
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/crm/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        // 1. Update Lead Status
        const response = await notion.pages.update({
            page_id: id,
            properties: {
                'Status': { select: { name: status } }
            }
        });

        // 2. Automation: Create Project if "En cours" or "Gagné"
        if (status === 'En cours' || status === 'Gagné' || status === 'In Progress') {
            const leadName = response.properties['Business Name']?.title[0]?.plain_text || 'Nouveau Lead';

            // Check if project already exists (simple duplicate check)
            const existing = await notion.databases.query({
                database_id: DB.PROJECTS,
                filter: {
                    property: 'Project Name',
                    title: {
                        equals: `Projet - ${leadName}`
                    }
                }
            });

            if (existing.results.length === 0) {
                await notion.pages.create({
                    parent: { database_id: DB.PROJECTS },
                    properties: {
                        'Project Name': { title: [{ text: { content: `Projet - ${leadName}` } }] },
                        'Status': { select: { name: status === 'Gagné' ? 'In Progress' : 'Planned' } },
                        'Priority': { select: { name: '⚡ Moyenne' } },
                        'Description': { rich_text: [{ text: { content: `Projet généré automatiquement depuis le lead CRM: ${leadName}` } }] }
                    }
                });
                console.log(`Automated Project Created for: ${leadName}`);
            }
        }

        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Projects Routes ---
app.get('/api/projects', async (req, res) => {
    try {
        const response = await notion.databases.query({
            database_id: DB.PROJECTS,
            sorts: [{ timestamp: 'created_time', direction: 'descending' }]
        });

        const projects = response.results.map(page => ({
            id: page.id,
            name: page.properties['Project Name']?.title[0]?.plain_text || 'Projet sans nom',
            status: page.properties['Status']?.select?.name || 'In Progress',
            // Simple calculation for demo (in real world count done tasks / total tasks)
            progress: Math.floor(Math.random() * 80) + 20
        }));

        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/projects', async (req, res) => {
    const { name, description, status, priority, startDate, endDate } = req.body;
    try {
        const response = await notion.pages.create({
            parent: { database_id: DB.PROJECTS },
            properties: {
                'Project Name': { title: [{ text: { content: name } }] },
                'Status': { select: { name: status || '🔄 En cours' } },
                'Priority': { select: { name: priority || '⚡ Moyenne' } },
                'Description': { rich_text: [{ text: { content: description || '' } }] },
                ...(startDate && { 'Start Date': { date: { start: startDate, end: endDate || null } } })
            }
        });
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Tasks Routes ---
app.get('/api/tasks', async (req, res) => {
    try {
        const response = await notion.databases.query({
            database_id: DB.TASKS,
            sorts: [{ property: 'Due Date', direction: 'ascending' }]
        });

        const tasks = response.results.map(page => ({
            id: page.id,
            name: page.properties['Task Name']?.title[0]?.plain_text || 'Sans nom',
            category: page.properties['Task Category']?.select?.name || 'General',
            status: page.properties['Status']?.select?.name || 'To do',
            assignee: page.properties['Assigned To']?.select?.name || 'Unassigned',
            dueDate: page.properties['Due Date']?.date?.start || null,
            isInPerson: page.properties['In-person Visit?']?.checkbox || false
        }));

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tasks', async (req, res) => {
    const { name, category, assignee, dueDate, status, isInPerson, notes } = req.body;
    try {
        const response = await notion.pages.create({
            parent: { database_id: DB.TASKS },
            properties: {
                'Task Name': { title: [{ text: { content: name } }] },
                'Task Category': { select: { name: category || '🔧 Opérations' } },
                'Status': { select: { name: status || 'To do' } },
                'Assigned To': { select: { name: assignee || 'Unassigned' } },
                ...(dueDate && { 'Due Date': { date: { start: dueDate } } }),
                'In-person Visit?': { checkbox: isInPerson || false }
            }
        });
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const response = await notion.pages.update({
            page_id: id,
            properties: {
                'Status': { select: { name: status } }
            }
        });
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Dashboard Stats ---
app.get('/api/stats', async (req, res) => {
    try {
        const [crm, projects, tasks] = await Promise.all([
            notion.databases.query({ database_id: DB.CRM }),
            notion.databases.query({ database_id: DB.PROJECTS }),
            notion.databases.query({ database_id: DB.TASKS })
        ]);

        res.json({
            leads: crm.results.length,
            projects: projects.results.length,
            tasks: tasks.results.filter(t => t.properties['Status']?.select?.name !== 'Done').length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
