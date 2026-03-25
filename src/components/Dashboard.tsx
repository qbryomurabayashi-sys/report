import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { User, AppState } from "../App";
import { Calendar, ChartLine, LogOut, Key, Lock, Bell, ChevronRight, Clock } from "lucide-react";
import { differenceInSeconds, nextSunday, setHours, setMinutes, setSeconds, format, isAfter } from "date-fns";
import { ja } from "date-fns/locale";

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onNavigate: (state: AppState) => void;
  onOpenPinModal: () => void;
}

export function Dashboard({ user, onLogout, onNavigate, onOpenPinModal }: DashboardProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);

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

  return (
    <div className="container mx-auto px-4 pt-8 pb-24 max-w-2xl">
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
      <header className="flex justify-between items-center mb-12 glass-card p-6 rounded-2xl border-l-4 border-neon-blue">
        <div>
          <h2 className="text-2xl font-bold neon-text-blue font-display tracking-tight">{user.Name}</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-1 font-digital">{user.Role} | {user.Area}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={onOpenPinModal} className="p-3 glass-card rounded-xl text-gray-500 hover:text-neon-blue transition-all">
            <Key size={18} />
          </button>
          <button onClick={onLogout} className="p-3 glass-card rounded-xl text-gray-500 hover:text-neon-red transition-all">
            <LogOut size={18} />
          </button>
        </div>
      </header>

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
