import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Settings, 
  Info, 
  Bell, 
  Type, 
  Volume2, 
  Key, 
  LogOut, 
  ChevronRight,
  History,
  AlertCircle
} from "lucide-react";
import { User } from "../types";

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onLogout: () => void;
  onOpenPinModal: () => void;
  onNavigate: (state: any) => void;
}

type MenuTab = "main" | "updates" | "settings";

export function SidebarMenu({ isOpen, onClose, user, onLogout, onOpenPinModal, onNavigate }: SidebarMenuProps) {
  const [activeTab, setActiveTab] = useState<MenuTab>("main");
  const [fontSize, setFontSize] = useState("medium");
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);

  const updateHistory = [
    {
      version: "v3.8",
      date: "2026-03-25",
      type: "Minor",
      changes: [
        "アプリの自動アップデート機能を追加",
        "バックグラウンドでの最新バージョン検知と自動更新"
      ]
    },
    {
      version: "v3.7",
      date: "2026-03-25",
      type: "Minor",
      changes: [
        "プッシュ通知機能の強化（期限1日前リマインド）",
        "いいね！・コメント通知の実装",
        "ハンバーガーメニューと設定画面の追加",
        "バージョン更新情報画面の実装"
      ]
    },
    {
      version: "v3.6",
      date: "2026-03-25",
      type: "Minor",
      changes: [
        "提出期限カウントダウンのロジック修正（役職別）",
        "読み込み中インジケーターの追加",
        "シート修復機能の隠しコマンド化"
      ]
    },
    {
      version: "v3.0",
      date: "2026-03-20",
      type: "Major",
      changes: [
        "Googleスプレッドシート(GAS)連携の全面刷新",
        "オフラインモードの安定性向上",
        "UIデザインのブラッシュアップ（BTTFテーマ）"
      ]
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-[280px] bg-dark-bg border-r border-neon-blue/30 z-50 flex flex-col shadow-[5px_0_30px_rgba(0,243,255,0.1)]"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neon-blue/10 flex items-center justify-center border border-neon-blue/30">
                  <Settings size={18} className="text-neon-blue" />
                </div>
                <h2 className="font-digital text-lg tracking-widest text-neon-blue">MENU</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <AnimatePresence mode="wait">
                {activeTab === "main" && (
                  <motion.div
                    key="main"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="p-4 space-y-2"
                  >
                    <MenuButton 
                      icon={<History size={18} />} 
                      label="更新情報" 
                      onClick={() => {
                        onNavigate("version_info");
                        onClose();
                      }} 
                    />
                    <MenuButton 
                      icon={<Settings size={18} />} 
                      label="設定" 
                      onClick={() => {
                        onNavigate("settings");
                        onClose();
                      }} 
                    />
                    <div className="pt-4 mt-4 border-t border-white/5">
                      <MenuButton 
                        icon={<Key size={18} />} 
                        label="パスワード変更" 
                        onClick={() => {
                          onOpenPinModal();
                          onClose();
                        }} 
                      />
                      <MenuButton 
                        icon={<LogOut size={18} />} 
                        label="ログアウト" 
                        variant="danger"
                        onClick={onLogout} 
                      />
                    </div>
                  </motion.div>
                )}

                {activeTab === "updates" && (
                  <motion.div
                    key="updates"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="p-4"
                  >
                    <button 
                      onClick={() => setActiveTab("main")}
                      className="flex items-center gap-2 text-[10px] font-digital text-gray-500 mb-6 hover:text-neon-blue transition-colors"
                    >
                      <ChevronRight size={12} className="rotate-180" /> BACK TO MENU
                    </button>
                    
                    <h3 className="text-xs font-digital text-neon-blue mb-4 tracking-widest uppercase">Version History</h3>
                    
                    <div className="space-y-6">
                      {updateHistory.map((update, idx) => (
                        <div key={idx} className="relative pl-4 border-l border-neon-blue/20">
                          <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-neon-blue shadow-[0_0_8px_#00f3ff]" />
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="text-sm font-bold text-gray-200">{update.version}</span>
                            <span className="text-[9px] font-digital text-gray-500">{update.date}</span>
                          </div>
                          <div className="mb-2">
                            <span className={`text-[8px] px-1.5 py-0.5 rounded border ${
                              update.type === "Major" ? "border-neon-orange text-neon-orange bg-neon-orange/10" : "border-neon-blue text-neon-blue bg-neon-blue/10"
                            } font-digital uppercase tracking-widest`}>
                              {update.type} Update
                            </span>
                          </div>
                          <ul className="space-y-1">
                            {update.changes.map((change, cIdx) => (
                              <li key={cIdx} className="text-[10px] text-gray-400 leading-relaxed">• {change}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === "settings" && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="p-4 space-y-6"
                  >
                    <button 
                      onClick={() => setActiveTab("main")}
                      className="flex items-center gap-2 text-[10px] font-digital text-gray-500 mb-2 hover:text-neon-blue transition-colors"
                    >
                      <ChevronRight size={12} className="rotate-180" /> BACK TO MENU
                    </button>

                    <div className="space-y-4">
                      <h3 className="text-xs font-digital text-neon-blue tracking-widest uppercase">App Settings</h3>
                      
                      <SettingToggle 
                        icon={<Bell size={18} />} 
                        label="プッシュ通知" 
                        enabled={notifications} 
                        onChange={setNotifications} 
                      />
                      
                      <SettingToggle 
                        icon={<Volume2 size={18} />} 
                        label="通知音" 
                        enabled={sound} 
                        onChange={setSound} 
                      />

                      <div className="pt-4 border-t border-white/5">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/test-push", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ userId: user.UserID })
                              });
                              const data = await res.json();
                              if (data.success) {
                                alert("テスト通知を送信しました。スマートフォンを確認してください。");
                              }
                            } catch (err) {
                              console.error("Test push failed", err);
                              alert("テスト通知の送信に失敗しました。");
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 p-3 bg-neon-blue/10 border border-neon-blue/30 rounded-xl text-neon-blue text-[10px] font-digital uppercase tracking-widest hover:bg-neon-blue hover:text-black transition-all"
                        >
                          <Bell size={14} />
                          テスト通知を送信
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-3 text-gray-400 mb-1">
                          <Type size={18} />
                          <span className="text-xs">文字の大きさ</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {["small", "medium", "large"].map((size) => (
                            <button
                              key={size}
                              onClick={() => setFontSize(size)}
                              className={`py-2 text-[10px] font-digital uppercase tracking-widest rounded border transition-all ${
                                fontSize === size 
                                  ? "border-neon-blue text-neon-blue bg-neon-blue/10" 
                                  : "border-white/5 text-gray-600 hover:border-white/20"
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl">
                      <div className="flex gap-3">
                        <AlertCircle size={16} className="text-blue-400 shrink-0" />
                        <p className="text-[9px] text-blue-300 leading-relaxed font-digital uppercase tracking-widest">
                          設定はブラウザのキャッシュに保存されます。デバイスごとに設定が必要です。
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 bg-black/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-blue/20 to-neon-orange/20 border border-white/10 flex items-center justify-center font-bold text-neon-blue">
                  {user.Name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-200">{user.Name}</p>
                  <p className="text-[8px] font-digital text-gray-500 uppercase tracking-widest">{user.Role} | {user.Area}</p>
                </div>
              </div>
              <p className="text-[7px] font-digital text-gray-600 text-center tracking-[0.3em] uppercase">
                BTTF Protocol v3.8.0
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function MenuButton({ icon, label, onClick, variant = "default" }: { 
  icon: React.ReactNode, 
  label: string, 
  onClick: () => void,
  variant?: "default" | "danger"
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 rounded-xl transition-all group ${
        variant === "danger" 
          ? "hover:bg-red-500/10 text-gray-400 hover:text-red-400" 
          : "hover:bg-neon-blue/10 text-gray-400 hover:text-neon-blue"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`transition-colors ${variant === "danger" ? "group-hover:text-red-400" : "group-hover:text-neon-blue"}`}>
          {icon}
        </div>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
    </button>
  );
}

function SettingToggle({ icon, label, enabled, onChange }: { 
  icon: React.ReactNode, 
  label: string, 
  enabled: boolean, 
  onChange: (val: boolean) => void 
}) {
  return (
    <div className="flex items-center justify-between p-2">
      <div className="flex items-center gap-3 text-gray-400">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`w-10 h-5 rounded-full relative transition-colors ${enabled ? "bg-neon-blue" : "bg-gray-800"}`}
      >
        <motion.div
          animate={{ x: enabled ? 22 : 2 }}
          className="absolute top-1 left-0 w-3 h-3 rounded-full bg-white shadow-sm"
        />
      </button>
    </div>
  );
}
