/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ControlMapping, ActionType, GameSettings, MobileLayoutSettings } from "../types";
import { sound } from "./SoundManager";
import { DEFAULT_CONTROLS, DEFAULT_MOBILE_LAYOUT } from "../data";
import {
  ChevronLeft,
  Keyboard,
  Smartphone,
  RotateCcw,
  Sliders,
  Check,
  Zap,
  HelpCircle,
  Eye,
  Minimize2,
  SlidersHorizontal
} from "lucide-react";

interface ControlsSettingsProps {
  controls: ControlMapping[];
  setControls: React.Dispatch<React.SetStateAction<ControlMapping[]>>;
  mobileLayout: MobileLayoutSettings;
  setMobileLayout: React.Dispatch<React.SetStateAction<MobileLayoutSettings>>;
  settings: GameSettings;
  setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
  onBack: () => void;
}

export const ControlsSettings: React.FC<ControlsSettingsProps> = ({
  controls,
  setControls,
  mobileLayout,
  setMobileLayout,
  settings,
  setSettings,
  onBack,
}) => {
  const isThai = settings.language === "th";
  const [activeTab, setActiveTab] = useState<"keyboard" | "touch" | "general">("keyboard");
  const [rebindingAction, setRebindingAction] = useState<ActionType | null>(null);

  // Keyboard Re-binding Key Listener
  useEffect(() => {
    if (!rebindingAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();

      // Don't bind Escape key directly so they can cancel
      if (e.key === "Escape") {
        setRebindingAction(null);
        sound.playClick();
        return;
      }

      // Format clean readable string for display
      let displayKey = e.key.toUpperCase();
      if (displayKey === " ") displayKey = "SPACE";
      if (displayKey === "ARROWUP") displayKey = "▲ UP";
      if (displayKey === "ARROWDOWN") displayKey = "▼ DOWN";
      if (displayKey === "ARROWLEFT") displayKey = "◀ LEFT";
      if (displayKey === "ARROWRIGHT") displayKey = "▶ RIGHT";

      // Update control mapping
      setControls((prev) =>
        prev.map((c) => {
          if (c.action === rebindingAction) {
            return {
              ...c,
              key: displayKey,
              code: e.code,
            };
          }
          return c;
        })
      );

      setRebindingAction(null);
      sound.playSelect();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [rebindingAction, setControls]);

  const handleResetControls = () => {
    sound.playSelect();
    setControls(JSON.parse(JSON.stringify(DEFAULT_CONTROLS)));
    setMobileLayout({ ...DEFAULT_MOBILE_LAYOUT });
  };

  const handleStartRebind = (action: ActionType) => {
    sound.playClick();
    setRebindingAction(action);
  };

  return (
    <div id="controls-settings-container" className="relative w-full h-screen overflow-y-auto select-none bg-[#0c0c14] text-white flex flex-col justify-between font-sans">
      {/* Background neon ambient lights */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Grid Scanline and Dot Matrix */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-indigo-950/15 via-transparent to-transparent z-0" />
      <div className="absolute inset-0 pointer-events-none radial-dots opacity-40 z-0" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] opacity-20 z-0" />

      {/* Top Bar Navigation */}
      <header className="relative w-full px-6 py-5 flex items-center justify-between border-b border-purple-500/20 bg-[#0c0c14]/90 backdrop-blur-md z-10 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <button
          id="btn-back-from-controls"
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          onMouseEnter={() => sound.playHover()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-500/30 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-900/30 hover:text-white hover:border-cyan-400 transition-all cursor-pointer font-bold"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm font-bold uppercase tracking-wider">{isThai ? "กลับหน้าหลัก" : "Back to Menu"}</span>
        </button>

        <h1 className="text-lg md:text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-purple-300 uppercase italic">
          {isThai ? "ปรับค่าและตั้งค่าการบังคับ" : "Control Mappings & Options"}
        </h1>

        <button
          id="btn-reset-defaults"
          onClick={handleResetControls}
          onMouseEnter={() => sound.playHover()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-900/40 bg-rose-950/15 text-xs text-rose-300 hover:bg-rose-900/30 hover:text-white transition-all cursor-pointer"
          title={isThai ? "รีเซ็ตค่าเริ่มต้นทั้งหมด" : "Reset all mappings to default"}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="font-bold">{isThai ? "รีเซ็ตเริ่มต้น" : "Reset"}</span>
        </button>
      </header>

      {/* Main Settings Section */}
      <main className="relative flex-1 p-4 md:p-6 max-w-5xl w-full mx-auto z-10 flex flex-col gap-6">
        {/* Navigation Tabs */}
        <div id="settings-tab-bar" className="flex rounded-xl bg-slate-950/80 p-1.5 border border-purple-500/15 w-full max-w-md mx-auto backdrop-blur-md">
          <button
            id="tab-keyboard"
            onClick={() => {
              sound.playClick();
              setActiveTab("keyboard");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === "keyboard"
                ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)] font-black"
                : "text-cyan-300/60 hover:text-cyan-300 hover:bg-cyan-950/20"
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>{isThai ? "แป้นพิมพ์" : "Keyboard"}</span>
          </button>

          <button
            id="tab-touch"
            onClick={() => {
              sound.playClick();
              setActiveTab("touch");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === "touch"
                ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)] font-black"
                : "text-cyan-300/60 hover:text-cyan-300 hover:bg-cyan-950/20"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{isThai ? "ปุ่มสัมผัส" : "Touch"}</span>
          </button>

          <button
            id="tab-general"
            onClick={() => {
              sound.playClick();
              setActiveTab("general");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === "general"
                ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)] font-black"
                : "text-cyan-300/60 hover:text-cyan-300 hover:bg-cyan-950/20"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{isThai ? "ทั่วไป" : "General"}</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div id="tab-panel-viewport" className="flex-1 bg-slate-950/40 rounded-2xl border border-purple-500/15 p-6 backdrop-blur-md min-h-[360px] flex flex-col justify-start">
          {/* TAB 1: KEYBOARD CONFIGURATION */}
          {activeTab === "keyboard" && (
            <div id="keyboard-config-panel" className="space-y-4">
              <div className="flex items-center justify-between border-b border-purple-950/50 pb-3 mb-2">
                <div>
                  <h2 className="text-sm font-extrabold text-purple-200 uppercase tracking-widest">
                    {isThai ? "จับคู่ปุ่มควบคุมแป้นพิมพ์" : "Keyboard Key Bindings"}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    {isThai
                      ? "คลิกที่การกระทำที่ต้องการแล้วกดปุ่มใดๆ เพื่อเชื่อมโยงปุ่มควบคุมใหม่"
                      : "Click on any action to bind a new key of your choice."}
                  </p>
                </div>
                <Keyboard className="w-5 h-5 text-purple-400 opacity-60" />
              </div>

              {/* Bindings List */}
              <div className="grid grid-cols-1 gap-3">
                {controls.map((control) => (
                  <div
                    id={`keyboard-row-${control.action}`}
                    key={control.action}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-purple-900/20 bg-purple-950/10 hover:bg-purple-950/20 hover:border-purple-500/30 transition-all gap-3"
                  >
                    <div className="text-left">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-indigo-950 text-indigo-300 tracking-wider">
                        {control.action}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1.5">{control.label}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{control.description}</p>
                    </div>

                    <button
                      id={`btn-rebind-${control.action}`}
                      onClick={() => handleStartRebind(control.action)}
                      onMouseEnter={() => sound.playHover()}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-purple-500/40 bg-purple-900/20 text-sm font-bold text-white hover:bg-purple-600 cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.1)] hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all min-w-[120px] text-center uppercase tracking-wide flex items-center justify-center gap-2"
                    >
                      <span className="font-mono text-amber-300 bg-slate-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                        {control.key}
                      </span>
                      <span className="text-xs text-purple-300 group-hover:text-white">
                        {isThai ? "[ ตั้งปุ่ม ]" : "[ REBIND ]"}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: TOUCH CONTROLS CONFIGURATION (FOR MOBILE/TOUCH DEVICES) */}
          {activeTab === "touch" && (
            <div id="touch-config-panel" className="space-y-6">
              <div className="flex items-center justify-between border-b border-purple-950/50 pb-3 mb-2">
                <div>
                  <h2 className="text-sm font-extrabold text-purple-200 uppercase tracking-widest">
                    {isThai ? "ปรับตั้งค่าปุ่มสัมผัสเสมือน" : "On-Screen Touch Controls Setup"}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    {isThai
                      ? "เลือกขนาด ทิศทาง และความโปร่งใสของปุ่มควบคุมเสมือนบนจอภาพ"
                      : "Modify the sizing, visibility, and handedness of virtual touchscreen controls."}
                  </p>
                </div>
                <Smartphone className="w-5 h-5 text-purple-400 opacity-60" />
              </div>

              {/* Sizing & Customizations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                {/* Left col: settings sliders */}
                <div className="space-y-5">
                  {/* BUTTON OPACITY */}
                  <div>
                    <label className="flex justify-between text-xs font-bold text-gray-300 mb-2">
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-purple-400" />
                        {isThai ? "ความโปร่งใสของปุ่มสัมผัส" : "On-Screen Opacity"}
                      </span>
                      <span className="font-mono text-purple-400">{Math.round(mobileLayout.opacity * 100)}%</span>
                    </label>
                    <input
                      id="input-opacity-slider"
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.1"
                      value={mobileLayout.opacity}
                      onChange={(e) => {
                        setMobileLayout((prev) => ({ ...prev, opacity: parseFloat(e.target.value) }));
                        sound.playClick();
                      }}
                      className="w-full h-2 bg-purple-950/80 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>

                  {/* BUTTON SIZE */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-300 mb-2">
                      <Minimize2 className="w-4 h-4 text-purple-400" />
                      {isThai ? "ขนาดของปุ่ม (Button Size)" : "Button Dimensions"}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["sm", "md", "lg"] as const).map((size) => (
                        <button
                          id={`btn-size-${size}`}
                          key={size}
                          onClick={() => {
                            sound.playClick();
                            setMobileLayout((prev) => ({ ...prev, buttonSize: size }));
                          }}
                          className={`py-2 px-3 rounded-lg text-xs font-extrabold tracking-wider border cursor-pointer capitalize ${
                            mobileLayout.buttonSize === size
                              ? "border-purple-500 bg-purple-900/30 text-white"
                              : "border-purple-950 bg-[#0d0a1b]/40 text-purple-300/60 hover:text-purple-300"
                          }`}
                        >
                          {size === "sm" ? (isThai ? "เล็ก" : "Small") : size === "md" ? (isThai ? "กลาง" : "Medium") : (isThai ? "ใหญ่" : "Large")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* LAYOUT D-PAD TYPE */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-300 mb-2">
                      <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                      {isThai ? "ประเภทปุ่มทิศทาง" : "D-Pad Style"}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        id="btn-layout-dpad"
                        onClick={() => {
                          sound.playClick();
                          setMobileLayout((prev) => ({ ...prev, layoutType: "dpad" }));
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-extrabold border cursor-pointer ${
                          mobileLayout.layoutType === "dpad"
                            ? "border-purple-500 bg-purple-900/30 text-white"
                            : "border-purple-950 bg-[#0d0a1b]/40 text-purple-300/60"
                        }`}
                      >
                        {isThai ? "ปุ่มแยก 4 ทิศทาง" : "Classic Cross D-Pad"}
                      </button>
                      <button
                        id="btn-layout-joystick"
                        onClick={() => {
                          sound.playClick();
                          setMobileLayout((prev) => ({ ...prev, layoutType: "joystick" }));
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-extrabold border cursor-pointer ${
                          mobileLayout.layoutType === "joystick"
                            ? "border-purple-500 bg-purple-900/30 text-white"
                            : "border-purple-950 bg-[#0d0a1b]/40 text-purple-300/60"
                        }`}
                      >
                        {isThai ? "จอยสติ๊กหมุน (Joystick)" : "Analog Joystick"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right col: layout ergonomics */}
                <div className="space-y-5">
                  {/* HANDEDNESS (Movement direction placement) */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-300 mb-2">
                      <Zap className="w-4 h-4 text-purple-400" />
                      {isThai ? "ความถนัดของมือบังคับ" : "Handedness Ergonomics"}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        id="btn-hand-right"
                        onClick={() => {
                          sound.playClick();
                          setMobileLayout((prev) => ({ ...prev, handedness: "right" }));
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-extrabold border cursor-pointer ${
                          mobileLayout.handedness === "right"
                            ? "border-purple-500 bg-purple-900/30 text-white"
                            : "border-purple-950 bg-[#0d0a1b]/40 text-purple-300/60"
                        }`}
                      >
                        {isThai ? "มือขวา (ทิศทางซ้าย/แอคชั่นขวา)" : "Normal Righty"}
                      </button>
                      <button
                        id="btn-hand-left"
                        onClick={() => {
                          sound.playClick();
                          setMobileLayout((prev) => ({ ...prev, handedness: "left" }));
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-extrabold border cursor-pointer ${
                          mobileLayout.handedness === "left"
                            ? "border-purple-500 bg-purple-900/30 text-white"
                            : "border-purple-950 bg-[#0d0a1b]/40 text-purple-300/60"
                        }`}
                      >
                        {isThai ? "มือซ้าย (ทิศทางขวา/แอคชั่นซ้าย)" : "Lefty Mode"}
                      </button>
                    </div>
                  </div>

                  {/* SWAP ACTION BUTTONS (A / B) */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-300 mb-2">
                      <RotateCcw className="w-4 h-4 text-purple-400" />
                      {isThai ? "สลับตำแหน่งปุ่ม แอคชั่น กับ ท่าไม้ตาย" : "Swap Action Button Orders"}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        id="btn-swap-actions-false"
                        onClick={() => {
                          sound.playClick();
                          setMobileLayout((prev) => ({ ...prev, swapActions: false }));
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-extrabold border cursor-pointer ${
                          !mobileLayout.swapActions
                            ? "border-purple-500 bg-purple-900/30 text-white"
                            : "border-purple-950 bg-[#0d0a1b]/40 text-purple-300/60"
                        }`}
                      >
                        {isThai ? "ปกติ [โจมตี ➔ พิเศษ]" : "Standard [ATK ➔ SPEC]"}
                      </button>
                      <button
                        id="btn-swap-actions-true"
                        onClick={() => {
                          sound.playClick();
                          setMobileLayout((prev) => ({ ...prev, swapActions: true }));
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-extrabold border cursor-pointer ${
                          mobileLayout.swapActions
                            ? "border-purple-500 bg-purple-900/30 text-white"
                            : "border-purple-950 bg-[#0d0a1b]/40 text-purple-300/60"
                        }`}
                      >
                        {isThai ? "สลับ [พิเศษ ➔ โจมตี]" : "Swapped [SPEC ➔ ATK]"}
                      </button>
                    </div>
                  </div>

                  {/* SENSORY VIBRATION FEEDBACK */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-300 mb-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      {isThai ? "สั่นตอบสนองการกดสัมผัส" : "Haptic Vibration Feedback"}
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input
                          id="chk-vibe-on"
                          type="checkbox"
                          checked={settings.vibration}
                          onChange={(e) => {
                            sound.playClick();
                            setSettings((prev) => ({ ...prev, vibration: e.target.checked }));
                          }}
                          className="rounded border-purple-900 text-purple-600 focus:ring-purple-500 w-4 h-4 accent-purple-500 cursor-pointer"
                        />
                        <span>{isThai ? "เปิดการสั่น (Vibe On)" : "Enable Vibration"}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GENERAL SETTINGS */}
          {activeTab === "general" && (
            <div id="general-config-panel" className="space-y-6 text-left">
              <div className="flex items-center justify-between border-b border-purple-950/50 pb-3 mb-2">
                <div>
                  <h2 className="text-sm font-extrabold text-purple-200 uppercase tracking-widest">
                    {isThai ? "การตั้งค่าทั่วไป" : "General Audio & Video Settings"}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    {isThai
                      ? "ปรับแต่งระดับเสียง และการแสดงผลหน้าจอสั่นไหว"
                      : "Fine-tune sound levels and visual camera screenshake options."}
                  </p>
                </div>
                <Sliders className="w-5 h-5 text-purple-400 opacity-60" />
              </div>

              <div className="max-w-md space-y-5">
                {/* SYSTEM SFX VOLUME */}
                <div>
                  <label className="flex justify-between text-xs font-bold text-gray-300 mb-2">
                    <span>{isThai ? "ระดับความดังเสียงเกม" : "Sound Effects Volume"}</span>
                    <span className="font-mono text-purple-400">{Math.round(settings.volume * 100)}%</span>
                  </label>
                  <input
                    id="input-sfx-vol"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.volume}
                    onChange={(e) => {
                      const vol = parseFloat(e.target.value);
                      setSettings((prev) => ({ ...prev, volume: vol }));
                      sound.setVolume(vol);
                      sound.playClick();
                    }}
                    className="w-full h-2 bg-purple-950/80 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                {/* CAMERA SCREEN SHAKE */}
                <div className="p-4 rounded-xl border border-purple-900/25 bg-purple-950/10 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold text-white">{isThai ? "เปิดหน้าจอสั่นตอนโจมตี" : "Camera Screen Shake"}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {isThai ? "สร้างแรงสั่นสะเทือนเมื่อโจมตีโดนเป้าหมาย" : "Triggers aesthetic rumble on landing hits."}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="toggle-screen-shake"
                      type="checkbox"
                      checked={settings.screenShake}
                      onChange={(e) => {
                        sound.playClick();
                        setSettings((prev) => ({ ...prev, screenShake: e.target.checked }));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Keyboard Rebinding Popup overlay */}
      <AnimatePresence>
        {rebindingAction && (
          <div
            id="rebind-modal-backdrop"
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4"
          >
            <motion.div
              id="rebind-modal-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-[#0c0c14] border-2 border-cyan-500 rounded-2xl p-6 text-center shadow-[0_0_35px_rgba(6,182,212,0.4)]"
            >
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
                <Keyboard className="w-6 h-6 text-cyan-400 animate-pulse" />
              </div>

              <h3 className="text-lg font-black tracking-wide text-white">
                {isThai ? "กำลังรอรับการกดปุ่ม..." : "Awaiting Input Press..."}
              </h3>

              <div className="my-5 p-3.5 rounded-xl bg-slate-950 border border-purple-950 text-left">
                <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 block font-bold">
                  {isThai ? "ปุ่มที่เลือก" : "Target Action"}
                </span>
                <span className="text-sm font-extrabold text-white">
                  {controls.find((c) => c.action === rebindingAction)?.label}
                </span>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed mb-6">
                {isThai
                  ? "กดปุ่มใดก็ได้บนแป้นพิมพ์เพื่อตั้งค่าเชื่อมโยงใหม่\n(กด 'ESC' เพื่อยกเลิก)"
                  : "Press any physical key on your keyboard to map it to this action.\n(Press 'ESC' to abort)"}
              </p>

              <button
                id="btn-rebind-cancel"
                onClick={() => {
                  sound.playClick();
                  setRebindingAction(null);
                }}
                className="px-4 py-2 rounded-lg border border-purple-950 hover:bg-slate-900 text-xs text-purple-400 font-bold transition-all cursor-pointer"
              >
                {isThai ? "ยกเลิกตั้งค่า" : "Cancel"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer bar */}
      <footer className="relative w-full px-6 py-5 flex items-center justify-center z-10 border-t border-purple-950/40 bg-[#0c0c14]/90 backdrop-blur-md">
        <button
          id="btn-confirm-save-controls"
          onClick={() => {
            sound.playSelect();
            onBack();
          }}
          onMouseEnter={() => sound.playHover()}
          className="px-8 py-3.5 rounded-xl font-black tracking-widest text-sm text-white bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:scale-103 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer transition-all uppercase"
        >
          {isThai ? "บันทึกและใช้ข้อมูลนี้" : "SAVE & USE CONFIGURATION"}
        </button>
      </footer>
    </div>
  );
};
