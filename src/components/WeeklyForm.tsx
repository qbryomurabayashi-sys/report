import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { User } from "../App";
import { ChevronLeft, Send, Info, MessageSquare, Calendar } from "lucide-react";

interface WeeklyFormProps {
  user: User;
  onBack: () => void;
}

export function WeeklyForm({ user, onBack }: WeeklyFormProps) {
  const [formData, setFormData] = useState({
    TargetDate: new Date().toISOString().split("T")[0],
    Goal: "",
    Result: "",
    ReviewPlus: "",
    ReviewMinus: "",
    NextActionPurpose: "",
    NextActionDetail: "",
    Consultation: "",
  });
  const [lastReport, setLastReport] = useState<any>(null);
  const [isLoadingLastReport, setIsLoadingLastReport] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchLastReport = async () => {
      setIsLoadingLastReport(true);
      try {
        const response = await fetch(`/api/weeklyReports?userId=${user.UserID}&role=${user.Role}`);
        const data = await response.json();
        // 自分自身の最新の報告を探す
        const myReports = data.filter((r: any) => String(r.UserID) === String(user.UserID));
        if (myReports.length > 0) {
          setLastReport(myReports[0]);
        }
      } catch (err) {
        console.error("Failed to fetch last report:", err);
      } finally {
        setIsLoadingLastReport(false);
      }
    };
    fetchLastReport();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("/api/saveWeeklyReport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, UserID: user.UserID }),
      });
      const data = await response.json();
      if (data.success) {
        alert("週報を送信しました");
        onBack();
      }
    } catch (err) {
      alert("送信に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 pt-8 pb-32 max-w-2xl">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-3 glass-card rounded-xl text-gray-500 hover:text-neon-blue transition-all">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold neon-text-blue font-display tracking-tight">週報作成</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-digital">店長用：1週間の報告</p>
        </div>
      </header>

      <div className="mb-8 p-4 glass-card rounded-xl border-l-4 border-gray-600 italic text-gray-400 text-sm">
        <p>❏週間報告</p>
        <p>お疲れ様です！今週の業務報告です</p>
      </div>

      {/* Previous Week Context */}
      {isLoadingLastReport ? (
        <div className="glass-card p-6 rounded-2xl mb-8 border-l-4 border-gray-600 animate-pulse">
          <p className="text-[10px] font-digital text-gray-500 uppercase tracking-[0.2em]">前回の履歴を取得中...</p>
        </div>
      ) : lastReport ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 rounded-2xl mb-8 border-l-4 border-neon-orange"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Info size={14} className="text-neon-orange" />
              <h3 className="text-[10px] font-digital text-neon-orange uppercase tracking-[0.2em]">前回の報告内容</h3>
            </div>
            <span className="text-[8px] font-digital text-gray-600">{new Date(lastReport.TargetDate).toLocaleDateString()} の報告</span>
          </div>
          
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                <label className="text-[8px] text-gray-600 uppercase tracking-widest block mb-1">目標</label>
                <p className="text-xs text-gray-300 whitespace-pre-wrap">{lastReport.Goal || "なし"}</p>
              </div>
              <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                <label className="text-[8px] text-gray-600 uppercase tracking-widest block mb-1">結果</label>
                <p className="text-xs text-gray-300 whitespace-pre-wrap">{lastReport.Result || "なし"}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                  <label className="text-[8px] text-gray-600 uppercase tracking-widest block mb-1">良かった点・成果</label>
                  <p className="text-xs text-gray-300 whitespace-pre-wrap">{lastReport.ReviewPlus || "なし"}</p>
                </div>
                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                  <label className="text-[8px] text-gray-600 uppercase tracking-widest block mb-1">課題と気づき</label>
                  <p className="text-xs text-gray-300 whitespace-pre-wrap">{lastReport.ReviewMinus || "なし"}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                  <label className="text-[8px] text-gray-600 uppercase tracking-widest block mb-1">次週の目的</label>
                  <p className="text-xs text-gray-300 whitespace-pre-wrap">{lastReport.NextActionPurpose || "なし"}</p>
                </div>
                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                  <label className="text-[8px] text-gray-600 uppercase tracking-widest block mb-1">具体的な行動</label>
                  <p className="text-xs text-gray-300 whitespace-pre-wrap">{lastReport.NextActionDetail || "なし"}</p>
                </div>
              </div>
              {lastReport.Consultation && (
                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                  <label className="text-[8px] text-gray-600 uppercase tracking-widest block mb-1">相談・共有事項</label>
                  <p className="text-xs text-gray-300 whitespace-pre-wrap">{lastReport.Consultation}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="glass-card p-4 rounded-xl mb-8 border-l-4 border-gray-800 text-gray-600 text-[10px] font-digital uppercase tracking-widest">
          前回の報告履歴はありません
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-2">
          <label className="block text-[10px] font-digital text-gray-500 uppercase tracking-[0.2em] ml-1">対象週</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neon-blue pointer-events-none" size={18} />
            <input
              type="date"
              value={formData.TargetDate}
              onChange={(e) => setFormData({ ...formData, TargetDate: e.target.value })}
              className="w-full bg-black/50 border border-gray-800 rounded-lg py-4 pl-12 pr-4 focus:border-neon-blue outline-none transition-all font-digital text-neon-blue"
              required
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 glass-card rounded-2xl border-l-4 border-neon-blue bg-neon-blue/5">
            <h3 className="text-xs font-bold text-neon-blue mb-4 flex items-center gap-2">
              <span className="bg-neon-blue text-black px-2 py-0.5 rounded text-[10px] font-digital">01</span>
              今週の目標と結果
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="block text-[10px] font-digital text-gray-400 uppercase tracking-widest ml-1">・目標</label>
                  <span className="text-[8px] text-gray-600 font-sans">計画の立案と管理スキルを養います</span>
                </div>
                <textarea
                  value={formData.Goal}
                  onChange={(e) => setFormData({ ...formData, Goal: e.target.value })}
                  className="w-full bg-black/50 border border-gray-800 rounded-lg p-4 focus:border-neon-blue outline-none transition-all h-24 text-gray-200 text-sm"
                  placeholder="・今週の具体的な目標を記入してください"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="block text-[10px] font-digital text-gray-400 uppercase tracking-widest ml-1">★結果</label>
                  <span className="text-[8px] text-gray-600 font-sans">客観的な「自己評価」の習慣をつけます</span>
                </div>
                <textarea
                  value={formData.Result}
                  onChange={(e) => setFormData({ ...formData, Result: e.target.value })}
                  className="w-full bg-black/50 border border-gray-800 rounded-lg p-4 focus:border-neon-blue outline-none transition-all h-24 text-gray-200 text-sm"
                  placeholder="・目標に対する達成度と結果を記入してください"
                  required
                />
              </div>
            </div>
          </div>

          <div className="p-6 glass-card rounded-2xl border-l-4 border-neon-green bg-neon-green/5">
            <h3 className="text-xs font-bold text-neon-green mb-4 flex items-center gap-2">
              <span className="bg-neon-green text-black px-2 py-0.5 rounded text-[10px] font-digital">02</span>
              今週の振り返り
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="block text-[10px] font-digital text-gray-400 uppercase tracking-widest ml-1">★【＋】良かった点・成果（プラス志向）</label>
                </div>
                <p className="text-[8px] text-gray-600 font-sans ml-1 mb-1">どんな状況でも前向きに捉え、成長の機会とする視点。スタッフの承認も忘れずに。</p>
                <textarea
                  value={formData.ReviewPlus}
                  onChange={(e) => setFormData({ ...formData, ReviewPlus: e.target.value })}
                  className="w-full bg-black/50 border border-gray-800 rounded-lg p-4 focus:border-neon-green outline-none transition-all h-24 text-gray-200 text-sm"
                  placeholder="・成果や良かった行動（複数回答可）"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="block text-[10px] font-digital text-gray-400 uppercase tracking-widest ml-1">★【－】課題と気づき（相手側からの視点など）</label>
                </div>
                <p className="text-[8px] text-gray-600 font-sans ml-1 mb-1">お客様やスタッフの立場で考え、他責にせず「自分ごと」として捉える姿勢。</p>
                <textarea
                  value={formData.ReviewMinus}
                  onChange={(e) => setFormData({ ...formData, ReviewMinus: e.target.value })}
                  className="w-full bg-black/50 border border-gray-800 rounded-lg p-4 focus:border-neon-green outline-none transition-all h-24 text-gray-200 text-sm"
                  placeholder="・課題や根本原因への気づき（複数回答可）"
                  required
                />
              </div>
            </div>
          </div>

          <div className="p-6 glass-card rounded-2xl border-l-4 border-neon-orange bg-neon-orange/5">
            <h3 className="text-xs font-bold text-neon-orange mb-4 flex items-center gap-2">
              <span className="bg-neon-orange text-black px-2 py-0.5 rounded text-[10px] font-digital">03</span>
              次週のアクション
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="block text-[10px] font-digital text-gray-400 uppercase tracking-widest ml-1">★目的（何のために）</label>
                  <span className="text-[8px] text-gray-600 font-sans">「目的思考」を明確にします</span>
                </div>
                <input
                  type="text"
                  value={formData.NextActionPurpose}
                  onChange={(e) => setFormData({ ...formData, NextActionPurpose: e.target.value })}
                  className="w-full bg-black/50 border border-gray-800 rounded-lg p-4 focus:border-neon-orange outline-none transition-all text-gray-200 text-sm"
                  placeholder="・何のためにそのアクションを行うのか"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="block text-[10px] font-digital text-gray-400 uppercase tracking-widest ml-1">★具体的な行動（どう進めるか）</label>
                  <span className="text-[8px] text-gray-600 font-sans">「仕事の組み立て」を自ら宣言します</span>
                </div>
                <textarea
                  value={formData.NextActionDetail}
                  onChange={(e) => setFormData({ ...formData, NextActionDetail: e.target.value })}
                  className="w-full bg-black/50 border border-gray-800 rounded-lg p-4 focus:border-neon-orange outline-none transition-all h-24 text-gray-200 text-sm"
                  placeholder="・目標達成のために業務をどう分解して進めるか"
                  required
                />
              </div>
            </div>
          </div>

          <div className="p-6 glass-card rounded-2xl border-l-4 border-gray-700">
            <h3 className="text-xs font-bold text-gray-400 mb-4 flex items-center gap-2">
              <span className="bg-gray-700 text-white px-2 py-0.5 rounded text-[10px] font-digital">04</span>
              相談・共有事項
            </h3>
            <div className="space-y-2">
              <p className="text-[8px] text-gray-600 font-sans ml-1 mb-1">一人で抱え込まず、適切な報告・連絡・相談を。</p>
              <textarea
                value={formData.Consultation}
                onChange={(e) => setFormData({ ...formData, Consultation: e.target.value })}
                className="w-full bg-black/50 border border-gray-800 rounded-lg p-4 focus:border-gray-700 outline-none transition-all h-24 text-gray-200 text-sm"
                placeholder="・相談したいことや共有しておきたいこと"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-transparent border border-neon-blue text-neon-blue py-6 rounded-2xl font-bold uppercase tracking-[0.3em] hover:bg-neon-blue hover:text-black transition-all hover:shadow-[0_0_20px_#00f3ff] disabled:opacity-50 font-digital flex items-center justify-center gap-4"
        >
          <Send size={20} />
          {isLoading ? "送信中..." : "報告を送信する"}
        </button>
      </form>
    </div>
  );
}
