import React, { useState, useEffect } from "react";
import { LoadingScreen } from "./components/LoadingScreen";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { WeeklyForm } from "./components/WeeklyForm";
import { DecadeForm } from "./components/DecadeForm";
import { ReportFeed } from "./components/ReportFeed";
import { PinModal } from "./components/PinModal";

export type Role = "店長" | "AM" | "BM";

export interface User {
  UserID: string;
  Name: string;
  Role: Role;
  Area: string;
}

export type AppState = "loading" | "login" | "dashboard" | "weekly_form" | "decade_form" | "report_feed";

// Helper for web push
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);

  useEffect(() => {
    // Initial 5s loading screen
    const timer = setTimeout(() => {
      setAppState("login");
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const subscribeToPush = async (userId: string) => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;

        const publicVapidKey = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYpPNs_Zqk";
        
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });

        await fetch('/api/subscribe', {
          method: 'POST',
          body: JSON.stringify({ subscription, userId }),
          headers: {
            'content-type': 'application/json'
          }
        });
        console.log("Push notification subscribed for user:", userId);
      } catch (err) {
        console.error("Push subscription failed:", err);
      }
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setAppState("dashboard");
    
    // Request notification permission and subscribe on login
    if ("Notification" in window) {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          subscribeToPush(user.UserID);
        }
      });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAppState("login");
  };

  if (appState === "loading") {
    return <LoadingScreen />;
  }

  if (appState === "login") {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-dark-bg text-gray-200 font-sans selection:bg-neon-blue selection:text-black">
      {currentUser && (
        <>
          {appState === "dashboard" && (
            <Dashboard 
              user={currentUser} 
              onLogout={handleLogout} 
              onNavigate={setAppState} 
              onOpenPinModal={() => setShowPinModal(true)}
            />
          )}
          {appState === "weekly_form" && (
            <WeeklyForm 
              user={currentUser} 
              onBack={() => setAppState("dashboard")} 
            />
          )}
          {appState === "decade_form" && (
            <DecadeForm 
              user={currentUser} 
              onBack={() => setAppState("dashboard")} 
            />
          )}
          {appState === "report_feed" && (
            <ReportFeed 
              user={currentUser} 
              onBack={() => setAppState("dashboard")} 
            />
          )}
          
          {showPinModal && (
            <PinModal 
              userId={currentUser.UserID} 
              onClose={() => setShowPinModal(false)} 
            />
          )}
        </>
      )}
    </div>
  );
}
