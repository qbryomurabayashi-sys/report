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
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    console.log("BTTF App Version: 4.1.0 (Firebase)");

    // Temporary migration trigger
    const triggerMigration = async () => {
      const hasMigrated = localStorage.getItem("has_migrated_to_firestore");
      if (!hasMigrated) {
        try {
          const res = await fetch("/api/migrate", { method: "POST" });
          if (res.ok) {
            localStorage.setItem("has_migrated_to_firestore", "true");
            console.log("Migration to Firestore triggered successfully.");
          }
        } catch (e) {
          console.error("Migration trigger failed", e);
        }
      }
    };
    triggerMigration();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setCurrentUser(userData);
            setAppState("dashboard");
            
            // Request notification permission and subscribe on login
            if ("Notification" in window) {
              Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                  subscribeToPush(userData.UserID);
                }
              });
            }
          } else {
            // User exists in Auth but not in Firestore
            // This might happen if it's a new Google user
            setAppState("login");
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setAppState("login");
        }
      } else {
        setCurrentUser(null);
        setAppState("login");
      }
      setIsAuthReady(true);
    });

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

    return () => unsubscribe();
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

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setCurrentUser(null);
      setAppState("login");
    } catch (error) {
      console.error("Logout error:", error);
    }
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

  if (!isAuthReady || appState === "loading") {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
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

        {appState === "login" && !currentUser && (
          <Login onLogin={handleLogin} />
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
    </ErrorBoundary>
  );
}
