require('dotenv/config');

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const rootDir = path.resolve(__dirname, '..', '..');
const apiDir = path.resolve(__dirname, '..');
const webscrappingDir = path.join(rootDir, 'webscrapping');
const reportPath = path.join(webscrappingDir, 'progress', 'todays_scraped_import_report.json');

function readDbTargets() {
  const envPath = path.join(apiDir, '.env');
  const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const targets = [];

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*#?\s*DATABASE_URL\s*=\s*"([^"]+)".*#\s*(production|testing)/i);
    if (match) {
      targets.push({ name: match[2].toLowerCase(), url: match[1] });
    }
  }

  const unique = new Map(targets.map((target) => [target.name, target]));
  if (!unique.has('testing') && process.env.DATABASE_URL) {
    unique.set('testing', { name: 'testing', url: process.env.DATABASE_URL });
  }

  for (const name of ['production', 'testing']) {
    if (!unique.has(name)) {
      throw new Error(`Could not find ${name} DATABASE_URL in api/.env`);
    }
  }

  return [unique.get('production'), unique.get('testing')];
}

async function updateDatabase(target, imageMap) {
  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(target.url),
  });

  const result = {
    target: target.name,
    updated: 0,
    failed: [],
  };

  try {
    for (const [key, imageUrl] of Object.entries(imageMap)) {
      const [brand, product] = key.split('::');
      try {
        const supplement = await prisma.supplement.findFirst({
          where: {
            name: product,
            manufacturer: brand,
          },
          select: { id: true },
        });

        if (supplement) {
          await prisma.supplement.update({
            where: { id: supplement.id },
            data: { imageUrl },
          });
          result.updated += 1;
          console.log(`✓ Updated ${target.name}: ${brand} - ${product}`);
        } else {
          result.failed.push({
            brand,
            product,
            message: 'Product not found in database',
          });
          console.log(`✗ Not found in ${target.name}: ${brand} - ${product}`);
        }
      } catch (error) {
        result.failed.push({
          brand,
          product,
          message: error.message,
        });
        console.log(`✗ Error updating ${target.name}: ${brand} - ${product}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  return result;
}

async function main() {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  // Build image URL map
  const imageMap = {};
  if (report.imageUploadResults && Array.isArray(report.imageUploadResults)) {
    for (const result of report.imageUploadResults) {
      if (result.imageUrl) {
        const key = `${result.brand}::${result.product}`;
        imageMap[key] = result.imageUrl;
      }
    }
  }

  if (Object.keys(imageMap).length === 0) {
    console.error('No image URLs found in report');
    process.exitCode = 1;
    return;
  }

  console.log(`Found ${Object.keys(imageMap).length} images to update in databases\n`);

  const targets = readDbTargets();
  const updates = [];

  for (const target of targets) {
    console.log(`\nUpdating ${target.name} database...`);
    const result = await updateDatabase(target, imageMap);
    updates.push(result);
  }

  // Update report with update results
  report.databaseUpdates = updates;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n=== SUMMARY ===');
  for (const update of updates) {
    console.log(`${update.target}: ${update.updated} updated, ${update.failed.length} failed`);
  }
  console.log(`Report updated: ${reportPath}`);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exitCode = 1;
});
