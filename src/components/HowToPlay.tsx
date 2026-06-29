/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { GameSettings, ControlMapping, Character } from "../types";
import { sound } from "./SoundManager";
import { ChevronLeft, Keyboard, HelpCircle, Gamepad2, Play } from "lucide-react";

interface HowToPlayProps {
  controls: ControlMapping[];
  selectedCharacter: Character;
  settings: GameSettings;
  onBack: () => void;
  onPlay: () => void;
}

export const HowToPlay: React.FC<HowToPlayProps> = ({
  controls,
  selectedCharacter,
  settings,
  onBack,
  onPlay,
}) => {
  const isThai = settings.language === "th";

  return (
    <div id="how-to-play-container" className="relative w-full h-screen overflow-y-auto select-none bg-[#0c0c14] text-white flex flex-col justify-between font-sans">
      {/* Background neon ambient lights */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Grid Scanline and Dot Matrix */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-indigo-950/15 via-transparent to-transparent z-0" />
      <div className="absolute inset-0 pointer-events-none radial-dots opacity-40 z-0" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] opacity-20 z-0" />

      {/* Top Header */}
      <header className="relative w-full px-6 py-5 flex items-center justify-between border-b border-purple-500/20 bg-[#0c0c14]/90 backdrop-blur-md z-10 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <button
          id="btn-back-from-help"
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          onMouseEnter={() => sound.playHover()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-500/30 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-900/30 hover:text-white hover:border-cyan-400 transition-all cursor-pointer font-bold"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm font-bold uppercase tracking-wider">{isThai ? "กลับหน้าหลัก" : "Back"}</span>
        </button>

        <h1 className="text-lg md:text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-purple-300 uppercase italic">
          {isThai ? "วิธีการเล่น & คู่มือควบคุม" : "How To Play Guide"}
        </h1>

        <div className="w-[120px] text-right font-mono text-xs text-cyan-400 font-bold tracking-wider uppercase">
          [ MANUAL ]
        </div>
      </header>

      {/* Manual Content */}
      <main className="relative flex-1 p-6 max-w-4xl w-full mx-auto z-10 flex flex-col justify-center items-center">
        <motion.div
          id="manual-card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-slate-950/40 rounded-2xl border border-purple-500/15 p-6 md:p-8 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
        >
          {/* Welcome header */}
          <div className="flex items-center gap-3 border-b border-purple-500/15 pb-4 mb-6">
            <Gamepad2 className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                {isThai ? "ระบบจำลองการกดปุ่มประลอง" : "Dynamic Custom Controller Arena"}
              </h2>
              <p className="text-xs text-purple-300 font-medium">
                {isThai
                  ? "เรียนรู้วิธีการควบคุมและใช้ปุ่มสัมผัสในการเล่นเกมสนามประลอง"
                  : "Understand mappings for your chosen character to control them in the Sandbox."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            {/* Left Col: Mapped Control Keys */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono tracking-widest uppercase text-cyan-400 font-bold flex items-center gap-1.5">
                <Keyboard className="w-4 h-4" />
                {isThai ? "ปุ่มควบคุมที่ตั้งค่าไว้" : "YOUR CURRENT MAPPINGS"}
              </h3>

              <div className="space-y-2.5">
                {controls.map((ctrl) => (
                  <div
                    id={`manual-row-${ctrl.action}`}
                    key={ctrl.action}
                    className="flex items-center justify-between p-3 rounded-xl border border-purple-500/10 bg-slate-950/50 hover:border-cyan-500/20 transition-colors"
                  >
                    <div className="text-left">
                      <div className="text-xs font-black text-white">{ctrl.label}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 font-medium">{ctrl.description}</div>
                    </div>
                    {/* Keycode Badge */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-black px-2.5 py-1 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300 shadow-sm uppercase">
                        {ctrl.key}
                      </span>
                      <span className="text-[10px] text-purple-300/60 font-mono font-bold">[{ctrl.mobileBtnLabel}]</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Col: Gameplay Actions for chosen character */}
            <div className="space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-mono tracking-widest uppercase text-cyan-400 font-bold flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" />
                  {isThai ? "ทักษะตัวละครปัจจุบัน" : "CURRENT WARRIOR SKILLS"}
                </h3>

                {/* Character Profile Brief */}
                <div className="mt-4 p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/10 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0c0c14] flex items-center justify-center text-3xl border border-cyan-500/20">
                    {selectedCharacter.avatar}
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-black text-white" style={{ color: selectedCharacter.color }}>
                      {isThai ? selectedCharacter.thaiName : selectedCharacter.name}
                    </h4>
                    <span className="text-[10px] font-mono text-purple-300 uppercase tracking-widest font-bold">
                      {isThai ? selectedCharacter.thaiTitle : selectedCharacter.title}
                    </span>
                  </div>
                </div>

                {/* Combos list */}
                <div className="mt-4 space-y-2.5 text-xs text-gray-300 leading-relaxed font-medium">
                  <p>
                    ⚡ <strong className="text-white">{isThai ? "เดินซ้าย-ขวา:" : "Move Left / Right:"}</strong>{" "}
                    {isThai ? "ก้าวเท้าไปตามทิศทางเพื่อจัดตำแหน่งรุกรับ" : "Step around to position yourself."}
                  </p>
                  <p>
                    🚀 <strong className="text-white">{isThai ? "ปุ่มกระโดด:" : "Jump Action:"}</strong>{" "}
                    {isThai ? "เหินขึ้นกลางอากาศเพื่อหลบสิ่งกีดขวางหรือโจมตีทางอากาศ" : "Leap vertically to evade or strike from above."}
                  </p>
                  <p>
                    ⚔️ <strong className="text-white">{isThai ? "โจมตีธรรมดา:" : "Basic Slash:"}</strong>{" "}
                    {isThai ? "โจมตีศัตรูด้านหน้า และเพิ่มแต้มพลังโจมตีต่อเนื่อง" : "Strike targets to chain high dynamic hit counts."}
                  </p>
                  <p>
                    🔥{" "}
                    <strong style={{ color: selectedCharacter.color }}>
                      {isThai ? "ท่าไม้ตาย: " : "Ultimate Force: "}
                    </strong>
                    {isThai ? selectedCharacter.specialMove.thaiName : selectedCharacter.specialMove.name} —{" "}
                    {isThai ? selectedCharacter.specialMove.thaiDescription : selectedCharacter.specialMove.description}
                  </p>
                </div>
              </div>

              {/* Tips block */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-purple-500/15 text-[11px] text-purple-300 text-left font-medium">
                💡 <strong>{isThai ? "เคล็ดลับสัมผัส:" : "Touch Tip:"}</strong>{" "}
                {isThai
                  ? "หากต้องการเล่นบนมือถือ/แท็บเล็ต คุณสามารถตั้งปุ่มสัมผัสเสมือนให้กว้าง โปร่งแสง หรือสลับขวาซ้ายได้ในหน้าเมนูตั้งค่า!"
                  : "If running on phone/tablets, fine-tune the touch layout, swap buttons, and adjust scaling inside Options for premium control feel!"}
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Confirmation play button footer */}
      <footer className="relative w-full px-6 py-5 flex items-center justify-center z-10 border-t border-purple-950/40 bg-[#0c0c14]/90 backdrop-blur-md">
        <button
          id="btn-play-from-help"
          onClick={() => {
            sound.playSelect();
            onPlay();
          }}
          onMouseEnter={() => sound.playHover()}
          className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-black tracking-widest text-sm text-white bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:scale-103 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer transition-all uppercase"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>{isThai ? "ไปลุยที่สนามประลองทันที" : "GO TO TESTING ARENA NOW"}</span>
        </button>
      </footer>
    </div>
  );
};
