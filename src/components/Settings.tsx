import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ChevronLeft, Bell, Smartphone, Monitor, CheckCircle2, Circle, Send, ShieldCheck, ShieldAlert } from "lucide-react";
import { User } from "../types";
import { subscribeToPush } from "../lib/notifications";

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

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    localStorage.setItem(`settings_${user.UserID}`, JSON.stringify(settings));
    
    // Update app badge if supported
    if (settings.showBadge && 'setAppBadge' in navigator) {
      // Fetch actual count or use mock for settings page
      fetch(`/api/notifications/count?userId=${user.UserID}`)
        .then(res => res.json())
        .then(data => {
          (navigator as any).setAppBadge(data.count || 0).catch(console.error);
        });
    } else if ('clearAppBadge' in navigator) {
      (navigator as any).clearAppBadge().catch(console.error);
    }
  }, [settings, user.UserID]);

  const toggleSetting = (key: keyof NotificationSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRequestPermission = async () => {
    if (!("Notification" in window)) return;
    
    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === "granted") {
      await subscribeToPush(user.UserID);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      await fetch("/api/test-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.UserID })
      });
    } catch (error) {
      console.error("Failed to send test notification", error);
    } finally {
      setTimeout(() => setIsTesting(false), 2000);
    }
  };

  const handleTestBadge = () => {
    if ('setAppBadge' in navigator) {
      (navigator as any).setAppBadge(7).catch(console.error);
      setTimeout(() => {
        // Restore actual count after 3s
        fetch(`/api/notifications/count?userId=${user.UserID}`)
          .then(res => res.json())
          .then(data => {
            (navigator as any).setAppBadge(data.count || 0).catch(console.error);
          });
      }, 3000);
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
                className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-left"
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
                className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-left"
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
              disabled={permission === "granted"}
              className="flex items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <Bell size={16} className="text-neon-purple" />
              <span className="text-xs font-bold">通知許可をリクエスト</span>
            </button>

            <button
              onClick={handleTestNotification}
              disabled={isTesting || permission !== "granted"}
              className="flex items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <Send size={16} className={isTesting ? "text-gray-500" : "text-neon-purple"} />
              <span className="text-xs font-bold">{isTesting ? "送信中..." : "テスト通知を送信"}</span>
            </button>

            <button
              onClick={handleTestBadge}
              className="flex items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
            >
              <Smartphone size={16} className="text-neon-purple" />
              <span className="text-xs font-bold">バッジテスト (3秒間)</span>
            </button>
          </div>
        </section>

        <div className="p-4 text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-digital">BTTF App Version 3.9.5</p>
        </div>
      </div>
    </div>
  );
}
