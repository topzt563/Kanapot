/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { Character, GameSettings } from "../types";
import { DEFAULT_CHARACTERS } from "../data";
import { sound } from "./SoundManager";
import { ChevronLeft, Zap, Heart, Sword, Trophy } from "lucide-react";

interface CharacterSelectProps {
  selectedCharacter: Character;
  setSelectedCharacter: (char: Character) => void;
  onBack: () => void;
  settings: GameSettings;
}

export const CharacterSelect: React.FC<CharacterSelectProps> = ({
  selectedCharacter,
  setSelectedCharacter,
  onBack,
  settings,
}) => {
  const isThai = settings.language === "th";

  const handleSelect = (char: Character) => {
    sound.playSelect();
    setSelectedCharacter(char);
  };

  return (
    <div id="character-select-container" className="relative w-full h-screen overflow-y-auto select-none bg-[#0c0c14] text-white flex flex-col justify-between font-sans">
      {/* Background neon ambient lights */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Grid Scanline and Dot Matrix density */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-950/20 via-transparent to-transparent z-0" />
      <div className="absolute inset-0 pointer-events-none radial-dots opacity-40 z-0" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] opacity-20 z-0" />

      {/* Top Bar */}
      <header className="relative w-full px-6 py-5 flex items-center justify-between border-b border-purple-500/20 bg-[#0c0c14]/90 backdrop-blur-md z-10 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <button
          id="btn-back-from-char"
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          onMouseEnter={() => sound.playHover()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-500/30 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-900/30 hover:text-white hover:border-cyan-400 transition-all cursor-pointer font-bold"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm font-bold uppercase tracking-wider">{isThai ? "กลับไปหน้าหลัก" : "Back to Menu"}</span>
        </button>

        <h1 className="text-lg md:text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-purple-300 uppercase italic">
          {isThai ? "เลือกตัวละครเข้าสู้" : "Warrior Selection"}
        </h1>

        <div className="w-[120px] text-right font-mono text-xs text-cyan-400 font-bold tracking-wider uppercase">
          [ GRID SELECT ]
        </div>
      </header>

      {/* Centered Selector Panels */}
      <main className="relative flex-1 flex flex-col items-center justify-center p-6 z-10 max-w-6xl mx-auto w-full">
        {/* Helper title */}
        <p className="text-sm text-gray-400 mb-8 text-center tracking-wider max-w-md font-medium">
          {isThai
            ? "คลิกเลือกตัวละครที่ต้องการเพื่อนำไปทดลองบังคับด้วยปุ่มควบคุมของคุณ"
            : "Select a warrior to test with your custom control button layout."}
        </p>

        {/* Responsive Grid Layout */}
        <div id="character-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full items-stretch">
          {DEFAULT_CHARACTERS.map((char) => {
            const isSelected = char.id === selectedCharacter.id;

            return (
              <motion.div
                id={`char-card-${char.id}`}
                key={char.id}
                onClick={() => handleSelect(char)}
                onMouseEnter={() => sound.playHover()}
                whileHover={{ y: -6 }}
                className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? "border-cyan-500 bg-cyan-950/15 shadow-[0_0_25px_rgba(6,182,212,0.3)]"
                    : "border-purple-500/20 bg-purple-950/5 hover:border-cyan-500/40 hover:bg-cyan-950/5"
                }`}
              >
                {/* Selection indicator Badge */}
                {isSelected && (
                  <span className="absolute top-4 right-4 px-3 py-0.5 rounded-full text-[10px] uppercase font-mono font-black tracking-widest bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.6)]">
                    {isThai ? "ใช้งานอยู่" : "Active"}
                  </span>
                )}

                {/* Card Top: Avatar Symbol & Name */}
                <div className="flex flex-col items-center mb-6">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-4 transition-transform duration-300"
                    style={{
                      backgroundColor: `${char.color}15`,
                      border: `1.5px solid ${char.color}40`,
                      boxShadow: isSelected ? `0 0 20px ${char.color}30` : "none"
                    }}
                  >
                    <span className="animate-pulse" style={{ animationDuration: "3s" }}>
                      {char.avatar}
                    </span>
                  </div>

                  <h3
                    className="text-xl font-black tracking-wide text-center uppercase italic"
                    style={{ color: isSelected ? char.color : "#ffffff" }}
                  >
                    {isThai ? char.thaiName : char.name}
                  </h3>
                  <p className="text-[10px] text-purple-300 mt-1 uppercase font-mono tracking-widest font-bold">
                    {isThai ? char.thaiTitle : char.title}
                  </p>
                </div>

                {/* Character stats meters */}
                <div className="space-y-3.5 mb-6">
                  {/* SPEED */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1 text-gray-300">
                      <span className="flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-cyan-400" />
                        {isThai ? "ความเร็ว" : "Speed"}
                      </span>
                      <span className="font-mono text-cyan-400 font-bold">{char.stats.speed}/10</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden p-[1px] border border-cyan-500/10">
                      <div
                        className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                        style={{ width: `${char.stats.speed * 10}%` }}
                      />
                    </div>
                  </div>

                  {/* JUMP */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1 text-gray-300">
                      <span className="flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-blue-400" />
                        {isThai ? "ระยะกระโดด" : "Jump Height"}
                      </span>
                      <span className="font-mono text-blue-400 font-bold">{char.stats.jump}/10</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden p-[1px] border border-blue-500/10">
                      <div
                        className="h-full rounded-full bg-blue-400 transition-all duration-500"
                        style={{ width: `${char.stats.jump * 10}%` }}
                      />
                    </div>
                  </div>

                  {/* POWER */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1 text-gray-300">
                      <span className="flex items-center gap-1.5">
                        <Sword className="w-4 h-4 text-amber-500" />
                        {isThai ? "พลังโจมตี" : "Attack Power"}
                      </span>
                      <span className="font-mono text-amber-500 font-bold">{char.stats.power}/10</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden p-[1px] border border-amber-500/10">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-500"
                        style={{ width: `${char.stats.power * 10}%` }}
                      />
                    </div>
                  </div>

                  {/* DEFENSE */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1 text-gray-300">
                      <span className="flex items-center gap-1.5">
                        <Heart className="w-4 h-4 text-emerald-400" />
                        {isThai ? "พลังป้องกัน" : "Defense Rating"}
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">{char.stats.defense}/10</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden p-[1px] border border-emerald-500/10">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                        style={{ width: `${char.stats.defense * 10}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Special Move Area */}
                <div
                  className="p-3.5 rounded-xl text-xs border border-purple-500/15 bg-purple-950/10 text-left"
                  style={{ borderLeft: `3px solid ${char.color}` }}
                >
                  <div className="font-black mb-1 flex items-center gap-1" style={{ color: char.color }}>
                    <span>🔥</span>
                    <span>{isThai ? "ท่าไม้ตาย: " : "ULTIMATE: "}</span>
                    <span>{isThai ? char.specialMove.thaiName : char.specialMove.name}</span>
                  </div>
                  <p className="text-gray-400 leading-relaxed text-[11px] font-medium">
                    {isThai ? char.specialMove.thaiDescription : char.specialMove.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Button to confirm and go back */}
      <footer className="relative w-full px-6 py-5 flex items-center justify-center z-10 border-t border-purple-950/40 bg-[#0c0c14]/90 backdrop-blur-md">
        <button
          id="btn-confirm-character"
          onClick={() => {
            sound.playSelect();
            onBack();
          }}
          onMouseEnter={() => sound.playHover()}
          className="px-8 py-4 rounded-xl font-black tracking-widest text-sm text-white bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:scale-103 hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] cursor-pointer transition-all uppercase"
        >
          {isThai ? `เลือกและตกลงใช้งาน [ ${selectedCharacter.thaiName} ]` : `CONFIRM USE [ ${selectedCharacter.name} ]`}
        </button>
      </footer>
    </div>
  );
};
