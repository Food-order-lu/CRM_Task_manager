import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'data.db'));

// Initialize schema
db.exec(`
    -- CRM (Commerces/Leads)
    CREATE TABLE IF NOT EXISTS commerces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        status TEXT DEFAULT 'Lead',
        phone TEXT,
        email TEXT,
        address TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Projects
    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT DEFAULT '🔄 En cours',
        progress INTEGER DEFAULT 0,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tasks (hierarchical)
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'To do',
        category TEXT DEFAULT '🔧 Opérations',
        assignee TEXT DEFAULT 'Unassigned',
        due_date TEXT,
        time_slot TEXT,
        is_in_person INTEGER DEFAULT 0,
        project_id TEXT,
        commerce_id TEXT,
        parent_id TEXT,
        google_event_id TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY (commerce_id) REFERENCES commerces(id) ON DELETE SET NULL,
        FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    -- App Config (Tokens, etc)
    CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
    );
`);

// Try to add commerce_id column to tasks if it doesn't exist (migration)
try {
    db.exec("ALTER TABLE tasks ADD COLUMN commerce_id TEXT");
} catch (e) {
    // Column probably already exists
}

// Helper to generate UUIDs
export const generateId = () => randomUUID();

// --- Config Operations ---
export const config = {
    get: (key) => db.prepare('SELECT value FROM config WHERE key = ?').get(key)?.value,
    set: (key, value) => db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value.toString()),
    delete: (key) => db.prepare('DELETE FROM config WHERE key = ?').run(key)
};

// --- Commerce/CRM Operations ---
export const commerces = {
    getAll: () => db.prepare('SELECT * FROM commerces ORDER BY created_at DESC').all(),
    getById: (id) => db.prepare('SELECT * FROM commerces WHERE id = ?').get(id),
    create: (data) => {
        const id = generateId();
        const stmt = db.prepare(`
            INSERT INTO commerces (id, name, category, status, phone, email, address, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(id, data.name, data.category, data.status || 'Lead', data.phone, data.email, data.address, data.notes);
        return { id, ...data };
    },
    update: (id, data) => {
        const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
        const stmt = db.prepare(`UPDATE commerces SET ${fields} WHERE id = ?`);
        stmt.run(...Object.values(data), id);
        return { id, ...data };
    },
    delete: (id) => db.prepare('DELETE FROM commerces WHERE id = ?').run(id)
};

// --- Project Operations ---
export const projects = {
    getAll: () => db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all(),
    getById: (id) => db.prepare('SELECT * FROM projects WHERE id = ?').get(id),
    create: (data) => {
        const id = generateId();
        const stmt = db.prepare(`
            INSERT INTO projects (id, name, status, progress, description)
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(id, data.name, data.status || '🔄 En cours', data.progress || 0, data.description);
        return { id, ...data };
    },
    update: (id, data) => {
        const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
        const stmt = db.prepare(`UPDATE projects SET ${fields} WHERE id = ?`);
        stmt.run(...Object.values(data), id);
        return { id, ...data };
    },
    delete: (id) => db.prepare('DELETE FROM projects WHERE id = ?').run(id)
};

// --- Task Operations ---
export const tasks = {
    getAll: () => db.prepare(`
        SELECT t.*, c.name as commerce_name 
        FROM tasks t 
        LEFT JOIN commerces c ON t.commerce_id = c.id 
        ORDER BY t.due_date ASC, t.created_at DESC
    `).all(),
    getById: (id) => db.prepare('SELECT * FROM tasks WHERE id = ?').get(id),
    getByProject: (projectId) => db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC').all(projectId),
    getByCommerce: (commerceId) => db.prepare('SELECT * FROM tasks WHERE commerce_id = ? ORDER BY created_at ASC').all(commerceId),
    create: (data) => {
        const id = generateId();
        const stmt = db.prepare(`
            INSERT INTO tasks (id, name, status, category, assignee, due_date, time_slot, is_in_person, project_id, commerce_id, parent_id, google_event_id, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
            id,
            data.name,
            data.status || 'To do',
            data.category || '🔧 Opérations',
            data.assignee || 'Unassigned',
            data.dueDate || data.due_date || null,
            data.timeSlot || data.time_slot || data.time || null,
            data.isInPerson || data.is_in_person ? 1 : 0,
            data.projectId || data.project_id || null,
            data.commerceId || data.commerce_id || null,
            data.parentId || data.parent_id || null,
            data.googleEventId || data.google_event_id || null,
            data.notes || null
        );
        return { id, ...data };
    },
    update: (id, data) => {
        const mapping = {
            dueDate: 'due_date',
            timeSlot: 'time_slot',
            isInPerson: 'is_in_person',
            projectId: 'project_id',
            commerceId: 'commerce_id',
            parentId: 'parent_id',
            googleEventId: 'google_event_id'
        };
        const mapped = {};
        for (const [key, value] of Object.entries(data)) {
            mapped[mapping[key] || key] = key === 'isInPerson' ? (value ? 1 : 0) : value;
        }
        const fields = Object.keys(mapped).map(k => `${k} = ?`).join(', ');
        const stmt = db.prepare(`UPDATE tasks SET ${fields} WHERE id = ?`);
        stmt.run(...Object.values(mapped), id);
        return { id, ...data };
    },
    delete: (id) => db.prepare('DELETE FROM tasks WHERE id = ?').run(id),
    setGoogleEventId: (id, googleEventId) => {
        db.prepare('UPDATE tasks SET google_event_id = ? WHERE id = ?').run(googleEventId, id);
    }
};

export default db;
