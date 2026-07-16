const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const p = new PrismaClient();

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "\\'").replace(/\\/g, "\\\\")}'`;
}

function formatDateTime(d) {
  if (!d) return 'NULL';
  const dt = new Date(d);
  return esc(dt.toISOString().replace('T', ' ').replace('Z', ''));
}

(async () => {
  try {
    // These are the actual table names in the Railway database (PascalCase from @@map)
    const tables = [
      'Announcement', 'AnnouncementStatus', 'ApprovalStatus', 'AvailabilityStatus',
      'Booking', 'BookingStatus', 'CalendarBlock', 'Client', 'ClientOrganization',
      'ClientRole', 'Document', 'DocumentType', 'Facility', 'FacilityImage',
      'FacilityRate', 'FacilityVenue', 'Inventory', 'LetterStatus', 'Notification',
      'Package', 'PackageInclusion', 'Particular', 'Payment', 'PaymentStatus',
      'RescheduleRequest', 'Reservation', 'ReservedParticular', 'Schedule',
      'Staff', 'StaffOrganization', 'StaffRole', 'TimeSlot', 'Transaction',
      'AuditLog'
    ];

    let sql = `-- ============================================\n`;
    sql += `-- Railway Database Export\n`;
    sql += `-- Generated: ${new Date().toISOString()}\n`;
    sql += `-- ============================================\n\n`;
    sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    for (const table of tables) {
      try {
        // Get columns
        const cols = await p.$queryRawUnsafe(`SHOW COLUMNS FROM \`${table}\``);
        const colNames = cols.map(c => c.Field);

        // Get rows
        const rows = await p.$queryRawUnsafe(`SELECT * FROM \`${table}\``);
        
        sql += `-- --------------------------------------------\n`;
        sql += `-- Table: ${table} (${rows.length} rows)\n`;
        sql += `-- --------------------------------------------\n`;

        if (rows.length === 0) {
          sql += `-- (empty)\n\n`;
          continue;
        }

        sql += `TRUNCATE TABLE \`${table}\`;\n`;

        for (const row of rows) {
          const values = colNames.map(col => {
            const val = row[col];
            if (val === null || val === undefined) return 'NULL';
            if (val instanceof Date || (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/))) {
              return formatDateTime(val);
            }
            if (typeof val === 'number') return String(val);
            return esc(val);
          });

          sql += `INSERT INTO \`${table}\` (\`${colNames.join('`, `')}\`) VALUES (${values.join(', ')});\n`;
        }
        sql += '\n';
      } catch (e) {
        sql += `-- Table ${table} could not be exported: ${e.message}\n\n`;
      }
    }

    sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    sql += `-- ============================================\n`;
    sql += `-- Export Complete\n`;
    sql += `-- ============================================\n`;

    const filename = `railway_export_${Date.now()}.sql`;
    fs.writeFileSync(filename, sql, 'utf8');
    console.log(`✅ Database exported to: ${filename}`);
    console.log(`📦 File size: ${(Buffer.byteLength(sql) / 1024).toFixed(1)} KB`);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
})();