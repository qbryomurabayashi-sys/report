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

  React.useEffect(() => {
    const fetchUsers = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      try {
        const debugRes = await fetch("/api/debug", { signal: controller.signal });
        const debugData = await debugRes.json();
        setIsGasSet(debugData.gasUrlSet);

        const response = await fetch("/api/users", { signal: controller.signal });
        const data = await response.json();
        setUsers(data);
      } catch (err: any) {
        console.error("Failed to fetch users", err);
        if (err.name === 'AbortError') {
          setError("ユーザー情報の取得がタイムアウトしました。再試行してください。");
        } else {
          setError("ユーザー情報の取得に失敗しました。");
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
        setError(data.message);
      }
    } catch (err: any) {
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
        {isGasSet && (
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
          <h1 className="text-5xl font-bold font-digital neon-text-blue mb-4 tracking-widest">BTTF</h1>
          <p className="text-gray-500 font-digital tracking-widest text-xs uppercase">管理システム</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-2">
            <label className="block text-[10px] font-digital text-gray-500 uppercase tracking-[0.2em] ml-1">名前を選択</label>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-black/50 border border-gray-800 rounded-lg p-4 focus:border-neon-blue outline-none transition-all font-digital text-neon-blue text-lg tracking-widest appearance-none"
                required
                disabled={isFetchingUsers}
              >
                <option value="">{isFetchingUsers ? "読み込み中..." : "-- 選択してください --"}</option>
                {users.map((u) => (
                  <option key={u.UserID} value={u.UserID} className="bg-black text-neon-blue">
                    {u.Name} ({u.Role})
                  </option>
                ))}
              </select>
              {!isFetchingUsers && users.length === 0 && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-2 text-[10px] text-neon-orange font-digital uppercase tracking-widest hover:underline"
                >
                  再読み込み
                </button>
              )}
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
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-neon-red text-xs font-digital text-center tracking-widest"
            >
              {error}
            </motion.p>
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
            <div className={`w-1 h-1 rounded-full ${isGasSet ? "bg-green-500 shadow-[0_0_5px_#22c55e]" : "bg-gray-700"}`} />
            <p className="text-[6px] text-gray-800 font-digital tracking-widest uppercase">
              {isGasSet ? "スプレッドシート接続済み" : "ローカルモード"}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
