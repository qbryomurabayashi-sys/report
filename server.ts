import express from "express";
import { createServer as createViteServer } from "vite";
import path from "node:path";
import fs from "node:fs";
import fetch from "node-fetch";
import webpush from "web-push";
import admin from "firebase-admin";

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: "gen-lang-client-0454608404"
  });
  console.log("Firebase Admin initialized successfully.");
} catch (err) {
  console.error("Failed to initialize Firebase Admin. Push notifications via FCM may not work.", err);
}

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
const publicVapidKey = "BIJQObXWpMqW1nYXUX3b4icKnyLwcPNU2-qXJOUuUOX68wQ2BlYWyILatrP_LB2xyOzOfWih8Ott31nsdXuOYX0";
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || "TDprt5aw0JnL-pbIiDv06CB81BCty7bu8NSWM6a1xTw"; // Should be set in env

try {
  webpush.setVapidDetails(
    "mailto:test@example.com",
    publicVapidKey,
    privateVapidKey
  );
} catch (err) {
  console.error("Failed to set VAPID details. Push notifications may not work.", err);
}

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
  console.log(`User ${userId} subscribed for push notifications. Total subs: ${subscriptions[userId].length}`);
  res.status(201).json({ success: true });
});

app.post("/api/test-push", (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "UserID required" });
  
  notifyUsers([String(userId)], {
    title: "テスト通知",
    body: "これはスマートフォン連動のテスト通知です。正常に動作しています。",
    badge: 1
  });
  
  res.json({ success: true, message: "Test notification sent" });
});

