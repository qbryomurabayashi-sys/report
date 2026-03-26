import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { User, AppState } from "../App";
import { Calendar, ChartLine, Lock, Bell, ChevronRight, Clock, Menu, CheckSquare, FolderKanban, ChevronLeft as ChevronLeftIcon } from "lucide-react";
import { differenceInSeconds, nextSunday, setHours, setMinutes, setSeconds, format, isAfter, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { SidebarMenu } from "./SidebarMenu";

interface Task {
  TaskID: string;
  Assignee: string;
  Deadline: string;
  Content: string;
  Status: string;
}

interface Project {
  ProjectID: string;
  Assignee: string;
  WithWhom: string;
  StartDate: string;
  EndDate: string;
  What: string;
  Purpose: string;
  Extent: string;
  Status: string;
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onNavigate: (state: AppState) => void;
  onOpenPinModal: () => void;
}

export function Dashboard({ user, onLogout, onNavigate, onOpenPinModal }: DashboardProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    fetch("/api/tasks").then(res => res.json()).then(data => setTasks(Array.isArray(data) ? data : []));
    fetch("/api/projects").then(res => res.json()).then(data => setProjects(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      let nextDeadline: Date;

      if (user.Role === "店長") {
        const today18 = setSeconds(setMinutes(setHours(new Date(now), 18), 0), 0);
        if (now.getDay() === 0 && now.getTime() < today18.getTime()) {
          nextDeadline = today18;
        } else {
          nextDeadline = setSeconds(setMinutes(setHours(nextSunday(now), 18), 0), 0);
        }
      } else if (user.Role === "AM") {
        const days = [10, 20, 30];
        let found = false;
        nextDeadline = now; // Fallback

        for (const day of days) {
          const d = setSeconds(setMinutes(setHours(new Date(now.getFullYear(), now.getMonth(), day), 18), 0), 0);
          if (isAfter(d, now)) {
            nextDeadline = d;
            found = true;
            break;
          }
        }

        if (!found) {
          nextDeadline = setSeconds(setMinutes(setHours(new Date(now.getFullYear(), now.getMonth() + 1, 10), 18), 0), 0);
        }
      } else {
        // Default fallback for other roles
        nextDeadline = setSeconds(setMinutes(setHours(nextSunday(now), 18), 0), 0);
      }

      setDeadlineDate(nextDeadline);
      const diff = differenceInSeconds(nextDeadline, now);

      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (60 * 60 * 24)),
          hours: Math.floor((diff / (60 * 60)) % 24),
          minutes: Math.floor((diff / 60) % 60),
          seconds: Math.floor(diff % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft();
    return () => clearInterval(timer);
  }, [user.Role]);

  const isDeadlineClose = timeLeft.days === 0 && timeLeft.hours < 24;

  const renderCalendar = () => {
    if (user.Role !== "AM" && user.Role !== "BM") return null;

    const today = new Date();
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const selectedDayStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
    
    const normalizeDate = (dateStr: string) => {
      if (!dateStr) return "";
      // Handle ISO strings (2026-03-26T00:00:00.000Z) or simple strings (2026-03-26)
      return dateStr.split('T')[0].replace(/\//g, '-');
    };

    const selectedDayTasks = tasks.filter(t => normalizeDate(t.Deadline) === selectedDayStr);
    const selectedDayProjects = projects.filter(p => {
      if (!selectedDayStr) return false;
      const start = normalizeDate(p.StartDate);
      const end = normalizeDate(p.EndDate);
      return selectedDayStr >= start && selectedDayStr <= end;
    });

    const handlePrevMonth = () => setViewDate(subMonths(viewDate, 1));
    const handleNextMonth = () => setViewDate(addMonths(viewDate, 1));

    return (
      <div className="glass-card p-6 rounded-2xl mb-8 border-l-4 border-neon-orange">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-neon-orange flex items-center gap-2">
            <Calendar size={20} />
            <span>タスク＆プロジェクトカレンダー</span>
          </h3>
          <div className="flex items-center gap-4 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
            <button onClick={handlePrevMonth} className="text-gray-500 hover:text-neon-orange transition-colors">
              <ChevronLeftIcon size={18} />
            </button>
            <span className="text-sm font-bold text-gray-200 min-w-[80px] text-center font-digital">
              {format(viewDate, "yyyy年 M月", { locale: ja })}
            </span>
            <button onClick={handleNextMonth} className="text-gray-500 hover:text-neon-orange transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {["日", "月", "火", "水", "木", "金", "土"].map(day => (
            <div key={day} className="text-[10px] text-gray-500 font-bold">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="p-2" />
          ))}
          {days.map(day => {
            const dayStr = format(day, "yyyy-MM-dd");
            const dayTasks = tasks.filter(t => normalizeDate(t.Deadline) === dayStr && t.Status !== 'completed');
            const dayProjects = projects.filter(p => {
              if (p.Status === 'completed') return false;
              const start = normalizeDate(p.StartDate);
              const end = normalizeDate(p.EndDate);
              return dayStr >= start && dayStr <= end;
            });
            const hasEvents = dayTasks.length > 0 || dayProjects.length > 0;
            const isToday = isSameDay(day, today);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <button 
                key={day.toISOString()} 
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className={`p-1 rounded-md text-center text-xs relative transition-all hover:bg-white/5 ${
                  isSelected ? "bg-neon-orange text-black font-bold" :
                  isToday ? "bg-neon-orange/20 text-neon-orange font-bold border border-neon-orange/50" : "text-gray-300"
                }`}
              >
                {format(day, "d")}
                {hasEvents && !isSelected && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-neon-blue shadow-[0_0_6px_#00f3ff]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Day Details */}
        {selectedDate && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-6 pt-6 border-t border-white/10 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-neon-orange">
                {format(selectedDate, "M月d日(E)", { locale: ja })} の予定
              </h4>
              <button onClick={() => setSelectedDate(null)} className="text-[10px] text-gray-500 hover:text-white">閉じる</button>
            </div>

            {selectedDayTasks.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-neon-blue font-digital uppercase tracking-widest">Tasks</p>
                {selectedDayTasks.map(t => (
                  <div key={t.TaskID} className="bg-black/40 p-2 rounded-lg border border-white/5 flex justify-between items-center">
                    <span className={`text-xs ${t.Status === 'completed' ? 'line-through text-gray-500' : 'text-gray-200'}`}>{t.Content}</span>
                    <span className="text-[9px] text-gray-500 bg-white/5 px-2 py-0.5 rounded">{t.Assignee}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedDayProjects.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-neon-orange font-digital uppercase tracking-widest">Projects</p>
                {selectedDayProjects.map(p => (
                  <div key={p.ProjectID} className="bg-black/40 p-2 rounded-lg border border-white/5 flex justify-between items-center">
                    <span className={`text-xs ${p.Status === 'completed' ? 'line-through text-gray-500' : 'text-gray-200'}`}>{p.What}</span>
                    <span className="text-[9px] text-gray-500 bg-white/5 px-2 py-0.5 rounded">{p.Assignee}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedDayTasks.length === 0 && selectedDayProjects.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-2">予定はありません</p>
            )}
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 pt-8 pb-24 max-w-2xl">
      <SidebarMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        user={user} 
        onLogout={onLogout} 
        onOpenPinModal={onOpenPinModal} 
      />
      
      {/* Time Circuit Countdown */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-6 rounded-2xl mb-8 border-l-4 border-neon-blue relative overflow-hidden"
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-digital text-gray-500 uppercase tracking-[0.2em]">提出期限まであと...</span>
            {deadlineDate && (
              <div className="flex items-center gap-1 mt-1">
                <Clock size={10} className="text-neon-blue" />
                <span className="text-[9px] font-digital text-neon-blue/80 tracking-widest">
                  DEADLINE: {format(deadlineDate, "yyyy/MM/dd (E) HH:mm", { locale: ja })}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Bell size={12} className={isDeadlineClose ? "text-neon-red animate-pulse" : "text-gray-700"} />
            <span className={`text-[10px] font-digital uppercase tracking-[0.2em] ${isDeadlineClose ? "text-neon-red" : "text-gray-700"}`}>
              {isDeadlineClose ? "至急" : "順調"}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center gap-2">
          {[
            { label: "日", value: timeLeft.days },
            { label: "時", value: timeLeft.hours },
            { label: "分", value: timeLeft.minutes },
            { label: "秒", value: timeLeft.seconds },
          ].map((item, i) => (
            <div key={i} className="flex-1 text-center bg-black/40 p-3 rounded-lg border border-white/5 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]">
              <div className={`text-3xl font-digital ${isDeadlineClose ? "text-neon-red" : "text-neon-orange"} drop-shadow-[0_0_8px_rgba(255,157,0,0.3)]`}>
                {String(item.value).padStart(2, "0")}
              </div>
              <div className="text-[8px] font-digital text-gray-600 mt-1 tracking-widest">{item.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* User Info Header */}
      <header className="flex justify-between items-center mb-8 glass-card p-6 rounded-2xl border-l-4 border-neon-blue">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="p-3 glass-card rounded-xl text-gray-500 hover:text-neon-blue transition-all active:scale-90"
          >
            <Menu size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold neon-text-blue font-display tracking-tight">{user.Name}</h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-1 font-digital">{user.Role} | {user.Area}</p>
          </div>
        </div>
      </header>

      {/* Progress Summary */}
      {(() => {
        let relevantTasks = tasks;
        let relevantProjects = projects;

        if (user.Role === "店長") {
          relevantTasks = tasks.filter(t => t.Assignee === user.Name);
          relevantProjects = projects.filter(p => p.Assignee === user.Name || p.WithWhom.includes(user.Name));
        }

        if (relevantTasks.length === 0 && relevantProjects.length === 0) return null;

        const completedTasks = relevantTasks.filter(t => t.Status === 'completed').length;
        const totalTasks = relevantTasks.length;
        const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const completedProjects = relevantProjects.filter(p => p.Status === 'completed').length;
        const totalProjects = relevantProjects.length;
        const projectProgress = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-2xl mb-8 border-l-4 border-neon-blue"
          >
            <h3 className="text-lg font-bold text-neon-blue mb-4 flex items-center gap-2">
              <CheckSquare size={20} />
              <span>進行状況サマリー</span>
            </h3>
            
            <div className="space-y-6">
              {totalTasks > 0 && (
                <div>
                  <button 
                    onClick={() => setShowTaskDetails(!showTaskDetails)}
                    className="w-full flex justify-between text-xs mb-2 items-center hover:text-neon-blue transition-colors"
                  >
                    <span className="text-gray-400 flex items-center gap-1">
                      タスク ({completedTasks}/{totalTasks})
                      <ChevronRight size={12} className={`transition-transform ${showTaskDetails ? "rotate-90" : ""}`} />
                    </span>
                    <span className="text-neon-blue font-digital">{taskProgress}%</span>
                  </button>
                  <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-white/5 mb-2">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${taskProgress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-neon-blue shadow-[0_0_10px_#00f3ff]"
                    />
                  </div>
                  {showTaskDetails && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-1 mt-2"
                    >
                      {relevantTasks.map(t => (
                        <div key={t.TaskID} className="flex justify-between items-center text-[10px] bg-white/5 p-2 rounded">
                          <div className="flex flex-col">
                            <span className={t.Status === 'completed' ? 'line-through text-gray-600' : 'text-gray-300'}>{t.Content}</span>
                            <span className="text-[8px] text-neon-orange mt-0.5">期限: {t.Deadline ? t.Deadline.split('T')[0] : '未設定'}</span>
                          </div>
                          <span className="text-gray-500">{t.Assignee}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              )}

              {totalProjects > 0 && (
                <div>
                  <button 
                    onClick={() => setShowProjectDetails(!showProjectDetails)}
                    className="w-full flex justify-between text-xs mb-2 items-center hover:text-neon-orange transition-colors"
                  >
                    <span className="text-gray-400 flex items-center gap-1">
                      プロジェクト ({completedProjects}/{totalProjects})
                      <ChevronRight size={12} className={`transition-transform ${showProjectDetails ? "rotate-90" : ""}`} />
                    </span>
                    <span className="text-neon-orange font-digital">{projectProgress}%</span>
                  </button>
                  <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-white/5 mb-2">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${projectProgress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-neon-orange shadow-[0_0_10px_#ff9d00]"
                    />
                  </div>
                  {showProjectDetails && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-1 mt-2"
                    >
                      {relevantProjects.map(p => (
                        <div key={p.ProjectID} className="flex justify-between items-center text-[10px] bg-white/5 p-2 rounded">
                          <div className="flex flex-col">
                            <span className={p.Status === 'completed' ? 'line-through text-gray-600' : 'text-gray-300'}>{p.What}</span>
                            <span className="text-[8px] text-neon-orange mt-0.5">期間: {p.StartDate ? p.StartDate.split('T')[0] : ''} 〜 {p.EndDate ? p.EndDate.split('T')[0] : ''}</span>
                          </div>
                          <span className="text-gray-500">{p.Assignee}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        );
      })()}

      {/* Dashboard Calendar for AM/BM */}
      {renderCalendar()}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 gap-4">
        {user.Role === "店長" && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate("weekly_form")}
            className="glass-card p-6 rounded-2xl flex items-center justify-between group hover:border-neon-blue transition-all"
          >
            <div className="flex items-center gap-6">
              <div className="p-4 bg-neon-blue/10 rounded-xl text-neon-blue group-hover:bg-neon-blue group-hover:text-black transition-all">
                <Calendar size={24} />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg group-hover:text-neon-blue transition-all">週報を書く</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-digital">店長用：1週間の報告</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-700 group-hover:text-neon-blue transition-all" />
          </motion.button>
        )}

        {user.Role === "AM" && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate("decade_form")}
            className="glass-card p-6 rounded-2xl flex items-center justify-between group hover:border-neon-orange transition-all"
          >
            <div className="flex items-center gap-6">
              <div className="p-4 bg-neon-orange/10 rounded-xl text-neon-orange group-hover:bg-neon-orange group-hover:text-black transition-all">
                <ChartLine size={24} />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg group-hover:text-neon-orange transition-all">旬報を書く</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-digital">AM用：10日ごとの報告</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-700 group-hover:text-neon-orange transition-all" />
          </motion.button>
        )}

        {(user.Role === "AM" || user.Role === "BM") && (
          <>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate("task_management")}
              className="glass-card p-6 rounded-2xl flex items-center justify-between group hover:border-neon-blue transition-all"
            >
              <div className="flex items-center gap-6">
                <div className="p-4 bg-neon-blue/10 rounded-xl text-neon-blue group-hover:bg-neon-blue group-hover:text-black transition-all">
                  <CheckSquare size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg group-hover:text-neon-blue transition-all">タスク管理</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-digital">To-Doリストと期限</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-700 group-hover:text-neon-blue transition-all" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate("project_management")}
              className="glass-card p-6 rounded-2xl flex items-center justify-between group hover:border-neon-orange transition-all"
            >
              <div className="flex items-center gap-6">
                <div className="p-4 bg-neon-orange/10 rounded-xl text-neon-orange group-hover:bg-neon-orange group-hover:text-black transition-all">
                  <FolderKanban size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg group-hover:text-neon-orange transition-all">プロジェクト管理</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-digital">中長期プロジェクト</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-700 group-hover:text-neon-orange transition-all" />
            </motion.button>
          </>
        )}

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate("report_feed")}
          className="glass-card p-6 rounded-2xl flex items-center justify-between group hover:border-neon-blue transition-all mt-4"
        >
          <div className="flex items-center gap-6">
            <div className="p-4 bg-neon-blue/10 rounded-xl text-neon-blue group-hover:bg-neon-blue group-hover:text-black transition-all">
              <Lock size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg group-hover:text-neon-blue transition-all">履歴・フィード</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-digital">みんなの報告を見る</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-700 group-hover:text-neon-blue transition-all" />
        </motion.button>

        <div className="pt-12 text-center">
          <p className="text-[8px] text-gray-800 font-digital tracking-[0.4em] uppercase">
            BTTF Management System v2.5 • Temporal Protocol Active
          </p>
        </div>
      </div>
    </div>
  );
}
