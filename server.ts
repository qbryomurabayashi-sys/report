import express from "express";
import { createServer as createViteServer } from "vite";
import path from "node:path";
import fs from "node:fs";
import fetch from "node-fetch";
import webpush from "web-push";

const app = express();
const PORT = 3000;
const GAS_URL = process.env.GAS_URL || "https://script.google.com/macros/s/AKfycbxJkVUWmqEL8ohB-TVnzrrQuzh0K3E4x9XWZFWewxH7RioQQjtDKL20qj1z8c_6fwXz/exec";

if (GAS_URL) {
  console.log("GAS_URL is set. Connecting to Google Sheets...");
} else {
  console.log("GAS_URL is NOT set. Using mock data (db.json).");
}

app.use(express.json());

// Web Push Setup
// In a real app, these should be environment variables
const publicVapidKey = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYpPNs_Zqk";
const privateVapidKey = "8xV-oH7gG8T-Q8R-R8T-Q8R-R8T-Q8R-R8T-Q8R-R8T"; // Dummy key for preview
webpush.setVapidDetails(
  "mailto:test@example.com",
  publicVapidKey,
  privateVapidKey
);

// Mock DB for subscriptions
let subscriptions: Record<string, any[]> = {};

app.post("/api/subscribe", (req, res) => {
  const { subscription, userId } = req.body;
  if (!userId) return res.status(400).json({ error: "UserID required" });
  if (!subscriptions[userId]) subscriptions[userId] = [];
  // Avoid duplicates
  if (!subscriptions[userId].some(s => s.endpoint === subscription.endpoint)) {
    subscriptions[userId].push(subscription);
  }
  res.status(201).json({});
});

// Helper to send notifications
function notifyUsers(userIds: string[], payload: any) {
  console.log(`Sending notifications to users: ${userIds.join(", ")} with payload:`, payload);
  userIds.forEach(uid => {
    const subs = subscriptions[uid] || [];
    subs.forEach(sub => {
      webpush.sendNotification(sub, JSON.stringify(payload)).catch(err => {
        console.error(`Push error for user ${uid}:`, err);
        // If subscription is expired or invalid, remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          subscriptions[uid] = subscriptions[uid].filter(s => s.endpoint !== sub.endpoint);
        }
      });
    });
  });
}

let lastDeadlineCheck = "";

// Deadline Check Logic
function checkDeadlines() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDate();
  const currentDayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday
  
  const checkKey = `${now.getFullYear()}-${now.getMonth()}-${currentDay}-${currentHour}`;
  if (lastDeadlineCheck === checkKey) return;
  lastDeadlineCheck = checkKey;

  const data = getData();
  if (!data.users) return;

  // Check for Store Manager (店長) - Saturday 18:00 (1 day before Sunday 18:00)
  if (currentDayOfWeek === 6 && currentHour === 18) {
    const storeManagers = data.users
      .filter((u: any) => u.Role === "店長")
      .map((u: any) => String(u.UserID));
    
    notifyUsers(storeManagers, {
      title: "【提出期限1日前】週報のリマインド",
      body: "明日の18:00が週報の提出期限です。作成をお願いします。"
    });
  }

  // Check for AM - 9th, 19th, 29th 18:00 (1 day before 10th, 20th, 30th 18:00)
  if ([9, 19, 29].includes(currentDay) && currentHour === 18) {
    const ams = data.users
      .filter((u: any) => u.Role === "AM")
      .map((u: any) => String(u.UserID));
    
    notifyUsers(ams, {
      title: "【提出期限1日前】旬報のリマインド",
      body: "明日の18:00が旬報の提出期限です。作成をお願いします。"
    });
  }

  // Check for Tasks deadline - 1 day before deadline at 9:00 AM
  if (currentHour === 9 && data.tasks) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const dueTasks = data.tasks.filter((t: any) => t.Status !== 'completed' && t.Deadline === tomorrowStr);
    
    dueTasks.forEach((task: any) => {
      // Find user by name (Assignee)
      const user = data.users.find((u: any) => u.Name === task.Assignee);
      if (user) {
        notifyUsers([String(user.UserID)], {
          title: "【タスク期限1日前】",
          body: `明日は「${task.Content}」の期限です。`
        });
      }
    });
  }
}

