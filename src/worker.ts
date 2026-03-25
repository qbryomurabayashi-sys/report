import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('/api/*', cors());

// Helper to interact with GAS
async function callGas(gasUrl: string, action: string, payload: any = {}) {
  if (!gasUrl) return null;
  
  try {
    const response = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
      redirect: "follow"
    });

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  } catch (error) {
    return null;
  }
}

app.get('/api/users', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const data = await callGas(gasUrl, "getUsers");
  return c.json(data || []);
});

app.post('/api/login', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const body = await c.req.json();
  const data = await callGas(gasUrl, "login", body);
  return c.json(data || { success: false, message: "Connection error" });
});

app.get('/api/weeklyReports', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const query = c.req.query();
  const data = await callGas(gasUrl, "getWeeklyReports", query);
  return c.json(data || []);
});

app.get('/api/decadeReports', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const query = c.req.query();
  const data = await callGas(gasUrl, "getDecadeReports", query);
  return c.json(data || []);
});

app.post('/api/saveWeeklyReport', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const body = await c.req.json();
  const data = await callGas(gasUrl, "saveWeeklyReport", body);
  return c.json(data || { success: false });
});

app.post('/api/saveDecadeReport', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const body = await c.req.json();
  const data = await callGas(gasUrl, "saveDecadeReport", body);
  return c.json(data || { success: false });
});

app.post('/api/toggleLike', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const body = await c.req.json();
  const data = await callGas(gasUrl, "toggleLike", body);
  return c.json(data || { success: false });
});

app.post('/api/addComment', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const body = await c.req.json();
  const data = await callGas(gasUrl, "addComment", body);
  return c.json(data || { success: false });
});

app.get('/api/debug', (c) => {
  return c.json({
    status: "ok",
    gasUrlSet: !!c.env.GAS_URL,
    timestamp: new Date().toISOString()
  });
});

export default app;
