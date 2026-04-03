import express from "express";
import { createServer as createViteServer } from "vite";
import path from "node:path";
import fs from "node:fs";
import fetch from "node-fetch";
import webpush from "web-push";

// Load Firebase configuration
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (err) {
  console.error("Failed to load firebase-applet-config.json", err);
}

// AI Studio環境では、バックエンドからユーザーのFirestoreにアクセスするための
// サービスアカウント権限がないため、firebase-adminは使用できません。
// 定期処理（checkDeadlines）やプッシュ通知はCloud Functionsに移行する必要があります。

const app = express();
const PORT = 3000;

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

// Mock DB for subscriptions (DEPRECATED: Now in Firestore)
let subscriptions: Record<string, any[]> = {};
let userSettings: Record<string, any> = {};

const getData = () => {
  try {
    const dataPath = path.join(process.cwd(), "db.json");
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to read db.json", e);
  }
  return {};
};

// Migration endpoint (Returns data for client-side migration)
app.get("/api/migrate-data", async (req, res) => {
  console.log("Migration data requested...");
  const data = getData();
  res.json({ success: true, data });
});

// Login endpoint for PIN authentication (Uses db.json)
app.post("/api/login", async (req, res) => {
  const { userId, pin } = req.body;
  if (!userId || !pin) {
    return res.status(400).json({ success: false, error: "UserID and PIN are required" });
  }

  try {
    const data = getData();
    const user = data.users?.find((u: any) => String(u.UserID) === String(userId));
    
    if (user) {
      if (String(user.PIN) === String(pin) || String(user.Pin) === String(pin)) {
        res.json({ success: true, user });
      } else {
        res.status(401).json({ success: false, error: "パスワードが正しくありません" });
      }
    } else {
      res.status(404).json({ success: false, error: "ユーザーが見つかりません" });
    }
  } catch (error: any) {
    console.error("Login API error:", error);
    res.status(500).json({ success: false, error: "サーバーエラーが発生しました" });
  }
});

// Helper to send notifications (Web Push only for now)
async function notifyUsers(userIds: string[], payload: any, type?: string) {
  console.log(`Sending notifications to users: ${userIds.join(", ")} with payload:`, payload);
  // FCM push notifications require firebase-admin which is not available in this environment.
  // This should be moved to Cloud Functions.
}

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

startServer();
