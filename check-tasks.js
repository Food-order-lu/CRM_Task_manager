import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkTasks() {
    const { data: tasks, error } = await supabase.from('tasks').select('*');
    if (error) {
        console.error(error);
    } else {
        console.log(`Found ${tasks.length} tasks.`);
        console.log(tasks.map(t => ({ id: t.id, name: t.name, category: t.category })));
    }
}

checkTasks();
