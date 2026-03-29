import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "../types";
import { ChevronLeft, MessageSquare, Send, User as UserIcon, Calendar, Heart, RefreshCw } from "lucide-react";

interface ReportFeedProps {
  user: User;
  onBack: () => void;
}

type ReportType = "weekly" | "decade" | "am_status";

const formatText = (text: string | undefined | null) => {
  if (!text) return "";
  return text.split('\n').map((line, i) => (
    <React.Fragment key={i}>
      {line}
      <br />
    </React.Fragment>
  ));
};

export function ReportFeed({ user, onBack }: ReportFeedProps) {
  const [reportType, setReportType] = useState<ReportType>("am_status");
  const [filter, setFilter] = useState<"all" | "mine" | "others">("all");
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [comment, setComment] = useState("");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

    const fetchReports = async (refresh = false) => {
    setIsLoading(true);
    setError("");
    try {
      let endpoint = "";
      if (reportType === "weekly") endpoint = "/api/weeklyReports";
      else if (reportType === "decade") endpoint = "/api/decadeReports";
      else if (reportType === "am_status") endpoint = "/api/amStatusReports";

      const response = await fetch(`${endpoint}?userId=${user.UserID}&role=${user.Role}&area=${encodeURIComponent(user.Area || "")}${refresh ? "&refresh=true" : ""}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || "データの取得に失敗しました");
      }
      
      if (!Array.isArray(data)) {
        console.error(`Expected array but got:`, data);
        setReports([]);
        setError("データの形式が正しくありません。GASの設定を確認してください。");
        return;
      }

      console.log(`Fetched ${data.length} ${reportType} reports:`, data);
      setReports(data);
    } catch (err: any) {
      console.error("Fetch reports failed:", err);
      setError(err.message);
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user.Role === "店長") {
      setReportType("weekly");
    } else {
      setReportType("am_status");
    }
  }, [user]);

  useEffect(() => {
    fetchReports();
    setSelectedReport(null);
    setComment("");
  }, [reportType]);

  const filteredReports = Array.isArray(reports) ? reports.filter(r => {
    if (filter === "mine") return String(r.UserID) === String(user.UserID);
    if (filter === "others") return String(r.UserID) !== String(user.UserID);
    return true;
  }) : [];

  const handleSaveComment = async () => {
    if (!selectedReport || !comment) return;
    
    const reportId = selectedReport.ReportID;
    const commentText = comment;
    
    // Optimistic update
    setReports(prev => prev.map(r => {
      if (String(r.ReportID) === String(reportId)) {
        const newComment = {
          CommentID: "temp-" + Date.now(),
          ReportID: reportId,
          UserID: user.UserID,
          UserName: user.Name,
          Role: user.Role,
          Text: commentText,
          CreatedAt: new Date().toISOString()
        };
        return {
          ...r,
          Comments: [...(r.Comments || []), newComment]
        };
      }
      return r;
    }));
    setComment("");

    setIsLoading(true);
    try {
      const response = await fetch("/api/addComment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: reportId,
          userId: user.UserID,
          role: user.Role,
          comment: commentText
        }),
      });
      const data = await response.json();
      if (!data.success) {
        fetchReports(); // Rollback
      }
    } catch (err) {
      alert("保存に失敗しました");
      fetchReports(); // Rollback
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLike = async (reportId: string) => {
    // Optimistic update
    setReports(prev => prev.map(r => {
      if (String(r.ReportID) === String(reportId)) {
        const newUserLiked = !r.UserLiked;
        return {
          ...r,
          UserLiked: newUserLiked,
          LikeCount: newUserLiked ? (Number(r.LikeCount || 0) + 1) : Math.max(0, Number(r.LikeCount || 0) - 1),
          LikerNames: newUserLiked 
            ? [...(r.LikerNames || []), user.Name]
            : (r.LikerNames || []).filter((name: string) => name !== user.Name)
        };
      }
      return r;
    }));

    try {
      const response = await fetch("/api/toggleLike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, userId: user.UserID, type: reportType }),
      });
      const data = await response.json();
      if (!data.success) {
        fetchReports(); // Rollback
      }
    } catch (err) {
      console.error("Like failed:", err);
      fetchReports(); // Rollback
    }
  };

  const handleSaveFeedback = async (type: 'weekly' | 'decade' = 'weekly') => {
    if (!selectedReport || !feedbackComment) return;
    
    const reportId = selectedReport.ReportID;
    const commentText = feedbackComment;
    const role = user.Role;
    
    // Optimistic update
    setReports(prev => prev.map(r => {
      if (String(r.ReportID) === String(reportId)) {
        if (type === 'weekly') {
          return {
            ...r,
            [role === 'AM' ? 'AM_Comment' : 'BM_Comment']: commentText,
            [role === 'AM' ? 'AM_Comment_Name' : 'BM_Comment_Name']: user.Name
          };
        } else {
          // For decade reports, feedback is just another comment in the list usually, 
          // or it might be a specific field. Looking at server.ts, it seems saveComment 
          // only handles weeklyReports for specific fields.
          // But let's assume it's a comment for now if it's not weekly.
          return r; 
        }
      }
      return r;
    }));
    setFeedbackComment("");

    setIsLoading(true);
    try {
      const response = await fetch("/api/saveComment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: reportId,
          comment: commentText,
          role: role,
          userId: user.UserID,
          type
        }),
      });
      const data = await response.json();
      if (!data.success) {
        fetchReports(); // Rollback
      }
    } catch (err) {
      alert("保存に失敗しました");
      fetchReports(); // Rollback
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
          onClick={() => fetchReports(true)}
          className="ml-auto p-2 glass-card rounded-lg text-gray-500 hover:text-neon-blue transition-all"
          title="更新"
        >
          <motion.div whileTap={{ rotate: 180 }}>
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </motion.div>
        </button>
      </header>

      {/* Type Toggle - Show for AM and BM */}
      {user.Role !== "店長" && (
        <div className="flex gap-2 mb-8 bg-black/40 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setReportType("am_status")}
            className={`flex-1 py-3 rounded-lg text-[10px] font-digital uppercase tracking-widest transition-all ${reportType === "am_status" ? "bg-neon-green text-black shadow-[0_0_15px_rgba(0,255,0,0.4)]" : "text-gray-500 hover:text-gray-300"}`}
          >
            AMの近況
          </button>
          <button
            onClick={() => setReportType("decade")}
            className={`flex-1 py-3 rounded-lg text-[10px] font-digital uppercase tracking-widest transition-all ${reportType === "decade" ? "bg-neon-orange text-black shadow-[0_0_15px_rgba(255,157,0,0.4)]" : "text-gray-500 hover:text-gray-300"}`}
          >
            AMの旬報
          </button>
          <button
            onClick={() => setReportType("weekly")}
            className={`flex-1 py-3 rounded-lg text-[10px] font-digital uppercase tracking-widest transition-all ${reportType === "weekly" ? "bg-neon-blue text-black shadow-[0_0_15px_rgba(0,243,255,0.4)]" : "text-gray-500 hover:text-gray-300"}`}
          >
            店長の週報
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
      {user.Role === "AM" && reportType === "am_status" && (
          <div className="mb-6 px-2">
            <h3 className="text-[10px] font-digital text-neon-green uppercase tracking-[0.2em]">AMの近況報告フィード</h3>
          </div>
      )}
      {user.Role === "AM" && reportType === "decade" && (
          <div className="mb-6 px-2">
            <h3 className="text-[10px] font-digital text-neon-orange uppercase tracking-[0.2em]">AMの旬報フィード</h3>
          </div>
      )}
      {user.Role === "BM" && reportType === "am_status" && (
          <div className="mb-6 px-2">
            <h3 className="text-[10px] font-digital text-neon-green uppercase tracking-[0.2em]">AMの近況報告フィード</h3>
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

      <div className="flex justify-end mb-4 px-2">
        <button
          onClick={() => fetchReports(true)}
          disabled={isLoading}
          className="text-[10px] font-digital uppercase tracking-widest text-gray-400 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10"
        >
          {isLoading ? (
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          )}
          更新
        </button>
      </div>

      <div className="space-y-4">
        {isLoading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-gray-600 font-digital uppercase tracking-widest text-xs animate-pulse">
              読み込み中... / LOADING...
            </div>
          </div>
        )}
        {error && !isLoading && (
          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-xs font-digital tracking-widest text-center">
            {error}
            <button 
              onClick={() => fetchReports(true)}
              className="block mx-auto mt-2 underline"
            >
              [ 再試行 / RETRY ]
            </button>
          </div>
        )}
        {!error && !isLoading && filteredReports.length === 0 && (
          <div className="text-center py-20 text-gray-600 font-digital uppercase tracking-widest text-xs">
            まだ報告がありません
          </div>
        )}
        {filteredReports.map((report) => {
          const isMine = String(report.UserID) === String(user.UserID);
          const typeColor = reportType === "weekly" ? "neon-blue" : reportType === "decade" ? "neon-orange" : "neon-green";
          const cardBorder = selectedReport?.ReportID === report.ReportID
            ? `border-${typeColor}`
            : isMine
              ? "border-neon-green"
              : `border-${typeColor}/20`;
          
          const cardBg = isMine 
            ? "bg-neon-green/10 shadow-[inset_0_0_20px_rgba(0,255,0,0.05)]" 
            : reportType === "weekly" 
              ? "bg-neon-blue/5 shadow-[inset_0_0_20px_rgba(0,243,255,0.03)]" 
              : reportType === "decade"
                ? "bg-neon-orange/5 shadow-[inset_0_0_20px_rgba(255,157,0,0.03)]"
                : "bg-neon-green/5 shadow-[inset_0_0_20px_rgba(0,255,0,0.03)]";

          return (
            <motion.div
              key={report.ReportID}
              layout
              className={`glass-card rounded-2xl overflow-hidden border-l-4 transition-all duration-300 ${cardBorder} ${cardBg} ${selectedReport?.ReportID === report.ReportID ? "ring-1 ring-white/10" : ""}`}
            >
              <div 
                className="p-6 cursor-pointer hover:bg-white/5 transition-all"
                onClick={() => {
                  setSelectedReport(selectedReport?.ReportID === report.ReportID ? null : report);
                  setComment("");
                  setFeedbackComment("");
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <UserIcon size={14} className={isMine ? "text-neon-green" : (reportType === "weekly" ? "text-neon-blue" : reportType === "decade" ? "text-neon-orange" : "text-neon-green")} />
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
                        {reportType === "weekly" 
                          ? (isNaN(new Date(report.TargetDate).getTime()) ? "日付不明" : new Date(report.TargetDate).toLocaleDateString()) 
                          : reportType === "decade" 
                            ? report.TargetDecade 
                            : (isNaN(new Date(report.SubmittedAt || report.Timestamp).getTime()) ? "日付不明" : new Date(report.SubmittedAt || report.Timestamp).toLocaleDateString())}
                      </span>
                    </div>
                    <span className={`text-[8px] font-digital uppercase tracking-widest px-2 py-0.5 rounded border ${isMine ? "border-neon-green/30 text-neon-green/70" : reportType === "weekly" ? "border-neon-blue/30 text-neon-blue/70" : reportType === "decade" ? "border-neon-orange/30 text-neon-orange/70" : "border-neon-green/30 text-neon-green/70"}`}>
                      {reportType === "weekly" ? "Weekly" : reportType === "decade" ? "Decade" : "AM Status"}
                    </span>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-400 line-clamp-1">
                    {reportType === "weekly" ? report.Goal : reportType === "decade" ? report.AreaFact : report.textAreaSummary || "近況報告"}
                  </p>
                  {reportType === "am_status" && report.storeReports && report.storeReports.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {report.storeReports.map((s: any, i: number) => (
                        <span key={i} className="text-[8px] bg-neon-green/10 text-neon-green px-1.5 py-0.5 rounded border border-neon-green/20">
                          {s.storeName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
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
                          <MessageSquare size={10} className="text-neon-green" />
                          <span className="text-[8px] text-neon-green font-digital uppercase tracking-widest">
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
                              <p className="whitespace-pre-wrap text-gray-200">{formatText(report.Goal)}</p>
                            </section>
                            <section>
                              <label className="text-[8px] text-gray-500 uppercase tracking-widest block mb-1">★結果</label>
                              <p className="whitespace-pre-wrap text-gray-200">{formatText(report.Result)}</p>
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
                              <p className="whitespace-pre-wrap text-gray-200">{formatText(report.ReviewPlus)}</p>
                            </section>
                            <section>
                              <label className="text-[8px] text-gray-500 uppercase tracking-widest block mb-1">★【－】課題と気づき</label>
                              <p className="whitespace-pre-wrap text-gray-200">{formatText(report.ReviewMinus)}</p>
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
                              <p className="whitespace-pre-wrap text-gray-200">{formatText(report.NextActionPurpose)}</p>
                            </section>
                            <section>
                              <label className="text-[8px] text-gray-500 uppercase tracking-widest block mb-1">★具体的な行動</label>
                              <p className="whitespace-pre-wrap text-gray-200">{formatText(report.NextActionDetail)}</p>
                            </section>
                          </div>
                        </div>

                        {report.Consultation && (
                          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <h4 className="text-[10px] text-gray-400 font-digital uppercase tracking-widest mb-3 flex items-center gap-2">
                              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                              相談・共有事項
                            </h4>
                            <p className="whitespace-pre-wrap text-gray-300">{formatText(report.Consultation)}</p>
                          </div>
                        )}
                        
                        {/* AM/BM Comments Display */}
                        {(report.AM_Comment || report.BM_Comment) && (
                          <div className="space-y-3 pt-4 border-t border-white/5">
                            <h4 className="text-[10px] font-digital uppercase tracking-widest text-gray-500">フィードバック</h4>
                            {report.AM_Comment && (
                              <div className="bg-neon-green/5 p-3 rounded-xl border border-neon-green/20">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-bold text-neon-green">
                                    {report.AM_Comment_Name || 'AM'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-300 whitespace-pre-wrap">{formatText(report.AM_Comment)}</p>
                              </div>
                            )}
                            {report.BM_Comment && (
                              <div className="bg-neon-orange/5 p-3 rounded-xl border border-neon-orange/20">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-bold text-neon-orange">
                                    {report.BM_Comment_Name || 'BM'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-300 whitespace-pre-wrap">{formatText(report.BM_Comment)}</p>
                              </div>
                            )}
                          </div>
                        )}

                      {/* Weekly Comments (AM/BM Only) */}
                      {(user.Role === "AM" || user.Role === "BM") && (
                        <div className="pt-6 border-t border-white/5">
                          {(() => {
                            const feedbackColor = user.Role === "AM" ? "neon-green" : "neon-orange";
                            const feedbackColorHex = user.Role === "AM" ? "rgba(0, 255, 0, 0.4)" : "rgba(255, 157, 0, 0.4)";
                            return (
                              <>
                                <label className={`text-[10px] text-${feedbackColor} font-digital uppercase tracking-widest block mb-2`}>
                                  {user.Name} ({user.Role}) としてフィードバックを送信
                                </label>
                                <textarea
                                  value={feedbackComment}
                                  onChange={(e) => setFeedbackComment(e.target.value)}
                                  className={`w-full bg-black/50 border border-gray-800 rounded-lg p-4 focus:border-${feedbackColor} outline-none transition-all h-24 text-gray-200 text-sm`}
                                  placeholder="具体的なアドバイスを入力してください..."
                                />
                                <button
                                  onClick={() => handleSaveFeedback('weekly')}
                                  disabled={isLoading || !feedbackComment}
                                  className={`mt-4 w-full bg-transparent border border-${feedbackColor} text-${feedbackColor} py-3 rounded-xl font-bold uppercase tracking-[0.2em] hover:bg-${feedbackColor} hover:text-black transition-all disabled:opacity-50 font-digital flex items-center justify-center gap-2 text-xs`}
                                  style={{ boxShadow: feedbackComment ? `0 0 15px ${feedbackColorHex}` : 'none' }}
                                >
                                  <Send size={14} />
                                  送信
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ) : reportType === "decade" ? (
                      <div className="space-y-6">
                        <div className="space-y-4 text-sm">
                          <section>
                            <label className="text-[10px] text-neon-orange font-digital uppercase tracking-widest block mb-1">状況把握：事実（Fact）のみ</label>
                            <p className="whitespace-pre-wrap text-gray-200">{formatText(report.AreaFact)}</p>
                          </section>
                          <section>
                            <label className="text-[10px] text-neon-orange font-digital uppercase tracking-widest block mb-1">店長への「伴走・育成」実績</label>
                            <p className="whitespace-pre-wrap text-gray-200">{formatText(report.CoachingRecord)}</p>
                          </section>
                          <section>
                            <label className="text-[10px] text-neon-orange font-digital uppercase tracking-widest block mb-1">自己責任100%の振り返りと1つの実験</label>
                            <p className="whitespace-pre-wrap text-gray-200">{formatText(report.SelfReflection)}</p>
                          </section>
                        </div>

                        {/* BM Feedback for Decade Reports */}
                        {report.BM_Comment && (
                          <div className="bg-neon-orange/10 p-4 rounded-2xl border border-neon-orange/20">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare size={14} className="text-neon-orange" />
                              <span className="text-[10px] font-bold text-neon-orange uppercase tracking-widest">
                                {report.BM_Comment_Name || 'BM'} (BM)
                              </span>
                            </div>
                            <p className="text-xs text-gray-200 whitespace-pre-wrap">{formatText(report.BM_Comment)}</p>
                          </div>
                        )}

                        {/* BM Feedback Input for Decade Reports */}
                        {user.Role === 'BM' && (
                          <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-3">
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest block">
                              {user.Name} ({user.Role}) としてフィードバックを送信
                            </label>
                            <textarea
                              value={feedbackComment}
                              onChange={(e) => setFeedbackComment(e.target.value)}
                              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-gray-200 focus:border-neon-orange outline-none transition-all min-h-[80px]"
                              placeholder="フィードバックを入力..."
                            />
                            <button
                              onClick={() => handleSaveFeedback('decade')}
                              disabled={isLoading || !feedbackComment}
                              className="mt-4 w-full bg-transparent border border-neon-orange text-neon-orange py-3 rounded-xl font-bold uppercase tracking-[0.2em] hover:bg-neon-orange hover:text-black transition-all disabled:opacity-50 font-digital flex items-center justify-center gap-2 text-xs"
                            >
                              <Send size={14} />
                              送信
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="space-y-4 text-sm">
                          <section>
                            <label className="text-[10px] text-neon-green font-digital uppercase tracking-widest block mb-1">エリアのビジョン・目標</label>
                            <p className="whitespace-pre-wrap text-gray-200">{formatText(report.textAreaVision) || "未入力"}</p>
                          </section>
                          <section>
                            <label className="text-[10px] text-neon-green font-digital uppercase tracking-widest block mb-1">総括</label>
                            <p className="whitespace-pre-wrap text-gray-200">{formatText(report.textAreaSummary) || "未入力"}</p>
                          </section>
                          <section>
                            <label className="text-[10px] text-neon-green font-digital uppercase tracking-widest block mb-1">店長のコンディション</label>
                            <p className="whitespace-pre-wrap text-gray-200">{formatText(report.textManagerCondition) || "未入力"}</p>
                          </section>
                          {report.textOtherTopics && (
                            <section>
                              <label className="text-[10px] text-neon-green font-digital uppercase tracking-widest block mb-1">その他トピックス</label>
                              <p className="whitespace-pre-wrap text-gray-200">{formatText(report.textOtherTopics)}</p>
                            </section>
                          )}
                          {report.storeReports && report.storeReports.length > 0 && (
                            <section>
                              <label className="text-[10px] text-neon-green font-digital uppercase tracking-widest block mb-2 mt-4 border-t border-white/10 pt-4">店舗別報告 ({report.storeReports.length}店舗)</label>
                              <div className="space-y-4">
                                {report.storeReports.map((store: any, idx: number) => (
                                  <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                                    <h5 className="text-sm font-bold text-neon-green border-b border-white/5 pb-2">{store.storeName}</h5>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <label className="text-[9px] text-gray-500 uppercase tracking-tighter">先月の課題解決/振り返り</label>
                                        <div className="space-y-1">
                                          <p className="text-[10px] text-gray-500">【課題解決・取り組み】</p>
                                          <p className="text-xs text-gray-300 whitespace-pre-wrap">{formatText(store.textLastMonthGoals) || "未入力"}</p>
                                          <p className="text-[10px] text-gray-500 mt-2">【学び・反省点や成果】</p>
                                          <p className="text-xs text-gray-300 whitespace-pre-wrap">{formatText(store.textLastMonthResults) || "未入力"}</p>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-[9px] text-gray-500 uppercase tracking-tighter">今月の課題解決への取り組み</label>
                                        <div className="space-y-1">
                                          <p className="text-[10px] text-gray-500">【課題解決・取り組み】</p>
                                          <p className="text-xs text-gray-300 whitespace-pre-wrap">{formatText(store.textThisMonthGoals) || "未入力"}</p>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <label className="text-[9px] text-gray-500 uppercase tracking-tighter">今月の注力ポイント</label>
                                      <p className="text-xs text-gray-300 whitespace-pre-wrap">{formatText(store.textThisMonthFocus) || "未入力"}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <label className="text-[9px] text-gray-500 uppercase tracking-tighter">販促・キャンペーン</label>
                                        <p className="text-xs text-gray-300 whitespace-pre-wrap">{formatText(store.textPromo) || "未入力"}</p>
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-[9px] text-gray-500 uppercase tracking-tighter">設備・備品</label>
                                        <p className="text-xs text-gray-300 whitespace-pre-wrap">{formatText(store.textFacility) || "未入力"}</p>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <label className="text-[9px] text-gray-500 uppercase tracking-tighter">売上実績</label>
                                      <div className="bg-black/20 p-3 rounded-lg border border-white/5 grid grid-cols-3 gap-2 text-center">
                                        <div>
                                          <p className="text-[8px] text-gray-500 uppercase">前期実績</p>
                                          <p className="text-xs text-neon-green font-digital">{store.textSalesPrevious || 0}<span className="text-[8px] ml-0.5">名</span></p>
                                        </div>
                                        <div>
                                          <p className="text-[8px] text-gray-500 uppercase">今期実績</p>
                                          <p className="text-xs text-neon-green font-digital">{store.textSalesCurrent || 0}<span className="text-[8px] ml-0.5">名</span></p>
                                        </div>
                                        <div>
                                          <p className="text-[8px] text-gray-500 uppercase">予算</p>
                                          <p className="text-xs text-neon-green font-digital">{store.textSalesBudget || 0}<span className="text-[8px] ml-0.5">名</span></p>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <label className="text-[9px] text-gray-500 uppercase tracking-tighter">スタッフの様子 (店舗)</label>
                                      <p className="text-xs text-gray-300 whitespace-pre-wrap">{formatText(store.textStaffStore) || "未入力"}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                          {report.hrEvents && report.hrEvents.length > 0 && (
                            <section>
                              <label className="text-[10px] text-neon-green font-digital uppercase tracking-widest block mb-2 mt-4 border-t border-white/10 pt-4">入社・退職・休職 ({report.hrEvents.length}件)</label>
                              <div className="space-y-2">
                                {report.hrEvents.map((event: any, idx: number) => (
                                  <div key={idx} className="bg-neon-green/5 p-3 rounded-xl border border-neon-green/10">
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-xs font-bold text-neon-green">{event.type}</span>
                                      <span className="text-[10px] text-gray-500 font-digital">{event.date}</span>
                                    </div>
                                    <p className="text-xs text-gray-200 mb-1">{event.store} / {event.name}</p>
                                    {event.details && (
                                      <p className="text-[10px] text-gray-400 whitespace-pre-wrap mt-2 bg-black/20 p-2 rounded border border-white/5">{formatText(event.details)}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                          {report.interviewEvents && report.interviewEvents.length > 0 && (
                            <section>
                              <label className="text-[10px] text-neon-green font-digital uppercase tracking-widest block mb-2 mt-4 border-t border-white/10 pt-4">スタッフ面談 ({report.interviewEvents.length}件)</label>
                              <div className="space-y-3">
                                {report.interviewEvents.map((event: any, idx: number) => (
                                  <div key={idx} className="bg-neon-green/5 p-4 rounded-xl border border-neon-green/10 space-y-3">
                                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                      <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${event.importance === "高" ? "bg-neon-red" : event.importance === "中" ? "bg-neon-orange" : "bg-neon-blue"}`} />
                                        <span className="text-xs font-bold text-neon-green">{event.interviewType || "面談"}</span>
                                      </div>
                                      <span className="text-[10px] text-gray-500 font-digital">{event.date}</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                                      <p className="text-gray-300"><span className="text-gray-500">店舗:</span> {event.store}</p>
                                      <p className="text-gray-300"><span className="text-gray-500">対象:</span> {event.name}</p>
                                      <p className="text-gray-300"><span className="text-gray-500">面談者:</span> {event.interviewer}</p>
                                      <p className="text-gray-300"><span className="text-gray-500">状況:</span> {event.status}</p>
                                    </div>

                                    <div className="space-y-2">
                                      <label className="text-[9px] text-gray-500 uppercase tracking-tighter">面談内容</label>
                                      <div className="space-y-3">
                                        <div>
                                          <p className="text-[10px] text-gray-500 mb-1">【主な内容】</p>
                                          <p className="text-xs text-gray-300 whitespace-pre-wrap bg-black/20 p-2 rounded border border-white/5">{formatText(event.contentMain) || "未入力"}</p>
                                        </div>
                                        <div>
                                          <p className="text-[10px] text-gray-500 mb-1">【懸念事項/未解決事項】</p>
                                          <p className="text-xs text-gray-300 whitespace-pre-wrap bg-neon-red/5 p-2 rounded border border-neon-red/10">{formatText(event.contentConcerns) || "未入力"}</p>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <label className="text-[9px] text-gray-500 uppercase tracking-tighter">次回アクション</label>
                                        <p className="text-xs text-gray-300 whitespace-pre-wrap">{formatText(event.contentNextAction) || "未入力"}</p>
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-[9px] text-gray-500 uppercase tracking-tighter">所感</label>
                                        <p className="text-xs text-gray-300 whitespace-pre-wrap">{formatText(event.contentImpression) || "未入力"}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Unified Interactions (Likes & Comments) - Available for all reports and all roles */}
                    <div className="pt-6 border-t border-white/5 space-y-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleLike(report.ReportID);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all cursor-pointer ${report.UserLiked ? "bg-neon-red/10 border-neon-red text-neon-red" : "border-gray-800 text-gray-500 hover:border-gray-700"}`}
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

                      {/* Comments List */}
                      <div className="space-y-4">
                        {report.Comments?.map((c: any) => {
                          const commentColor = c.Role === "AM" ? "neon-green" : c.Role === "BM" ? "neon-orange" : "neon-blue";
                          return (
                            <div key={c.CommentID} className={`bg-white/5 p-3 rounded-xl border border-${commentColor}/20`}>
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-[10px] font-bold text-${commentColor}`}>{c.UserName} ({c.Role})</span>
                                <span className="text-[8px] font-digital text-gray-600">{new Date(c.CreatedAt).toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-gray-300 whitespace-pre-wrap">{formatText(c.Text)}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Add Comment */}
                      <div className="flex gap-2">
                        {(() => {
                          const myCommentColor = user.Role === "AM" ? "neon-green" : user.Role === "BM" ? "neon-orange" : "neon-blue";
                          const myCommentColorHex = user.Role === "AM" ? "rgba(0, 255, 0, 0.4)" : user.Role === "BM" ? "rgba(255, 157, 0, 0.4)" : "rgba(0, 243, 255, 0.4)";
                          return (
                            <>
                              <input
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className={`flex-1 bg-black/50 border border-gray-800 rounded-lg px-4 py-2 focus:border-${myCommentColor} outline-none transition-all text-xs text-gray-200`}
                                placeholder="コメントを追加..."
                              />
                              <button
                                onClick={handleSaveComment}
                                disabled={isLoading || !comment}
                                className={`p-2 bg-${myCommentColor} text-black rounded-lg hover:shadow-[0_0_10px_${myCommentColorHex}] transition-all disabled:opacity-50 cursor-pointer`}
                              >
                                <Send size={16} />
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </div>
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
