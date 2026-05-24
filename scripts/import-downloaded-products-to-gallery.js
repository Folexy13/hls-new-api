require('dotenv/config');

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const mariadb = require('mariadb');

const rootDir = path.resolve(__dirname, '..', '..');
const webscrapingDir = path.join(rootDir, 'webscrapping');
const csvPath = path.join(webscrapingDir, 'final_product_level_dataset.csv');
const imagesDir = path.join(webscrapingDir, 'images');
const progressDir = path.join(webscrapingDir, 'progress');
const reportPath = path.join(progressDir, 'research_gallery_import_report.json');

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'folajimidev';
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'zoahguuq';
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

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slug(value) {
  return normalize(value).replace(/\s+/g, '-');
}

function parseRating(value) {
  const rating = Number(String(value || '').replace('%', '').trim());
  return Number.isFinite(rating) ? rating : null;
}

function getImageRecords() {
  const records = [];

  for (const brandEntry of fs.readdirSync(imagesDir, { withFileTypes: true })) {
    if (!brandEntry.isDirectory()) continue;
    const brandDir = path.join(imagesDir, brandEntry.name);

    for (const imageEntry of fs.readdirSync(brandDir, { withFileTypes: true })) {
      if (!imageEntry.isFile()) continue;
      const extension = path.extname(imageEntry.name).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(extension)) continue;

      records.push({
        brand: brandEntry.name,
        product: path.basename(imageEntry.name, extension),
        imagePath: path.join(brandDir, imageEntry.name),
      });
    }
  }

  return records;
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

function uploadToCloudinary(imagePath, brand, product) {
  const response = execFileSync(
    'curl.exe',
    [
      '-s',
      '-L',
      '-X',
      'POST',
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      '-F',
      `file=@${imagePath}`,
      '-F',
      `upload_preset=${CLOUDINARY_UPLOAD_PRESET}`,
      '-F',
      'folder=researcher-supplements',
      '-F',
      `public_id=${slug(brand)}-${slug(product)}`,
      '--max-time',
      '90',
    ],
    { encoding: 'utf8' },
  );
  const payload = JSON.parse(response);
  if (!payload.secure_url) {
    throw new Error(`Cloudinary upload failed for ${brand} - ${product}: ${response}`);
  }
  return payload.secure_url;
}

async function main() {
  fs.mkdirSync(progressDir, { recursive: true });

  const csvRows = parseCsv(csvPath);
  const csvByKey = new Map(
    csvRows.map((row) => [`${normalize(row.Brand)}|||${normalize(row.Product)}`, row]),
  );
  const imageRecords = getImageRecords();
  const matched = imageRecords
    .map((image) => ({
      image,
      row: csvByKey.get(`${normalize(image.brand)}|||${normalize(image.product)}`),
    }))
    .filter((item) => item.row);

  const conn = await connect();
  const researchers = await conn.query("SELECT id FROM User WHERE role = 'researcher' ORDER BY id ASC LIMIT 1");
  if (!researchers.length) throw new Error('No researcher user found for shared gallery ownership');
  const userId = Number(researchers[0].id);

  let created = 0;
  let updated = 0;
  let uploaded = 0;
  let skippedExistingCloudinary = 0;
  const failures = [];

  for (const item of matched) {
    const { row, image } = item;
    const brand = row.Brand;
    const product = row.Product;
    const className = row.Class;
    const existing = await conn.query(
      'SELECT id, imageUrl FROM Supplement WHERE name = ? AND manufacturer = ? LIMIT 1',
      [product, brand],
    );
    const existingRow = existing[0];
    let imageUrl = existingRow?.imageUrl || null;

    try {
      if (!imageUrl || !String(imageUrl).startsWith('https://res.cloudinary.com/')) {
        imageUrl = uploadToCloudinary(image.imagePath, brand, product);
        uploaded += 1;
      } else {
        skippedExistingCloudinary += 1;
      }

      const tags = JSON.stringify(className ? { hls_factors: [className] } : {});
      const description = row['Description / Rationale + Research'] || product;
      const rating = parseRating(row.Rating);
      const now = new Date();

      if (existingRow) {
        await conn.query(
          'UPDATE Supplement SET description = ?, rating = ?, imageUrl = ?, category = ?, manufacturer = ?, tags = ?, status = ?, userId = ?, updatedAt = ? WHERE id = ?',
          [description, rating, imageUrl, className || null, brand, tags, 'in_stock', userId, now, Number(existingRow.id)],
        );
        updated += 1;
      } else {
        await conn.query(
          'INSERT INTO Supplement (name, description, rating, price, stock, imageUrl, category, manufacturer, tags, status, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [product, description, rating, 0, 0, imageUrl, className || null, brand, tags, 'in_stock', userId, now, now],
        );
        created += 1;
      }

      console.log(`${created + updated}/${matched.length} saved: ${brand} - ${product}`);
    } catch (error) {
      failures.push({ brand, product, error: error.message });
      console.error(`Failed: ${brand} - ${product}: ${error.message}`);
    }
  }

  conn.destroy();

  const report = {
    csvRows: csvRows.length,
    downloadedImages: imageRecords.length,
    matchedImagesToCsv: matched.length,
    remainingWithoutDownloadedImage: csvRows.length - matched.length,
    created,
    updated,
    uploaded,
    skippedExistingCloudinary,
    failures,
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
