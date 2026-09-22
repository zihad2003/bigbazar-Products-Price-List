import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const ID_TO_FILE = {
  'Stiched-Coton-Three-Piece': 'STITCHED-COTTON-THREE-PIECE.jpg',
  Parshi: 'PARSHI.jpg',
  Saree: 'SAREE.jpg',
  'Two-piece': 'WESTERN-2-PIECE.jpg',
};

const ID_TO_UPLOAD = {
  'Stiched-Coton-Three-Piece': 'up-d2d8d9bb9e994d11',
  Parshi: 'up-5aad3564db464f07',
  Saree: 'up-d261e7532265425f',
  'Two-piece': 'up-74c647d7e4614b8c',
};

async function main() {
  // Prefer Hostinger TCP (DB_*), never TiDB HTTP gateway for this restore
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const port = parseInt(process.env.DB_PORT || '3306', 10);

  if (!host || !user || !database) {
    console.error('Missing DB_HOST / DB_USER / DB_NAME — cannot update production settings');
    process.exit(1);
  }

  if (/tidbcloud/i.test(host)) {
    console.error('DB_HOST looks like TiDB; need Hostinger MySQL host for live settings');
    process.exit(1);
  }

  console.log('Connecting to MySQL host:', host, 'db:', database);

  const subcatsDir = path.join(root, 'public', 'img', 'subcats');
  const publicImg = path.join(root, 'public', 'api', 'img');
  const distImg = path.join(root, 'dist', 'api', 'img');
  fs.mkdirSync(publicImg, { recursive: true });
  fs.mkdirSync(distImg, { recursive: true });

  for (const [subId, fileName] of Object.entries(ID_TO_FILE)) {
    const src = path.join(subcatsDir, fileName);
    if (!fs.existsSync(src)) {
      console.error('Missing source:', src);
      continue;
    }
    const uploadId = ID_TO_UPLOAD[subId];
    const destName = `${uploadId}.jpg`;
    fs.copyFileSync(src, path.join(publicImg, destName));
    fs.copyFileSync(src, path.join(distImg, destName));
    console.log('Local copy OK:', destName);
  }

  const conn = await mysql.createConnection({
    host: host === 'localhost' ? '127.0.0.1' : host,
    port,
    user,
    password,
    database,
    connectTimeout: 15000,
  });

  const [rows] = await conn.execute('SELECT value FROM site_settings WHERE `key` = ?', ['subcategories']);
  if (!rows?.[0]) {
    console.error('No subcategories row');
    await conn.end();
    process.exit(1);
  }

  const val = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
  let changed = 0;
  for (const list of Object.values(val || {})) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const fileName = ID_TO_FILE[item.id];
      if (!fileName) continue;
      const nextUrl = `/img/subcats/${fileName}`;
      if (item.image_url !== nextUrl) {
        console.log(`${item.id}: ${item.image_url} → ${nextUrl}`);
        item.image_url = nextUrl;
        changed++;
      }
    }
  }

  if (changed > 0) {
    await conn.execute('UPDATE site_settings SET value = ? WHERE `key` = ?', [
      JSON.stringify(val),
      'subcategories',
    ]);
    console.log(`Updated ${changed} image_url(s) in site_settings`);
  } else {
    console.log('DB already pointed at /img/subcats');
  }

  await conn.end();
  process.exit(0);
}

main().catch((e) => {
  console.error('FAILED:', e.code || '', e.message);
  process.exit(1);
});
