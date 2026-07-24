const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const searchPaths = [
  path.join(process.env.HOME, '.config/LemWriter/lemwriter.db'),
  path.join(process.env.HOME, '.config/lemwriter/lemwriter.db'),
  path.join(process.cwd(), 'lemwriter.db'),
  path.join(process.cwd(), 'electron/lemwriter.db'),
  path.join(process.cwd(), 'database/lemwriter.db'),
];

async function checkDb() {
  let dbPath = null;
  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      dbPath = p;
      break;
    }
  }

  if (!dbPath) {
    console.error('Could not find lemwriter.db in searched paths.');
    return;
  }

  console.log(`Found database at: ${dbPath}`);
  const db = new Database(dbPath);

  try {
    const projects = db.prepare('SELECT * FROM projects').all();
    console.log('Projects in SQLite:', projects.length);
    if (projects.length > 0) {
      console.log('Projects list:', JSON.stringify(projects, null, 2));
    }

    const models = db.prepare('SELECT * FROM custom_models').all();
    console.log('Models in SQLite:', models.length);
    if (models.length > 0) {
      console.log('Models list:', JSON.stringify(models, null, 2));
    }

    const sections = db.prepare('SELECT * FROM sections').all();
    console.log('Sections in SQLite:', sections.length);

  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    db.close();
  }
}

checkDb();
