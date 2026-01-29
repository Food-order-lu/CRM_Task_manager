import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables! Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// --- Config Operations ---
export const config = {
    get: async (key) => {
        const { data, error } = await supabase.from('config').select('value').eq('key', key).single();
        if (error) return null;
        return data.value;
    },
    set: async (key, value) => {
        const { error } = await supabase.from('config').upsert({ key, value: value.toString() });
        if (error) throw error;
    },
    delete: async (key) => {
        const { error } = await supabase.from('config').delete().eq('key', key);
        if (error) throw error;
    }
};

// --- Commerce/CRM Operations ---
export const commerces = {
    getAll: async () => {
        const { data, error } = await supabase.from('commerces').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },
    getById: async (id) => {
        const { data, error } = await supabase.from('commerces').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    },
    create: async (data) => {
        const { data: result, error } = await supabase.from('commerces').insert([
            {
                name: data.name,
                category: data.category,
                status: data.status || 'Lead',
                phone: data.phone,
                email: data.email,
                address: data.address,
                notes: data.notes
            }
        ]).select().single();
        if (error) throw error;
        return result;
    },
    update: async (id, data) => {
        const { data: result, error } = await supabase.from('commerces').update(data).eq('id', id).select().single();
        if (error) throw error;
        return result;
    },
    delete: async (id) => {
        const { error } = await supabase.from('commerces').delete().eq('id', id);
        if (error) throw error;
    }
};

// --- Project Operations ---
export const projects = {
    getAll: async () => {
        const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },
    getById: async (id) => {
        const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    },
    create: async (data) => {
        const { data: result, error } = await supabase.from('projects').insert([
            {
                name: data.name,
                status: data.status || '🔄 En cours',
                progress: data.progress || 0,
                description: data.description
            }
        ]).select().single();
        if (error) throw error;
        return result;
    },
    update: async (id, data) => {
        const { data: result, error } = await supabase.from('projects').update(data).eq('id', id).select().single();
        if (error) throw error;
        return result;
    },
    delete: async (id) => {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) throw error;
    }
};

// --- Task Operations ---
export const tasks = {
    getAll: async () => {
        // Simple join using foreign key if RLS allows and relationships are named clearly
        const { data, error } = await supabase
            .from('tasks')
            .select('*, commerces(name)')
            .order('due_date', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map commerce name to match old sqlite field
        return data.map(t => ({
            ...t,
            commerceName: t.commerces?.name || null
        }));
    },
    getById: async (id) => {
        const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    },
    getByProject: async (projectId) => {
        const { data, error } = await supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
        if (error) throw error;
        return data;
    },
    getByCommerce: async (commerceId) => {
        const { data, error } = await supabase.from('tasks').select('*').eq('commerce_id', commerceId).order('created_at', { ascending: true });
        if (error) throw error;
        return data;
    },
    create: async (data) => {
        const { data: result, error } = await supabase.from('tasks').insert([
            {
                name: data.name,
                status: data.status || 'To do',
                category: data.category || '🔧 Opérations',
                assignee: data.assignee || 'Unassigned',
                due_date: data.dueDate || data.due_date || null,
                time_slot: data.timeSlot || data.time_slot || data.time || null,
                is_in_person: !!(data.isInPerson || data.is_in_person),
                project_id: data.projectId || data.project_id || null,
                commerce_id: data.commerceId || data.commerce_id || null,
                parent_id: data.parentId || data.parent_id || null,
                google_event_id: data.googleEventId || data.google_event_id || null,
                notes: data.notes || null
            }
        ]).select().single();
        if (error) throw error;
        return result;
    },
    update: async (id, data) => {
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
            mapped[mapping[key] || key] = key === 'isInPerson' ? !!value : value;
        }
        const { data: result, error } = await supabase.from('tasks').update(mapped).eq('id', id).select().single();
        if (error) throw error;
        return result;
    },
    delete: async (id) => {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) throw error;
    },
    setGoogleEventId: async (id, googleEventId) => {
        const { error } = await supabase.from('tasks').update({ google_event_id: googleEventId }).eq('id', id);
        if (error) throw error;
    }
};