// Run deadline check every 30 minutes for better reliability
setInterval(checkDeadlines, 30 * 60 * 1000);
// Also run once on startup (with a small delay to let subscriptions load if they were persisted)
setTimeout(checkDeadlines, 5000);

// Mock Spreadsheet Data
const DATA_FILE = path.join(process.cwd(), "db.json");

// Helper to interact with GAS
const gasCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 15000; // 15 seconds cache

function invalidateGasCache(actionPrefix?: string) {
  if (!actionPrefix) {
    Object.keys(gasCache).forEach(key => delete gasCache[key]);
    console.log("GAS Cache fully invalidated");
  } else {
    let count = 0;
    Object.keys(gasCache).forEach(key => {
      if (key.includes(actionPrefix)) {
        delete gasCache[key];
        count++;
      }
    });
    console.log(`GAS Cache invalidated for prefix ${actionPrefix} (${count} items)`);
  }
}

async function callGas(action: string, payload: any = {}, useCache = false) {
  console.log(`Calling GAS action: ${action} with payload:`, JSON.stringify(payload));
  const cacheKey = JSON.stringify({ action, ...payload });
  
  if (useCache && gasCache[cacheKey]) {
    const cached = gasCache[cacheKey];
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Returning cached GAS data for ${action}`);
      return cached.data;
    }
  }

  if (!GAS_URL || GAS_URL.includes("TODO")) {
    console.log(`GAS_URL is not configured for action: ${action}`);
    return null;
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
      redirect: "follow",
      signal: controller.signal as any
    });

    clearTimeout(timeoutId);
    const text = await response.text();
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      try {
        const json = JSON.parse(text);
        if (json.error) {
          console.error(`GAS returned application error for ${action}:`, json.error);
        } else if (useCache) {
          gasCache[cacheKey] = { data: json, timestamp: Date.now() };
        }
        return json;
      } catch (parseError) {
        console.error(`Failed to parse GAS JSON response for ${action}. Status: ${response.status}. Body starts with: ${text.substring(0, 200)}`);
        return null;
      }
    } else {
      console.error(`GAS returned non-JSON response for ${action} (${response.status}, ${contentType}):`, text.substring(0, 500));
      return null;
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error(`GAS Request Timeout for ${action} (15s)`);
    } else {
      console.error(`GAS Connection Error for ${action}:`, error);
    }
    return null;
  }
}

const initialData = {
  users: [
    { UserID: "101", Name: "店長A", Role: "店長", Area: "東京", PIN: "12345678" },
    { UserID: "102", Name: "店長B", Role: "店長", Area: "大阪", PIN: "12345678" },
    { UserID: "103", Name: "店長C", Role: "店長", Area: "東京", PIN: "12345678" },
    { UserID: "201", Name: "AM太郎", Role: "AM", Area: "東京", PIN: "12345678" },
    { UserID: "202", Name: "AM次郎", Role: "AM", Area: "大阪", PIN: "12345678" },
    { UserID: "301", Name: "BMボス", Role: "BM", Area: "本部", PIN: "12345678" }
  ],
  weeklyReports: [],
  decadeReports: [],
  likes: [],
  comments: [],
  tasks: [],
  projects: []
};

if (!fs.existsSync(DATA_FILE)) {
  console.log("Creating initial db.json with empty data...");
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
}

function getData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (err) {
    console.error("Error reading db.json, returning initialData:", err);
    return initialData;
  }
}

function saveData(data: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error saving db.json:", err);
  }
}

// API Routes
app.get("/api/debug", (req, res) => {
  const data = getData();
  res.json({
    gasUrlSet: !!GAS_URL,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    userCount: data.users.length,
    weeklyCount: data.weeklyReports.length,
    decadeCount: data.decadeReports.length
  });
});

app.post("/api/setup", async (req, res) => {
  console.log("Setup requested...");
  const gasData = await callGas("setup");
  if (gasData) {
    if (gasData.success) {
      console.log("Setup via GAS successful:", gasData.message);
      return res.json(gasData);
    } else {
      console.error("Setup via GAS returned failure:", gasData.message);
      return res.json(gasData);
    }
  }
  
  console.log("Setup via GAS failed (connection error or invalid response), using local setup");
  // Local setup: ensure db.json exists (already handled by module load)
  res.json({ success: true, message: "Local data initialized (Google Sheets connection failed)" });
});

app.get("/api/users", async (req, res) => {
  const gasData = await callGas("getUsers");
  if (gasData) return res.json(gasData);

  const data = getData();
  console.log(`Returning ${data.users.length} local users`);
  res.json(data.users);
});

app.post("/api/login", async (req, res) => {
  const { userId, pin } = req.body;
  console.log(`Login attempt for UserID: ${userId}`);
  const gasData = await callGas("login", { userId, pin });
  if (gasData) return res.json(gasData);

  const data = getData();
  const user = data.users.find((u: any) => String(u.UserID) === String(userId) && String(u.PIN) === String(pin));
  if (user) {
    console.log(`Local login success for ${user.Name}`);
    res.json({ success: true, user: { UserID: user.UserID, Name: user.Name, Role: user.Role, Area: user.Area } });
  } else {
    console.log(`Local login failed for UserID: ${userId}`);
    res.json({ success: false, message: "IDまたはパスワードが正しくありません" });
  }
});

app.post("/api/updatePin", async (req, res) => {
  const { userId, newPin } = req.body;
  const gasData = await callGas("updatePin", { userId, newPin });
  if (gasData) return res.json(gasData);

  const data = getData();
  const userIndex = data.users.findIndex((u: any) => String(u.UserID) === String(userId));
  if (userIndex !== -1) {
    data.users[userIndex].PIN = newPin;
    saveData(data);
    res.json({ success: true });
  } else {
    res.json({ success: false, message: "ユーザーが見つかりません" });
  }
});

app.get("/api/weeklyReports", async (req, res) => {
  const { userId, role, area, refresh } = req.query;
  console.log(`Fetching weekly reports for UserID: ${userId}, Role: ${role}, Area: ${area}, Refresh: ${refresh}`);
  
  // Revert to userId and role only for the GAS payload to avoid potential filtering issues in the script
  const gasData = await callGas("getWeeklyReports", { userId, role }, refresh !== "true");
  
  if (gasData) {
    if (gasData.error) {
      console.error(`GAS error in weeklyReports: ${gasData.error}`);
      return res.status(400).json({ error: `GASエラー: ${gasData.error}` });
    }
    if (Array.isArray(gasData)) {
      console.log(`Fetched ${gasData.length} weekly reports from GAS`);
      return res.json(gasData);
    }
  }

  if (GAS_URL && !GAS_URL.includes("TODO")) {
    console.error("GAS request failed or returned invalid data for weeklyReports");
    return res.status(503).json({ error: "Google Sheetsからのデータ取得に失敗しました。しばらく時間をおいて再試行してください。" });
  }

  const data = getData();
  let filtered = data.weeklyReports;

  if (role === "店長") {
    const allStoreManagers = data.users
      .filter((u: any) => u.Role === "店長")
      .map((u: any) => String(u.UserID));
    filtered = data.weeklyReports.filter((r: any) => allStoreManagers.includes(String(r.UserID)));
  }

  const result = filtered.map((r: any) => {
    const user = data.users.find((u: any) => String(u.UserID) === String(r.UserID));
    const likes = data.likes || [];
    const comments = data.comments || [];
    const reportLikes = likes.filter((l: any) => String(l.ReportID) === String(r.ReportID));
    const likerNames = reportLikes.map((l: any) => {
      const liker = data.users.find((u: any) => String(u.UserID) === String(l.UserID));
      return liker ? liker.Name : "不明";
    });
    return { 
      ...r, 
      UserName: user ? user.Name : "不明",
      UserArea: user ? user.Area : "",
      LikeCount: reportLikes.length,
      LikerNames: likerNames,
      UserLiked: likes.some((l: any) => String(l.ReportID) === String(r.ReportID) && String(l.UserID) === String(userId)),
      AM_Comment_Name: r.AM_Comment_UserID ? (data.users.find((u: any) => String(u.UserID) === String(r.AM_Comment_UserID))?.Name || "AM") : "AM",
      BM_Comment_Name: r.BM_Comment_UserID ? (data.users.find((u: any) => String(u.UserID) === String(r.BM_Comment_UserID))?.Name || "BM") : "BM",
      Comments: comments.filter((c: any) => String(c.ReportID) === String(r.ReportID)).map((c: any) => {
        const cUser = data.users.find((u: any) => String(u.UserID) === String(c.UserID));
        return { ...c, UserName: cUser ? cUser.Name : "不明" };
      })
    };
  });

  console.log(`Returning ${result.length} local weekly reports`);
  res.json(result.reverse());
});

app.get("/api/decadeReports", async (req, res) => {
  const { userId, role, area, refresh } = req.query;
  console.log(`Fetching decade reports for UserID: ${userId}, Role: ${role}, Area: ${area}, Refresh: ${refresh}`);
  
  // Revert to userId and role only for the GAS payload
  const gasData = await callGas("getDecadeReports", { userId, role }, refresh !== "true");
  
  if (gasData) {
    if (gasData.error) {
      console.error(`GAS error in decadeReports: ${gasData.error}`);
      return res.status(400).json({ error: `GASエラー: ${gasData.error}` });
    }
    if (Array.isArray(gasData)) {
      console.log(`Fetched ${gasData.length} decade reports from GAS`);
      return res.json(gasData);
    }
  }

  if (GAS_URL && !GAS_URL.includes("TODO")) {
    console.error("GAS request failed or returned invalid data for decadeReports");
    return res.status(503).json({ error: "Google Sheetsからのデータ取得に失敗しました。しばらく時間をおいて再試行してください。" });
  }

  const data = getData();
  let filtered = data.decadeReports;

  if (role === "店長") {
    filtered = [];
  }

  const result = filtered.map((r: any) => {
    const user = data.users.find((u: any) => String(u.UserID) === String(r.UserID));
    const likes = data.likes || [];
    const comments = data.comments || [];
    const reportLikes = likes.filter((l: any) => String(l.ReportID) === String(r.ReportID));
    const likerNames = reportLikes.map((l: any) => {
      const liker = data.users.find((u: any) => String(u.UserID) === String(l.UserID));
      return liker ? liker.Name : "不明";
    });
    return { 
      ...r, 
      UserName: user ? user.Name : "不明",
      UserArea: user ? user.Area : "",
      LikeCount: reportLikes.length,
      LikerNames: likerNames,
      UserLiked: likes.some((l: any) => String(l.ReportID) === String(r.ReportID) && String(l.UserID) === String(userId)),
      Comments: comments.filter((c: any) => String(c.ReportID) === String(r.ReportID)).map((c: any) => {
        const cUser = data.users.find((u: any) => String(u.UserID) === String(c.UserID));
        return { ...c, UserName: cUser ? cUser.Name : "不明" };
      })
    };
  });

  console.log(`Returning ${result.length} local decade reports`);
  res.json(result.reverse());
});

app.post("/api/toggleLike", async (req, res) => {
  const { reportId, userId } = req.body;
  console.log(`Toggle like for ReportID: ${reportId}, UserID: ${userId}`);
  const gasData = await callGas("toggleLike", { reportId, userId });
  
  let liked = false;
  if (gasData) {
    invalidateGasCache("Reports"); // Invalidate report caches
    liked = gasData.liked;
  } else {
    const data = getData();
    if (!data.likes) data.likes = [];
    
    const likeIndex = data.likes.findIndex((l: any) => String(l.ReportID) === String(reportId) && String(l.UserID) === String(userId));
    if (likeIndex !== -1) {
      data.likes.splice(likeIndex, 1);
      saveData(data);
      liked = false;
    } else {
      data.likes.push({ LikeID: Math.random().toString(36).substr(2, 9), ReportID: reportId, UserID: userId, CreatedAt: new Date().toISOString() });
      saveData(data);
      liked = true;
    }
  }

  // Send push notification if liked
  if (liked) {
    const data = getData();
    const decadeReport = data.decadeReports.find((r: any) => String(r.ReportID) === String(reportId));
    const weeklyReport = data.weeklyReports.find((r: any) => String(r.ReportID) === String(reportId));
    const report = decadeReport || weeklyReport;
    
    if (report && String(report.UserID) !== String(userId)) {
      const liker = data.users.find((u: any) => String(u.UserID) === String(userId));
      notifyUsers([String(report.UserID)], {
        title: "いいね！されました",
        body: `${liker?.Name || "誰か"}があなたの報告にいいね！しました。`
      });
    }
  }

  return res.json({ success: true, liked });
});

app.post("/api/addComment", async (req, res) => {
  const { reportId, userId, role, text } = req.body;
  const gasData = await callGas("addComment", { reportId, userId, role, text });
  if (gasData) {
    invalidateGasCache("Reports");
    return res.json(gasData);
  }

  const data = getData();
  if (!data.comments) data.comments = [];
  const newComment = {
    CommentID: Math.random().toString(36).substr(2, 9),
    ReportID: reportId,
    UserID: userId,
    Role: role,
    Text: text,
    CreatedAt: new Date().toISOString()
  };
  data.comments.push(newComment);
  saveData(data);

  // Send push notification to report owner
  const decadeReport = data.decadeReports.find((r: any) => String(r.ReportID) === String(reportId));
  const weeklyReport = data.weeklyReports.find((r: any) => String(r.ReportID) === String(reportId));
  const report = decadeReport || weeklyReport;
  
  if (report && String(report.UserID) !== String(userId)) {
    const commenter = data.users.find((u: any) => String(u.UserID) === String(userId));
    notifyUsers([String(report.UserID)], {
      title: "新しいコメント",
      body: `${commenter?.Name || role}からコメントがつきました。`
    });
  }

  res.json({ success: true });
});

app.post("/api/saveWeeklyReport", async (req, res) => {
  const gasData = await callGas("saveWeeklyReport", req.body);
  if (gasData) {
    invalidateGasCache("Reports");
    return res.json(gasData);
  }

  const data = getData();
  const newReport = {
    ...req.body,
    ReportID: Math.random().toString(36).substr(2, 9),
    SubmittedAt: new Date().toISOString()
  };
  data.weeklyReports.push(newReport);
  saveData(data);

  // Notify peers and superiors
  const submitter = data.users.find((u: any) => String(u.UserID) === String(req.body.UserID));
  if (submitter) {
    let notifyRoles: string[] = [];
    if (submitter.Role === "店長") notifyRoles = ["店長", "AM", "BM"];
    if (submitter.Role === "AM") notifyRoles = ["AM", "BM"];
    if (submitter.Role === "BM") notifyRoles = ["BM"];

    const usersToNotify = data.users
      .filter((u: any) => notifyRoles.includes(u.Role) && String(u.UserID) !== String(submitter.UserID))
      .map((u: any) => String(u.UserID));
    
    notifyUsers(usersToNotify, {
      title: "週報の提出",
      body: `${submitter.Name}が週報を提出しました。`
    });
  }

  res.json({ success: true });
});

app.post("/api/saveDecadeReport", async (req, res) => {
  const gasData = await callGas("saveDecadeReport", req.body);
  if (gasData) {
    invalidateGasCache("Reports");
    return res.json(gasData);
  }

  const data = getData();
  const newReport = {
    ...req.body,
    ReportID: Math.random().toString(36).substr(2, 9),
    SubmittedAt: new Date().toISOString()
  };
  data.decadeReports.push(newReport);
  saveData(data);

  // Notify peers and superiors
  const submitter = data.users.find((u: any) => String(u.UserID) === String(req.body.UserID));
  if (submitter) {
    let notifyRoles: string[] = [];
    if (submitter.Role === "店長") notifyRoles = ["店長", "AM", "BM"];
    if (submitter.Role === "AM") notifyRoles = ["AM", "BM"];
    if (submitter.Role === "BM") notifyRoles = ["BM"];

    const usersToNotify = data.users
      .filter((u: any) => notifyRoles.includes(u.Role) && String(u.UserID) !== String(submitter.UserID))
      .map((u: any) => String(u.UserID));
    
    notifyUsers(usersToNotify, {
      title: "旬報の提出",
      body: `${submitter.Name}が旬報を提出しました。`
    });
  }

  res.json({ success: true });
});

app.post("/api/saveComment", async (req, res) => {
  const { reportId, comment, role, userId } = req.body;
  const gasData = await callGas("saveComment", { reportId, comment, role, userId });
  if (gasData) {
    invalidateGasCache("Reports");
    return res.json(gasData);
  }

  const data = getData();
  const reportIndex = data.weeklyReports.findIndex((r: any) => String(r.ReportID) === String(reportId));
  if (reportIndex !== -1) {
    if (role === "AM") {
      data.weeklyReports[reportIndex].AM_Comment = comment;
      data.weeklyReports[reportIndex].AM_Comment_UserID = userId;
    }
    if (role === "BM") {
      data.weeklyReports[reportIndex].BM_Comment = comment;
      data.weeklyReports[reportIndex].BM_Comment_UserID = userId;
    }
    saveData(data);

    // Send push notification to report owner
    const report = data.weeklyReports[reportIndex];
    if (String(report.UserID) !== String(userId)) {
      const commenter = data.users.find((u: any) => String(u.UserID) === String(userId));
      notifyUsers([String(report.UserID)], {
        title: "新しいフィードバック",
        body: `${commenter?.Name || role}からフィードバックがつきました。`
      });
    }

    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

// Tasks API
app.get("/api/tasks", async (req, res) => {
  const gasResult = await callGas('getTasks', {}, true);
  if (gasResult && Array.isArray(gasResult)) {
    return res.json(gasResult);
  }
  if (gasResult && gasResult.error) {
    console.error("GAS error for getTasks:", gasResult.error);
  }
  res.json(getData().tasks || []);
});

app.post("/api/tasks", async (req, res) => {
  const gasResult = await callGas('saveTask', req.body, false);
  if (gasResult && !gasResult.error) {
    invalidateGasCache('getTasks');
    return res.json(gasResult);
  }
  if (gasResult && gasResult.error) {
    console.error("GAS error for saveTask:", gasResult.error);
  }

  const data = getData();
  if (!data.tasks) data.tasks = [];
  
  if (req.body.taskId) {
    const task = data.tasks.find((t: any) => t.TaskID === req.body.taskId);
    if (task) {
      if (req.body.status !== undefined) task.Status = req.body.status;
      if (req.body.assignee !== undefined) task.Assignee = req.body.assignee;
      if (req.body.deadline !== undefined) task.Deadline = req.body.deadline;
      if (req.body.content !== undefined) task.Content = req.body.content;
    }
  } else {
    data.tasks.push({
      TaskID: "T" + Date.now(),
      Assignee: req.body.assignee || '',
      Deadline: req.body.deadline || '',
      Content: req.body.content || '',
      Status: req.body.status || 'pending',
      CreatedAt: new Date().toISOString(),
      Source: req.body.source || 'manual'
    });
  }
  saveData(data);
  res.json({ success: true });
});

app.delete("/api/tasks/:id", async (req, res) => {
  const gasResult = await callGas('deleteTask', { taskId: req.params.id }, false);
  if (gasResult && !gasResult.error) {
    invalidateGasCache('getTasks');
    return res.json(gasResult);
  }
  if (gasResult && gasResult.error) {
    console.error("GAS error for deleteTask:", gasResult.error);
  }

  const data = getData();
  if (data.tasks) {
    data.tasks = data.tasks.filter((t: any) => t.TaskID !== req.params.id);
    saveData(data);
  }
  res.json({ success: true });
});

// Projects API
app.get("/api/projects", async (req, res) => {
  const gasResult = await callGas('getProjects', {}, true);
  if (gasResult && Array.isArray(gasResult)) {
    return res.json(gasResult);
  }
  if (gasResult && gasResult.error) {
    console.error("GAS error for getProjects:", gasResult.error);
  }
  res.json(getData().projects || []);
});

app.post("/api/projects", async (req, res) => {
  const gasResult = await callGas('saveProject', req.body, false);
  if (gasResult && !gasResult.error) {
    invalidateGasCache('getProjects');
    return res.json(gasResult);
  }
  if (gasResult && gasResult.error) {
    console.error("GAS error for saveProject:", gasResult.error);
  }

  const data = getData();
  if (!data.projects) data.projects = [];
  
  if (req.body.projectId) {
    const project = data.projects.find((p: any) => p.ProjectID === req.body.projectId);
    if (project) {
      if (req.body.status !== undefined) project.Status = req.body.status;
      if (req.body.assignee !== undefined) project.Assignee = req.body.assignee;
      if (req.body.withWhom !== undefined) project.WithWhom = req.body.withWhom;
      if (req.body.startDate !== undefined) project.StartDate = req.body.startDate;
      if (req.body.endDate !== undefined) project.EndDate = req.body.endDate;
      if (req.body.what !== undefined) project.What = req.body.what;
      if (req.body.purpose !== undefined) project.Purpose = req.body.purpose;
      if (req.body.extent !== undefined) project.Extent = req.body.extent;
    }
  } else {
    data.projects.push({
      ProjectID: "P" + Date.now(),
      Assignee: req.body.assignee || '',
      WithWhom: req.body.withWhom || '',
      StartDate: req.body.startDate || '',
      EndDate: req.body.endDate || '',
      What: req.body.what || '',
      Purpose: req.body.purpose || '',
      Extent: req.body.extent || '',
      Status: req.body.status || 'pending',
      CreatedAt: new Date().toISOString()
    });
  }
  saveData(data);
  res.json({ success: true });
});

app.delete("/api/projects/:id", async (req, res) => {
  const gasResult = await callGas('deleteProject', { projectId: req.params.id }, false);
  if (gasResult && !gasResult.error) {
    invalidateGasCache('getProjects');
    return res.json(gasResult);
  }
  if (gasResult && gasResult.error) {
    console.error("GAS error for deleteProject:", gasResult.error);
  }

  const data = getData();
  if (data.projects) {
    data.projects = data.projects.filter((p: any) => p.ProjectID !== req.params.id);
    saveData(data);
  }
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Local development only
if (process.env.NODE_ENV !== "production") {
  startServer();
}

// Cloudflare Workers entry point
export default {
  async fetch(request: Request, env: any, ctx: any) {
    // Set environment variables from Workers env
    if (env.GAS_URL) process.env.GAS_URL = env.GAS_URL;
    
    // This is a placeholder. To run Express on Workers, 
    // you would normally use a library like @codegenie/serverless-express.
    return new Response("BTTF API is running on Cloudflare Workers. Please use Cloudflare Pages for the full React app.");
  },
};
