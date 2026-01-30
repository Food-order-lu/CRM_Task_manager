import fetch from 'node-fetch';

async function test() {
    const taskData = {
        name: "Test Note Task",
        category: "🔧 Opérations",
        assignee: "Tiago",
        status: "To do",
        notes: "This is a test note"
    };

    const res = await fetch('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
    });

    const result = await res.json();
    console.log('Created task:', result);

    const checkRes = await fetch(`http://localhost:3000/api/tasks`);
    const allTasks = await checkRes.json();
    const created = allTasks.find(t => t.id === result.id);
    console.log('Fetched created task:', created);
}

test();
