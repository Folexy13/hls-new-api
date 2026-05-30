require('dotenv/config');

const fs = require('fs');
const path = require('path');
const { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');

const rootDir = path.resolve(__dirname, '..', '..');
const webscrappingDir = path.join(rootDir, 'webscrapping');
const scrapeLogPath = path.join(webscrappingDir, 'progress', 'scrape_log.csv');
const reportPath = path.join(webscrappingDir, 'progress', 'todays_scraped_import_report.json');
const today = process.env.SCRAPED_IMPORT_DATE || new Date().toISOString().slice(0, 10);

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

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
  const requestedPath = String(relativePath || '');
  if (!requestedPath || requestedPath.includes('\0') || path.isAbsolute(requestedPath)) return null;

  const segments = requestedPath.split(/[\\/]+/);
  if (segments.includes('..')) return null;

  if (!path.isAbsolute(parent)) return null;

  const parentPath = parent;
  const targetPath = path.resolve(parentPath, requestedPath); // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
  const relative = path.relative(parentPath, targetPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return targetPath;
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
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
  const bucket = process.env.AWS_S3_BUCKET || 'hlsnigeriabucket';
  const region = process.env.AWS_REGION || 'eu-north-1';
  if (!bucket || !region) return null;

  const extension = path.extname(filePath).toLowerCase() || '.jpg';
  if (!IMAGE_EXTENSIONS.has(extension)) return null;

  const key = `supplements/scraped/${slug(brand)}/${slug(product)}${extension}`;
  console.log(`Uploading: ${key}`);

  try {
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fs.readFileSync(filePath),
      ContentType: contentTypeFor(filePath),
    }));
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('Failed to upload:', key, error.message);
    throw error;
  }
}

async function main() {
  const logRows = parseCsv(scrapeLogPath)
    .filter((row) => row.scrape_status === 'SCRAPED' && String(row.last_updated || '').startsWith(today));

  console.log(`Found ${logRows.length} scraped products from today`);

  const uploadResults = [];
  const missingImages = [];
  const imageUploadFailures = [];
  let uploadedImages = 0;

  for (const row of logRows) {
    const imagePath = safeJoinUnder(webscrappingDir, row.image_path);
    let imageUrl = null;
    let status = 'failed';

    if (imagePath && fs.existsSync(imagePath)) {
      try {
        imageUrl = await uploadImage(imagePath, row.Brand, row.Product);
        if (imageUrl) {
          uploadedImages += 1;
          status = 'uploaded';
          console.log(`✓ Uploaded: ${row.Brand} - ${row.Product}`);
        }
      } catch (error) {
        imageUploadFailures.push({
          brand: row.Brand,
          product: row.Product,
          message: error.message,
        });
        console.log(`✗ Failed: ${row.Brand} - ${row.Product}`);
      }
    } else {
      missingImages.push({
        brand: row.Brand,
        product: row.Product,
        imagePath: row.image_path
      });
      console.log(`⊘ Missing: ${row.Brand} - ${row.Product}`);
    }

    uploadResults.push({
      brand: row.Brand,
      product: row.Product,
      status,
      imageUrl,
    });
  }

  // Update the report
  const existingReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const updatedReport = {
    ...existingReport,
    uploadedImages,
    missingImages: [...(existingReport.missingImages || []), ...missingImages],
    imageUploadFailures: [...(existingReport.imageUploadFailures || []), ...imageUploadFailures],
    imageUploadResults: uploadResults,
  };

  fs.writeFileSync(reportPath, JSON.stringify(updatedReport, null, 2));

  console.log('\n=== SUMMARY ===');
  console.log(`Total products: ${logRows.length}`);
  console.log(`Successfully uploaded: ${uploadedImages}`);
  console.log(`Failed uploads: ${imageUploadFailures.length}`);
  console.log(`Missing images: ${missingImages.length}`);
  console.log(`Report updated: ${reportPath}`);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exitCode = 1;
});
