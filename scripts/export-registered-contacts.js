require('dotenv/config');

const fs = require('fs');
const path = require('path');
const mariadb = require('mariadb');

function rowLine(row, index) {
  const name = `${row.firstName || ''} ${row.lastName || ''}`.trim();
  return [
    index + 1,
    name,
    row.email || '',
    row.phone || '',
    row.whatsappNumber || '',
  ].join('\t');
}

async function connect() {
  const url = new URL(process.env.DATABASE_URL);
  return mariadb.createConnection({
    host: url.hostname,
    port: Number(url.port),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
    connectTimeout: 20000,
  });
}

async function main() {
  const conn = await connect();
  const benfeks = await conn.query(
    "SELECT firstName, lastName, email, phone, whatsappNumber FROM User WHERE role = 'benfek' ORDER BY id ASC",
  );
  const principals = await conn.query(
    "SELECT firstName, lastName, email, phone, whatsappNumber FROM User WHERE role = 'principal' ORDER BY id ASC",
  );
  conn.destroy();

  const lines = [
    'Registered Benfek and Principal Contacts',
    `Generated: ${new Date().toISOString()}`,
    `Total Benfeks: ${benfeks.length} | Total Principals: ${principals.length}`,
    '',
    'BENFEKS',
    '#\tName\tEmail\tPhone\tWhatsApp Number',
    ...benfeks.map(rowLine),
    '',
    'PRINCIPALS',
    '#\tName\tEmail\tPhone\tWhatsApp Number',
    ...principals.map(rowLine),
    '',
  ];

  const outputPath = path.resolve(__dirname, '..', '..', 'webscrapping', 'registered_benfek_principal_contacts.doc');
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');

  console.log(JSON.stringify({ outputPath, benfekCount: benfeks.length, principalCount: principals.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
