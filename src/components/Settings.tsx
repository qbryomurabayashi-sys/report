import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ChevronLeft, Bell, Smartphone, Monitor, CheckCircle2, Circle, Send, ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react";
import { User } from "../types";
import { subscribeToPush } from "../lib/notifications";
import { db } from "../firebase";
import { doc, getDoc, setDoc, collection } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firebase-utils";

interface SettingsProps {
  user: User;
  onBack: () => void;
}

export interface NotificationSettings {
  projectAdded: boolean;
  taskAdded: boolean;
  deadlineApproaching: boolean;
  showPanel: boolean;
  showBadge: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  projectAdded: true,
  taskAdded: true,
  deadlineApproaching: true,
  showPanel: true,
  showBadge: true,
};

export function Settings({ user, onBack }: SettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem(`settings_${user.UserID}`);
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isTesting, setIsTesting] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState("");

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    const syncSettings = async () => {
      localStorage.setItem(`settings_${user.UserID}`, JSON.stringify(settings));
      
      // Sync with Firestore
      try {
        await setDoc(doc(db, "users", user.UserID), {
          settings: settings
        }, { merge: true }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${user.UserID}`));
      } catch (error) {
        console.error("Failed to sync settings to Firestore", error);
      }
    };

    syncSettings();
    
    // Update app badge if supported
    if (settings.showBadge && 'setAppBadge' in navigator) {
      // Fetch actual count from Firestore
      const fetchCount = async () => {
        try {
          const { collection, query, where, getDocs } = await import("firebase/firestore");
          const q = query(collection(db, "notifications"), where("UserID", "==", user.UserID), where("Read", "==", false));
          const snap = await getDocs(q);
          (navigator as any).setAppBadge(snap.size).catch(console.error);
        } catch (e) {
          console.error(e);
        }
      };
      fetchCount();
    } else if ('clearAppBadge' in navigator) {
      (navigator as any).clearAppBadge().catch(console.error);
    }
  }, [settings, user.UserID]);

  const toggleSetting = (key: keyof NotificationSettings) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: !prev[key] };
      return newSettings;
    });
  };

  const handleRequestPermission = async () => {
    if (!("Notification" in window)) {
      alert("お使いのブラウザはプッシュ通知をサポートしていません。iOSの場合はホーム画面に追加（PWA化）してからお試しください。");
      return;
    }
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        const success = await subscribeToPush(user.UserID);
        if (success) {
          alert("通知設定が完了しました！");
        } else {
          alert("通知の登録に失敗しました。");
        }
      } else {
        alert("通知が許可されませんでした。端末の設定から通知を許可してください。");
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      alert("通知設定中にエラーが発生しました。");
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      // Create a test notification in Firestore
      const { collection, addDoc } = await import("firebase/firestore");
      await addDoc(collection(db, "notifications"), {
        UserID: user.UserID,
        Title: "テスト通知",
        Body: "これはFirestore経由のテスト通知です。正常に動作しています。",
        Url: "/dashboard",
        Read: false,
        CreatedAt: new Date().toISOString(),
        Type: "info"
      }).catch(e => handleFirestoreError(e, OperationType.CREATE, "notifications"));
      
      alert("テスト通知をFirestoreに登録しました。通知パネルを確認してください。");
    } catch (error) {
      console.error("Failed to send test notification", error);
    } finally {
      setTimeout(() => setIsTesting(false), 2000);
    }
  };

  const handleTestBadge = async () => {
    if ('setAppBadge' in navigator) {
      (navigator as any).setAppBadge(7).catch(console.error);
      setTimeout(async () => {
        // Restore actual count after 3s
        try {
          const { collection, query, where, getDocs } = await import("firebase/firestore");
          const q = query(collection(db, "notifications"), where("UserID", "==", user.UserID), where("Read", "==", false));
          const snap = await getDocs(q);
          (navigator as any).setAppBadge(snap.size).catch(console.error);
        } catch (e) {
          console.error(e);
        }
      }, 3000);
    }
  };

  const handleForceUpdate = async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
      }
    }
    window.location.reload();
  };

  const handleMigration = async () => {
    if (!confirm("旧システム（db.json）からデータを移行しますか？既存のデータは上書きされる可能性があります。")) {
      return;
    }
    
    setIsMigrating(true);
    setMigrationStatus("データを取得中...");
    
    try {
      const response = await fetch("/api/migrate-data");
      const result = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error("データの取得に失敗しました");
      }
      
      const data = result.data;
      const collections: Record<string, string> = {
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
        setMigrationStatus(`${collectionName} を移行中... (${items.length}件)`);
        
        for (const item of items) {
          const id = item.UserID || item.ReportID || item.TaskID || item.ProjectID || item.NotificationID;
          if (!id) continue;
          
          const docRef = doc(db, collectionName, String(id));
          await setDoc(docRef, {
            ...item,
            migratedAt: new Date().toISOString()
          }, { merge: true }).catch(e => handleFirestoreError(e, OperationType.WRITE, collectionName));
        }
      }
      
      setMigrationStatus("移行が完了しました！");
      setTimeout(() => setMigrationStatus(""), 3000);
    } catch (error: any) {
      console.error("Migration failed:", error);
      setMigrationStatus(`エラー: ${error.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 glass-card rounded-xl text-gray-400 hover:text-white transition-all">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold neon-text-orange font-display tracking-tight">設定</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-digital">System Settings</p>
        </div>
      </header>

      <div className="space-y-6 pb-20">
        <section className="glass-card p-6 rounded-2xl border-l-4 border-neon-orange">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 neon-text-orange" />
              <h3 className="text-sm font-bold text-neon-orange uppercase tracking-widest font-display">Notification Items</h3>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
              {permission === "granted" ? (
                <>
                  <ShieldCheck size={12} className="text-green-400" />
                  <span className="text-[10px] text-green-400 font-digital uppercase">Active</span>
                </>
              ) : (
                <>
                  <ShieldAlert size={12} className="text-neon-orange" />
                  <span className="text-[10px] text-neon-orange font-digital uppercase">{permission === "denied" ? "Blocked" : "Disabled"}</span>
                </>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            {[
              { id: 'projectAdded', label: 'プロジェクト追加時', desc: '新しいプロジェクトが登録された時に通知します' },
              { id: 'taskAdded', label: 'タスク追加時', desc: '新しいタスクが登録された時に通知します' },
              { id: 'deadlineApproaching', label: '締切間近', desc: '締切が近づいている項目がある時に通知します' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => toggleSetting(item.id as keyof NotificationSettings)}
                className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-left cursor-pointer"
              >
                <div>
                  <p className="text-sm font-bold">{item.label}</p>
                  <p className="text-[10px] text-gray-500">{item.desc}</p>
                </div>
                {settings[item.id as keyof NotificationSettings] ? (
                  <CheckCircle2 className="text-neon-orange" size={20} />
                ) : (
                  <Circle className="text-gray-600" size={20} />
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="glass-card p-6 rounded-2xl border-l-4 border-neon-blue">
          <div className="flex items-center gap-2 mb-6">
            <Smartphone className="w-4 h-4 neon-text-blue" />
            <h3 className="text-sm font-bold text-neon-blue uppercase tracking-widest font-display">Device Integration</h3>
          </div>
          
          <div className="space-y-4">
            {[
              { id: 'showPanel', label: '通知パネル表示', desc: 'ステータスバーや通知パネルに情報を表示します', icon: Monitor },
              { id: 'showBadge', label: 'スマホドットバッチ', desc: 'アプリアイコンに未読バッジを表示します', icon: Smartphone },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => toggleSetting(item.id as keyof NotificationSettings)}
                className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg">
                    <item.icon size={16} className="text-neon-blue" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{item.label}</p>
                    <p className="text-[10px] text-gray-500">{item.desc}</p>
                  </div>
                </div>
                {settings[item.id as keyof NotificationSettings] ? (
                  <CheckCircle2 className="text-neon-blue" size={20} />
                ) : (
                  <Circle className="text-gray-600" size={20} />
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="glass-card p-6 rounded-2xl border-l-4 border-neon-purple">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle2 className="w-4 h-4 neon-text-purple" />
            <h3 className="text-sm font-bold text-neon-purple uppercase tracking-widest font-display">Test & Support</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleRequestPermission}
              className="flex items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
            >
              <Bell size={16} className="text-neon-purple" />
              <span className="text-xs font-bold">通知設定を更新 (再登録)</span>
            </button>

            <button
              onClick={handleTestNotification}
              disabled={isTesting || permission !== "granted"}
              className="flex items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send size={16} className={isTesting ? "text-gray-500" : "text-neon-purple"} />
              <span className="text-xs font-bold">{isTesting ? "送信中..." : "テスト通知を送信"}</span>
            </button>

            <button
              onClick={handleTestBadge}
              className="flex items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
            >
              <Smartphone size={16} className="text-neon-purple" />
              <span className="text-xs font-bold">バッジテスト (3秒間)</span>
            </button>

            <button
              onClick={handleForceUpdate}
              className="flex items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
            >
              <RefreshCw size={16} className="text-neon-purple" />
              <span className="text-xs font-bold">アプリを強制更新</span>
            </button>
          </div>
        </section>

        {user.Role === 'BM' && (
          <section className="glass-card p-6 rounded-2xl border-l-4 border-red-500">
            <div className="flex items-center gap-2 mb-6">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest font-display">Admin Tools</h3>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={handleMigration}
                disabled={isMigrating}
                className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl hover:bg-red-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={16} className={isMigrating ? "text-gray-500 animate-spin" : "text-red-500"} />
                <span className="text-xs font-bold text-red-500">
                  {isMigrating ? "移行処理中..." : "旧システムからデータを移行"}
                </span>
              </button>
              {migrationStatus && (
                <p className="text-[10px] text-center text-gray-400 font-digital">{migrationStatus}</p>
              )}
            </div>
          </section>
        )}

        <div className="p-4 text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-digital">BTTF App Version 4.1.0 (Firebase)</p>
        </div>
      </div>
    </div>
  );
}
