import fetch from 'node-fetch';

async function check() {
    try {
        const res = await fetch('http://localhost:3000/api/tasks');
        const tasks = await res.json();
        console.log('Total tasks:', tasks.length);
        tasks.forEach(t => {
            if (t.notes) {
                console.log(`Task: ${t.name} -> Notes: ${t.notes}`);
            }
        });
    } catch (e) {
        console.error(e);
    }
}

check();
