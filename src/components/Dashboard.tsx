import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { User, AppState, Task, Project, ViewType, Member } from "../types";
import { Calendar, ChartLine, Lock, Bell, ChevronRight, Clock, Menu, CheckSquare, FolderKanban, ChevronLeft as ChevronLeftIcon, RefreshCw, Sword, Target, Flag, MessageSquare } from "lucide-react";
import { differenceInSeconds, nextSunday, setHours, setMinutes, setSeconds, format, isAfter } from "date-fns";
import { ja } from "date-fns/locale";
import { SidebarMenu } from "./SidebarMenu";
import ViewSwitcher from "./ViewSwitcher";
import TeamTimeline from "./TeamTimeline";
import DeadlineCalendar from "./DeadlineCalendar";
import WeeklyPlan from "./WeeklyPlan";
import QuestBoard from "./QuestBoard";
import { NotificationPanel } from "./NotificationPanel";
import { db } from "../firebase";
import { collection, query, where, getDocs, onSnapshot, orderBy, limit } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firebase-utils";

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
  const [members, setMembers] = useState<Member[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>("Board");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const fetchData = async (refresh = false) => {
    setIsRefreshing(true);
    try {
      // Fetch notification count from Firestore
      const qNotif = query(collection(db, "notifications"), where("UserID", "==", user.UserID), where("Read", "==", false));
      const notifSnap = await getDocs(qNotif);
      setNotificationCount(notifSnap.size);
      
      // Update app badge
      if ('setAppBadge' in navigator) {
        if (notifSnap.size > 0) {
          (navigator as any).setAppBadge(notifSnap.size);
        } else {
          (navigator as any).clearAppBadge();
        }
      }

      // Fetch tasks from Firestore
      const qTasks = query(collection(db, "tasks"), orderBy("Deadline", "asc"));
      const tasksSnap = await getDocs(qTasks);
      const tasksData = tasksSnap.docs.map(doc => ({ ...doc.data(), TaskID: doc.id })) as Task[];
      setTasks(tasksData);

      // Fetch projects from Firestore
      const qProjects = query(collection(db, "projects"), orderBy("EndDate", "asc"));
      const projectsSnap = await getDocs(qProjects);
      const projectsData = projectsSnap.docs.map(doc => ({ ...doc.data(), ProjectID: doc.id })) as Project[];
      setProjects(projectsData);

      // Fetch members (users) from Firestore
      const qMembers = query(collection(db, "users"));
      const membersSnap = await getDocs(qMembers);
      const membersData = membersSnap.docs.map(doc => ({ 
        id: doc.id, 
        name: doc.data().Name, 
        role: doc.data().Role, 
        area: doc.data().Area 
      })) as Member[];
      setMembers(membersData);
      
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      handleFirestoreError(err, OperationType.LIST, "dashboard_data");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => fetchData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
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

  const renderView = () => {
    switch (currentView) {
      case "Team":
        return <TeamTimeline tasks={tasks} projects={projects} members={members} />;
      case "Calendar":
        return <DeadlineCalendar tasks={tasks} projects={projects} />;
      case "Weekly":
        return <WeeklyPlan tasks={tasks} projects={projects} />;
      case "Board":
        return <QuestBoard tasks={tasks} projects={projects} />;
      default:
        return <QuestBoard tasks={tasks} projects={projects} />;
    }
  };

  return (
    <div className="container mx-auto px-4 pt-8 pb-24 max-w-4xl">
      <NotificationPanel user={user} />
      <SidebarMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        user={user} 
        onLogout={onLogout} 
        onOpenPinModal={onOpenPinModal} 
        onNavigate={onNavigate}
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
            <div className="relative">
              <Bell size={12} className={isDeadlineClose || notificationCount > 0 ? "text-neon-red animate-pulse" : "text-gray-700"} />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-neon-red rounded-full shadow-[0_0_5px_rgba(255,0,0,0.5)]" />
              )}
            </div>
            <span className={`text-[10px] font-digital uppercase tracking-[0.2em] ${isDeadlineClose || notificationCount > 0 ? "text-neon-red" : "text-gray-700"}`}>
              {notificationCount > 0 ? `${notificationCount}件の通知` : isDeadlineClose ? "至急" : "順調"}
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
      <header className="flex justify-between items-center mb-8 glass-card p-4 sm:p-6 rounded-2xl border-l-4 border-neon-blue">
        <div className="flex items-center gap-3 sm:gap-4">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="p-2 sm:p-3 glass-card rounded-xl text-gray-500 hover:text-neon-blue transition-all active:scale-90 cursor-pointer"
          >
            <Menu size={20} />
          </button>
          <div>
            <h2 className="text-lg sm:text-2xl font-bold neon-text-blue font-display tracking-tight truncate max-w-[120px] sm:max-w-none">{user.Name}</h2>
            <p className="text-[8px] sm:text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-1 font-digital">{user.Role} | {user.Area}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button 
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className={`p-2 glass-card rounded-xl text-gray-500 hover:text-neon-blue transition-all active:scale-90 cursor-pointer ${isRefreshing ? "animate-spin text-neon-blue" : ""}`}
            title="最新の情報に更新"
          >
            <RefreshCw size={16} />
          </button>
          {lastUpdated && (
            <span className="text-[8px] text-gray-700 font-digital uppercase hidden sm:block">
              {format(lastUpdated, "HH:mm:ss")} UPDATED
            </span>
          )}
        </div>
      </header>

      {/* View Switcher and Multi-View */}
      {user.Role !== "店長" && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <ViewSwitcher currentView={currentView} onViewChange={setCurrentView} />
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-3 py-1 glass-card rounded-full border border-neon-blue/30">
                <Sword size={12} className="text-neon-blue" />
                <span className="text-[10px] font-digital text-neon-blue uppercase">Quests: {tasks.length}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 glass-card rounded-full border border-neon-orange/30">
                <Target size={12} className="text-neon-orange" />
                <span className="text-[10px] font-digital text-neon-orange uppercase">Scenarios: {projects.length}</span>
              </div>
            </div>
          </div>
          
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {renderView()}
          </motion.div>
        </div>
      )}

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
          <>
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

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate("am_status_form")}
              className="glass-card p-6 rounded-2xl flex items-center justify-between group hover:border-neon-green transition-all mt-4"
            >
              <div className="flex items-center gap-6">
                <div className="p-4 bg-neon-green/10 rounded-xl text-neon-green group-hover:bg-neon-green group-hover:text-black transition-all">
                  <MessageSquare size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg group-hover:text-neon-green transition-all">近況報告を書く</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-digital">AM用：日々の近況報告</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-700 group-hover:text-neon-green transition-all" />
            </motion.button>
          </>
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

        <div className="pt-12 text-center space-y-2">
          <p className="text-[8px] text-gray-800 font-digital tracking-[0.4em] uppercase">
            BTTF Management System v3.0 • Firebase Protocol Active
          </p>
        </div>
      </div>
    </div>
  );
}
