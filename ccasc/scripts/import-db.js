const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

console.log('Connecting to Railway MySQL database...');
console.log('Host: acela.proxy.rlwy.net:30001');

const connection = mysql.createConnection({
  host: 'acela.proxy.rlwy.net',
  port: 30001,
  user: 'root',
  password: 'NighiLFAuYAQRvOIcnVkaPhQDhLrGlPk',
  database: 'railway',
  ssl: { rejectUnauthorized: false },
  multipleStatements: true,
  connectTimeout: 30000
});

connection.connect(async (err) => {
  if (err) {
    console.error('Error connecting:', err.message);
    process.exit(1);
  }
  console.log('Connected!');

  const sqlFile = path.join(__dirname, '..', 'all_data_fixed.sql');
  let sql = fs.readFileSync(sqlFile, 'utf8');

  // Replace /*!....*/ with just the inner content (remove the comment markers, keep the SQL)
  // Pattern: /*!xxxxx SQL CONTENT */
  sql = sql.replace(/\/\*![0-9]*\s*/g, '');  // remove opening /*!xxxxx
  sql = sql.replace(/\*\//g, '');              // remove closing */
  
  // Remove single-line comments
  sql = sql.replace(/--.*$/gm, '');
  // Remove empty lines
  sql = sql.replace(/^\s*[\r\n]/gm, '\n');
  
  // Debug: print first 500 chars
  console.log('First 500 chars of processed SQL:');
  console.log(sql.substring(0, 500));
  console.log('...');

  // Disable FK constraints
  await new Promise((resolve, reject) => {
    connection.query('SET FOREIGN_KEY_CHECKS = 0', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Split by semicolons to get individual statements
  const statements = sql.split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);
  
  console.log(`\nFound ${statements.length} statements`);
  
  let executedCount = 0;
  let errorCount = 0;
  let skipCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    
    // Skip SET/LOCK/UNLOCK/ALTER
    if (/^(SET|LOCK|UNLOCK|ALTER)\s/i.test(stmt)) {
      skipCount++;
      continue;
    }

    // Only execute INSERT statements
    if (/^INSERT\s+INTO/i.test(stmt)) {
      try {
        await new Promise((resolve, reject) => {
          connection.query(stmt, (err, result) => {
            if (err) {
              errorCount++;
              if (errorCount <= 3) {
                console.error(`\n⚠️  Error [${i}]: ${err.message.substring(0, 150)}`);
              }
            } else {
              executedCount++;
            }
            resolve();
          });
        });
      } catch (e) {
        errorCount++;
      }
    } else {
      skipCount++;
    }

    if (i % 10 === 0) {
      process.stdout.write(`\rProgress: ${i}/${statements.length}`);
    }
  }

  await new Promise((resolve) => {
    connection.query('SET FOREIGN_KEY_CHECKS = 1', resolve);
  });

  console.log(`\n✅ Import complete!`);
  console.log(`   Rows inserted: ${executedCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Skipped (SET/LOCK/ALTER/other): ${skipCount}`);
  connection.end();
});