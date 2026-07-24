const { projectService } = require('./src/services/projectService');

// Mocking the DB and window.api
const mockDb = {
  execute: async (sql, params) => {
    console.log(`[DB EXEC] ${sql} | Params: ${JSON.stringify(params)}`);
    return { lastInsertId: 1 };
  },
  query: async (sql, params) => {
    console.log(`[DB QUERY] ${sql} | Params: ${JSON.stringify(params)}`);
    return [];
  }
};

global.window = { api: { db: mockDb } };

async function test() {
  console.log('--- Simulación de creación de proyectos ---');

  console.log('\n1. Proyecto de tipo BOOK (Libro):');
  const p1 = await projectService.createNewProject('book', 'Mi Libro');
  console.log(`   -> Tipo: ${p1.type}, Style asignado: ${p1.style}`);

  console.log('\n2. Proyecto de tipo TEACHING (Enseñanza):');
  const p2 = await projectService.createNewProject('teaching', 'Mi Clase');
  console.log(`   -> Tipo: ${p2.type}, Style asignado: ${p2.style}`);

  console.log('\n3. Proyecto de tipo DEVOTIONAL (Devocional):');
  const p3 = await projectService.createNewProject('devotional', 'Mi Devocional');
  console.log(`   -> Tipo: ${p3.type}, Style asignado: ${p3.style}`);

  console.log('\n4. Proyecto con estilo EXPLÍCITO (Libro con estilo moderno):');
  const p4 = await projectService.createNewProject('book', 'Libro Moderno', null, 'estudio_moderno');
  console.log(`   -> Tipo: ${p4.type}, Style asignado: ${p4.style}`);
}

test().catch(console.error);
