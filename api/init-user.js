const duckdb = require('duckdb');
const bcrypt = require('bcrypt');

async function createUser() {
  return new Promise((resolve, reject) => {
    const db = new duckdb.Database('./data/usuarios.db');
    
    db.run('CREATE SEQUENCE IF NOT EXISTS seq_usuarios START 1', (err1) => {
      if (err1 && !err1.message.includes('already exists')) {
        console.error('Sequence error:', err1.message);
      }
      
      db.run(`CREATE TABLE IF NOT EXISTS tb_usuarios (
        id INTEGER PRIMARY KEY,
        username VARCHAR NOT NULL UNIQUE,
        password_hash VARCHAR NOT NULL,
        nome_completo VARCHAR NOT NULL,
        tipo_usuario VARCHAR NOT NULL,
        ativo BOOLEAN DEFAULT true,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`, (err2) => {
        if (err2 && !err2.message.includes('already exists')) {
          console.error('Table error:', err2.message);
        }
        
        db.all("SELECT COUNT(*) as count FROM tb_usuarios WHERE username = 'conjo'", (err3, rows) => {
          if (err3) {
            console.error('Select error:', err3.message);
            db.close();
            return reject(err3);
          }
          
          if (rows && rows[0].count === 0) {
            const hash = bcrypt.hashSync('admin123', 10);
            db.run(
              "INSERT INTO tb_usuarios (id, username, password_hash, nome_completo, tipo_usuario, ativo) VALUES (nextval('seq_usuarios'), 'conjo', ?, 'Conjo', 'admin', true)",
              [hash],
              (err4) => {
                if (err4) {
                  console.error('Insert error:', err4.message);
                  db.close();
                  return reject(err4);
                }
                console.log('✓ Usuario admin criado (username: conjo, password: admin123)');
                db.close();
                resolve();
              }
            );
          } else {
            console.log('✓ Usuario admin ja existe');
            db.close();
            resolve();
          }
        });
      });
    });
  });
}

createUser().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
