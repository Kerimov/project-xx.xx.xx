import { pool } from '../src/db/connection.js';

async function checkDb() {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM documents');
    console.log(`📊 Documents in DB: ${result.rows[0].count}`);
    
    const docs = await pool.query('SELECT id, number, type, organization_id, created_at FROM documents ORDER BY created_at DESC LIMIT 5');
    console.log('\n📄 Last 5 documents:');
    docs.rows.forEach((doc: any) => {
      console.log(`  - ${doc.number} (${doc.type}) - ${doc.created_at}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDb();
