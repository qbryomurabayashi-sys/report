import React from "react";
import { motion } from "motion/react";
import { ChevronLeft, Info, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { User } from "../types";

interface VersionInfoProps {
  user: User;
  onBack: () => void;
}

interface Update {
  version: string;
  date: string;
  title: string;
  content: string[];
  roleRequired: "店長" | "AM" | "BM" | "all";
}

const UPDATES: Update[] = [
  {
    version: "3.9.2",
    date: "2026-03-27",
    title: "AM/BM 向け機能強化",
    content: [
      "協力者（External Collaborators）の複数登録に対応しました。",
      "通知設定画面を追加し、通知項目の選択が可能になりました。",
      "スマホドットバッジ機能、通知パネル連携を実装しました。",
      "バージョンアップ情報の表示を役職に合わせて最適化しました。"
    ],
    roleRequired: "AM"
  },
  {
    version: "3.9.1",
    date: "2026-03-26",
    title: "UI/UX 改善",
    content: [
      "カレンダーのプロジェクト表示を期間帯（バンド）形式に変更しました。",
      "担当者選択時に AM/BM のみが候補に出るようにフィルタリングを強化しました。",
      "タスクに時間の指定ができるようになりました。"
    ],
    roleRequired: "all"
  },
  {
    version: "3.8.0",
    date: "2026-03-20",
    title: "基盤システムアップデート",
    content: [
      "Google スプレッドシートとの連携を高速化しました。",
      "オフライン時のデータキャッシュ機能を実装しました。",
      "RPGテーマのビジュアルを刷新しました。"
    ],
    roleRequired: "all"
  }
];

export function VersionInfo({ user, onBack }: VersionInfoProps) {
  const filteredUpdates = UPDATES.filter(update => {
    if (update.roleRequired === "all") return true;
    if (update.roleRequired === "AM" || update.roleRequired === "BM") {
      return user.Role === "AM" || user.Role === "BM";
    }
    return user.Role === update.roleRequired;
  });

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 glass-card rounded-xl text-gray-400 hover:text-white transition-all">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold neon-text-blue font-display tracking-tight">バージョン情報</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-digital">System Updates</p>
        </div>
      </header>

      <div className="space-y-6">
        {filteredUpdates.map((update, index) => (
          <motion.section
            key={update.version}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-6 rounded-2xl border-l-4 border-neon-blue"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 neon-text-blue" />
                <h3 className="text-sm font-bold text-neon-blue uppercase tracking-widest font-display">v{update.version}</h3>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-500 font-digital">
                <Clock size={12} />
                {update.date}
              </div>
            </div>
            
            <h4 className="text-lg font-bold mb-3">{update.title}</h4>
            <ul className="space-y-2">
              {update.content.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
                  <CheckCircle size={14} className="mt-0.5 text-neon-blue shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            
            {update.roleRequired !== "all" && (
              <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2">
                <AlertCircle size={12} className="text-neon-orange" />
                <span className="text-[10px] text-neon-orange font-bold uppercase tracking-widest">
                  {update.roleRequired} 以上限定情報
                </span>
              </div>
            )}
          </motion.section>
        ))}

        <div className="p-4 text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-digital">BTTF App Version 3.9.2</p>
        </div>
      </div>
    </div>
  );
}
