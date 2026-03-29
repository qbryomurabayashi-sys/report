import React, { useState, useEffect } from "react";
import { LoadingScreen } from "./components/LoadingScreen";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { WeeklyForm } from "./components/WeeklyForm";
import { DecadeForm } from "./components/DecadeForm";
import { AMStatusForm } from "./components/AMStatusForm";
import { ReportFeed } from "./components/ReportFeed";
import { PinModal } from "./components/PinModal";
import { TaskManagement } from "./components/TaskManagement";
import { ProjectManagement } from "./components/ProjectManagement";
import { Settings } from "./components/Settings";
import { VersionInfo } from "./components/VersionInfo";
import { User, AppState } from "./types";
import { subscribeToPush, setupForegroundNotifications } from "./lib/notifications";

export default function App() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    console.log("BTTF App Version: 4.0.0");
    // Initial 3s loading screen
    const timer = setTimeout(() => {
      setAppState("login");
    }, 3000);

    // Setup foreground notifications
    setupForegroundNotifications();

    // Clear badge on startup
    if ("clearAppBadge" in navigator) {
      (navigator as any).clearAppBadge();
    }

    // Register Service Worker for PWA support
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('SW registered: ', registration);
          setSwRegistration(registration);
          
          // Force update check immediately on load
          registration.update().catch(err => console.log('SW update check failed:', err));
          
          // Check for updates every 15 minutes
          setInterval(() => {
            registration.update().catch(err => console.log('SW periodic update check failed:', err));
          }, 1000 * 60 * 15);

          // If there's already a waiting worker, show the banner
          if (registration.waiting) {
            setShowUpdateBanner(true);
          }

          // Listen for new service worker waiting
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setShowUpdateBanner(true);
                }
              });
            }
          });

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

  const handleUpdate = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
          window.location.reload();
        }
      } catch (e) {
        window.location.reload();
      }
    } else {
      window.location.reload();
    }
  };

  if (appState === "loading") {
    return <LoadingScreen />;
  }

  if (appState === "login") {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-dark-bg text-gray-200 font-sans selection:bg-neon-blue selection:text-black">
      {showUpdateBanner && (
        <div className="fixed top-0 left-0 w-full z-[100] bg-neon-blue text-black p-2 text-center font-digital flex items-center justify-center gap-4 shadow-[0_0_20px_#00f3ff]">
          <span className="text-xs font-bold uppercase tracking-widest">新しいバージョンが利用可能です</span>
          <button 
            onClick={handleUpdate}
            className="bg-black text-neon-blue px-4 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-gray-900 transition-all border border-black"
          >
            アップデートを適用
          </button>
        </div>
      )}
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
          {appState === "am_status_form" && (
            <AMStatusForm 
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
          {appState === "task_management" && (
            <TaskManagement 
              user={currentUser} 
              onBack={() => setAppState("dashboard")} 
            />
          )}
          {appState === "project_management" && (
            <ProjectManagement 
              user={currentUser} 
              onBack={() => setAppState("dashboard")} 
            />
          )}

          {appState === "settings" && (
            <Settings 
              user={currentUser} 
              onBack={() => setAppState("dashboard")} 
            />
          )}

          {appState === "version_info" && (
            <VersionInfo 
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
