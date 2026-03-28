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
  
  if (!gasUrl || gasUrl.includes("TODO") || gasUrl === "") {
    console.error("GAS_URL is missing or invalid");
    return { 
      success: false, 
      message: "GAS_URLが設定されていません。", 
      details: "Cloudflare Pagesの設定画面で環境変数『GAS_URL』が正しく入力されているか確認してください。設定後は再デプロイが必要です。" 
    };
  }
  
  try {
    console.log(`Calling GAS with action: ${action}, URL: ${gasUrl.substring(0, 40)}...`);
    const response = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
      redirect: "follow"
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GAS HTTP Error: ${response.status} - ${errorText}`);
      return { 
        success: false, 
        message: `GASサーバーエラー (${response.status})`, 
        details: "GASのデプロイ設定が『全員（匿名含む）』になっているか確認してください。" 
      };
    }

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      console.log(`GAS response for ${action}:`, data.success ? "success" : "failed");
      return data;
    } catch (e) {
      console.error("GAS returned invalid JSON:", text.substring(0, 200));
      return { 
        success: false, 
        message: "GASから不正なデータが返されました", 
        details: text.substring(0, 100) 
      };
    }
  } catch (error) {
    console.error("Fetch error while calling GAS:", error);
    return { 
      success: false, 
      message: "GASへの通信に失敗しました", 
      details: error instanceof Error ? error.message : "ネットワークエラー" 
    };
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

app.post('/api/updatePin', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const body = await c.req.json();
  const data = await callGas(gasUrl, "updatePin", body);
  return c.json(data || { success: false });
});

app.post('/api/subscribe', async (c) => {
  // Just return success for now as we don't have a DB in the worker for subscriptions
  return c.json({ success: true }, 201);
});

app.get('/api/weeklyReports', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const query = c.req.query();
  const data = await callGas(gasUrl, "getWeeklyReports", query);
  if (data && data.success === false) {
    return c.json({ error: data.message, details: data.details }, 400);
  }
  return c.json(data || []);
});

app.get('/api/decadeReports', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const query = c.req.query();
  const data = await callGas(gasUrl, "getDecadeReports", query);
  if (data && data.success === false) {
    return c.json({ error: data.message, details: data.details }, 400);
  }
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

app.post('/api/saveAMStatusReport', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const body = await c.req.json();
  const data = await callGas(gasUrl, "saveAMStatusReport", body);
  if (!data) return c.json({ success: false, message: "GASからの応答がありません。GAS_URLの設定を確認してください。" }, 500);
  return c.json(data);
});

app.get('/api/amStatusReports', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const query = c.req.query();
  const data = await callGas(gasUrl, "getAMStatusReports", query);
  if (data && data.success === false) {
    return c.json({ error: data.message, details: data.details }, 400);
  }
  if (!data || !Array.isArray(data)) return c.json([]);
  return c.json(data);
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

// Tasks API
app.get('/api/tasks', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const query = c.req.query();
  const data = await callGas(gasUrl, "getTasks", query);
  return c.json(data || []);
});

app.get('/api/tasks/', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const query = c.req.query();
  const data = await callGas(gasUrl, "getTasks", query);
  return c.json(data || []);
});

app.post('/api/tasks', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const body = await c.req.json();
  const data = await callGas(gasUrl, "saveTask", body);
  return c.json(data || { success: false });
});

app.post('/api/tasks/', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const body = await c.req.json();
  const data = await callGas(gasUrl, "saveTask", body);
  return c.json(data || { success: false });
});

app.delete('/api/tasks/:id', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const taskId = c.req.param('id');
  const data = await callGas(gasUrl, "deleteTask", { taskId });
  return c.json(data || { success: false });
});

// Projects API
app.get('/api/projects', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const query = c.req.query();
  const data = await callGas(gasUrl, "getProjects", query);
  return c.json(data || []);
});

app.get('/api/projects/', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const query = c.req.query();
  const data = await callGas(gasUrl, "getProjects", query);
  return c.json(data || []);
});

app.post('/api/projects', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const body = await c.req.json();
  const data = await callGas(gasUrl, "saveProject", body);
  return c.json(data || { success: false });
});

app.post('/api/projects/', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const body = await c.req.json();
  const data = await callGas(gasUrl, "saveProject", body);
  return c.json(data || { success: false });
});

app.delete('/api/projects/:id', async (c) => {
  const gasUrl = c.env.GAS_URL;
  const projectId = c.req.param('id');
  const data = await callGas(gasUrl, "deleteProject", { projectId });
  return c.json(data || { success: false });
});

app.get('/api/members', async (c) => {
  const envGasUrl = c.env.GAS_URL;
  const data = await callGas(envGasUrl, "getMembers");
  if (data && data.success === false) {
    return c.json({ error: data.message, details: data.details }, 400);
  }
  if (!data || !Array.isArray(data)) return c.json([]);
  return c.json(data);
});

app.get('/api/notifications/count', async (c) => {
  const envGasUrl = c.env.GAS_URL;
  const query = c.req.query();
  const data = await callGas(envGasUrl, "getNotifications", query);
  if (data && data.success === false) {
    return c.json({ count: 0, error: data.message, details: data.details }, 400);
  }
  if (Array.isArray(data)) {
    const unread = data.filter((n: any) => !n.IsRead).length;
    return c.json({ count: unread });
  }
  return c.json({ count: 0 });
});

app.get('/api/notifications', async (c) => {
  const envGasUrl = c.env.GAS_URL;
  const query = c.req.query();
  const data = await callGas(envGasUrl, "getNotifications", query);
  if (data && data.success === false) {
    return c.json({ error: data.message, details: data.details }, 400);
  }
  if (!data || !Array.isArray(data)) return c.json([]);
  return c.json(data);
});

app.post('/api/sendNotification', async (c) => {
  const envGasUrl = c.env.GAS_URL;
  const body = await c.req.json();
  const data = await callGas(envGasUrl, "sendNotification", body);
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
  console.log(`[404] ${c.req.method} ${c.req.path}`);
  return c.json({ 
    error: "Route not found", 
    method: c.req.method, 
    path: c.req.path,
    availableRoutes: [
      "GET /api/users", "POST /api/login", "POST /api/updatePin", "POST /api/subscribe",
      "GET /api/weeklyReports", "GET /api/decadeReports", "GET /api/amStatusReports",
      "POST /api/saveWeeklyReport", "POST /api/saveDecadeReport", "POST /api/saveAMStatusReport",
      "POST /api/toggleLike", "POST /api/addComment", "POST /api/saveComment",
      "GET /api/tasks", "POST /api/tasks", "DELETE /api/tasks/:id",
      "GET /api/projects", "POST /api/projects", "DELETE /api/projects/:id",
      "GET /api/notifications", "GET /api/notifications/count", "GET /api/debug"
    ]
  }, 404);
});

// Serve static assets for all other routes
app.all('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
