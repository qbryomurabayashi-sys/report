import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, X, Info, AlertCircle, CheckCircle2 } from "lucide-react";
import { User } from "../types";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firebase-utils";

interface NotificationPanelProps {
  user: User;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success";
  time: string;
}

export function NotificationPanel({ user }: NotificationPanelProps) {
  const [show, setShow] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      where("UserID", "==", user.UserID),
      where("Read", "==", false),
      orderBy("CreatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const formatted = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.Title,
          message: data.Body,
          type: (data.Type || "info") as "info" | "warning" | "success",
          time: data.CreatedAt ? new Date(data.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""
        };
      });
      setNotifications(formatted);
      if (formatted.length > 0) {
        setShow(true);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "notifications");
    });

    return () => unsubscribe();
  }, [user.UserID]);

  const removeNotification = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), {
        Read: true
      }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `notifications/${id}`));
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] w-80 pointer-events-none">
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="pointer-events-auto"
          >
            <div className="glass-card rounded-2xl border-l-4 border-neon-blue p-4 shadow-2xl bg-black/80 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-neon-blue animate-pulse" />
                  <span className="text-[10px] font-digital text-neon-blue uppercase tracking-widest">System Notifications</span>
                </div>
                <button onClick={() => setShow(false)} className="p-1 hover:bg-white/5 rounded-full transition-colors">
                  <X size={14} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {notifications.map(n => (
                  <div key={n.id} className="p-3 bg-white/5 border border-white/10 rounded-xl relative group">
                    <button 
                      onClick={() => removeNotification(n.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded-md"
                    >
                      <X size={10} className="text-gray-500" />
                    </button>
                    <div className="flex gap-3">
                      <div className="mt-1">
                        {n.type === "info" && <Info size={14} className="text-neon-blue" />}
                        {n.type === "warning" && <AlertCircle size={14} className="text-neon-orange" />}
                        {n.type === "success" && <CheckCircle2 size={14} className="text-green-400" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold mb-1">{n.title}</p>
                        <p className="text-[10px] text-gray-400 leading-relaxed">{n.message}</p>
                        <p className="text-[8px] text-gray-600 mt-2 font-digital uppercase">{n.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!show && notifications.length > 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setShow(true)}
          className="pointer-events-auto absolute top-0 right-0 p-3 bg-neon-blue rounded-full shadow-[0_0_20px_rgba(0,243,255,0.5)] text-black hover:scale-110 transition-transform"
        >
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-neon-orange text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-black">
            {notifications.length}
          </span>
        </motion.button>
      )}
    </div>
  );
}
