require('dotenv/config');

const fs = require('fs');
const path = require('path');
const { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const rootDir = path.resolve(__dirname, '..', '..');
const apiDir = path.resolve(__dirname, '..');
const webscrappingDir = path.join(rootDir, 'webscrapping');
const scrapeLogPath = path.join(webscrappingDir, 'progress', 'scrape_log.csv');
const finalDatasetPath = path.join(webscrappingDir, 'final_product_level_dataset.csv');
const reportPath = path.join(webscrappingDir, 'progress', 'todays_scraped_import_report.json');
const today = process.env.SCRAPED_IMPORT_DATE || new Date().toISOString().slice(0, 10);

const s3 = new S3Client({
  region: process.env.AWS_REGION || '',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const skipImageUpload = String(process.env.SKIP_IMAGE_UPLOAD || '').toLowerCase() === 'true';

function parseCsvLine(line) {
  const values = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(value);
      value = '';
    } else {
      value += char;
    }
  }

  values.push(value);
  return values;
}

function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = content.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines.shift()).map((header) => header.trim());

  return lines.map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = (values[index] || '').trim();
      return row;
    }, {});
  });
}

function safeJoinUnder(parent, relativePath) {
  const parentPath = path.resolve(parent);
  const targetPath = path.resolve(parentPath, String(relativePath || ''));
  const relative = path.relative(parentPath, targetPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return targetPath;
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slug(value) {
  return normalizeName(value).replace(/\s+/g, '-');
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  return 'image/jpeg';
}

async function uploadImage(filePath, brand, product) {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  if (!bucket || !region) return null;

  const extension = path.extname(filePath).toLowerCase() || '.jpg';
  if (!IMAGE_EXTENSIONS.has(extension)) return null;

  const key = `supplements/scraped/${slug(brand)}/${slug(product)}${extension}`;
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fs.readFileSync(filePath),
    ContentType: contentTypeFor(filePath),
  }));

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function parseRating(value) {
  if (!value) return null;
  const rating = Number(String(value).replace(/%/g, '').trim());
  return Number.isFinite(rating) ? rating : null;
}

function datasetKey(brand, product) {
  return `${normalizeName(brand)}::${normalizeName(product)}`;
}

function readDescription(logRow, datasetRow) {
  const descriptionPath = safeJoinUnder(webscrappingDir, logRow.description_path);
  if (descriptionPath && fs.existsSync(descriptionPath)) {
    const description = fs.readFileSync(descriptionPath, 'utf8').trim();
    if (description) return description;
  }

  return datasetRow?.['Description / Rationale + Research'] || logRow.Product;
}

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

async function findImportUser(prisma) {
  const user = await prisma.user.findFirst({
    where: { role: 'researcher' },
    orderBy: { id: 'asc' },
    select: { id: true, email: true, role: true },
  }) || await prisma.user.findFirst({
    where: { role: 'principal' },
    orderBy: { id: 'asc' },
    select: { id: true, email: true, role: true },
  }) || await prisma.user.findFirst({
    where: { role: { not: 'wholesaler' } },
    orderBy: { id: 'asc' },
    select: { id: true, email: true, role: true },
  });

  if (!user) throw new Error('No non-wholesaler user found for imported products');
  return user;
}

async function importIntoTarget(target, products) {
  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(target.url),
  });

  const result = {
    target: target.name,
    user: null,
    created: 0,
    updated: 0,
    failed: [],
  };

  try {
    const user = await findImportUser(prisma);
    result.user = { id: user.id, role: user.role, email: user.email };

    for (const product of products) {
      try {
        const existing = await prisma.supplement.findFirst({
          where: {
            name: product.name,
            manufacturer: product.manufacturer,
          },
          select: { id: true },
        });

        const data = {
          name: product.name,
          description: product.description,
          rating: product.rating,
          category: product.category,
          manufacturer: product.manufacturer,
          tags: product.tags,
          status: 'in_stock',
        };
        if (product.imageUrl) data.imageUrl = product.imageUrl;

        if (existing) {
          await prisma.supplement.update({
            where: { id: existing.id },
            data,
          });
          result.updated += 1;
        } else {
          await prisma.supplement.create({
            data: {
              ...data,
              price: 0,
              stock: 0,
              userId: user.id,
            },
          });
          result.created += 1;
        }
      } catch (error) {
        result.failed.push({
          brand: product.manufacturer,
          product: product.name,
          message: error.message,
        });
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  return result;
}

async function main() {
  const logRows = parseCsv(scrapeLogPath)
    .filter((row) => row.scrape_status === 'SCRAPED' && String(row.last_updated || '').startsWith(today));

  const datasetRows = new Map(
    parseCsv(finalDatasetPath).map((row) => [datasetKey(row.Brand, row.Product), row]),
  );

  const products = [];
  const missingImages = [];
  const imageUploadFailures = [];
  let uploadedImages = 0;

  for (const row of logRows) {
    const datasetRow = datasetRows.get(datasetKey(row.Brand, row.Product));
    const imagePath = safeJoinUnder(webscrappingDir, row.image_path);
    let imageUrl = null;

    if (skipImageUpload) {
      if (imagePath && fs.existsSync(imagePath)) {
        imageUploadFailures.push({
          brand: row.Brand,
          product: row.Product,
          message: 'Skipped by SKIP_IMAGE_UPLOAD=true',
        });
      } else {
        missingImages.push({ brand: row.Brand, product: row.Product, imagePath: row.image_path });
      }
    } else if (imagePath && fs.existsSync(imagePath)) {
      try {
        imageUrl = await uploadImage(imagePath, row.Brand, row.Product);
        if (imageUrl) uploadedImages += 1;
      } catch (error) {
        imageUploadFailures.push({
          brand: row.Brand,
          product: row.Product,
          message: error.message,
        });
      }
    } else {
      missingImages.push({ brand: row.Brand, product: row.Product, imagePath: row.image_path });
    }

    products.push({
      name: row.Product,
      description: readDescription(row, datasetRow),
      rating: parseRating(datasetRow?.Rating),
      category: datasetRow?.Class || null,
      manufacturer: row.Brand,
      imageUrl,
      tags: datasetRow?.Class ? { hls_factors: [datasetRow.Class] } : {},
    });
  }

  const targets = readDbTargets();
  const imports = [];
  for (const target of targets) {
    imports.push(await importIntoTarget(target, products));
  }

  const report = {
    importDate: today,
    scrapedRows: logRows.length,
    preparedProducts: products.length,
    uploadedImages,
    missingImages,
    imageUploadFailures,
    imports,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
