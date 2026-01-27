const Database = require('better-sqlite3');
const db = new Database('data.db');
const rows = db.prepare('SELECT id, name, project_id, commerce_id, category FROM tasks').all();
console.log(JSON.stringify(rows, null, 2));
db.close();
