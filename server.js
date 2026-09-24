import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import apiApp from './functions/api/[[path]].js';
import { buildSitemapXml, buildRobotsTxt } from './functions/sitemap-builder.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');

const app = new Hono();

app.use('*', async (c, next) => {
  c.env = { ...(c.env || {}), ...process.env };
  await next();
});

const siteOrigin = () =>
  String(process.env.PUBLIC_SITE_ORIGIN || 'https://onlinebigbazar.com').replace(/\/$/, '');

// Dynamic sitemap + robots BEFORE static/SPA fallback (Hostinger was serving HTML before)
app.get('/sitemap.xml', async (c) => {
  try {
    const xml = await buildSitemapXml(siteOrigin());
    return c.body(xml, 200, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    });
  } catch (err) {
    console.error('sitemap error:', err);
    return c.text('Sitemap unavailable', 500);
  }
});

app.get('/robots.txt', (c) => {
  return c.text(buildRobotsTxt(siteOrigin()), 200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=86400',
  });
});

app.use('/api/img/*', async (c, next) => {
  await next();
  if (c.res && c.res.status >= 200 && c.res.status < 400) {
    c.res.headers.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
  }
});
app.use('/api/img/*', serveStatic({ root: './dist' }));
app.use('/api/settings-img/*', async (c, next) => {
  await next();
  if (c.res && c.res.status >= 200 && c.res.status < 400) {
    c.res.headers.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
  }
});
app.use('/api/settings-img/*', serveStatic({ root: './dist' }));

app.route('/', apiApp);

app.use('/assets/*', async (c, next) => {
  await next();
  if (c.res && c.res.status >= 200 && c.res.status < 400) {
    c.res.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
});
app.use('/assets/*', serveStatic({ root: './dist' }));
app.use('/img/*', async (c, next) => {
  await next();
  if (c.res && c.res.status >= 200 && c.res.status < 400) {
    c.res.headers.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
  }
});
app.use('/b.jpg', serveStatic({ root: './dist' }));
app.use('/favicon.ico', serveStatic({ root: './dist' }));
app.use('/*', serveStatic({ root: './dist' }));

app.get('*', (c) => {
  const reqPath = c.req.path;
  if (reqPath.startsWith('/api/')) {
    return c.json({ error: 'Endpoint not found' }, 404);
  }

  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf8');
    return c.html(html);
  }
  return c.text('Frontend build not found. Please run "npm run build" first.', 500);
});

const port = parseInt(process.env.PORT || '3000', 10);
const host = '0.0.0.0';

console.log(`=============================================`);
console.log(`BigBazar Production Server starting...`);
console.log(`Domain: ${siteOrigin()}`);
console.log(`Server listening on: http://${host}:${port}`);
console.log(`Database Host: ${process.env.DB_HOST || 'Not specified'}`);
console.log(`=============================================`);

serve({
  fetch: app.fetch,
  port,
  hostname: host,
});

export default app;
