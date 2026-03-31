import React, { useEffect, useRef, useState } from 'react';

export const MatrixLoading: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Matrix characters
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    const fontSize = 16;
    let columns = Math.floor(canvas.width / fontSize);
    let drops: number[] = [];

    for (let x = 0; x < columns; x++) {
      drops[x] = Math.floor(Math.random() * (canvas.height / fontSize));
    }

    const qbWord = "QBHOUSE";
    const qbDropConfigs = Array.from({ length: 3 }, () => ({
      startTime: Math.floor(Math.random() * 150) + 20,
      col: Math.floor(Math.random() * columns),
      startRow: Math.floor(Math.random() * (canvas.height / fontSize / 2)), // Random start height (top half)
      index: 0,
      active: false,
    }));
    let frameCount = 0;

    const draw = () => {
      // Translucent black background to create trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = fontSize + 'px monospace';

      frameCount++;
      
      // Check for starting new QB drops
      qbDropConfigs.forEach(config => {
        if (frameCount === config.startTime) {
          config.active = true;
          drops[config.col] = config.startRow;
          config.index = 0;
        }
      });

      for (let i = 0; i < drops.length; i++) {
        let text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        ctx.fillStyle = '#0F0'; // Green text
        
        // Check if this column is currently a QB drop
        const activeConfig = qbDropConfigs.find(c => c.active && c.col === i);
        
        if (activeConfig) {
          if (activeConfig.index < qbWord.length) {
            text = qbWord[activeConfig.index];
            ctx.fillStyle = '#3b82f6'; // Blue
            ctx.shadowColor = '#3b82f6';
            ctx.shadowBlur = 12;
            activeConfig.index++;
          } else {
            activeConfig.active = false;
          }
        }

        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        ctx.shadowBlur = 0; // Reset shadow

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);

    // Progress bar animation
    const duration = 7000; // 7 seconds
    const startTime = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(currentProgress);

      if (currentProgress < 100) {
        animationFrameId = requestAnimationFrame(updateProgress);
      } else {
        setTimeout(onComplete, 500); // Small delay before unmounting
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-70" />
      
      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6">
        <h1 
          className="text-green-500 font-mono text-3xl md:text-5xl font-bold tracking-widest mb-8 text-center"
          style={{ textShadow: '0 0 10px #0F0, 0 0 20px #0F0' }}
        >
          SYSTEM BOOT
        </h1>
        
        <div className="w-full space-y-2">
          <div className="flex justify-between text-green-500 font-mono text-sm mb-1">
            <span>INITIALIZING...</span>
            <span>{Math.floor(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-green-900/30 border border-green-500/50 rounded-none overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-75 ease-linear"
              style={{ 
                width: `${progress}%`,
                boxShadow: '0 0 10px #0F0'
              }}
            />
          </div>
        </div>

        <div className="mt-8 text-green-500/70 font-mono text-xs text-left w-full space-y-1 h-24 overflow-hidden">
          {progress > 10 && <p className="animate-pulse">Loading core modules...</p>}
          {progress > 30 && <p className="animate-pulse">Connecting to database...</p>}
          {progress > 50 && <p className="animate-pulse">Fetching workforce parameters...</p>}
          {progress > 70 && <p className="animate-pulse">Calculating optimal schedules...</p>}
          {progress > 90 && <p className="animate-pulse">System ready.</p>}
        </div>
      </div>
    </div>
  );
};
