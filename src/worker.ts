import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Env = {
  Bindings: {
    GAS_URL: string;
    ASSETS: { fetch: typeof fetch };
  };
};

const app = new Hono<Env>();

app.use('/api/*', cors());

// Fallback URL in case environment variable is not set in Cloudflare Pages
const FALLBACK_GAS_URL = "https://script.google.com/macros/s/AKfycbxJkVUWmqEL8ohB-TVnzrrQuzh0K3E4x9XWZFWewxH7RioQQjtDKL20qj1z8c_6fwXz/exec";

// Helper to interact with GAS
async function callGas(envGasUrl: string | undefined, action: string, payload: any = {}) {
  const gasUrl = envGasUrl || FALLBACK_GAS_URL;
  
  if (!gasUrl) {
    console.error("GAS_URL is missing in environment variables and fallback");
    return { success: false, message: "GAS_URL is not configured" };
  }
  
  try {
    console.log(`Calling GAS with action: ${action}, URL: ${gasUrl.substring(0, 30)}...`);
    const response = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
      redirect: "follow"
    });

    if (!response.ok) {
      console.error(`GAS returned error status: ${response.status}`);
      return { success: false, message: `GAS returned status ${response.status}` };
    }

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("GAS returned invalid JSON:", text.substring(0, 100));
      return { success: false, message: "GAS returned invalid JSON", raw: text.substring(0, 100) };
    }
  } catch (error) {
    console.error("Fetch error while calling GAS:", error);
    return { success: false, message: error instanceof Error ? error.message : "Fetch error" };
  }
}

app.post('/api/setup', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const data = await callGas(gasUrl, "setup");
  return c.json(data);
});

app.get('/api/users', async (c) => {
  const envGasUrl = c.env.GAS_URL;
  const data = await callGas(envGasUrl, "getUsers");
  if (Array.isArray(data)) return c.json(data);
  console.error("Failed to fetch users:", data);
  return c.json({ error: "GASからのユーザー取得に失敗しました", details: data }, 500);
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

app.post('/api/saveComment', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const body = await c.req.json();
  // body should contain { reportId, role, comment, userId, type }
  const data = await callGas(gasUrl, "saveComment", body);
  return c.json(data || { success: false });
});

app.get('/api/debug', (c) => {
  const envGasUrl = c.env.GAS_URL;
  const gasUrl = envGasUrl || FALLBACK_GAS_URL;
  return c.json({
    status: "ok",
    gasUrlSet: !!gasUrl,
    gasUrlPreview: gasUrl ? `${gasUrl.substring(0, 20)}...` : "not set",
    usingFallback: !envGasUrl,
    environment: "Cloudflare Pages (Advanced Mode)",
    build: "VER 3.6",
    timestamp: new Date().toISOString()
  });
});

app.all('/api/*', (c) => {
  return c.json({ error: "Route not found", path: c.req.path }, 404);
});

// Serve static assets for all other routes
app.all('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
