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
    console.log("BTTF App Version: 3.8");
    // Initial 3s loading screen
    const timer = setTimeout(() => {
      setAppState("login");
    }, 3000);

    // Register Service Worker for PWA support
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('SW registered: ', registration);
          
          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 1000 * 60 * 60);

        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });

        // Automatically reload when a new Service Worker takes control
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            console.log('New version available! Auto-refreshing...');
            window.location.reload();
          }
        });
      });
    }

    return () => clearTimeout(timer);
  }, []);

  const subscribeToPush = async (userId: string) => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;

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
