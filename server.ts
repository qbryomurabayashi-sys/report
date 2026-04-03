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

// Migration endpoint
app.post("/api/migrate", async (req, res) => {
  console.log("Migration requested...");
  const data = getData();
  const db = admin.firestore();

  const collections: Record<string, string> = {
    users: "users",
    weeklyReports: "weeklyReports",
    decadeReports: "decadeReports",
    amStatusReports: "amStatusReports",
    tasks: "tasks",
    projects: "projects",
    notifications: "notifications"
  };

  try {
    for (const [key, collectionName] of Object.entries(collections)) {
      const items = data[key] || [];
      console.log(`Migrating ${items.length} items to ${collectionName}...`);
      
      for (const item of items) {
        // Use existing ID if available, otherwise let Firestore generate one
        const id = item.UserID || item.ReportID || item.TaskID || item.ProjectID || item.NotificationID;
        const docRef = id ? db.collection(collectionName).doc(String(id)) : db.collection(collectionName).doc();
        
        await docRef.set({
          ...item,
          migratedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
    }
    res.json({ success: true, message: "Migration complete!" });
  } catch (error: any) {
    console.error("Migration failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper to send notifications
async function notifyUsers(userIds: string[], payload: any, type?: string) {
  console.log(`Sending notifications to users: ${userIds.join(", ")} with payload:`, payload);
  const db = admin.firestore();
  
  // Add default badge if not present
  if (payload.badge === undefined) {
    payload.badge = 1;
  }

  for (const uid of userIds) {
    try {
      const userDoc = await db.collection("users").doc(uid).get();
      if (!userDoc.exists) continue;
      
      const userData = userDoc.data() || {};
      const settings = userData.settings || {};
      
      // 設定によるフィルタリング
      if (type && settings[type] === false) {
        console.log(`Notification of type ${type} skipped for user ${uid} due to settings.`);
        continue;
      }

      // ペイロードに設定を含める (Service Worker用)
      const customizedPayload = {
        ...payload,
        showPanel: settings.showPanel !== false,
        showBadge: settings.showBadge !== false,
        badgeCount: payload.badgeCount || payload.badge || 1
      };

      const subs = userData.subscriptions || [];
      for (const sub of subs) {
        // Send via Web Push (legacy/fallback)
        if (sub.endpoint && sub.endpoint.startsWith('https://')) {
          webpush.sendNotification(sub, JSON.stringify(customizedPayload)).catch(async err => {
            console.error(`Web Push error for user ${uid}:`, err);
            if (err.statusCode === 410 || err.statusCode === 404) {
              // Remove invalid subscription
              await db.collection("users").doc(uid).update({
                subscriptions: admin.firestore.FieldValue.arrayRemove(sub)
              });
            }
          });
        }

        // Send via FCM if it's an FCM token
        if (sub.endpoint && !sub.endpoint.startsWith('https://')) {
          const message = {
            notification: {
              title: customizedPayload.title,
              body: customizedPayload.body,
            },
            token: sub.endpoint,
            webpush: {
              notification: {
                icon: '/icon.svg',
                badge: '/icon.svg',
              },
              fcmOptions: {
                link: customizedPayload.url || '/'
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
      }
    } catch (err) {
      console.error(`Failed to notify user ${uid}:`, err);
    }
  }
}

let lastDeadlineCheck = "";

// Deadline Check Logic
async function checkDeadlines() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDate();
  const currentDayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday
  
  const checkKey = `${now.getFullYear()}-${now.getMonth()}-${currentDay}-${currentHour}`;
  if (lastDeadlineCheck === checkKey) return;
  lastDeadlineCheck = checkKey;

  const db = admin.firestore();
  
  try {
    const usersSnapshot = await db.collection("users").get();
    const users = usersSnapshot.docs.map(doc => doc.data());

    // Check for Store Manager (店長) - Saturday 18:00 (1 day before Sunday 18:00)
    if (currentDayOfWeek === 6 && currentHour === 18) {
      const storeManagers = users
        .filter((u: any) => u.Role === "店長")
        .map((u: any) => String(u.uid || u.UserID));
      
      notifyUsers(storeManagers, {
        title: "【提出期限1日前】週報のリマインド",
        body: "明日の18:00が週報の提出期限です。作成をお願いします。"
      }, 'deadlineApproaching');
    }

    // Check for AM - 9th, 19th, 29th 18:00 (1 day before 10th, 20th, 30th 18:00)
    if ([9, 19, 29].includes(currentDay) && currentHour === 18) {
      const ams = users
        .filter((u: any) => u.Role === "AM")
        .map((u: any) => String(u.uid || u.UserID));
      
      notifyUsers(ams, {
        title: "【提出期限1日前】旬報のリマインド",
        body: "明日の18:00が旬報の提出期限です。作成をお願いします。"
      }, 'deadlineApproaching');
    }

    // Check for Tasks deadline - 1 day before deadline at 9:00 AM
    if (currentHour === 9) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const tasksSnapshot = await db.collection("tasks")
        .where("Status", "!=", "completed")
        .where("Deadline", "==", tomorrowStr)
        .get();
      
      const dueTasks = tasksSnapshot.docs.map(doc => doc.data());
      
      dueTasks.forEach((task: any) => {
        // Find user by name (Assignee)
        const user = users.find((u: any) => u.Name === task.Assignee);
        if (user) {
          notifyUsers([String(user.uid || user.UserID)], {
            title: "【タスク期限1日前】",
            body: `明日は「${task.Content}」の期限です。`
          }, 'deadlineApproaching');
        }
      });
    }
  } catch (err) {
    console.error("Deadline check failed:", err);
  }
}

// Run deadline check every 30 minutes for better reliability
setInterval(checkDeadlines, 30 * 60 * 1000);
// Also run once on startup
setTimeout(checkDeadlines, 5000);

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
