import React, { useState } from "react";
import { motion } from "motion/react";
import { User, Role } from "../App";

interface LoginProps {
  onLogin: (user: User) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(true);
  const [isGasSet, setIsGasSet] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [showSetup, setShowSetup] = useState(false);

  const handleLogoClick = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (newCount >= 10) {
      setShowSetup(true);
      setTapCount(0);
    }
  };

  React.useEffect(() => {
    const fetchUsers = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      try {
        console.log("Fetching debug info...");
        const debugRes = await fetch("/api/debug", { 
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache' } // キャッシュを避ける
        });
        
        const contentType = debugRes.headers.get("content-type");
        if (!debugRes.ok || !contentType?.includes("application/json")) {
          const text = await debugRes.text().catch(() => "");
          if (text.includes("<!DOCTYPE html>")) {
            throw new Error("APIが未起動です（404エラー）。CloudflareのFunctionsが正しくデプロイされているか確認してください。");
          }
          throw new Error(`API接続エラー (Status: ${debugRes.status})。CloudflareのFunctionsがデプロイされていない可能性があります。`);
        }

        const debugData = await debugRes.json();
        console.log("Debug data received:", debugData);
        setIsGasSet(!!debugData.gasUrlSet);

        if (!debugData.gasUrlSet) {
          setError(`GAS_URLが未設定です。Cloudflareの管理画面で環境変数を設定するか、プログラムのFALLBACK_GAS_URLを確認してください。 (Env: ${debugData.environment})`);
          setIsFetchingUsers(false);
          return;
        }

        console.log("Fetching users from GAS...");
        const response = await fetch("/api/users", { signal: controller.signal });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`ユーザー取得失敗 (${response.status}): ${errorData.error || "GAS側のエラー"}`);
        }
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setUsers(data);
        } else {
          throw new Error("ユーザーリストが空です。スプレッドシートを確認してください。");
        }
      } catch (err: any) {
        console.error("Login fetch error:", err);
        if (err.name === 'AbortError') {
          setError("接続タイムアウト。ネットワークを確認してください。");
        } else {
          setError(`接続エラー: ${err.message}`);
        }
      } finally {
        clearTimeout(timeoutId);
        setIsFetchingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setIsLoading(true);
    setError("");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, pin }),
        signal: controller.signal
      });
      const data = await response.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setSelectedUserId(""); // Clear ID on failure
        setError(data.message);
      }
    } catch (err: any) {
      setSelectedUserId(""); // Clear ID on error
      if (err.name === 'AbortError') {
        setError("ログイン処理がタイムアウトしました。");
      } else {
        setError("通信エラーが発生しました");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const handleSetup = async () => {
    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for setup

    try {
      const res = await fetch("/api/setup", { 
        method: "POST",
        signal: controller.signal
      });
      const data = await res.json();
      if (data.success) {
        alert("Sheets initialized successfully: " + (data.message || ""));
        window.location.reload();
      } else {
        alert("Setup failed: " + data.message);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        alert("セットアップがタイムアウトしました。スプレッドシートの接続を確認してください。");
      } else {
        alert("Setup error: " + err);
      }
    } finally {
      clearTimeout(timeoutId);
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
        {isGasSet && showSetup && (
          <div className="mb-6 p-4 bg-blue-900/20 rounded-xl border border-blue-500/30">
            <p className="text-[10px] text-blue-400 mb-2 font-digital tracking-widest uppercase">Googleスプレッドシート連携：有効</p>
            <button
              onClick={handleSetup}
              type="button"
              disabled={isLoading}
              className="text-[10px] bg-blue-600/50 text-white px-3 py-1.5 rounded-md border border-blue-400/50 hover:bg-blue-600 transition-colors disabled:opacity-50 font-digital uppercase tracking-widest"
            >
              {isLoading ? "修復中..." : "シートの修復・初期設定"}
            </button>
          </div>
        )}
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
        </form>

        <div className="mt-8 text-center space-y-2">
          <p className="text-[8px] text-gray-700 font-digital tracking-widest uppercase">
            アクセス制限 • 関係者以外立入禁止
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isGasSet ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-red-500 shadow-[0_0_8px_#ef4444]"}`} />
            <p className={`text-[7px] font-digital tracking-widest uppercase ${isGasSet ? "text-green-500" : "text-red-500"}`}>
              {isGasSet ? "SYSTEM ONLINE (GAS)" : "OFFLINE / LOCAL MODE"}
            </p>
          </div>
          <p className="text-[6px] text-gray-500 font-digital mt-1">VER 3.7 - 20260325</p>
        </div>
      </motion.div>
    </div>
  );
}
