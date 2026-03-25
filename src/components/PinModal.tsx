import React, { useState } from "react";
import { motion } from "motion/react";
import { Key, X, Send } from "lucide-react";

interface PinModalProps {
  userId: string;
  onClose: () => void;
}

export function PinModal({ userId, onClose }: PinModalProps) {
  const [newPin, setNewPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[a-zA-Z0-9]{8,}$/.test(newPin)) {
      setError("8文字以上の半角英数字で入力してください");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/updatePin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPin }),
      });
      const data = await response.json();
      if (data.success) {
        alert("パスワードを更新しました");
        onClose();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("通信エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 rounded-2xl w-full max-w-md neon-border relative overflow-hidden"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-neon-blue transition-all">
          <X size={20} />
        </button>

        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-neon-blue/10 rounded-full flex items-center justify-center mx-auto mb-4 text-neon-blue">
            <Key size={24} />
          </div>
          <h3 className="text-xl font-bold neon-text-blue font-display tracking-tight">パスワード変更</h3>
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-digital mt-1">セキュリティ設定</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-digital text-gray-500 uppercase tracking-[0.2em] ml-1">新しいパスワード</label>
            <input
              type="text"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="w-full bg-black/50 border border-gray-800 rounded-lg p-4 focus:border-neon-blue outline-none transition-all font-digital text-neon-blue text-lg tracking-widest"
              placeholder="8文字以上"
              required
            />
            <p className="text-[8px] text-gray-700 font-digital tracking-widest uppercase mt-2">半角英数字のみ • 大文字小文字を区別</p>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-neon-red text-[10px] font-digital text-center tracking-widest"
            >
              {error}
            </motion.p>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-lg border border-gray-800 text-gray-500 font-digital text-xs uppercase tracking-widest hover:text-white transition-all"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading || !newPin}
              className="flex-1 bg-transparent border border-neon-blue text-neon-blue py-4 rounded-lg font-bold uppercase tracking-[0.2em] hover:bg-neon-blue hover:text-black transition-all hover:shadow-[0_0_20px_#00f3ff] disabled:opacity-50 font-digital flex items-center justify-center gap-2 text-xs"
            >
              <Send size={14} />
              {isLoading ? "更新中..." : "更新する"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
