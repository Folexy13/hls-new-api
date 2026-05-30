require('dotenv/config');

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const rootDir = path.resolve(__dirname, '..', '..');
const webscrappingDir = path.join(rootDir, 'webscrapping');
const scrapeLogPath = path.join(webscrappingDir, 'progress', 'scrape_log.csv');
const reportPath = path.join(webscrappingDir, 'progress', 'todays_scraped_import_report.json');
const today = process.env.SCRAPED_IMPORT_DATE || new Date().toISOString().slice(0, 10);

const CLOUDINARY_CLOUD_NAME = 'folajimidev';
const CLOUDINARY_UPLOAD_PRESET = 'zoahguuq';

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

async function uploadImageToCloudinary(filePath, brand, product) {
  const extension = path.extname(filePath).toLowerCase() || '.jpg';
  if (!IMAGE_EXTENSIONS.has(extension)) return null;

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const publicId = `supplements/scraped/${slug(brand)}/${slug(product)}`;

  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  form.append('public_id', publicId);
  form.append('folder', 'supplements/scraped');

  console.log(`Uploading to Cloudinary: ${publicId}`);

  try {
    const response = await axios.post(uploadUrl, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });

    if (response.data && response.data.secure_url) {
      return response.data.secure_url;
    }
    return null;
  } catch (error) {
    console.error('Failed to upload:', publicId, error.response?.data?.error?.message || error.message);
    throw error;
  }
}

async function main() {
  const logRows = parseCsv(scrapeLogPath)
    .filter((row) => row.scrape_status === 'SCRAPED' && String(row.last_updated || '').startsWith(today));

  console.log(`Found ${logRows.length} scraped products from today\n`);

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
        imageUrl = await uploadImageToCloudinary(imagePath, row.Brand, row.Product);
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
