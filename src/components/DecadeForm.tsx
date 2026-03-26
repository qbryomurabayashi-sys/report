import React, { useState } from "react";
import { motion } from "motion/react";
import { User } from "../App";
import { ChevronLeft, Send, ChartLine, Info, Plus, Trash2 } from "lucide-react";

interface DecadeFormProps {
  user: User;
  onBack: () => void;
}

interface TaskInput {
  Assignee: string;
  Deadline: string;
  Content: string;
}

export function DecadeForm({ user, onBack }: DecadeFormProps) {
  const [formData, setFormData] = useState({
    TargetDecade: "10日",
    AreaFact: "",
    CoachingRecord: "",
    SelfReflection: "",
  });
  const [tasks, setTasks] = useState<TaskInput[]>([]);
  const [lastReport, setLastReport] = useState<any>(null);
  const [isLoadingLastReport, setIsLoadingLastReport] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    const fetchLastReport = async () => {
      setIsLoadingLastReport(true);
      try {
        const response = await fetch(`/api/decadeReports?userId=${user.UserID}&role=${user.Role}`);
        const data = await response.json();
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
      const response = await fetch("/api/saveDecadeReport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, UserID: user.UserID }),
      });
      const data = await response.json();
      
      // Save tasks if any
      for (const task of tasks) {
        if (task.Content && task.Deadline && task.Assignee) {
          await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assignee: task.Assignee,
              deadline: task.Deadline,
              content: task.Content,
              status: "pending"
            })
          });
        }
      }

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

  const addTask = () => {
    setTasks([...tasks, { Assignee: user.Name, Deadline: "", Content: "" }]);
  };

  const updateTask = (index: number, field: keyof TaskInput, value: string) => {
    const newTasks = [...tasks];
    newTasks[index][field] = value;
    setTasks(newTasks);
  };

  const removeTask = (index: number) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
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

      {/* Previous Decade Context */}
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
              <h3 className="text-[10px] font-digital text-neon-orange uppercase tracking-[0.2em]">前回の振り返り</h3>
            </div>
            <span className="text-[8px] font-digital text-gray-600">{lastReport.TargetDecade} の報告</span>
          </div>
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                <label className="text-[8px] text-gray-600 uppercase tracking-widest block mb-1">エリアファクト</label>
                <p className="text-xs text-gray-300 whitespace-pre-wrap">{lastReport.AreaFact || "なし"}</p>
              </div>
              <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                <label className="text-[8px] text-gray-600 uppercase tracking-widest block mb-1">コーチング記録</label>
                <p className="text-xs text-gray-300 whitespace-pre-wrap">{lastReport.CoachingRecord || "なし"}</p>
              </div>
              <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                <label className="text-[8px] text-gray-600 uppercase tracking-widest block mb-1">1つの実験（振り返り）</label>
                <p className="text-xs text-gray-300 whitespace-pre-wrap">{lastReport.SelfReflection || "なし"}</p>
              </div>
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
          {/* Section 4: Tasks */}
          <div className="p-6 glass-card rounded-2xl border-l-4 border-neon-purple bg-neon-purple/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-neon-purple flex items-center gap-2">
                <span className="bg-neon-purple text-black px-2 py-0.5 rounded text-[10px] font-digital">04</span>
                やることリスト（タスク化）
              </h3>
              <button
                type="button"
                onClick={addTask}
                className="flex items-center gap-1 text-[10px] text-neon-purple hover:text-white transition-colors bg-neon-purple/20 px-2 py-1 rounded"
              >
                <Plus size={12} /> 追加
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-[9px] text-gray-400 leading-relaxed mb-3">
                ここで入力したタスクは、タスク管理画面とカレンダーに自動で同期されます。
              </p>
              
              {tasks.length === 0 ? (
                <div className="text-center text-gray-500 text-[10px] py-4 border border-dashed border-gray-700 rounded-lg">
                  タスクを追加してください
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task, index) => (
                    <div key={index} className="bg-black/40 p-3 rounded-xl border border-white/10 relative group">
                      <button
                        type="button"
                        onClick={() => removeTask(index)}
                        className="absolute -top-2 -right-2 bg-red-500/20 text-red-400 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 size={12} />
                      </button>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="block text-[8px] text-gray-500 mb-1">誰が</label>
                          <input
                            type="text"
                            value={task.Assignee}
                            onChange={(e) => updateTask(index, "Assignee", e.target.value)}
                            className="w-full bg-black/50 border border-gray-800 rounded p-2 text-[10px] text-white focus:border-neon-purple outline-none"
                            placeholder="担当者"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] text-gray-500 mb-1">いつまでに</label>
                          <input
                            type="date"
                            value={task.Deadline}
                            onChange={(e) => updateTask(index, "Deadline", e.target.value)}
                            className="w-full bg-black/50 border border-gray-800 rounded p-2 text-[10px] text-white focus:border-neon-purple outline-none"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[8px] text-gray-500 mb-1">何を</label>
                        <input
                          type="text"
                          value={task.Content}
                          onChange={(e) => updateTask(index, "Content", e.target.value)}
                          className="w-full bg-black/50 border border-gray-800 rounded p-2 text-[10px] text-white focus:border-neon-purple outline-none"
                          placeholder="タスク内容"
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
