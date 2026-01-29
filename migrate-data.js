import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'server/data.db'));
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function migrate() {
    console.log('--- Starting Migration ---');

    // 1. Migrate Commerces
    const localCommerces = db.prepare('SELECT * FROM commerces').all();
    console.log(`Migrating ${localCommerces.length} commerces...`);

    for (const c of localCommerces) {
        const { error } = await supabase.from('commerces').upsert({
            id: c.id,
            name: c.name,
            category: c.category,
            status: c.status,
            phone: c.phone,
            email: c.email,
            address: c.address,
            notes: c.notes,
            created_at: c.created_at
        });
        if (error) console.error(`Error migrating commerce ${c.name}:`, error);
    }

    // 2. Migrate Projects
    const localProjects = db.prepare('SELECT * FROM projects').all();
    console.log(`Migrating ${localProjects.length} projects...`);
    for (const p of localProjects) {
        const { error } = await supabase.from('projects').upsert({
            id: p.id,
            name: p.name,
            status: p.status,
            progress: p.progress,
            description: p.description,
            created_at: p.created_at
        });
        if (error) console.error(`Error migrating project ${p.name}:`, error);
    }

    // 3. Migrate Tasks
    const localTasks = db.prepare('SELECT * FROM tasks').all();
    console.log(`Migrating ${localTasks.length} tasks...`);
    for (const t of localTasks) {
        const { error } = await supabase.from('tasks').upsert({
            id: t.id,
            name: t.name,
            status: t.status,
            category: t.category,
            assignee: t.assignee,
            due_date: t.due_date,
            time_slot: t.time_slot,
            is_in_person: t.is_in_person === 1,
            project_id: t.project_id,
            commerce_id: t.commerce_id,
            parent_id: t.parent_id,
            google_event_id: t.google_event_id,
            notes: t.notes,
            created_at: t.created_at
        });
        if (error) console.error(`Error migrating task ${t.name}:`, error);
    }

    console.log('--- Migration Finished! ---');
}

migrate();
