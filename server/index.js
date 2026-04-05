import { serve } from '@hono/node-server';
import 'dotenv/config';
import app from '../functions/api/[[path]].js';

const port = process.env.PORT || 3001;

console.log(`🚀 BigBazar Local API Server starting on port ${port}...`);

// Adapter to provide process.env as Hono c.env when running in Node
const originalFetch = app.fetch;
app.fetch = (request, env, executionContext) => {
  return originalFetch(request, env || process.env, executionContext);
};

serve({
  fetch: app.fetch,
  port: parseInt(port)
}, (info) => {
  console.log(`✅ Server is ready at http://localhost:${info.port}`);
  console.log(`📡 Database Host: ${process.env.DB_HOST}`);
});
