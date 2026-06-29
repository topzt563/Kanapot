/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { GameView, GameSettings, Character } from "../types";
import { sound } from "./SoundManager";
import { Volume2, VolumeX, Settings, Play, ShieldAlert, Award, Languages, HelpCircle } from "lucide-react";

interface MainLauncherProps {
  onViewChange: (view: GameView) => void;
  settings: GameSettings;
  setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
  selectedCharacter: Character;
}

export const MainLauncher: React.FC<MainLauncherProps> = ({
  onViewChange,
  settings,
  setSettings,
  selectedCharacter,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Background Starfield Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Stars data
    const numStars = 100;
    const stars: Array<{ x: number; y: number; z: number; color: string }> = [];
    const colors = ["#ffffff", "#60a5fa", "#f59e0b", "#f472b6", "#a78bfa"];

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        z: Math.random() * width,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    const animate = () => {
      ctx.fillStyle = "rgba(11, 10, 22, 0.25)"; // Dark midnight overlay
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      stars.forEach((star) => {
        star.z -= 1.8; // Star speed
        if (star.z <= 0) {
          star.z = width;
          star.x = Math.random() * width - width / 2;
          star.y = Math.random() * height - height / 2;
        }

        // 3D Projection
        const px = (star.x / star.z) * cx + cx;
        const py = (star.y / star.z) * cy + cy;
        const size = (1 - star.z / width) * 4.5;

        // Skip if out of viewport bounds
        if (px < 0 || px > width || py < 0 || py > height) return;

        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.shadowBlur = size * 2;
        ctx.shadowColor = star.color;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      });

      // Grid perspective helper lines for that cyberpunk look
      ctx.strokeStyle = "rgba(147, 51, 234, 0.07)";
      ctx.lineWidth = 1;
      const gridCount = 20;
      for (let i = 0; i <= gridCount; i++) {
        // Vertical perspective lines
        const xFactor = i / gridCount;
        ctx.beginPath();
        ctx.moveTo(width * xFactor, height);
        ctx.lineTo(cx + (xFactor - 0.5) * 150, cy);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const toggleSound = () => {
    const newVolume = settings.volume > 0 ? 0 : 0.5;
    setSettings((prev) => ({ ...prev, volume: newVolume }));
    sound.setVolume(newVolume);
    sound.playClick();
  };

  const toggleLanguage = () => {
    const newLang = settings.language === "th" ? "en" : "th";
    setSettings((prev) => ({ ...prev, language: newLang }));
    sound.playSelect();
  };

  const handleMenuClick = (view: GameView) => {
    sound.playSelect();
    onViewChange(view);
  };

  return (
    <div id="main-launcher-container" className="relative w-full h-screen overflow-hidden flex flex-col justify-between select-none bg-[#0c0c14] font-sans">
      {/* Background ambient neon glow circles */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Dynamic Background Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none w-full h-full opacity-60" />

      {/* Grid Scanline and Dot Matrix Overlay for premium look */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#0c0c14]/30 to-[#0c0c14]/95 z-10" />
      <div className="absolute inset-0 pointer-events-none radial-dots opacity-40 z-10" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] z-10 opacity-30" />

      {/* Top Header Row (Volume, Lan, Version) */}
      <header className="relative w-full px-6 py-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.6)]" />
          <span className="font-mono text-xs text-cyan-300 tracking-widest vibrant-glow-cyan font-bold">SYSTEM ONLINE | V1.2</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Language Toggle */}
          <button
            id="lang-toggle"
            onClick={toggleLanguage}
            onMouseEnter={() => sound.playHover()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/20 text-xs text-cyan-300 font-semibold hover:bg-cyan-900/30 hover:border-cyan-400 transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.1)]"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{settings.language === "th" ? "EN" : "ไทย"}</span>
          </button>

          {/* Volume Toggle */}
          <button
            id="volume-toggle"
            onClick={toggleSound}
            onMouseEnter={() => sound.playHover()}
            className="p-2 rounded-lg border border-purple-500/30 bg-purple-950/20 text-purple-300 hover:bg-purple-900/30 hover:border-purple-400 hover:text-white transition-all cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.1)]"
            title={settings.language === "th" ? "เปิด/ปิดเสียง" : "Toggle Sound"}
          >
            {settings.volume > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
        </div>
      </header>

      {/* Centered Main Area */}
      <main className="relative flex-1 flex flex-col items-center justify-center z-20 px-4">
        {/* Animated Game Logo */}
        <motion.div
          id="launcher-logo-container"
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
          className="relative max-w-md md:max-w-xl flex flex-col items-center mb-8"
        >
          {/* Neon Logo glow behind */}
          <div className="absolute inset-0 bg-cyan-500/10 blur-3xl rounded-full" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-md" />

          {/* Required Logo Image */}
          <img
            id="game-logo"
            src="https://res.cloudinary.com/dsucg33fv/image/upload/v1782709347/logo_i8827v.png"
            alt="Arcade Logo"
            className="w-full h-auto max-h-[140px] md:max-h-[180px] object-contain drop-shadow-[0_0_25px_rgba(6,182,212,0.5)] hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />

          {/* Subtitle / Cyberpunk Badge */}
          <div className="mt-4 flex flex-col items-center gap-1.5">
            <span className="px-4 py-1 rounded-full bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-400/30 text-[10px] md:text-xs text-cyan-200 tracking-[0.25em] font-mono uppercase font-black animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              {settings.language === "th" ? "สนามประลองปรับแต่งปุ่มขั้นสูง" : "ADVANCED CONTROLLER arena"}
            </span>
          </div>
        </motion.div>

        {/* Current Character Preview Bubble */}
        <motion.div
          id="character-quick-preview"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8 flex items-center gap-4 px-5 py-3 rounded-2xl vibrant-glass border border-cyan-500/30 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)]"
        >
          <span className="text-3xl animate-bounce" style={{ animationDuration: "2s" }}>{selectedCharacter.avatar}</span>
          <div className="text-left">
            <div className="text-[9px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
              {settings.language === "th" ? "ตัวละครที่เลือก" : "SELECTED WARRIOR"}
            </div>
            <div className="text-base font-black text-white flex items-center gap-2">
              <span style={{ color: selectedCharacter.color }} className="tracking-wide">
                {settings.language === "th" ? selectedCharacter.thaiName : selectedCharacter.name}
              </span>
              <span className="text-xs text-purple-300 font-mono font-medium">
                [ {settings.language === "th" ? selectedCharacter.thaiTitle : selectedCharacter.title} ]
              </span>
            </div>
          </div>
        </motion.div>

        {/* Dynamic Navigation Menu Panel */}
        <motion.div
          id="launcher-menu-panel"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="w-full max-w-sm flex flex-col gap-3.5 px-4"
        >
          {/* PLAY BUTTON */}
          <button
            id="btn-play-game"
            onClick={() => handleMenuClick(GameView.GAMEPLAY)}
            onMouseEnter={() => sound.playHover()}
            className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 p-[1.5px] transition-all duration-300 hover:scale-103 hover:shadow-[0_0_30px_rgba(6,182,212,0.45)] cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center justify-center gap-3 rounded-[10px] bg-[#0c0c14]/95 px-6 py-4.5 text-white transition-colors group-hover:bg-transparent">
              <Play className="w-5 h-5 text-cyan-400 fill-cyan-400 group-hover:text-white group-hover:fill-white group-hover:scale-110 transition-transform duration-300" />
              <span className="font-sans text-base font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-purple-300 group-hover:from-white group-hover:to-white">
                {settings.language === "th" ? "เข้าสู่เกมสนามประลอง" : "ENTER GAME ARENA"}
              </span>
            </div>
          </button>

          {/* SELECT CHARACTER BUTTON */}
          <button
            id="btn-select-character"
            onClick={() => handleMenuClick(GameView.CHARACTER_SELECT)}
            onMouseEnter={() => sound.playHover()}
            className="group w-full flex items-center justify-between px-6 py-4 rounded-xl border border-purple-500/20 bg-purple-950/10 hover:bg-purple-950/20 hover:border-cyan-500/50 text-purple-200 hover:text-white transition-all duration-300 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-cyan-400 group-hover:text-pink-400 transition-colors" />
              <span className="text-sm font-black tracking-wider uppercase">
                {settings.language === "th" ? "เลือกตัวละครประลอง" : "SELECT WARRIOR"}
              </span>
            </div>
            <span className="text-sm text-cyan-400 font-mono group-hover:text-cyan-300 group-hover:translate-x-1 transition-all">➔</span>
          </button>

          {/* CONTROLS SETTINGS BUTTON */}
          <button
            id="btn-controls-settings"
            onClick={() => handleMenuClick(GameView.CONTROLS_SETTINGS)}
            onMouseEnter={() => sound.playHover()}
            className="group w-full flex items-center justify-between px-6 py-4 rounded-xl border border-purple-500/20 bg-purple-950/10 hover:bg-purple-950/20 hover:border-cyan-500/50 text-purple-200 hover:text-white transition-all duration-300 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-cyan-400 group-hover:text-purple-400 transition-colors" />
              <span className="text-sm font-black tracking-wider uppercase">
                {settings.language === "th" ? "ตั้งค่าปุ่ม & การควบคุม" : "CUSTOM CONTROLS & OPTIONS"}
              </span>
            </div>
            <span className="text-sm text-cyan-400 font-mono group-hover:text-cyan-300 group-hover:translate-x-1 transition-all">➔</span>
          </button>

          {/* HOW TO PLAY BUTTON */}
          <button
            id="btn-how-to-play"
            onClick={() => handleMenuClick(GameView.HOW_TO_PLAY)}
            onMouseEnter={() => sound.playHover()}
            className="group w-full flex items-center justify-between px-6 py-4 rounded-xl border border-purple-500/20 bg-purple-950/10 hover:bg-purple-950/20 hover:border-cyan-500/50 text-purple-200 hover:text-white transition-all duration-300 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-cyan-400 group-hover:text-emerald-400 transition-colors" />
              <span className="text-sm font-black tracking-wider uppercase">
                {settings.language === "th" ? "วิธีการเล่นเบื้องต้น" : "HOW TO PLAY GUIDE"}
              </span>
            </div>
            <span className="text-sm text-cyan-400 font-mono group-hover:text-cyan-300 group-hover:translate-x-1 transition-all">➔</span>
          </button>
        </motion.div>
      </main>

      {/* Footer / Copyright / Brand lines */}
      <footer className="relative w-full px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-3 z-20 border-t border-purple-950/40 bg-[#0c0c14]/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-mono text-[10px] md:text-xs text-gray-400 tracking-wider">
            {settings.language === "th"
              ? "ควบคุมผ่านแป้นพิมพ์ หรือแตะสัมผัสบนหน้าจออย่างอิสระ"
              : "SUPPORT KEYBOARD & ON-SCREEN TOUCH EMULATION"}
          </span>
        </div>

        <span className="font-mono text-[9px] md:text-xs text-gray-500 tracking-wider">
          © 2026 ARCADE CONTROLLER SYSTEM. ALL RIGHTS RESERVED.
        </span>
      </footer>
    </div>
  );
};
