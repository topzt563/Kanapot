/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum GameView {
  LAUNCHER = "LAUNCHER",
  CHARACTER_SELECT = "CHARACTER_SELECT",
  CONTROLS_SETTINGS = "CONTROLS_SETTINGS",
  GAMEPLAY = "GAMEPLAY",
  HOW_TO_PLAY = "HOW_TO_PLAY"
}

export type ActionType = "MOVE_LEFT" | "MOVE_RIGHT" | "JUMP" | "ATTACK_1" | "ATTACK_2";

export interface ControlMapping {
  action: ActionType;
  label: string;
  description: string;
  key: string;       // Primary keyboard key (e.g., 'ArrowLeft', 'KeyA')
  code: string;      // KeyCode for keyboard mapping
  mobileBtnLabel: string; // Text shown on on-screen button (e.g., 'A', 'B')
}

export interface Character {
  id: string;
  name: string;
  thaiName: string;
  title: string;
  thaiTitle: string;
  avatar: string; // Emoji, SVG path description, or stylized symbol
  color: string;  // Primary theme color
  accentColor: string;
  stats: {
    speed: number;   // 1-10
    jump: number;    // 1-10
    power: number;   // 1-10
    defense: number; // 1-10
  };
  specialMove: {
    name: string;
    thaiName: string;
    description: string;
    thaiDescription: string;
  };
}

export interface MobileLayoutSettings {
  opacity: number;        // 0.1 to 1.0
  buttonSize: "sm" | "md" | "lg";
  layoutType: "dpad" | "joystick";
  handedness: "right" | "left"; // Control placement (movement on left/right)
  swapActions: boolean;   // Swap JUMP (A) and ATTACK (B) buttons
}

export interface GameSettings {
  volume: number;        // 0.0 to 1.0
  sfxVolume: number;     // 0.0 to 1.0
  vibration: boolean;
  screenShake: boolean;
  language: "th" | "en";
}
