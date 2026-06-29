/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { GameView, ControlMapping, Character, MobileLayoutSettings, GameSettings } from "./types";
import {
  DEFAULT_CHARACTERS,
  DEFAULT_CONTROLS,
  DEFAULT_MOBILE_LAYOUT,
  DEFAULT_SETTINGS
} from "./data";
import { MainLauncher } from "./components/MainLauncher";
import { CharacterSelect } from "./components/CharacterSelect";
import { ControlsSettings } from "./components/ControlsSettings";
import { HowToPlay } from "./components/HowToPlay";
import { GameTestArena } from "./components/GameTestArena";
import { sound } from "./components/SoundManager";
import { AnimatePresence, motion } from "motion/react";

export default function App() {
  // --- STATE REGISTRATION & PERSISTENCE ---
  const [view, setView] = useState<GameView>(GameView.LAUNCHER);

  const [selectedCharacter, setSelectedCharacter] = useState<Character>(() => {
    try {
      const saved = localStorage.getItem("arcade_char");
      if (saved) {
        const found = DEFAULT_CHARACTERS.find((c) => c.id === saved);
        if (found) return found;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CHARACTERS[0];
  });

  const [controls, setControls] = useState<ControlMapping[]>(() => {
    try {
      const saved = localStorage.getItem("arcade_controls");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_CONTROLS));
  });

  const [mobileLayout, setMobileLayout] = useState<MobileLayoutSettings>(() => {
    try {
      const saved = localStorage.getItem("arcade_mobile_layout");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return { ...DEFAULT_MOBILE_LAYOUT };
  });

  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem("arcade_settings");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return { ...DEFAULT_SETTINGS };
  });

  // --- SAVE STATE TO STORAGE ON UPDATE ---
  useEffect(() => {
    try {
      localStorage.setItem("arcade_char", selectedCharacter.id);
    } catch (e) {
      console.error(e);
    }
  }, [selectedCharacter]);

  useEffect(() => {
    try {
      localStorage.setItem("arcade_controls", JSON.stringify(controls));
    } catch (e) {
      console.error(e);
    }
  }, [controls]);

  useEffect(() => {
    try {
      localStorage.setItem("arcade_mobile_layout", JSON.stringify(mobileLayout));
    } catch (e) {
      console.error(e);
    }
  }, [mobileLayout]);

  useEffect(() => {
    try {
      localStorage.setItem("arcade_settings", JSON.stringify(settings));
    } catch (e) {
      console.error(e);
    }
    // Sync active volume with synthesizer
    sound.setVolume(settings.volume);
  }, [settings]);

  // Handle visual page entry trigger
  useEffect(() => {
    // Prime synthesizer audio volume
    sound.setVolume(settings.volume);
  }, [settings.volume]);

  // --- SCREEN RENDERING CONTROLLER ---
  const renderView = () => {
    switch (view) {
      case GameView.LAUNCHER:
        return (
          <MainLauncher
            key="view-launcher"
            onViewChange={setView}
            settings={settings}
            setSettings={setSettings}
            selectedCharacter={selectedCharacter}
          />
        );

      case GameView.CHARACTER_SELECT:
        return (
          <CharacterSelect
            key="view-char-select"
            selectedCharacter={selectedCharacter}
            setSelectedCharacter={setSelectedCharacter}
            onBack={() => setView(GameView.LAUNCHER)}
            settings={settings}
          />
        );

      case GameView.CONTROLS_SETTINGS:
        return (
          <ControlsSettings
            key="view-controls-settings"
            controls={controls}
            setControls={setControls}
            mobileLayout={mobileLayout}
            setMobileLayout={setMobileLayout}
            settings={settings}
            setSettings={setSettings}
            onBack={() => setView(GameView.LAUNCHER)}
          />
        );

      case GameView.HOW_TO_PLAY:
        return (
          <HowToPlay
            key="view-how-to-play"
            controls={controls}
            selectedCharacter={selectedCharacter}
            settings={settings}
            onBack={() => setView(GameView.LAUNCHER)}
            onPlay={() => setView(GameView.GAMEPLAY)}
          />
        );

      case GameView.GAMEPLAY:
        return (
          <GameTestArena
            key="view-gameplay"
            controls={controls}
            selectedCharacter={selectedCharacter}
            mobileLayout={mobileLayout}
            settings={settings}
            setSettings={setSettings}
            onBack={() => setView(GameView.LAUNCHER)}
            onViewChange={setView}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div id="app-root-container" className="relative w-full h-screen overflow-hidden bg-black text-white font-sans antialiased">
      <AnimatePresence mode="wait">
        <motion.div
          id={`route-${view}`}
          key={view}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className="w-full h-full"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
