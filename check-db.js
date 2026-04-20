const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'database.db');
console.log('📁 Verificando BD en:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error abriendo BD:', err.message);
    process.exit(1);
  }
  console.log('✅ BD abierta correctamente\n');
});

// Verificar tablas
db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
  if (err) {
    console.error('❌ Error consultando tablas:', err.message);
  } else {
    console.log('📋 Tablas encontradas (' + tables.length + '):');
    tables.forEach(t => console.log('   -', t.name));
  }

  console.log('');
});

// Verificar usuarios
db.all("SELECT id, username, nombre_completo, rol, activo FROM usuarios", (err, rows) => {
  if (err) {
    console.error('❌ Error en tabla usuarios:', err.message);
  } else {
    console.log('👤 Usuarios encontrados (' + rows.length + '):');
    rows.forEach(u => {
      console.log(`   - ${u.username} (${u.nombre_completo}) - ${u.rol} - ${u.activo ? 'Activo' : 'Inactivo'}`);
    });

    if (rows.length === 0) {
      console.log('   ⚠️ No hay usuarios en la tabla');
    }
  }

  console.log('');
});

// Verificar password_hash
db.all("SELECT username, password_hash FROM usuarios", (err, rows) => {
  if (err) {
    console.error('❌ Error verificando passwords:', err.message);
  } else {
    console.log('🔐 Estado de passwords:');
    rows.forEach(u => {
      const hash = u.password_hash;
      const status = !hash ? 'NULL' :
        hash === 'temp_hash_admin' || hash === 'temp_hash_vendedor' ? 'TEMP (sin hashear)' :
          'HASHEADO ✓';
      console.log(`   - ${u.username}: ${status}`);
    });
  }

  db.close();
});

console.log('🔍 Ejecutando consultas...\n');