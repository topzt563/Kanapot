/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Character, ControlMapping, MobileLayoutSettings, GameSettings } from "./types";

export const DEFAULT_CHARACTERS: Character[] = [
  {
    id: "ignis",
    name: "Ignis",
    thaiName: "อัคนี (Ignis)",
    title: "The Flame Warden",
    thaiTitle: "ผู้พิทักษ์เพลิงสุริยะ",
    avatar: "🔥",
    color: "#f59e0b", // Amber
    accentColor: "#ef4444", // Red
    stats: {
      speed: 7,
      jump: 6,
      power: 8,
      defense: 5
    },
    specialMove: {
      name: "Flame Wave Blast",
      thaiName: "คลื่นดาบอัคคี",
      description: "Launches a piercing fiery wave that deals massive damage to targets.",
      thaiDescription: "ปลดปล่อยคลื่นพลังไฟพุ่งทะลวงสร้างความเสียหายรุนแรง"
    }
  },
  {
    id: "kaze",
    name: "Kaze",
    thaiName: "วายุ (Kaze)",
    title: "The Tempest Shadow",
    thaiTitle: "นินจาเงาวายุ",
    avatar: "⚡",
    color: "#06b6d4", // Cyan
    accentColor: "#3b82f6", // Blue
    stats: {
      speed: 9,
      jump: 9,
      power: 5,
      defense: 4
    },
    specialMove: {
      name: "Tornado Surge",
      thaiName: "วายุทะลวงพสุธา",
      description: "A fast rising spin attack that launches enemies into the air.",
      thaiDescription: "หมุนตัวโจมตีขึ้นสู่เวหาพร้อมพลังพายุหมุนสะกดศัตรู"
    }
  },
  {
    id: "terra",
    name: "Terra",
    thaiName: "ภูผา (Terra)",
    title: "The Earth Colossus",
    thaiTitle: "ยักษ์หินผู้พิทักษ์ปฐพี",
    avatar: "🛡️",
    color: "#10b981", // Emerald
    accentColor: "#84cc16", // Lime/Gold
    stats: {
      speed: 4,
      jump: 4,
      power: 9,
      defense: 9
    },
    specialMove: {
      name: "Seismic Shockwave",
      thaiName: "พิภพกัมปนาท",
      description: "Slam the ground to create a huge shockwave, stunning all targets nearby.",
      thaiDescription: "กระแทกพื้นพสุธาสร้างคลื่นกระแทกยักษ์และสตันเป้าหมาย"
    }
  }
];

export const DEFAULT_CONTROLS: ControlMapping[] = [
  {
    action: "MOVE_LEFT",
    label: "เดินซ้าย (Move Left)",
    description: "บังคับตัวละครเคลื่อนที่ไปทางซ้าย",
    key: "A",
    code: "KeyA",
    mobileBtnLabel: "◀"
  },
  {
    action: "MOVE_RIGHT",
    label: "เดินขวา (Move Right)",
    description: "บังคับตัวละครเคลื่อนที่ไปทางขวา",
    key: "D",
    code: "KeyD",
    mobileBtnLabel: "▶"
  },
  {
    action: "JUMP",
    label: "กระโดด (Jump)",
    description: "บังคับตัวละครกระโดดขึ้นด้านบน",
    key: "W",
    code: "KeyW",
    mobileBtnLabel: "JUMP"
  },
  {
    action: "ATTACK_1",
    label: "โจมตีธรรมดา (Basic Attack)",
    description: "โจมตีปกติด้วยอาวุธประจำตัว",
    key: "J",
    code: "KeyJ",
    mobileBtnLabel: "ATK"
  },
  {
    action: "ATTACK_2",
    label: "ใช้ท่าไม้ตาย (Special Skill)",
    description: "ปลดปล่อยทักษะพิเศษสุดรุนแรง",
    key: "K",
    code: "KeyK",
    mobileBtnLabel: "SPEC"
  }
];

export const DEFAULT_MOBILE_LAYOUT: MobileLayoutSettings = {
  opacity: 0.8,
  buttonSize: "md",
  layoutType: "dpad",
  handedness: "right",
  swapActions: false
};

export const DEFAULT_SETTINGS: GameSettings = {
  volume: 0.5,
  sfxVolume: 0.6,
  vibration: true,
  screenShake: true,
  language: "th"
};
