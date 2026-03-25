import React, { useState } from "react";
import { motion } from "motion/react";
import { User } from "../App";
import { ChevronLeft, Send, ChartLine } from "lucide-react";

interface DecadeFormProps {
  user: User;
  onBack: () => void;
}

export function DecadeForm({ user, onBack }: DecadeFormProps) {
  const [formData, setFormData] = useState({
    TargetDecade: "10日",
    AreaFact: "",
    CoachingRecord: "",
    SelfReflection: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("/api/saveDecadeReport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, UserID: user.UserID }),
      });
      const data = await response.json();
      if (data.success) {
        alert("旬報を送信しました");
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
        <button onClick={onBack} className="p-3 glass-card rounded-xl text-gray-500 hover:text-neon-orange transition-all">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold neon-text-orange font-display tracking-tight">AM旬報作成</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-digital">AM用：10日ごとの報告</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-2">
          <label className="block text-[10px] font-digital text-gray-500 uppercase tracking-[0.2em] ml-1">対象（日）</label>
          <select
            value={formData.TargetDecade}
            onChange={(e) => setFormData({ ...formData, TargetDecade: e.target.value })}
            className="w-full bg-black/50 border border-gray-800 rounded-lg p-4 focus:border-neon-orange outline-none transition-all font-digital text-neon-orange"
            required
          >
            <option value="10日">10日</option>
            <option value="20日">20日</option>
            <option value="30日">30日</option>
          </select>
        </div>

        <div className="space-y-6">
          {/* Section 1: Facts */}
          <div className="p-6 glass-card rounded-2xl border-l-4 border-neon-orange bg-neon-orange/5">
            <h3 className="text-xs font-bold text-neon-orange mb-4 flex items-center gap-2">
              <span className="bg-neon-orange text-black px-2 py-0.5 rounded text-[10px] font-digital">01</span>
              状況把握：事実（Fact）のみ
            </h3>
            <div className="space-y-2">
              <p className="text-[9px] text-gray-400 leading-relaxed mb-3">
                感情や推測を排除し、カメラに映る「事実（What・When・Who・Where）」だけをサクッと書きます。正確な状況把握が問題解決のスタートです。
              </p>
              <textarea
                value={formData.AreaFact}
                onChange={(e) => setFormData({ ...formData, AreaFact: e.target.value })}
                className="w-full bg-black/50 border border-gray-800 rounded-lg p-4 focus:border-neon-orange outline-none transition-all h-32 text-gray-200 text-sm"
                placeholder="・〇〇店、〇時頃に〇〇が発生&#10;・〇〇店長が〇〇を実施していた"
                required
              />
            </div>
          </div>

          {/* Section 2: Coaching/PDR */}
          <div className="p-6 glass-card rounded-2xl border-l-4 border-neon-blue bg-neon-blue/5">
            <h3 className="text-xs font-bold text-neon-blue mb-4 flex items-center gap-2">
              <span className="bg-neon-blue text-black px-2 py-0.5 rounded text-[10px] font-digital">02</span>
              店長への「伴走・育成」実績
            </h3>
            <div className="space-y-4">
              <div className="bg-black/40 p-3 rounded-xl border border-neon-blue/20 text-[9px] text-gray-400 space-y-2">
                <p className="font-bold text-neon-blue">【SBIフィードバックのコツ】</p>
                <p>S (Situation): いつ、どこで、どんな場面か</p>
                <p>B (Behavior): カメラで撮れる客観的な行動（主観NG）</p>
                <p>I (Impact): その行動がもたらした結果・影響</p>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-neon-blue/20 text-[9px] text-gray-400 space-y-2">
                <p className="font-bold text-neon-blue">【PDR（実行支援）のコツ】</p>
                <p>Planning: 部下と共にゴールを描く</p>
                <p>Doing: 放置せず「承認」と「問い」で伴走する</p>
                <p>Reviewing: プロセスからの「学習」に焦点を当てる</p>
              </div>
              <textarea
                value={formData.CoachingRecord}
                onChange={(e) => setFormData({ ...formData, CoachingRecord: e.target.value })}
                className="w-full bg-black/50 border border-gray-800 rounded-lg p-4 focus:border-neon-blue outline-none transition-all h-40 text-gray-200 text-sm"
                placeholder="店長への具体的なフィードバック実績を1件記入してください。&#10;例：〇〇店長へ、〇〇の行動(B)が〇〇の影響(I)を与えたことを伝えた。"
                required
              />
            </div>
          </div>

          {/* Section 3: Reflection & Experiment */}
          <div className="p-6 glass-card rounded-2xl border-l-4 border-neon-green bg-neon-green/5">
            <h3 className="text-xs font-bold text-neon-green mb-4 flex items-center gap-2">
              <span className="bg-neon-green text-black px-2 py-0.5 rounded text-[10px] font-digital">03</span>
              自己責任100%の振り返りと1つの実験
            </h3>
            <div className="space-y-2">
              <p className="text-[9px] text-gray-400 leading-relaxed mb-3">
                「問題の真の原因は自分にある」と考える自立型マインドセットを定着させます。その上で、来週試すことを「1つの実験」として気軽に行動に移します。
              </p>
              <textarea
                value={formData.SelfReflection}
                onChange={(e) => setFormData({ ...formData, SelfReflection: e.target.value })}
                className="w-full bg-black/50 border border-gray-800 rounded-lg p-4 focus:border-neon-green outline-none transition-all h-32 text-gray-200 text-sm"
                placeholder="気づき（自己責任）：&#10;来週の実験： "
                required
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-transparent border border-neon-orange text-neon-orange py-6 rounded-2xl font-bold uppercase tracking-[0.3em] hover:bg-neon-orange hover:text-black transition-all hover:shadow-[0_0_20px_#ff9d00] disabled:opacity-50 font-digital flex items-center justify-center gap-4"
        >
          <Send size={20} />
          {isLoading ? "送信中..." : "旬報を送信する"}
        </button>
      </form>
    </div>
  );
}
