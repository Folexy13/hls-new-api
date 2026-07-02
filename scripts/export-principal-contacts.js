require('dotenv/config');

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL || ''),
});

function rowLine(row, index) {
  return [
    index + 1,
    row.firstName || '',
    row.lastName || '',
    row.email || '',
    row.phone || '',
    row.whatsappNumber || '',
  ].join('\t');
}

async function main() {
  const principals = await prisma.user.findMany({
    where: { role: 'principal' },
    orderBy: { id: 'asc' },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      whatsappNumber: true,
    },
  });

  const lines = [
    'Registered Principal Contacts',
    `Generated: ${new Date().toISOString()}`,
    `Total Principals: ${principals.length}`,
    '',
    '#\tFirst Name\tLast Name\tEmail\tPhone\tWhatsApp Number',
    ...principals.map(rowLine),
    '',
  ];

  const outputPath = path.resolve(__dirname, '..', '..', 'webscrapping', 'registered_principal_contacts.doc');
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');

  console.log(JSON.stringify({ outputPath, principalCount: principals.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
