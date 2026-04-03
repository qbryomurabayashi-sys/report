import React, { useState } from "react";
import { motion } from "motion/react";
import { User } from "../types";
import { auth, db } from "../firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface LoginProps {
  onLogin: (user: User) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  const handleLogoClick = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (newCount >= 10) {
      setTapCount(0);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      if (userDoc.exists()) {
        onLogin(userDoc.data() as User);
      } else {
        // New user - for now, let's try to match by email from db.json or assign default
        // In a real app, you'd have a registration form here.
        // Let's check if this email is the admin email
        let role: any = "店長";
        let area = "未設定";
        
        if (firebaseUser.email === "qb.ryo.murabayashi@gmail.com") {
          role = "BM";
          area = "本部";
        }

        const newUser: User = {
          UserID: firebaseUser.uid,
          Name: firebaseUser.displayName || "ゲストユーザー",
          Role: role,
          Area: area
        };

        await setDoc(doc(db, "users", firebaseUser.uid), {
          ...newUser,
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          createdAt: new Date().toISOString()
        });

        onLogin(newUser);
      }
    } catch (err: any) {
      console.error("Google login error:", err);
      setError("Googleログインに失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, pin })
      });
      
      const result = await response.json();
      
      if (result.success) {
        onLogin(result.user);
      } else {
        setError(result.error || "ログインに失敗しました");
      }
    } catch (err: any) {
      setError("通信エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-dark-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="glass-card p-8 rounded-2xl w-full max-w-md neon-border relative overflow-hidden"
      >
        {/* BTTF Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-blue to-transparent opacity-50" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-orange to-transparent opacity-50" />

        <div className="text-center mb-12">
          <h1 
            onClick={handleLogoClick}
            className="text-5xl font-bold font-digital neon-text-blue mb-4 tracking-widest cursor-pointer select-none active:scale-95 transition-transform"
          >
            BTTF
          </h1>
          <p className="text-gray-500 font-digital tracking-widest text-xs uppercase">管理システム</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-digital text-gray-500 uppercase tracking-[0.2em] ml-1">
                ユーザーIDを入力
              </label>
              <input
                type="text"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-black/50 border border-gray-800 rounded-lg p-4 focus:border-neon-blue outline-none transition-all font-digital text-neon-blue text-lg tracking-widest"
                placeholder="ENTER USER ID"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-digital text-gray-500 uppercase tracking-[0.2em] ml-1">パスワード</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-black/50 border border-gray-800 rounded-lg p-4 focus:border-neon-blue outline-none transition-all font-digital text-neon-blue text-lg tracking-widest"
              placeholder="********"
              required
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-900/40 border border-red-500/50 rounded-lg backdrop-blur-sm space-y-2"
            >
              <p className="text-neon-red text-[10px] font-digital text-center tracking-widest leading-relaxed">
                {error}
              </p>
            <div className="flex justify-center gap-4">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="text-[8px] font-digital text-red-400 hover:text-red-300 underline underline-offset-4 uppercase tracking-widest"
                >
                  [ 再試行 / RETRY ]
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if ('serviceWorker' in navigator) {
                      const registrations = await navigator.serviceWorker.getRegistrations();
                      for (let registration of registrations) {
                        await registration.unregister();
                      }
                      const cacheNames = await caches.keys();
                      for (let name of cacheNames) {
                        await caches.delete(name);
                      }
                      window.location.reload();
                    }
                  }}
                  className="text-[8px] font-digital text-red-400 hover:text-red-300 underline underline-offset-4 uppercase tracking-widest"
                >
                  [ 強制更新 / FORCE UPDATE ]
                </button>
              </div>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-transparent border border-neon-blue text-neon-blue py-4 rounded-lg font-bold uppercase tracking-[0.3em] hover:bg-neon-blue hover:text-black transition-all hover:shadow-[0_0_20px_#00f3ff] disabled:opacity-50 font-digital"
          >
            {isLoading ? "認証中..." : "ログイン"}
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-[8px] uppercase tracking-widest">
              <span className="bg-dark-bg px-2 text-gray-500 font-digital">OR</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white text-black py-4 rounded-lg font-bold uppercase tracking-[0.1em] hover:bg-gray-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50 font-sans"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Googleでログイン
          </button>
        </form>

        <div className="mt-8 text-center space-y-2">
          <p className="text-[8px] text-gray-700 font-digital tracking-widest uppercase">
            アクセス制限 • 関係者以外立入禁止
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
            <p className="text-[7px] font-digital tracking-widest uppercase text-green-500">
              SYSTEM ONLINE (FIREBASE)
            </p>
          </div>
          <p className="text-[6px] text-gray-500 font-digital mt-1">VER 4.1.0 - 20260403</p>
        </div>
      </motion.div>
    </div>
  );
}
