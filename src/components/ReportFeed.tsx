import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "../App";
import { ChevronLeft, MessageSquare, Send, User as UserIcon, Calendar, Heart } from "lucide-react";

interface ReportFeedProps {
  user: User;
  onBack: () => void;
}

type ReportType = "weekly" | "decade";

export function ReportFeed({ user, onBack }: ReportFeedProps) {
  const [reportType, setReportType] = useState<ReportType>("weekly");
  const [filter, setFilter] = useState<"all" | "mine" | "others">("all");
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);

   const fetchReports = async () => {
    setIsLoading(true);
    try {
      const endpoint = reportType === "weekly" ? "/api/weeklyReports" : "/api/decadeReports";
      const response = await fetch(`${endpoint}?userId=${user.UserID}&role=${user.Role}`);
      const data = await response.json();
      console.log(`Fetched ${data.length} ${reportType} reports:`, data);
      setReports(data);
    } catch (err) {
      console.error("Fetch reports failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user.Role === "店長") {
      setReportType("weekly");
    }
    fetchReports();
    setSelectedReport(null);
    setComment("");
  }, [user, reportType]);

  const filteredReports = reports.filter(r => {
    if (filter === "mine") return String(r.UserID) === String(user.UserID);
    if (filter === "others") return String(r.UserID) !== String(user.UserID);
    return true;
  });

  const handleSaveComment = async () => {
    if (!selectedReport || !comment) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/addComment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: selectedReport.ReportID,
          userId: user.UserID,
          role: user.Role,
          text: comment
        }),
      });
      const data = await response.json();
      if (data.success) {
        setComment("");
        fetchReports();
      }
    } catch (err) {
      alert("保存に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLike = async (reportId: string) => {
    console.log("Toggling like for ReportID:", reportId, "UserID:", user.UserID);
    try {
      const response = await fetch("/api/toggleLike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, userId: user.UserID }),
      });
      const data = await response.json();
      console.log("Toggle like response:", data);
      if (data.success) {
        fetchReports();
      }
    } catch (err) {
      console.error("Like failed:", err);
    }
  };

  const handleSaveWeeklyComment = async () => {
    if (!selectedReport || !comment) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/saveComment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: selectedReport.ReportID,
          comment,
          role: user.Role,
          userId: user.UserID
        }),
      });
      const data = await response.json();
      if (data.success) {
        setComment("");
        fetchReports();
      }
    } catch (err) {
      alert("保存に失敗しました");
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
          <h2 className="text-xl font-bold neon-text-blue font-display tracking-tight">履歴・フィード</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-digital">みんなの報告を見る</p>
        </div>
        <button 
          onClick={fetchReports}
          className="ml-auto p-2 glass-card rounded-lg text-gray-500 hover:text-neon-blue transition-all"
          title="更新"
        >
          <motion.div whileTap={{ rotate: 180 }}>
            <Calendar size={18} />
          </motion.div>
        </button>
      </header>

      {/* Type Toggle - Show for AM and BM */}
      {user.Role !== "店長" && (
        <div className="flex gap-2 mb-8 bg-black/40 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setReportType("weekly")}
            className={`flex-1 py-3 rounded-lg text-[10px] font-digital uppercase tracking-widest transition-all ${reportType === "weekly" ? "bg-neon-blue text-black shadow-[0_0_15px_rgba(0,243,255,0.4)]" : "text-gray-500 hover:text-gray-300"}`}
          >
            店長の週報
          </button>
          <button
            onClick={() => setReportType("decade")}
            className={`flex-1 py-3 rounded-lg text-[10px] font-digital uppercase tracking-widest transition-all ${reportType === "decade" ? "bg-neon-orange text-black shadow-[0_0_15px_rgba(255,157,0,0.4)]" : "text-gray-500 hover:text-gray-300"}`}
          >
            AMの旬報
          </button>
        </div>
      )}

      {/* If Store Manager, show a simple title */}
      {user.Role === "店長" && (
        <div className="mb-6 px-2">
          <h3 className="text-[10px] font-digital text-neon-blue uppercase tracking-[0.2em]">店長の週報フィード</h3>
        </div>
      )}

      {/* Filter Toggle - Only show if the user has their own reports in this view */}
      {user.Role === "店長" && reportType === "weekly" && (
        <div className="flex gap-2 mb-6 bg-black/20 p-1 rounded-lg border border-white/5">
          {[
            { id: "all", label: "すべて" },
            { id: "mine", label: "自分" },
            { id: "others", label: "他の方" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`flex-1 py-2 rounded-md text-[10px] font-digital uppercase tracking-widest transition-all ${
                filter === f.id
                  ? "bg-white/10 text-white shadow-inner"
                  : "text-gray-600 hover:text-gray-400"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
      
      {/* For AM viewing Store Manager reports, only show "All" filter. */}
      {user.Role === "AM" && reportType === "weekly" && (
        <div className="flex gap-2 mb-6 bg-black/20 p-1 rounded-lg border border-white/5">
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 py-2 rounded-md text-[10px] font-digital uppercase tracking-widest transition-all bg-white/10 text-white shadow-inner`}
          >
            すべて
          </button>
        </div>
      )}
      {user.Role === "AM" && reportType === "decade" && (
          <div className="mb-6 px-2">
            <h3 className="text-[10px] font-digital text-neon-orange uppercase tracking-[0.2em]">AMの旬報フィード</h3>
          </div>
      )}
      {user.Role === "BM" && reportType === "weekly" && (
          <div className="mb-6 px-2">
            <h3 className="text-[10px] font-digital text-neon-blue uppercase tracking-[0.2em]">店長の週報フィード</h3>
          </div>
      )}
      {user.Role === "BM" && reportType === "decade" && (
          <div className="mb-6 px-2">
            <h3 className="text-[10px] font-digital text-neon-orange uppercase tracking-[0.2em]">AMの旬報フィード</h3>
          </div>
      )}

      <div className="space-y-4">
        {filteredReports.length === 0 && (
          <div className="text-center py-20 text-gray-600 font-digital uppercase tracking-widest text-xs">
            まだ報告がありません
          </div>
        )}
        {filteredReports.map((report) => {
          const isMine = String(report.UserID) === String(user.UserID);
          const typeColor = reportType === "weekly" ? "neon-blue" : "neon-orange";
          const cardBorder = selectedReport?.ReportID === report.ReportID
            ? `border-${typeColor}`
            : isMine
              ? "border-neon-green"
              : `border-${typeColor}/20`;
          
          const cardBg = isMine 
            ? "bg-neon-green/10 shadow-[inset_0_0_20px_rgba(0,255,102,0.05)]" 
            : reportType === "weekly" 
              ? "bg-neon-blue/5 shadow-[inset_0_0_20px_rgba(0,243,255,0.03)]" 
              : "bg-neon-orange/5 shadow-[inset_0_0_20px_rgba(255,157,0,0.03)]";

          return (
            <motion.div
              key={report.ReportID}
              layout
              className={`glass-card rounded-2xl overflow-hidden border-l-4 transition-all duration-300 ${cardBorder} ${cardBg} ${selectedReport?.ReportID === report.ReportID ? "ring-1 ring-white/10" : ""}`}
            >
              <div 
                className="p-6 cursor-pointer hover:bg-white/5 transition-all"
                onClick={() => setSelectedReport(selectedReport?.ReportID === report.ReportID ? null : report)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <UserIcon size={14} className={isMine ? "text-neon-green" : (reportType === "weekly" ? "text-neon-blue" : "text-neon-orange")} />
                    <div className="flex flex-col">
                      <span className={`font-bold leading-none ${isMine ? "text-neon-green" : "text-gray-200"}`}>
                        {report.UserName} {isMine && "(自分)"}
                      </span>
                      <span className="text-[8px] text-gray-500 font-digital uppercase tracking-widest mt-1">{report.UserArea}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <Calendar size={12} className="text-gray-600" />
                      <span className="text-[10px] font-digital text-gray-600">
                        {reportType === "weekly" ? new Date(report.TargetDate).toLocaleDateString() : report.TargetDecade}
                      </span>
                    </div>
                    <span className={`text-[8px] font-digital uppercase tracking-widest px-2 py-0.5 rounded border ${isMine ? "border-neon-green/30 text-neon-green/70" : reportType === "weekly" ? "border-neon-blue/30 text-neon-blue/70" : "border-neon-orange/30 text-neon-orange/70"}`}>
                      {reportType === "weekly" ? "Weekly" : "Decade"}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 line-clamp-1">
                  {reportType === "weekly" ? report.Goal : report.AreaFact}
                </p>
                
                {/* Interaction Summary */}
                <div className="flex flex-wrap gap-4 mt-4 items-center">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleLike(report.ReportID);
                      }}
                      className="flex items-center gap-1 text-[10px] font-digital text-gray-500 hover:text-neon-red transition-all"
                    >
                      <Heart size={12} className={report.UserLiked ? "text-neon-red fill-neon-red" : "text-gray-700"} />
                      <span>{report.LikeCount || 0}</span>
                    </button>
                    {report.LikerNames && report.LikerNames.length > 0 && (
                      <div className="flex -space-x-1">
                        <span className="text-[8px] text-gray-600 font-digital ml-1">
                          {report.LikerNames.slice(0, 3).join(", ")}{report.LikerNames.length > 3 ? "..." : ""} が「いいね」
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {reportType === "weekly" ? (
                    <div className="flex gap-2">
                      {report.AM_Comment && (
                        <div className="flex items-center gap-1">
                          <MessageSquare size={10} className="text-neon-blue" />
                          <span className="text-[8px] text-neon-blue font-digital uppercase tracking-widest">
                            {report.AM_Comment_Name || 'AM'}がコメント
                          </span>
                        </div>
                      )}
                      {report.BM_Comment && (
                        <div className="flex items-center gap-1">
                          <MessageSquare size={10} className="text-neon-orange" />
                          <span className="text-[8px] text-neon-orange font-digital uppercase tracking-widest">
                            {report.BM_Comment_Name || 'BM'}がコメント
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] font-digital text-gray-500">
                      <MessageSquare size={12} className="text-gray-700" />
                      <span>{report.Comments?.length || 0}</span>
                    </div>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {selectedReport?.ReportID === report.ReportID && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-6 pb-6 pt-2 border-t border-white/5 space-y-6"
                  >
                    {reportType === "weekly" ? (
                      <div className="space-y-6 text-sm">
                        <div className="p-4 rounded-xl bg-neon-blue/5 border border-neon-blue/20">
                          <h4 className="text-[10px] text-neon-blue font-digital uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-1 h-1 bg-neon-blue rounded-full"></span>
                            今週の目標と結果
                          </h4>
                          <div className="space-y-3">
                            <section>
                              <label className="text-[8px] text-gray-500 uppercase tracking-widest block mb-1">・目標</label>
                              <p className="whitespace-pre-wrap text-gray-200">{report.Goal}</p>
                            </section>
                            <section>
                              <label className="text-[8px] text-gray-500 uppercase tracking-widest block mb-1">★結果</label>
                              <p className="whitespace-pre-wrap text-gray-200">{report.Result}</p>
                            </section>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-neon-green/5 border border-neon-green/20">
                          <h4 className="text-[10px] text-neon-green font-digital uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-1 h-1 bg-neon-green rounded-full"></span>
                            今週の振り返り
                          </h4>
                          <div className="space-y-3">
                            <section>
                              <label className="text-[8px] text-gray-500 uppercase tracking-widest block mb-1">★【＋】良かった点・成果</label>
                              <p className="whitespace-pre-wrap text-gray-200">{report.ReviewPlus}</p>
                            </section>
                            <section>
                              <label className="text-[8px] text-gray-500 uppercase tracking-widest block mb-1">★【－】課題と気づき</label>
                              <p className="whitespace-pre-wrap text-gray-200">{report.ReviewMinus}</p>
                            </section>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-neon-orange/5 border border-neon-orange/20">
                          <h4 className="text-[10px] text-neon-orange font-digital uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-1 h-1 bg-neon-orange rounded-full"></span>
                            次週のアクション
                          </h4>
                          <div className="space-y-3">
                            <section>
                              <label className="text-[8px] text-gray-500 uppercase tracking-widest block mb-1">★目的</label>
                              <p className="whitespace-pre-wrap text-gray-200">{report.NextActionPurpose}</p>
                            </section>
                            <section>
                              <label className="text-[8px] text-gray-500 uppercase tracking-widest block mb-1">★具体的な行動</label>
                              <p className="whitespace-pre-wrap text-gray-200">{report.NextActionDetail}</p>
                            </section>
                          </div>
                        </div>

                        {report.Consultation && (
                          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <h4 className="text-[10px] text-gray-400 font-digital uppercase tracking-widest mb-3 flex items-center gap-2">
                              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                              相談・共有事項
                            </h4>
                            <p className="whitespace-pre-wrap text-gray-300">{report.Consultation}</p>
                          </div>
                        )}
                        
                        {/* AM/BM Comments Display */}
                        {(report.AM_Comment || report.BM_Comment) && (
                          <div className="space-y-3 pt-4 border-t border-white/5">
                            <h4 className="text-[10px] font-digital uppercase tracking-widest text-gray-500">フィードバック</h4>
                            {report.AM_Comment && (
                              <div className="bg-neon-blue/5 p-3 rounded-xl border border-neon-blue/20">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-bold text-neon-blue">
                                    {report.AM_Comment_Name || 'AM'}からのアドバイス
                                  </span>
                                </div>
                                <p className="text-xs text-gray-300">{report.AM_Comment}</p>
                              </div>
                            )}
                            {report.BM_Comment && (
                              <div className="bg-neon-orange/5 p-3 rounded-xl border border-neon-orange/20">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-bold text-neon-orange">
                                    {report.BM_Comment_Name || 'BM'}からのアドバイス
                                  </span>
                                </div>
                                <p className="text-xs text-gray-300">{report.BM_Comment}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Weekly Interactions */}
                        <div className="pt-6 border-t border-white/5 space-y-6">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleLike(report.ReportID);
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${report.UserLiked ? "bg-neon-red/10 border-neon-red text-neon-red" : "border-gray-800 text-gray-500 hover:border-gray-700"}`}
                              >
                                <Heart size={16} className={report.UserLiked ? "fill-neon-red" : ""} />
                                <span className="text-xs font-digital">{report.LikeCount || 0}</span>
                              </button>
                            </div>
                            {report.LikerNames && report.LikerNames.length > 0 && (
                              <p className="text-[10px] text-gray-500 font-digital ml-2">
                                いいねした人: {report.LikerNames.join(", ")}
                              </p>
                            )}
                          </div>
                        </div>

                      {/* Weekly Comments (AM/BM Only) */}
                      {(user.Role === "AM" || user.Role === "BM") && (
                        <div className="pt-6 border-t border-white/5">
                          <label className="text-[10px] text-neon-orange font-digital uppercase tracking-widest block mb-2">SBIフィードバック（改善のアドバイス） ({user.Role})</label>
                          <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full bg-black/50 border border-gray-800 rounded-lg p-4 focus:border-neon-orange outline-none transition-all h-24 text-gray-200 text-sm"
                            placeholder="フィードバックを記入してください"
                          />
                          <button
                            onClick={handleSaveWeeklyComment}
                            disabled={isLoading || !comment}
                            className="mt-4 w-full bg-transparent border border-neon-orange text-neon-orange py-3 rounded-xl font-bold uppercase tracking-[0.2em] hover:bg-neon-orange hover:text-black transition-all disabled:opacity-50 font-digital flex items-center justify-center gap-2 text-xs"
                          >
                            <Send size={14} />
                            フィードバックを保存
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                      <div className="space-y-6">
                        <div className="space-y-4 text-sm">
                          <section>
                            <label className="text-[10px] text-neon-orange font-digital uppercase tracking-widest block mb-1">状況把握：事実（Fact）のみ</label>
                            <p className="whitespace-pre-wrap text-gray-200">{report.AreaFact}</p>
                          </section>
                          <section>
                            <label className="text-[10px] text-neon-orange font-digital uppercase tracking-widest block mb-1">店長への「伴走・育成」実績</label>
                            <p className="whitespace-pre-wrap text-gray-200">{report.CoachingRecord}</p>
                          </section>
                          <section>
                            <label className="text-[10px] text-neon-orange font-digital uppercase tracking-widest block mb-1">自己責任100%の振り返りと1つの実験</label>
                            <p className="whitespace-pre-wrap text-gray-200">{report.SelfReflection}</p>
                          </section>
                        </div>

                      {/* Decade Interactions */}
                      <div className="pt-6 border-t border-white/5 space-y-6">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleLike(report.ReportID);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${report.UserLiked ? "bg-neon-red/10 border-neon-red text-neon-red" : "border-gray-800 text-gray-500 hover:border-gray-700"}`}
                          >
                            <Heart size={16} className={report.UserLiked ? "fill-neon-red" : ""} />
                            <span className="text-xs font-digital">{report.LikeCount || 0}</span>
                          </button>
                        </div>
                        {report.LikerNames && report.LikerNames.length > 0 && (
                          <p className="text-[10px] text-gray-500 font-digital ml-2">
                            いいねした人: {report.LikerNames.join(", ")}
                          </p>
                        )}

                        {/* Comments List */}
                        <div className="space-y-4">
                          {report.Comments?.map((c: any) => (
                            <div key={c.CommentID} className="bg-white/5 p-3 rounded-xl border border-white/5">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-neon-blue">{c.UserName} ({c.Role})</span>
                                <span className="text-[8px] font-digital text-gray-600">{new Date(c.CreatedAt).toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-gray-300">{c.Text}</p>
                            </div>
                          ))}
                        </div>

                        {/* Add Comment */}
                        <div className="flex gap-2">
                          <input
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="flex-1 bg-black/50 border border-gray-800 rounded-lg px-4 py-2 focus:border-neon-blue outline-none transition-all text-xs text-gray-200"
                            placeholder="コメントを追加..."
                          />
                          <button
                            onClick={handleSaveComment}
                            disabled={isLoading || !comment}
                            className="p-2 bg-neon-blue text-black rounded-lg hover:shadow-[0_0_10px_rgba(0,243,255,0.4)] transition-all disabled:opacity-50"
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
      </div>
    </div>
  );
}
