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
import { subscribeToPush } from "./lib/notifications";

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