// Helper to send notifications
function notifyUsers(userIds: string[], payload: any) {
  console.log(`Sending notifications to users: ${userIds.join(", ")} with payload:`, payload);
  
  // Add default badge if not present
  if (payload.badge === undefined) {
    payload.badge = 1;
  }

  userIds.forEach(uid => {
    // Persist to GAS for notification center
    callGas('addNotification', {
      userId: uid,
      title: payload.title,
      body: payload.body,
      url: payload.url || ""
    }, false);

    const subs = subscriptions[uid] || [];
    subs.forEach(sub => {
      // Send via Web Push (legacy/fallback)
      webpush.sendNotification(sub, JSON.stringify(payload)).catch(err => {
        console.error(`Web Push error for user ${uid}:`, err);
        if (err.statusCode === 410 || err.statusCode === 404) {
          subscriptions[uid] = subscriptions[uid].filter(s => s.endpoint !== sub.endpoint);
        }
      });

      // Send via FCM if it's an FCM token
      // In our subscribe logic, we're putting the token in sub.endpoint
      if (sub.endpoint && !sub.endpoint.startsWith('https://')) {
        const message = {
          notification: {
            title: payload.title,
            body: payload.body,
          },
          token: sub.endpoint,
          webpush: {
            notification: {
              icon: '/icon.svg',
              badge: '/icon.svg',
            },
            fcmOptions: {
              link: payload.url || '/'
            }
          }
        };

        admin.messaging().send(message)
          .then((response) => {
            console.log('Successfully sent FCM message:', response);
          })
          .catch((error) => {
            console.error('Error sending FCM message:', error);
          });
      }
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
    const keysBefore = Object.keys(gasCache);
    keysBefore.forEach(key => {
      if (key.includes(actionPrefix)) {
        delete gasCache[key];
        count++;
      }
    });
    console.log(`GAS Cache invalidated for prefix "${actionPrefix}". Removed ${count} items. Remaining keys: ${Object.keys(gasCache).length}`);
    if (count > 0) {
      console.log(`Invalidated keys: ${keysBefore.filter(k => k.includes(actionPrefix)).join(", ")}`);
    }
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
    if (!response.ok) {
      console.error(`GAS response not OK (${action}):`, response.status, response.statusText);
      return null;
    }

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
  amStatusReports: [],
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
    decadeCount: data.decadeReports.length,
    amStatusCount: data.amStatusReports?.length || 0
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

app.post("/api/setup", async (req, res) => {
  const gasData = await callGas("setup");
  res.json(gasData || { success: false, message: "GAS connection failed" });
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

  console.log("GAS request failed or returned invalid data for weeklyReports, falling back to local data.");
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

  console.log("GAS request failed or returned invalid data for decadeReports, falling back to local data.");
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

app.get("/api/amStatusReports", async (req, res) => {
  const { userId, role, area, refresh } = req.query;
  console.log(`Fetching AM status reports for UserID: ${userId}, Role: ${role}, Area: ${area}, Refresh: ${refresh}`);
  
  // Revert to userId and role only for the GAS payload
  const gasData = await callGas("getAMStatusReports", { userId, role }, refresh !== "true");
  
  if (gasData) {
    if (gasData.error) {
      console.error(`GAS error in amStatusReports: ${gasData.error}`);
      return res.status(400).json({ error: `GASエラー: ${gasData.error}` });
    }
    if (Array.isArray(gasData)) {
      console.log(`Fetched ${gasData.length} AM status reports from GAS`);
      let filteredGasData = gasData;
      if (role === "店長") {
        filteredGasData = [];
      }
      return res.json(filteredGasData);
    }
  }

  console.log("GAS request failed or returned invalid data for amStatusReports, falling back to local data.");
  const data = getData();
  let filtered = data.amStatusReports || [];

  if (role === "店長") {
    filtered = []; // Store managers shouldn't see AM status reports usually, or maybe they can? Let's hide for now.
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

  console.log(`Returning ${result.length} local AM status reports`);
  res.json(result.reverse());
});

app.post("/api/toggleLike", async (req, res) => {
  const { reportId, userId, type } = req.body;
  console.log(`Toggle like for ReportID: ${reportId}, UserID: ${userId}, Type: ${type}`);
  const gasData = await callGas("toggleLike", { reportId, userId, type });
  
  let liked = false;
  if (gasData) {
    invalidateGasCache("Reports");
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
    const amStatusReport = data.amStatusReports?.find((r: any) => String(r.ReportID) === String(reportId));
    const report = decadeReport || weeklyReport || amStatusReport;
    
    if (report && String(report.UserID) !== String(userId)) {
      const liker = data.users.find((u: any) => String(u.UserID) === String(userId));
      notifyUsers([String(report.UserID)], {
        title: "いいね！されました",
        body: `${liker?.Name || "誰か"}があなたの報告にいいね！しました。`,
        url: "/reports"
      });
    }
  }

  return res.json({ success: true, liked });
});

app.post("/api/saveWeeklyReport", async (req, res) => {
  const gasData = await callGas("saveWeeklyReport", req.body);
  
  const data = getData();
  const submitter = data.users.find((u: any) => String(u.UserID) === String(req.body.UserID));

  if (!gasData) {
    const newReport = {
      ...req.body,
      ReportID: Math.random().toString(36).substr(2, 9),
      SubmittedAt: new Date().toISOString()
    };
    data.weeklyReports.push(newReport);
    saveData(data);
    invalidateGasCache("Reports");
  } else {
    invalidateGasCache("Reports");
  }

  // Notify peers and superiors
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
      body: `${submitter.Name}が週報を提出しました。`,
      url: "/reports"
    });
  }

  res.json(gasData || { success: true });
});

app.post("/api/saveDecadeReport", async (req, res) => {
  const gasData = await callGas("saveDecadeReport", req.body);
  
  const data = getData();
  const submitter = data.users.find((u: any) => String(u.UserID) === String(req.body.UserID));

  if (!gasData) {
    const newReport = {
      ...req.body,
      ReportID: Math.random().toString(36).substr(2, 9),
      SubmittedAt: new Date().toISOString()
    };
    data.decadeReports.push(newReport);
    saveData(data);
    invalidateGasCache("Reports");
  } else {
    invalidateGasCache("Reports");
  }

  // Notify peers and superiors
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
      body: `${submitter.Name}が旬報を提出しました。`,
      url: "/reports"
    });
  }

  res.json(gasData || { success: true });
});

app.post("/api/saveAMStatusReport", async (req, res) => {
  console.log("Saving AM Status Report...");
  const gasData = await callGas("saveAMStatusReport", req.body);
  
  const data = getData();
  const submitter = data.users.find((u: any) => String(u.UserID) === String(req.body.UserID));

  // Handle local fallback if GAS fails (connection error)
  if (!gasData) {
    console.log("GAS connection failed, saving AM Status Report locally.");
    const newReport = {
      ...req.body,
      ReportID: Math.random().toString(36).substr(2, 9),
      SubmittedAt: new Date().toISOString()
    };
    if (!data.amStatusReports) data.amStatusReports = [];
    data.amStatusReports.push(newReport);
    saveData(data);
    invalidateGasCache("Reports");
  } else if (gasData.success) {
    invalidateGasCache("Reports");
  }

  // Notify peers and superiors (Always do this)
  if (submitter) {
    let notifyRoles: string[] = [];
    if (submitter.Role === "AM") notifyRoles = ["AM", "BM"];
    if (submitter.Role === "BM") notifyRoles = ["BM"];

    const usersToNotify = data.users
      .filter((u: any) => notifyRoles.includes(u.Role) && String(u.UserID) !== String(submitter.UserID))
      .map((u: any) => String(u.UserID));
    
    notifyUsers(usersToNotify, {
      title: "AM近況報告の提出",
      body: `${submitter.Name}が近況報告を提出しました。`,
      url: "/reports"
    });
  }

  res.json(gasData || { success: true, message: "Saved locally (GAS connection failed)" });
});

app.post("/api/addComment", async (req, res) => {
  const { reportId, userId, role, comment } = req.body;
  console.log(`Adding general comment for ReportID: ${reportId}, UserID: ${userId}`);
  
  const gasData = await callGas("addComment", { reportId, userId, role, comment });
  
  if (gasData && gasData.success) {
    invalidateGasCache("Reports");
    
    const data = getData();
    if (!data.comments) data.comments = [];
    data.comments.push({
      CommentID: gasData.commentId || Math.random().toString(36).substr(2, 9),
      ReportID: reportId,
      UserID: userId,
      Role: role,
      Text: comment,
      CreatedAt: new Date().toISOString()
    });
    saveData(data);
  }

  res.json(gasData || { success: true });
});

app.post("/api/saveComment", async (req, res) => {
  const { reportId, comment, role, userId, type } = req.body;
  console.log(`Saving feedback (AM/BM) for ReportID: ${reportId}, UserID: ${userId}, Type: ${type}`);
  const gasData = await callGas("saveComment", { reportId, comment, role, userId, type });
  
  const data = getData();
  const commenter = data.users.find((u: any) => String(u.UserID) === String(userId));

  // Find the report to get the author
  let report: any = null;
  let reportList: any[] = [];
  
  if (type === 'weekly') reportList = data.weeklyReports;
  else if (type === 'decade') reportList = data.decadeReports;
  else if (type === 'am_status') reportList = data.amStatusReports || [];

  const reportIndex = reportList.findIndex((r: any) => String(r.ReportID) === String(reportId));
  
  if (reportIndex !== -1) {
    report = reportList[reportIndex];
    if (!gasData) {
      if (role === "AM") {
        report.AM_Comment = comment;
        report.AM_Comment_UserID = userId;
        report.AM_Comment_Name = commenter?.Name;
      } else if (role === "BM") {
        report.BM_Comment = comment;
        report.BM_Comment_UserID = userId;
        report.BM_Comment_Name = commenter?.Name;
      } else {
        // Regular comment
        if (!data.comments) data.comments = [];
        data.comments.push({
          CommentID: Math.random().toString(36).substr(2, 9),
          ReportID: reportId,
          UserID: userId,
          Role: role,
          Text: comment,
          CreatedAt: new Date().toISOString()
        });
      }
      saveData(data);
    } else {
      invalidateGasCache("Reports");
    }

    // Notify the author of the report
    if (report && String(report.UserID) !== String(userId)) {
      notifyUsers([String(report.UserID)], {
        title: role === "AM" || role === "BM" ? "フィードバックが届きました" : "新しいコメント",
        body: `${commenter?.Name || role}から反応がありました。`,
        url: "/reports"
      });
    }

    res.json(gasData || { success: true });
  } else {
    // If report not found in lists, it might be a general comment
    if (!gasData) {
      if (!data.comments) data.comments = [];
      data.comments.push({
        CommentID: Math.random().toString(36).substr(2, 9),
        ReportID: reportId,
        UserID: userId,
        Role: role,
        Text: comment,
        CreatedAt: new Date().toISOString()
      });
      saveData(data);
    }
    res.json(gasData || { success: true });
  }
});

// Tasks API
app.get("/api/tasks", async (req, res) => {
  const { refresh } = req.query;
  const gasResult = await callGas('getTasks', {}, refresh !== "true");
  
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  if (gasResult && Array.isArray(gasResult)) {
    // Update local cache for offline/fallback use
    const data = getData();
    data.tasks = gasResult;
    saveData(data);
    return res.json(gasResult);
  }

  if (gasResult && gasResult.error) {
    console.error("GAS error for getTasks:", gasResult.error);
    return res.status(500).json(gasResult);
  }

  // Fallback to local data if GAS is unavailable
  console.log("Falling back to local data for getTasks");
  const data = getData();
  res.json(data.tasks || []);
});

app.post("/api/tasks", async (req, res) => {
  const gasResult = await callGas('saveTask', req.body, false);
  if (gasResult && !gasResult.error && gasResult.success !== false) {
    invalidateGasCache('getTasks');
  } else if (gasResult && (gasResult.error || gasResult.success === false)) {
    console.error("GAS error for saveTask:", gasResult.error || gasResult.message);
  }

  const data = getData();
  if (!data.tasks) data.tasks = [];
  
  if (req.body.taskId) {
    const task = data.tasks.find((t: any) => t.TaskID === req.body.taskId);
    if (task) {
      if (req.body.status !== undefined) task.Status = req.body.status;
      if (req.body.assignee !== undefined) task.Assignees = Array.isArray(req.body.assignee) ? req.body.assignee : [req.body.assignee];
      if (req.body.assignees !== undefined) task.Assignees = req.body.assignees;
      if (req.body.deadline !== undefined) task.Deadline = req.body.deadline;
      if (req.body.content !== undefined) task.Content = req.body.content;
    }
  } else {
    data.tasks.push({
      TaskID: (gasResult && gasResult.taskId) ? gasResult.taskId : "T" + Date.now(),
      Assignees: req.body.assignees || (req.body.assignee ? [req.body.assignee] : []),
      Deadline: req.body.deadline || '',
      IsAllDay: req.body.isAllDay !== undefined ? req.body.isAllDay : true,
      Time: req.body.time || '',
      Content: req.body.content || '',
      Status: req.body.status || 'pending',
      CreatedAt: new Date().toISOString(),
      Source: req.body.source || 'manual'
    });
  }
  saveData(data);
  res.json({ success: true, taskId: gasResult?.taskId });
});

app.delete("/api/tasks/:id", async (req, res) => {
  const gasResult = await callGas('deleteTask', { taskId: req.params.id }, false);
  if (gasResult && !gasResult.error && gasResult.success !== false) {
    invalidateGasCache('getTasks');
  } else if (gasResult && (gasResult.error || gasResult.success === false)) {
    console.error("GAS error for deleteTask:", gasResult.error || gasResult.message);
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
  const { refresh } = req.query;
  const gasResult = await callGas('getProjects', {}, refresh !== "true");
  
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (gasResult && Array.isArray(gasResult)) {
    // Update local cache for offline/fallback use
    const data = getData();
    data.projects = gasResult;
    saveData(data);
    return res.json(gasResult);
  }

  if (gasResult && gasResult.error) {
    console.error("GAS error for getProjects:", gasResult.error);
    return res.status(500).json(gasResult);
  }

  // Fallback to local data if GAS is unavailable
  console.log("Falling back to local data for getProjects");
  const data = getData();
  res.json(data.projects || []);
});

app.post("/api/projects", async (req, res) => {
  const gasResult = await callGas('saveProject', req.body, false);
  if (gasResult && !gasResult.error && gasResult.success !== false) {
    invalidateGasCache('getProjects');
  } else if (gasResult && (gasResult.error || gasResult.success === false)) {
    console.error("GAS error for saveProject:", gasResult.error || gasResult.message);
  }

  const data = getData();
  if (!data.projects) data.projects = [];
  
  if (req.body.projectId) {
    const project = data.projects.find((p: any) => p.ProjectID === req.body.projectId);
    if (project) {
      if (req.body.status !== undefined) project.Status = req.body.status;
      if (req.body.assignees !== undefined) project.Assignees = req.body.assignees;
      if (req.body.withWhom !== undefined) project.WithWhom = req.body.withWhom;
      if (req.body.startDate !== undefined) project.StartDate = req.body.startDate;
      if (req.body.endDate !== undefined) project.EndDate = req.body.endDate;
      if (req.body.what !== undefined) project.What = req.body.what;
      if (req.body.purpose !== undefined) project.Purpose = req.body.purpose;
      if (req.body.extent !== undefined) project.Extent = req.body.extent;
    }
  } else {
    data.projects.push({
      ProjectID: (gasResult && gasResult.projectId) ? gasResult.projectId : "P" + Date.now(),
      Assignees: req.body.assignees || [],
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
  res.json({ success: true, projectId: gasResult?.projectId });
});

app.delete("/api/projects/:id", async (req, res) => {
  const gasResult = await callGas('deleteProject', { projectId: req.params.id }, false);
  if (gasResult && !gasResult.error && gasResult.success !== false) {
    invalidateGasCache('getProjects');
  } else if (gasResult && (gasResult.error || gasResult.success === false)) {
    console.error("GAS error for deleteProject:", gasResult.error || gasResult.message);
  }

  const data = getData();
  if (data.projects) {
    data.projects = data.projects.filter((p: any) => p.ProjectID !== req.params.id);
    saveData(data);
  }
  res.json({ success: true });
});

app.get("/api/members", async (req, res) => {
  const gasResult = await callGas('getMembers', {}, true);
  if (gasResult) return res.json(gasResult);
  
  // Mock members if GAS fails
  const data = getData();
  const members = data.users.map((u: any) => ({
    id: u.UserID,
    name: u.Name,
    role: u.Role,
    area: u.Area
  }));
  res.json(members);
});

app.get("/api/notifications/count", async (req, res) => {
  const { userId } = req.query;
  const gasResult = await callGas('getNotifications', { userId }, false);
  if (Array.isArray(gasResult)) {
    const unread = gasResult.filter(n => !n.IsRead).length;
    return res.json({ count: unread });
  }
  res.json({ count: 0 });
});

app.get("/api/notifications", async (req, res) => {
  const { userId } = req.query;
  const gasResult = await callGas('getNotifications', { userId }, false);
  res.json(gasResult || []);
});

app.post("/api/notifications/read", async (req, res) => {
  const gasResult = await callGas('markNotificationAsRead', req.body, false);
  res.json(gasResult || { success: true });
});

app.post("/api/notifications", async (req, res) => {
  const gasResult = await callGas('addNotification', req.body, false);
  res.json(gasResult || { success: true });
});

app.post("/api/sendNotification", async (req, res) => {
  const gasResult = await callGas('sendNotification', req.body, false);
  res.json(gasResult || { success: true });
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

// Local development and production entry point
startServer();

// Cloudflare Workers entry point (Optional, if you want to keep it)
export default {
  async fetch(request: Request, env: any, ctx: any) {
    // Set environment variables from Workers env
    if (env.GAS_URL) process.env.GAS_URL = env.GAS_URL;
    
    // This is a placeholder. To run Express on Workers, 
    // you would normally use a library like @codegenie/serverless-express.
    return new Response("BTTF API is running on Cloudflare Workers. Please use Cloudflare Pages for the full React app.");
  },
};
