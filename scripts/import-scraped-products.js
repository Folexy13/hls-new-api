require('dotenv/config');

const fs = require('fs');
const path = require('path');
const { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const rootDir = path.resolve(__dirname, '..', '..');
const webscrappingDir = path.join(rootDir, 'webscrapping');
const csvPath = path.join(webscrappingDir, 'final_product_level_dataset.csv');
const imagesDir = path.join(webscrappingDir, 'images');
const publicImagesDir = path.join(rootDir, 'fe', 'public', 'scraped-products');
const reportDir = path.join(webscrappingDir, 'progress');
const missingImagesReport = path.join(reportDir, 'missing_product_images.csv');

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL || ''),
});

const s3 = new S3Client({
  region: process.env.AWS_REGION || '',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function safePathSegment(value) {
  const segment = String(value || '').replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
  if (!segment || segment === '.' || segment === '..') return null;
  return segment;
}

function safeJoinUnder(parent, ...segments) {
  const safeSegments = segments.map(safePathSegment);
  if (safeSegments.some((segment) => !segment)) return null;

  const parentPath = path.resolve(parent);
  // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
  const targetPath = path.resolve(parentPath, ...safeSegments);
  const relativePath = path.relative(parentPath, targetPath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  return targetPath;
}

function parseCsvLine(line) {
  const values = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
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

function normalizeName(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findDirectory(parent, expectedName) {
  const exactPath = safeJoinUnder(parent, expectedName);
  if (exactPath && fs.existsSync(exactPath)) return exactPath;

  const normalizedExpected = normalizeName(expectedName);
  const match = fs
    .readdirSync(parent, { withFileTypes: true })
    .find((entry) => entry.isDirectory() && normalizeName(entry.name) === normalizedExpected);

  return match ? safeJoinUnder(parent, match.name) : null;
}

function findProductImage(brand, product) {
  const brandDir = findDirectory(imagesDir, brand);
  if (!brandDir) return null;

  for (const extension of IMAGE_EXTENSIONS) {
    const exactPath = safeJoinUnder(brandDir, `${product}${extension}`);
    if (exactPath && fs.existsSync(exactPath)) return exactPath;
  }

  const normalizedProduct = normalizeName(product);
  const match = fs
    .readdirSync(brandDir, { withFileTypes: true })
    .find((entry) => {
      if (!entry.isFile()) return false;
      const extension = path.extname(entry.name).toLowerCase();
      return IMAGE_EXTENSIONS.includes(extension) && normalizeName(path.basename(entry.name, extension)) === normalizedProduct;
    });

  return match ? safeJoinUnder(brandDir, match.name) : null;
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function safeKeyPart(value) {
  return normalizeName(value).replace(/\s+/g, '-');
}

async function uploadImage(filePath, brand, product) {
  if ((process.env.SCRAPED_PRODUCTS_STORAGE || 'local').toLowerCase() !== 's3') {
    const extension = path.extname(filePath).toLowerCase() || '.jpg';
    const brandPart = safeKeyPart(brand);
    const productPart = safeKeyPart(product);
    const targetDir = safeJoinUnder(publicImagesDir, brandPart);
    const targetPath = safeJoinUnder(publicImagesDir, brandPart, `${productPart}${extension}`);

    if (!targetDir || !targetPath) {
      throw new Error(`Invalid image output path for ${brand} - ${product}`);
    }

    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(filePath, targetPath);

    return `/scraped-products/${brandPart}/${productPart}${extension}`;
  }

  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;

  if (!bucket || !region) {
    throw new Error('AWS_S3_BUCKET and AWS_REGION are required to upload product images');
  }

  const extension = path.extname(filePath).toLowerCase() || '.jpg';
  const key = `supplements/scraped/${safeKeyPart(brand)}/${safeKeyPart(product)}${extension}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fs.readFileSync(filePath),
      ContentType: contentTypeFor(filePath),
    }),
  );

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function parseRating(value) {
  if (!value) return null;
  const rating = Number(String(value).replace(/%/g, '').trim());
  return Number.isFinite(rating) ? rating : null;
}

async function findResearcherId() {
  if (process.env.SCRAPED_PRODUCTS_USER_ID) {
    return Number(process.env.SCRAPED_PRODUCTS_USER_ID);
  }

  const researcher = await prisma.user.findFirst({
    where: { role: 'researcher' },
    orderBy: { id: 'asc' },
    select: { id: true },
  });

  if (!researcher) {
    throw new Error('No researcher user found. Set SCRAPED_PRODUCTS_USER_ID to an existing user ID.');
  }

  return researcher.id;
}

async function main() {
  const rows = parseCsv(csvPath);
  const userId = await findResearcherId();
  const missingImages = [];
  let created = 0;
  let updated = 0;
  let uploadedImages = 0;

  fs.mkdirSync(reportDir, { recursive: true });

  for (const row of rows) {
    const brand = row.Brand;
    const product = row.Product;
    const productClass = row.Class;

    if (!brand || !product) continue;

    const imagePath = findProductImage(brand, product);
    let imageUrl = null;

    if (imagePath) {
      imageUrl = await uploadImage(imagePath, brand, product);
      uploadedImages += 1;
    } else {
      missingImages.push({ brand, product, productClass });
    }

    const data = {
      name: product,
      description: row['Description / Rationale + Research'] || product,
      rating: parseRating(row.Rating),
      category: productClass || null,
      manufacturer: brand,
      tags: productClass ? { hls_factors: [productClass] } : {},
      ...(imageUrl ? { imageUrl } : {}),
      status: 'in_stock',
      userId,
    };

    const existing = await prisma.supplement.findFirst({
      where: {
        name: product,
        manufacturer: brand,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.supplement.update({
        where: { id: existing.id },
        data,
      });
      updated += 1;
    } else {
      await prisma.supplement.create({
        data: {
          ...data,
          price: 0,
          stock: 0,
        },
      });
      created += 1;
    }
  }

  const reportContent = [
    'Brand,Product,Class',
    ...missingImages.map((item) => `"${item.brand.replace(/"/g, '""')}","${item.product.replace(/"/g, '""')}","${item.productClass.replace(/"/g, '""')}"`),
  ].join('\n');
  fs.writeFileSync(missingImagesReport, reportContent);

  console.log(`Rows processed: ${rows.length}`);
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Images uploaded: ${uploadedImages}`);
  console.log(`Missing images: ${missingImages.length}`);
  console.log(`Missing image report: ${missingImagesReport}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
