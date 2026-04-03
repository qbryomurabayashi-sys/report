import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";

// Initialize Firebase Admin
// You need to set GOOGLE_APPLICATION_CREDENTIALS or use applicationDefault() if in Cloud Run
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "gen-lang-client-0454608404"
});

const db = admin.firestore();

async function migrate() {
  const dataPath = path.join(process.cwd(), "db.json");
  if (!fs.existsSync(dataPath)) {
    console.log("db.json not found. Skipping migration.");
    return;
  }

  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  const collections = {
    users: "users",
    weeklyReports: "weeklyReports",
    decadeReports: "decadeReports",
    amStatusReports: "amStatusReports",
    tasks: "tasks",
    projects: "projects",
    notifications: "notifications"
  };

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
      });
    }
  }

  console.log("Migration complete!");
}

migrate().catch(console.error);
