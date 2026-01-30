import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkData() {
    const { data: commerces, error: cError } = await supabase.from('commerces').select('id, name, status');
    if (cError) {
        console.error('Error fetching commerces:', cError);
    } else {
        console.log(`Found ${commerces.length} commerces.`);
        console.log(commerces.slice(0, 5));
    }
}

checkData();
