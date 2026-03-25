import React, { useState, useEffect } from "react";
import { motion } from "motion/react";

export function LoadingScreen() {
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => prev + 0.05);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-dark-bg z-[9999] flex flex-col items-center justify-center overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        className="text-7xl font-bold font-digital neon-text-blue mb-12 tracking-widest"
      >
        BTTF
      </motion.div>
      
      <div className="relative w-64 h-1 bg-white/5 overflow-hidden rounded-full">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-neon-blue shadow-[0_0_15px_#00f3ff]"
        />
      </div>

      <div className="mt-12 font-digital text-cyan-500 tracking-[0.3em] animate-pulse text-sm">
        システム初期化中...
      </div>
      
      <div className="mt-4 font-digital text-xs text-gray-600">
        {timer.toFixed(2)}s / 5.00s
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="scanner w-full h-[2px] bg-neon-blue absolute top-0" />
      </div>
    </div>
  );
}
