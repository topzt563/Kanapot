/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo, Suspense, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture, Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";
import { GameSettings, ControlMapping, Character, MobileLayoutSettings, GameView } from "../types";
import { sound } from "./SoundManager";
import {
  ChevronLeft,
  Zap,
  Flame,
  RotateCcw,
  Shield,
  HelpCircle,
  Gamepad2,
  Volume2,
  VolumeX,
  Eye,
  EyeOff
} from "lucide-react";

interface GameTestArenaProps {
  controls: ControlMapping[];
  selectedCharacter: Character;
  mobileLayout: MobileLayoutSettings;
  settings: GameSettings;
  setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
  onBack: () => void;
  onViewChange: (view: GameView) => void;
}

// Data structures for our dynamic 3D visual effect systems
interface DamageText {
  id: number;
  text: string;
  position: [number, number, number];
  velocity: [number, number, number];
  color: string;
  life: number;
}

interface HitParticle {
  id: number;
  position: [number, number, number];
  velocity: [number, number, number];
  size: number;
  color: string;
  life: number;
}

interface EnergyRing {
  id: number;
  position: [number, number, number];
  radius: number;
  maxRadius: number;
  opacity: number;
  color: string;
}

// Global mutable reference for active enemies
const enemiesRef = {
  current: [] as {
    id: string;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    health: number;
    maxHealth: number;
    facingLeft: boolean;
    animState: number; // 0 = idle, 1 = walk
    frame: number;
    animAccumulator: number;
    flashRedTimer: number;
    flashWhiteTimer: number;
    isDying: boolean;
    dyingVelocity: THREE.Vector3;
    dyingRotation: THREE.Vector3;
    label: string;
  }[]
};

// --- SUB-COMPONENT: HOSTILE ENEMIES WITH WALK/IDLE TEXTURES ---
function EnemySprite({
  enemyData,
  playerPosRef,
  isGameOver,
  onPlayerHit,
  hitboxViewer
}: {
  enemyData: typeof enemiesRef.current[0];
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  isGameOver: boolean;
  onPlayerHit: () => void;
  hitboxViewer: boolean;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const spriteMeshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  const texture = useTexture(
    "https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/enemy.png"
  );

  // Clone texture so each instance manages its offsets independently
  const enemyTexture = useMemo(() => {
    const cloned = texture.clone();
    cloned.needsUpdate = true;
    cloned.wrapS = THREE.RepeatWrapping;
    cloned.wrapT = THREE.RepeatWrapping;
    cloned.repeat.set(0.25, 0.5); // 4 columns, 2 rows
    cloned.magFilter = THREE.NearestFilter; // sharp retro pixel look
    cloned.minFilter = THREE.NearestFilter;
    return cloned;
  }, [texture]);

  // Track attack cooldown
  const attackCooldownRef = useRef(Math.random() * 1.5);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1);
    const data = enemyData;
    if (!data) return;

    if (data.flashRedTimer > 0) {
      data.flashRedTimer -= d;
    }
    if (data.flashWhiteTimer > 0) {
      data.flashWhiteTimer -= d;
    }

    if (data.isDying) {
      // Fly out of screen or slide and spin!
      data.position.addScaledVector(data.dyingVelocity, d);
      // Gravity pulls down after fly up
      data.dyingVelocity.y -= 15.0 * d;

      data.dyingRotation.addScaledVector(new THREE.Vector3(2.0, 5.0, 1.0), d);

      if (meshRef.current) {
        meshRef.current.position.copy(data.position);
        meshRef.current.rotation.set(data.dyingRotation.x, data.dyingRotation.y, data.dyingRotation.z);
      }
      return;
    }

    // AI Chasing player logic
    if (!isGameOver) {
      const pPos = playerPosRef.current;
      const toPlayer = new THREE.Vector3().subVectors(pPos, data.position);
      const dist = toPlayer.length();

      if (dist > 1.2) {
        // Move towards player
        toPlayer.normalize();
        const chaseSpeed = 1.6; // slightly slower than player to make it fair

        data.velocity.copy(toPlayer).multiplyScalar(chaseSpeed);
        data.position.addScaledVector(data.velocity, d);

        data.animState = 1; // Walk

        // Facing direction based on movement
        if (data.velocity.x > 0.05) {
          data.facingLeft = false; // Move Right, default is face right
        } else if (data.velocity.x < -0.05) {
          data.facingLeft = true; // Move Left, flip
        }
      } else {
        // Close enough to attack!
        data.animState = 0; // Idle/Stand

        // Attack cooldown
        if (attackCooldownRef.current > 0) {
          attackCooldownRef.current -= d;
        } else {
          // Attack!
          attackCooldownRef.current = 1.5 + Math.random() * 1.0;
          data.flashRedTimer = 0.4; // Flash red on attack!
          onPlayerHit();
        }
      }
    } else {
      data.animState = 0; // Idle if Game Over
    }

    // Wrap bounds
    data.position.x = Math.max(-24.5, Math.min(24.5, data.position.x));
    data.position.z = Math.max(-24.5, Math.min(24.5, data.position.z));

    // Update mesh position
    if (meshRef.current) {
      meshRef.current.position.copy(data.position);
      meshRef.current.position.y = 1.25; // standard height off ground
    }

    // Sprite Animation
    data.animAccumulator += d;
    const fps = data.animState === 1 ? 10 : 6;
    const interval = 1.0 / fps;
    if (data.animAccumulator >= interval) {
      data.animAccumulator = 0;
      data.frame = (data.frame + 1) % 4;
    }

    // Calculate texture offset based on Row and Frame
    // Row 0 (Standing): yOffset = 0.5 (top row)
    // Row 1 (Walking): yOffset = 0.0 (bottom row)
    const yOffset = data.animState === 0 ? 0.5 : 0.0;
    enemyTexture.offset.x = data.frame * 0.25;
    enemyTexture.offset.y = yOffset;

    // Apply flash tinting color in material
    if (materialRef.current) {
      if (data.flashWhiteTimer > 0) {
        const flashState = Math.floor(state.clock.getElapsedTime() * 25) % 2 === 0;
        materialRef.current.color.set(flashState ? "#ffffff" : "#4b5563");
      } else if (data.flashRedTimer > 0) {
        materialRef.current.color.set("#ff2222");
      } else {
        materialRef.current.color.set("#ffffff");
      }
    }
  });

  return (
    <group ref={meshRef}>
      <Billboard>
        <mesh ref={spriteMeshRef} scale={[enemyData.facingLeft ? -2.3 : 2.3, 2.3, 1]}>
          <planeGeometry />
          <meshBasicMaterial
            ref={materialRef}
            map={enemyTexture}
            transparent
            alphaTest={0.4}
          />
        </mesh>
      </Billboard>

      {/* Shadow */}
      <mesh position={[0, -1.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 0.55, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.45} />
      </mesh>

      {/* Hitbox Viewer Overlay */}
      {hitboxViewer && (
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <mesh position={[0, 0, -1.2]}>
            <ringGeometry args={[1.15, 1.2, 32]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.5} />
          </mesh>
        </group>
      )}

      {/* Enemy HP billboard */}
      <Billboard position={[0, 1.4, 0]}>
        <Html center transform pointerEvents="none">
          <div className="flex flex-col items-center gap-0.5 select-none pointer-events-none scale-75">
            <span className="font-mono text-[8px] font-black text-rose-300 bg-slate-950/90 px-1.5 py-0.5 rounded border border-white/10 uppercase tracking-wider whitespace-nowrap">
              {enemyData.label}
            </span>
            <div className="w-12 h-1 bg-black/60 border border-white/10 rounded-full overflow-hidden mt-0.5">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-rose-500 transition-all duration-100"
                style={{ width: `${(enemyData.health / enemyData.maxHealth) * 100}%` }}
              />
            </div>
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

// --- SUB-COMPONENT: POTION SPAWN ITEMS ---
function PotionSprite({
  id,
  spawnPos
}: {
  id: string;
  spawnPos: [number, number, number];
}) {
  const meshRef = useRef<THREE.Group>(null);
  const texture = useTexture(
    "https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/potion.png"
  );

  const potionTexture = useMemo(() => {
    const cloned = texture.clone();
    cloned.needsUpdate = true;
    cloned.magFilter = THREE.NearestFilter;
    cloned.minFilter = THREE.NearestFilter;
    return cloned;
  }, [texture]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = 0.8 + Math.sin(state.clock.getElapsedTime() * 4.0 + id.charCodeAt(0)) * 0.18;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 1.5;
    }
  });

  return (
    <group ref={meshRef} position={[spawnPos[0], 0.8, spawnPos[2]]}>
      <Billboard>
        <mesh scale={[1.3, 1.3, 1]}>
          <planeGeometry />
          <meshBasicMaterial map={potionTexture} transparent alphaTest={0.4} />
        </mesh>
      </Billboard>
      <mesh position={[0, -0.79, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 0.4, 16]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

// --- SUB-COMPONENT: POTION COLLECTION CHECKS ---
function PotionCollector({
  potions,
  playerPosRef,
  onCollect
}: {
  potions: { id: string; spawnPos: [number, number, number] }[];
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  onCollect: (id: string, pos: THREE.Vector3) => void;
}) {
  useFrame(() => {
    const pPos = playerPosRef.current;
    potions.forEach((pot) => {
      const dx = pot.spawnPos[0] - pPos.x;
      const dz = pot.spawnPos[2] - pPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance <= 1.25) {
        onCollect(pot.id, new THREE.Vector3(pot.spawnPos[0], 0.8, pot.spawnPos[2]));
      }
    });
  });

  return null;
}

// --- SUB-COMPONENT: 3D DUST AND ATTACK PARTICLES & POPUPS ---
function EffectsRenderer({
  damageTexts,
  setDamageTexts,
  particles,
  setParticles,
  energyRings,
  setEnergyRings
}: {
  damageTexts: DamageText[];
  setDamageTexts: React.Dispatch<React.SetStateAction<DamageText[]>>;
  particles: HitParticle[];
  setParticles: React.Dispatch<React.SetStateAction<HitParticle[]>>;
  energyRings: EnergyRing[];
  setEnergyRings: React.Dispatch<React.SetStateAction<EnergyRing[]>>;
}) {
  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1); // Clamp delta to avoid massive leaps

    // Update floating damage texts
    setDamageTexts((prev) => {
      if (prev.length === 0) return prev;
      return prev
        .map((t) => ({
          ...t,
          position: [
            t.position[0] + t.velocity[0] * d,
            t.position[1] + t.velocity[1] * d,
            t.position[2] + t.velocity[2] * d
          ] as [number, number, number],
          velocity: [t.velocity[0] * 0.95, t.velocity[1] * 0.94 - 1.2 * d, t.velocity[2] * 0.95] as [
            number,
            number,
            number
          ],
          life: t.life - d * 1.4
        }))
        .filter((t) => t.life > 0);
    });

    // Update physics-driven hit sparks/particles
    setParticles((prev) => {
      if (prev.length === 0) return prev;
      return prev
        .map((p) => ({
          ...p,
          position: [
            p.position[0] + p.velocity[0] * d,
            p.position[1] + p.velocity[1] * d,
            p.position[2] + p.velocity[2] * d
          ] as [number, number, number],
          velocity: [p.velocity[0] * 0.98, p.velocity[1] - 9.8 * d, p.velocity[2] * 0.98] as [
            number,
            number,
            number
          ],
          life: p.life - d * 1.8
        }))
        .filter((p) => p.life > 0 && p.position[1] >= -0.1);
    });

    // Update ultimate skill expanding shockwave rings
    setEnergyRings((prev) => {
      if (prev.length === 0) return prev;
      return prev
        .map((r) => ({
          ...r,
          radius: r.radius + (r.maxRadius - r.radius) * 7.5 * d,
          opacity: r.opacity - d * 1.8
        }))
        .filter((r) => r.opacity > 0);
    });
  });

  return (
    <>
      {/* HTML Billboards for crisp custom damage numbers */}
      {damageTexts.map((text) => (
        <Billboard key={text.id} position={text.position}>
          <Html center transform pointerEvents="none">
            <div
              className="font-mono text-xs md:text-sm font-black whitespace-nowrap select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] px-2 py-0.5 rounded border border-white/10"
              style={{
                color: text.color,
                opacity: Math.max(0, text.life),
                transform: `scale(${1.0 + (1.0 - text.life) * 0.6})`,
                backgroundColor: "rgba(12, 12, 20, 0.8)",
                boxShadow: "0 0 10px rgba(0,0,0,0.5)"
              }}
            >
              {text.text}
            </div>
          </Html>
        </Billboard>
      ))}

      {/* Sparks physical cubes */}
      {particles.map((p) => (
        <mesh key={p.id} position={p.position}>
          <boxGeometry args={[p.size, p.size, p.size]} />
          <meshBasicMaterial color={p.color} transparent opacity={p.life} />
        </mesh>
      ))}

      {/* Shockwave Energy Rings on ground */}
      {energyRings.map((r) => (
        <group key={r.id} position={r.position} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[Math.max(0, r.radius - 0.25), r.radius + 0.1, 32]} />
            <meshBasicMaterial color={r.color} transparent opacity={r.opacity} side={THREE.DoubleSide} />
          </mesh>
          {/* Subtle colored glow inside ring */}
          <mesh>
            <ringGeometry args={[0, r.radius, 32]} />
            <meshBasicMaterial color={r.color} transparent opacity={r.opacity * 0.16} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// --- SUB-COMPONENT: BILLBOARD RETRO SPRITE CHARACTER BOSS ---
function BossSprite({
  bossRef,
  playerPosRef,
  isGameOver,
  onPlayerHit,
  hitboxViewer,
  isThai,
  spawnFireball
}: {
  bossRef: React.MutableRefObject<any>;
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  isGameOver: boolean;
  onPlayerHit: () => void;
  hitboxViewer: boolean;
  isThai: boolean;
  spawnFireball: () => void;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  const texture = useTexture(
    "https://res.cloudinary.com/dsucg33fv/image/upload/v1782709455/boss_e8jti1.png"
  );

  const bossTexture = useMemo(() => {
    const cloned = texture.clone();
    cloned.needsUpdate = true;
    cloned.wrapS = THREE.RepeatWrapping;
    cloned.wrapT = THREE.RepeatWrapping;
    cloned.repeat.set(0.25, 0.5); // 4 columns, 2 rows
    cloned.magFilter = THREE.NearestFilter;
    cloned.minFilter = THREE.NearestFilter;
    return cloned;
  }, [texture]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1);
    const data = bossRef.current;
    if (!data) return;

    if (data.flashRedTimer > 0) {
      data.flashRedTimer -= d;
    }
    if (data.flashWhiteTimer > 0) {
      data.flashWhiteTimer -= d;
    }

    if (data.isDying) {
      data.position.addScaledVector(data.dyingVelocity, d);
      data.dyingVelocity.y -= 15.0 * d;
      data.dyingRotation.addScaledVector(new THREE.Vector3(2.0, 5.0, 1.0), d);

      if (meshRef.current) {
        meshRef.current.position.copy(data.position);
        meshRef.current.rotation.set(data.dyingRotation.x, data.dyingRotation.y, data.dyingRotation.z);
      }
      return;
    }

    // AI logic & Pattern Updates
    if (!isGameOver) {
      data.patternTimer -= d;
      
      if (data.patternTimer <= 0) {
        const patterns: ("idle" | "dash" | "telegraph" | "attack")[] = ["idle", "dash", "telegraph", "attack"];
        const currentIndex = patterns.indexOf(data.pattern);
        const nextIndex = (currentIndex + 1) % patterns.length;
        const nextPattern = patterns[nextIndex];

        data.pattern = nextPattern;

        if (nextPattern === "idle") {
          data.animState = 0;
          data.patternTimer = 1.3 + Math.random() * 0.7;
          data.velocity.set(0, 0, 0);
        } else if (nextPattern === "dash") {
          data.animState = 1;
          data.patternTimer = 0.8;
          
          // Dash close or far
          const isFar = Math.random() > 0.5;
          const dist = isFar ? 14.0 : 4.0;
          const angle = Math.random() * Math.PI * 2;
          const targetX = playerPosRef.current.x + Math.sin(angle) * dist;
          const targetZ = playerPosRef.current.z + Math.cos(angle) * dist;

          const dir = new THREE.Vector3(targetX, 3.5, targetZ).sub(data.position);
          dir.y = 0;
          dir.normalize();
          data.velocity.copy(dir).multiplyScalar(isFar ? 14.0 : 8.0);
        } else if (nextPattern === "telegraph") {
          data.animState = 1;
          data.patternTimer = 1.4;
          data.velocity.set(0, 0, 0);
        } else if (nextPattern === "attack") {
          data.animState = 1;
          data.patternTimer = 1.5;
          data.velocity.set(0, 0, 0);
          
          // Spawn falling fireballs on the player!
          spawnFireball();
        }
      }

      if (data.pattern === "dash") {
        data.position.addScaledVector(data.velocity, d);
      }

      data.position.x = Math.max(-23, Math.min(23, data.position.x));
      data.position.z = Math.max(-23, Math.min(23, data.position.z));

      if (playerPosRef.current.x < data.position.x) {
        data.facingLeft = true;
      } else {
        data.facingLeft = false;
      }
    }

    if (meshRef.current) {
      meshRef.current.position.copy(data.position);
      meshRef.current.position.y = 3.5 + Math.sin(state.clock.getElapsedTime() * 2.5) * 0.4; // smooth fly hover
    }

    data.animAccumulator += d;
    const fps = data.pattern === "dash" ? 12 : 6;
    const interval = 1.0 / fps;
    if (data.animAccumulator >= interval) {
      data.animAccumulator = 0;
      data.frame = (data.frame + 1) % 4;
    }

    const yOffset = data.animState === 0 ? 0.5 : 0.0;
    bossTexture.offset.x = data.frame * 0.25;
    bossTexture.offset.y = yOffset;

    if (materialRef.current) {
      if (data.flashWhiteTimer > 0) {
        const flashState = Math.floor(state.clock.getElapsedTime() * 25) % 2 === 0;
        materialRef.current.color.set(flashState ? "#ffffff" : "#4b5563");
      } else if (data.flashRedTimer > 0) {
        materialRef.current.color.set("#ef4444");
      } else if (data.pattern === "telegraph") {
        materialRef.current.color.set("#fb923c"); // Orange telegraph glow
      } else {
        materialRef.current.color.set("#ffffff");
      }
    }
  });

  let visualScale = 3.5;
  const data = bossRef.current;
  if (data && data.pattern === "telegraph") {
    const step = Math.floor(data.patternTimer * 8) % 2;
    visualScale = 3.5 + step * 0.7; // pulsating warning scale step!
  }

  return (
    <group ref={meshRef}>
      <Billboard>
        <mesh scale={[data?.facingLeft ? -visualScale : visualScale, visualScale, 1]}>
          <planeGeometry />
          <meshBasicMaterial ref={materialRef} map={bossTexture} transparent alphaTest={0.4} />
        </mesh>
      </Billboard>

      <mesh position={[0, -3.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 1.3, 16]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.25} />
      </mesh>

      {hitboxViewer && (
        <mesh position={[0, -3.19, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.35, 2.4, 32]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
        </mesh>
      )}

      <Billboard position={[0, 2.4, 0]}>
        <Html center transform pointerEvents="none">
          <div className="flex flex-col items-center gap-1 select-none w-32 font-mono pointer-events-none">
            <span className="text-[9px] font-bold text-red-400 bg-black/85 px-1.5 py-0.5 rounded border border-red-500/20 uppercase tracking-widest text-center shadow-md">
              👑 {isThai ? "ราชาปีศาจ" : "ARENA DEMON KING"}
            </span>
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

// --- SUB-COMPONENT: FIREBALL PROJECTILE ---
interface FireballProps {
  fireball: {
    id: string;
    position: THREE.Vector3;
    startPosition: THREE.Vector3;
    targetPosition: THREE.Vector3;
    progress: number;
    duration: number;
    hasExploded: boolean;
  };
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  onExplode: (id: string, targetPos: THREE.Vector3) => void;
}

function FireballSprite({ fireball, playerPosRef, onExplode }: FireballProps) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1);
    if (fireball.hasExploded) return;

    fireball.progress += d / fireball.duration;
    if (fireball.progress >= 1.0) {
      fireball.progress = 1.0;
      fireball.hasExploded = true;
      onExplode(fireball.id, fireball.targetPosition);
      return;
    }

    const t = fireball.progress;
    const currX = THREE.MathUtils.lerp(fireball.startPosition.x, fireball.targetPosition.x, t);
    const currZ = THREE.MathUtils.lerp(fireball.startPosition.z, fireball.targetPosition.z, t);

    // Parabolic arc height logic
    const peakHeight = 12.0;
    const currY = THREE.MathUtils.lerp(fireball.startPosition.y, 0.1, t) + Math.sin(t * Math.PI) * peakHeight;

    fireball.position.set(currX, currY, currZ);

    if (meshRef.current) {
      meshRef.current.position.copy(fireball.position);
    }
  });

  const ringScale = Math.max(0.1, (1.0 - fireball.progress) * 1.8);

  return (
    <group>
      <group ref={meshRef}>
        <mesh>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshBasicMaterial color="#f97316" />
        </mesh>
        <mesh scale={[1.3, 1.3, 1.3]}>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.4} />
        </mesh>
      </group>

      {!fireball.hasExploded && (
        <group position={[fireball.targetPosition.x, 0.04, fireball.targetPosition.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[1.75, 1.8, 32]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.65} />
          </mesh>
          <mesh scale={[ringScale, ringScale, 1]}>
            <ringGeometry args={[0, 1.0, 32]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.25} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// --- SUB-COMPONENT: PORTAL WARP GATE ---
interface WarpGateProps {
  position: [number, number, number];
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  onEnter: () => void;
  isThai: boolean;
}

function WarpGateSprite({ position, playerPosRef, onEnter, isThai }: WarpGateProps) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1);
    
    if (meshRef.current) {
      meshRef.current.rotation.y += 1.8 * d;
    }

    const pPos = playerPosRef.current;
    const dx = position[0] - pPos.x;
    const dz = position[2] - pPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < 1.4) {
      onEnter();
    }
  });

  return (
    <group ref={meshRef} position={position}>
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[1.1, 0.1, 16, 100]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.8} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.15, 0.05, 8, 32]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.5} />
      </mesh>

      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 2.0, 32, 1, true]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.24} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 1.2, 32]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.3} />
      </mesh>

      <Billboard position={[0, 2.4, 0]}>
        <Html center transform pointerEvents="none">
          <div className="flex flex-col items-center gap-1 select-none pointer-events-none whitespace-nowrap bg-black/85 px-2 py-1 rounded border border-cyan-500/30 font-mono shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <span className="text-[10px] font-black tracking-widest text-cyan-300 animate-pulse uppercase">
              🌌 {isThai ? "ประตูมิติวาร์ป" : "WARP GATE PORTAL"}
            </span>
            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">
              {isThai ? "เดินเข้าเพื่อจบภารกิจ" : "STEP INSIDE TO VICTORY"}
            </span>
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

// --- SUB-COMPONENT: BILLBOARD RETRO SPRITE CHARACTER NPC ---
interface NPCSpriteProps {
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  facingLeft: boolean;
  setArrival: (arrived: boolean) => void;
}

function NPCSprite({ position, targetPosition, facingLeft, setArrival }: NPCSpriteProps) {
  const meshRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  const texture = useTexture(
    "https://res.cloudinary.com/dsucg33fv/image/upload/v1782439980/npc1_pdraha.png"
  );

  const npcTexture = useMemo(() => {
    const cloned = texture.clone();
    cloned.needsUpdate = true;
    cloned.wrapS = THREE.RepeatWrapping;
    cloned.wrapT = THREE.RepeatWrapping;
    cloned.repeat.set(0.25, 0.5); // 4 columns, 2 rows
    cloned.magFilter = THREE.NearestFilter;
    cloned.minFilter = THREE.NearestFilter;
    return cloned;
  }, [texture]);

  const [frame, setFrame] = useState(0);
  const animAccumulator = useRef(0);
  const [isWalking, setIsWalking] = useState(true);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1);

    const dist = position.distanceTo(targetPosition);
    if (dist > 0.05) {
      const dir = new THREE.Vector3().subVectors(targetPosition, position).normalize();
      position.addScaledVector(dir, 2.2 * d);
      setIsWalking(true);
    } else {
      position.copy(targetPosition);
      setIsWalking(false);
      setArrival(true);
    }

    if (meshRef.current) {
      meshRef.current.position.copy(position);
    }

    animAccumulator.current += d;
    const fps = isWalking ? 8 : 4;
    const interval = 1.0 / fps;
    if (animAccumulator.current >= interval) {
      animAccumulator.current = 0;
      setFrame((prev) => (prev + 1) % 4);
    }

    const yOffset = isWalking ? 0.0 : 0.5;
    npcTexture.offset.x = frame * 0.25;
    npcTexture.offset.y = yOffset;
  });

  return (
    <group ref={meshRef}>
      <Billboard>
        <mesh scale={[facingLeft ? -2.5 : 2.5, 2.5, 1]}>
          <planeGeometry />
          <meshBasicMaterial ref={materialRef} map={npcTexture} transparent alphaTest={0.4} />
        </mesh>
      </Billboard>

      <mesh position={[0, -1.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 0.65, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.5} />
      </mesh>

      <Billboard position={[0, 1.5, 0]}>
        <Html center transform pointerEvents="none">
          <span className="text-[10px] font-black tracking-widest text-indigo-300 bg-black/85 px-2 py-0.5 rounded border border-indigo-500/20 uppercase shadow-md whitespace-nowrap">
            🧙‍♂️ JIN (GRAND MASTER)
          </span>
        </Html>
      </Billboard>
    </group>
  );
}

// --- SUB-COMPONENT: BILLBOARD RETRO SPRITE CHARACTER PLAYER ---
function PlayerSprite({
  selectedCharacter,
  keysRef,
  playerPos,
  onHit,
  setEnergyRings,
  currentState,
  setCurrentState,
  facingLeft,
  setFacingLeft,
  hitboxViewer,
  posXNodeRef,
  posZNodeRef,
  enemiesRef,
  spawnEnemy,
  setEnemiesList,
  setEnemiesState,
  invulnerableTimerRef,
  bossActive,
  bossRef,
  onBossHit,
  onEnemyDefeated
}: {
  selectedCharacter: Character;
  keysRef: React.MutableRefObject<any>;
  playerPos: React.MutableRefObject<THREE.Vector3>;
  onHit: (pos: THREE.Vector3, isCrit: boolean, damage: number) => void;
  setEnergyRings: React.Dispatch<React.SetStateAction<EnergyRing[]>>;
  currentState: number;
  setCurrentState: React.Dispatch<React.SetStateAction<number>>;
  facingLeft: boolean;
  setFacingLeft: React.Dispatch<React.SetStateAction<boolean>>;
  hitboxViewer: boolean;
  posXNodeRef: React.MutableRefObject<HTMLSpanElement | null>;
  posZNodeRef: React.MutableRefObject<HTMLSpanElement | null>;
  enemiesRef: React.MutableRefObject<any[]>;
  spawnEnemy: () => void;
  setEnemiesList: React.Dispatch<React.SetStateAction<any[]>>;
  setEnemiesState: React.Dispatch<React.SetStateAction<any[]>>;
  invulnerableTimerRef: React.MutableRefObject<number>;
  bossActive?: boolean;
  bossRef?: React.MutableRefObject<any>;
  onBossHit?: (pos: THREE.Vector3, isCrit: boolean, damage: number) => void;
  onEnemyDefeated?: () => void;
}) {
  const texture = useTexture(
    "https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/player.png"
  );

  // Clone texture so each instance manages its offsets without affecting global caches
  const playerTexture = useMemo(() => {
    const cloned = texture.clone();
    cloned.needsUpdate = true;
    cloned.wrapS = THREE.RepeatWrapping;
    cloned.wrapT = THREE.RepeatWrapping;
    cloned.repeat.set(0.25, 0.25);
    cloned.magFilter = THREE.NearestFilter; // Sharp crispy retro pixel art rendering
    cloned.minFilter = THREE.NearestFilter;
    return cloned;
  }, [texture]);

  const frameRef = useRef(0);
  const animAccumulator = useRef(0);
  const actionActiveTimer = useRef(0);
  const skillCooldownRef = useRef(0);
  const meshGroupRef = useRef<THREE.Group>(null);

  // States
  const STATE_IDLE = 0;
  const STATE_WALK = 1;
  const STATE_ATTACK = 2;
  const STATE_DANCE = 3;

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1);

    if (skillCooldownRef.current > 0) {
      skillCooldownRef.current -= d;
    }

    if (invulnerableTimerRef.current > 0) {
      invulnerableTimerRef.current -= d;
    }

    // Flash player sprite if invulnerable
    if (meshGroupRef.current) {
      if (invulnerableTimerRef.current > 0) {
        const flash = Math.floor(state.clock.getElapsedTime() * 15) % 2 === 0;
        meshGroupRef.current.visible = flash;
      } else {
        meshGroupRef.current.visible = true;
      }
    }

    // Read active controller bindings
    const keys = keysRef.current;
    let moveX = 0;
    let moveZ = 0;

    if (keys.w) moveZ -= 1;
    if (keys.s) moveZ += 1;
    if (keys.a) moveX -= 1;
    if (keys.d) moveX += 1;

    // Trigger Normal Punch / Attack (P)
    if (keys.p && currentState !== STATE_ATTACK) {
      setCurrentState(STATE_ATTACK);
      frameRef.current = 0;
      animAccumulator.current = 0;
      actionActiveTimer.current = 0.24; // Attack state lock duration
      sound.playAttack1();

      // Trigger 3D Hit Checks
      const hits = checkHits("P");
      hits.forEach((h) => {
        onHit(h.position, h.isCrit, h.damage);
      });
    }

    // Trigger Expanding Energy Skill Burst (O)
    if (keys.o && skillCooldownRef.current <= 0 && currentState !== STATE_ATTACK) {
      setCurrentState(STATE_DANCE);
      frameRef.current = 0;
      animAccumulator.current = 0;
      actionActiveTimer.current = 0.65; // Skill burst animation duration
      skillCooldownRef.current = 1.3; // Cooldown lock
      sound.playAttack2();

      // Spawn flat expanding ring
      const ringId = Math.random();
      setEnergyRings((prev) => [
        ...prev,
        {
          id: ringId,
          position: [playerPos.current.x, 0.05, playerPos.current.z],
          radius: 0.3,
          maxRadius: 5.2,
          opacity: 1.0,
          color: selectedCharacter.color || "#06b6d4"
        }
      ]);

      // Trigger massive ring checks
      const hits = checkHits("O");
      hits.forEach((h) => {
        onHit(h.position, h.isCrit, h.damage);
      });
    }

    // Process timers
    if (actionActiveTimer.current > 0) {
      actionActiveTimer.current -= d;
      if (actionActiveTimer.current <= 0) {
        setCurrentState(STATE_IDLE);
      }
    }

    // Handle 8-directional movement physics when not locked in animation
    if (currentState !== STATE_ATTACK && currentState !== STATE_DANCE) {
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      if (len > 0) {
        moveX /= len;
        moveZ /= len;

        const characterSpeed = 3.8 + selectedCharacter.stats.speed * 0.45;
        playerPos.current.x += moveX * characterSpeed * d;
        playerPos.current.z += moveZ * characterSpeed * d;

        // Clamp inside 50x50 ground bounds (-24 to 24 to keep inside plane margin)
        playerPos.current.x = Math.max(-24.5, Math.min(24.5, playerPos.current.x));
        playerPos.current.z = Math.max(-24.5, Math.min(24.5, playerPos.current.z));

        setCurrentState(STATE_WALK);

        // Direction orientation
        if (moveX > 0) setFacingLeft(false);
        else if (moveX < 0) setFacingLeft(true);
      } else {
        if (keys.y) {
          setCurrentState(STATE_DANCE);
        } else {
          setCurrentState(STATE_IDLE);
        }
      }
    }

    // High performance HTML coordinate updates (bypass React cycles)
    if (posXNodeRef.current) posXNodeRef.current.innerText = playerPos.current.x.toFixed(2);
    if (posZNodeRef.current) posZNodeRef.current.innerText = playerPos.current.z.toFixed(2);

    // Frame animations speed calculations
    animAccumulator.current += d;
    let fps = 8;
    if (currentState === STATE_ATTACK) fps = 18; // Plays FASTER as requested ("เล่น Animation ไวขึ้น")
    else if (currentState === STATE_WALK) fps = 10;
    else if (currentState === STATE_DANCE) fps = 12;

    const frameInterval = 1.0 / fps;
    if (animAccumulator.current >= frameInterval) {
      animAccumulator.current = 0;
      frameRef.current = (frameRef.current + 1) % 4;
    }

    // Map rows top-to-bottom vertically (Row 0 is Standing, Row 1 is Walk, Row 2 is Attack, Row 3 is Dance)
    let yOffset = 0.75; // Standing Still / Idle
    if (currentState === STATE_WALK) yOffset = 0.5;
    else if (currentState === STATE_ATTACK) yOffset = 0.25;
    else if (currentState === STATE_DANCE) yOffset = 0.0; // Dancing row

    playerTexture.offset.x = frameRef.current * 0.25;
    playerTexture.offset.y = yOffset;
  });

  const checkHits = (attackType: "P" | "O") => {
    const pPos = playerPos.current;
    const hits: {
      enemy: any;
      damage: number;
      position: THREE.Vector3;
      isCrit: boolean;
    }[] = [];

    let range = 2.4;
    let damageBase = 12 + selectedCharacter.stats.power * 2.5;

    if (attackType === "O") {
      range = 5.2; // Ultimate expanding ring radius
      damageBase = 46 + selectedCharacter.stats.power * 6.0;
    }

    // Hit check against the Boss
    if (bossActive && bossRef && onBossHit) {
      const boss = bossRef.current;
      if (boss && !boss.isDying) {
        const dx = boss.position.x - pPos.x;
        const dz = boss.position.z - pPos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance <= range) {
          let hitSuccess = true;
          if (attackType === "P") {
            const isToRight = dx > 0;
            if (facingLeft && isToRight) hitSuccess = false;
            if (!facingLeft && !isToRight) hitSuccess = false;
          }

          if (hitSuccess) {
            const variance = (Math.random() - 0.5) * 6;
            const damage = Math.max(1, Math.floor(damageBase + variance));
            const isCrit = attackType === "O" || Math.random() < 0.25;
            const finalDmg = isCrit ? Math.floor(damage * 1.6) : damage;

            onBossHit(new THREE.Vector3(boss.position.x, 1.5, boss.position.z), isCrit, finalDmg);
          }
        }
      }
    }

    enemiesRef.current.forEach((enemy) => {
      if (enemy.health <= 0 || enemy.isDying) return;

      const dx = enemy.position.x - pPos.x;
      const dz = enemy.position.z - pPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance <= range) {
        // Attack 1 validation: Punch is direction directional, must face the target enemy!
        if (attackType === "P") {
          const isToRight = dx > 0;
          if (facingLeft && isToRight) return;
          if (!facingLeft && !isToRight) return;
        }

        const variance = (Math.random() - 0.5) * 6;
        const damage = Math.max(1, Math.floor(damageBase + variance));
        const isCrit = attackType === "O" || Math.random() < 0.25;

        const finalDmg = isCrit ? Math.floor(damage * 1.6) : damage;

        // Reduce enemy health (starts at 2, dead at 0)
        enemy.health = Math.max(0, enemy.health - 1);

        if (enemy.health === 1) {
          // Hit 1: Knockback backward in opposite direction
          const pushAngle = Math.atan2(dx, dz);
          const pushForce = 3.2;
          enemy.position.x += Math.sin(pushAngle) * pushForce;
          enemy.position.z += Math.cos(pushAngle) * pushForce;
          enemy.flashRedTimer = 0.45;
        } else if (enemy.health === 0) {
          // Hit 2: Knockout flying off-screen or flash white and disappear
          enemy.isDying = true;
          const pushAngle = Math.atan2(dx, dz);
          const speedH = 12.0;
          enemy.dyingVelocity.set(
            Math.sin(pushAngle) * speedH,
            16.0, // High launch angle
            Math.cos(pushAngle) * speedH
          );
          enemy.flashWhiteTimer = 2.0;

          if (onEnemyDefeated) {
            onEnemyDefeated();
          }

          // Remove enemy after fly-out animation is completed
          const targetId = enemy.id;
          setTimeout(() => {
            setEnemiesList((prev) => prev.filter((e) => e.id !== targetId));
            enemiesRef.current = enemiesRef.current.filter((e) => e.id !== targetId);
            setEnemiesState(
              enemiesRef.current.filter(e => !e.isDying).map((e) => ({
                id: e.id,
                health: e.health,
                maxHealth: e.maxHealth,
                label: e.label
              }))
            );
            // Spawn replacement enemy
            spawnEnemy();
          }, 1800);
        }

        hits.push({
          enemy,
          damage: finalDmg,
          position: new THREE.Vector3(enemy.position.x, 1.2, enemy.position.z),
          isCrit
        });
      }
    });

    return hits;
  };

  return (
    <group ref={meshGroupRef} position={[playerPos.current.x, 1.25, playerPos.current.z]}>
      {/* Sprite mesh always facing the camera */}
      <Billboard>
        <mesh scale={[facingLeft ? -2.5 : 2.5, 2.5, 1]}>
          <planeGeometry />
          <meshBasicMaterial map={playerTexture} transparent alphaTest={0.4} />
        </mesh>
      </Billboard>

      {/* Flat dark round shadow on floor */}
      <mesh position={[0, -1.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 0.65, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.5} />
      </mesh>

      {/* HITBOX AUDITOR GEOMETRY OVERLAY */}
      {hitboxViewer && (
        <group rotation={[-Math.PI / 2, 0, 0]}>
          {/* Attack 1 hit range circle */}
          <mesh position={[facingLeft ? -1.2 : 1.2, 0, -1.1]}>
            <ringGeometry args={[1.35, 1.38, 32]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.7} />
          </mesh>
          {/* Skill Ultimate AoE Ring range */}
          <mesh position={[0, 0, -1.2]}>
            <ringGeometry args={[5.15, 5.2, 64]} />
            <meshBasicMaterial color="#06b6d4" transparent opacity={0.35} />
          </mesh>
        </group>
      )}

      {/* Stylized Overhead Billboard tag */}
      <Billboard position={[0, 1.5, 0]}>
        <Html center transform pointerEvents="none">
          <div className="flex flex-col items-center gap-0.5 select-none scale-85 pointer-events-none">
            <span
              className="text-xs font-black tracking-wider uppercase text-white px-2 py-0.5 rounded border border-white/10 shadow-lg flex items-center gap-1"
              style={{
                backgroundColor: `${selectedCharacter.color}bb` || "rgba(6, 182, 212, 0.65)",
                textShadow: "0 1px 3px rgba(0,0,0,0.9)"
              }}
            >
              <span>{selectedCharacter.avatar}</span>
              <span>{selectedCharacter.name}</span>
            </span>
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

// --- SUB-COMPONENT: REPEAT FLAT TILING GROUND ---
function GroundPlane() {
  const groundTex = useTexture(
    "https://res.cloudinary.com/dsucg33fv/image/upload/v1782439980/ground_d1kjrx.png"
  );

  // Apply repeated tiling wrapping ("ทำ tiling เล็กหน่อย")
  useEffect(() => {
    if (groundTex) {
      groundTex.wrapS = THREE.RepeatWrapping;
      groundTex.wrapT = THREE.RepeatWrapping;
      groundTex.repeat.set(16, 16); // Small tiling repeat count
      groundTex.magFilter = THREE.NearestFilter; // Crispy retro pixels
      groundTex.minFilter = THREE.NearestFilter;
    }
  }, [groundTex]);

  return (
    <group>
      {/* Primary Plane of size 50 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial map={groundTex} roughness={0.85} metalness={0.12} />
      </mesh>

      {/* Cybernetic Grid Matrix Floor Overlay */}
      <gridHelper args={[50, 50, "#06b6d4", "#3b0764"]} position={[0, 0.012, 0]} material-opacity={0.25} material-transparent={true} />

      {/* Glowing neon safety rails at the 50x50 boundary limits */}
      <mesh position={[0, 0.08, -25]}>
        <boxGeometry args={[50, 0.16, 0.16]} />
        <meshBasicMaterial color="#a855f7" />
      </mesh>
      <mesh position={[0, 0.08, 25]}>
        <boxGeometry args={[50, 0.16, 0.16]} />
        <meshBasicMaterial color="#a855f7" />
      </mesh>
      <mesh position={[-25, 0.08, 0]}>
        <boxGeometry args={[0.16, 0.16, 50]} />
        <meshBasicMaterial color="#06b6d4" />
      </mesh>
      <mesh position={[25, 0.08, 0]}>
        <boxGeometry args={[0.16, 0.16, 50]} />
        <meshBasicMaterial color="#06b6d4" />
      </mesh>
    </group>
  );
}

// --- SUB-COMPONENT: INTERPOLATED SMOOTH FOLLOW CAMERA ---
function CameraManager({
  playerPos,
  shakeIntensityRef,
  settings,
  endingSceneActive
}: {
  playerPos: React.MutableRefObject<THREE.Vector3>;
  shakeIntensityRef: React.MutableRefObject<number>;
  settings: GameSettings;
  endingSceneActive?: boolean;
}) {
  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1);
    
    let targetCamX = playerPos.current.x;
    let targetCamY = playerPos.current.y + 7.5;
    let targetCamZ = playerPos.current.z + 11.5;

    if (endingSceneActive) {
      // Wide cinematic framing
      targetCamX = 0;
      targetCamY = 3.2;
      targetCamZ = 6.2;
    }

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetCamX, 6.0 * d);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetCamY, 6.0 * d);
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetCamZ, 6.0 * d);

    // Apply decayed camera shaking from impact
    if (settings.screenShake && shakeIntensityRef.current > 0.01 && !endingSceneActive) {
      const sx = (Math.random() - 0.5) * shakeIntensityRef.current;
      const sy = (Math.random() - 0.5) * shakeIntensityRef.current;
      const sz = (Math.random() - 0.5) * shakeIntensityRef.current;

      state.camera.position.x += sx;
      state.camera.position.y += sy;
      state.camera.position.z += sz;

      // Decay
      shakeIntensityRef.current *= 0.86;
    }

    if (endingSceneActive) {
      state.camera.lookAt(0, 1.3, 0);
    } else {
      state.camera.lookAt(playerPos.current.x, playerPos.current.y + 0.8, playerPos.current.z);
    }
  });

  return null;
}

// --- MAIN ARENA CONTAINER EXPORT COMPONENT ---
export const GameTestArena: React.FC<GameTestArenaProps> = ({
  controls,
  selectedCharacter,
  mobileLayout,
  settings,
  setSettings,
  onBack,
  onViewChange
}) => {
  const isThai = settings.language === "th";

  // Hit visual effects lists
  const [damageTexts, setDamageTexts] = useState<DamageText[]>([]);
  const [particles, setParticles] = useState<HitParticle[]>([]);
  const [energyRings, setEnergyRings] = useState<EnergyRing[]>([]);

  // Combo systems
  const [comboCount, setComboCount] = useState(0);
  const [lastComboTime, setLastComboTime] = useState(0);

  // Active state switches
  const [isMuted, setIsMuted] = useState(false);
  const [hitboxViewer, setHitboxViewer] = useState(false);
  const [isMobileEmulator, setIsMobileEmulator] = useState(false);

  // --- STATE FOR GAME OVER, HEALTH, POTIONS AND HOSTILE ENEMIES ---
  const [playerLives, setPlayerLives] = useState(5);
  const [isGameOver, setIsGameOver] = useState(false);
  const invulnerableTimerRef = useRef(0);

  const [enemiesList, setEnemiesList] = useState<{
    id: string;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    health: number;
    maxHealth: number;
    facingLeft: boolean;
    animState: number;
    frame: number;
    animAccumulator: number;
    flashRedTimer: number;
    flashWhiteTimer: number;
    isDying: boolean;
    dyingVelocity: THREE.Vector3;
    dyingRotation: THREE.Vector3;
    label: string;
  }[]>([]);

  const [potionsList, setPotionsList] = useState<{
    id: string;
    spawnPos: [number, number, number];
  }[]>([]);

  const [enemiesState, setEnemiesState] = useState<{
    id: string;
    health: number;
    maxHealth: number;
    label: string;
  }[]>([]);

  // --- BOSS, FIREBALLS AND WARP GATE PORTAL STATE ---
  const [defeatedCount, setDefeatedCount] = useState(0);
  const defeatedCountRef = useRef(0);
  
  const [bossActive, setBossActive] = useState(false);
  const bossActiveRef = useRef(false);
  const [bossHealth, setBossHealth] = useState(15);
  const [bossIsDying, setBossIsDying] = useState(false);
  const bossIsDyingRef = useRef(false);
  
  const bossRef = useRef({
    id: "boss-1",
    position: new THREE.Vector3(0, 3.5, -8),
    velocity: new THREE.Vector3(0, 0, 0),
    health: 15,
    maxHealth: 15,
    facingLeft: false,
    animState: 0,
    frame: 0,
    animAccumulator: 0,
    flashRedTimer: 0,
    flashWhiteTimer: 0,
    isDying: false,
    dyingVelocity: new THREE.Vector3(0, 0, 0),
    dyingRotation: new THREE.Vector3(0, 0, 0),
    label: isThai ? "ราชาปีศาจ อารีน่าบอส" : "ARENA DEMON KING BOSS",
    pattern: "idle",
    patternTimer: 2.0,
    scale: 1.0
  });

  const [fireballs, setFireballs] = useState<{
    id: string;
    position: THREE.Vector3;
    startPosition: THREE.Vector3;
    targetPosition: THREE.Vector3;
    progress: number;
    duration: number;
    hasExploded: boolean;
  }[]>([]);

  const [warpGateActive, setWarpGateActive] = useState(false);
  
  // --- ENDING SCENE AND DIALOGUE STATE ---
  const [endingSceneActive, setEndingSceneActive] = useState(false);
  const endingSceneActiveRef = useRef(false);
  const [npcPosition] = useState(() => new THREE.Vector3(6.0, 1.25, 0));
  const [npcArrived, setNpcArrived] = useState(false);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [showFinishScreen, setShowFinishScreen] = useState(false);

  // Dialogue text resources (approx. 8 lines exchanged between player & NPC Jin)
  const dialogueLines = useMemo(() => [
    {
      speaker: "npc",
      textEN: "Incredible! You have defeated the Arena Demon King and passed the ultimate test!",
      textTH: "เหลือเชื่อจริงๆ! เจ้าปราบราชาปีศาจแห่งอารีน่าและผ่านการทดสอบขั้นสุดยอดแล้ว!"
    },
    {
      speaker: "player",
      textEN: "Thank you, Master Jin. It was a tough battle, but your teachings guided my hand.",
      textTH: "ขอบคุณครับปรมาจารย์จิน มันเป็นการต่อสู้ที่ยากลำบาก แต่คำสอนของท่านช่วยชี้นำการเคลื่อนไหวของผม"
    },
    {
      speaker: "npc",
      textEN: "Indeed, your speed and power are unlike anything I have witnessed in decades.",
      textTH: "จริงแท้ ความเร็วและพลังของเจ้านั้น ช่างแตกต่างจากสิ่งที่ข้าได้เคยพบมาตลอดหลายทศวรรษ"
    },
    {
      speaker: "player",
      textEN: "I felt the flow of the arena. Every combo felt natural.",
      textTH: "ผมรู้สึกถึงกระแสของลานประลองนี้ ทุกๆ ท่วงท่าการต่อสู้รู้สึกราบรื่นเป็นธรรมชาติอย่างยิ่ง"
    },
    {
      speaker: "npc",
      textEN: "That is the state of Zen Combat. You have unlocked your true potential.",
      textTH: "นั่นคือสภาวะแห่ง 'สมาธิการต่อสู้' (Zen Combat) เจ้าได้ปลดล็อกศักยภาพที่แท้จริงแล้ว"
    },
    {
      speaker: "player",
      textEN: "What lies ahead for me now, Master?",
      textTH: "แล้วหนทางข้างหน้าของผมจากนี้คืออะไรหรือครับ ท่านปรมาจารย์?"
    },
    {
      speaker: "npc",
      textEN: "The world outside needs a champion of your caliber. Go and defend the peace!",
      textTH: "โลกภายนอกกำลังต้องการผู้กล้าที่มีความสามารถระดับเจ้า จงออกไปปกป้องความสงบสุขของโลกเถิด!"
    },
    {
      speaker: "player",
      textEN: "I will not let you down. I am ready for whatever comes next!",
      textTH: "ผมจะไม่ทำให้ท่านผิดหวังเลยครับ ไม่ว่าจะเจอกับอะไรต่อจากนี้ ผมก็พร้อมเสมอ!"
    }
  ], []);

  // Sync references to prevent background stale closures in physics loops
  useEffect(() => {
    defeatedCountRef.current = defeatedCount;
  }, [defeatedCount]);

  useEffect(() => {
    bossActiveRef.current = bossActive;
  }, [bossActive]);

  useEffect(() => {
    bossIsDyingRef.current = bossIsDying;
  }, [bossIsDying]);

  useEffect(() => {
    endingSceneActiveRef.current = endingSceneActive;
  }, [endingSceneActive]);

  // Callback on enemy hit connection
  const handleHitImpact = useCallback((impactPos: THREE.Vector3, isCrit: boolean, damage: number) => {
    sound.playHit();
    setComboCount((prev) => prev + 1);
    setLastComboTime(Date.now());

    if (settings.screenShake) {
      shakeIntensityRef.current = isCrit ? 0.65 : 0.3;
    }

    // Force HTML enemies overlay state updates
    setEnemiesState(
      enemiesRef.current.filter(e => !e.isDying).map((e) => ({
        id: e.id,
        health: e.health,
        maxHealth: e.maxHealth,
        label: e.label
      }))
    );

    // Render floating popups text
    const textId = Math.random();
    const damageTextString = isCrit ? `CRIT -${damage}! 🔥` : `-${damage}`;
    const damageTextColor = isCrit ? "#f59e0b" : "#22d3ee";

    setDamageTexts((prev) => [
      ...prev,
      {
        id: textId,
        text: damageTextString,
        position: [impactPos.x + (Math.random() - 0.5) * 0.4, impactPos.y + 0.6, impactPos.z] as [
          number,
          number,
          number
        ],
        velocity: [(Math.random() - 0.5) * 1.5, 3.2 + Math.random() * 1.5, (Math.random() - 0.5) * 1.5] as [
          number,
          number,
          number
        ],
        color: damageTextColor,
        life: 1.0
      }
    ]);

    // Spawn 3D bursting physical blocks
    const burstSparks: HitParticle[] = [];
    const particlesCount = isCrit ? 22 : 10;
    const themeColors = isCrit ? ["#ef4444", "#f97316", "#fbbf24", "#ffffff"] : ["#06b6d4", "#3b82f6", "#ffffff"];

    for (let i = 0; i < particlesCount; i++) {
      burstSparks.push({
        id: Math.random() + i,
        position: [impactPos.x, impactPos.y, impactPos.z] as [number, number, number],
        velocity: [
          (Math.random() - 0.5) * 6,
          Math.random() * 5.5 + 2.0,
          (Math.random() - 0.5) * 6
        ] as [number, number, number],
        size: 0.08 + Math.random() * 0.12,
        color: themeColors[Math.floor(Math.random() * themeColors.length)],
        life: 1.0
      });
    }

    setParticles((prev) => [...prev.slice(-60), ...burstSparks]);
  }, [settings.screenShake]);

  // Handler for Boss getting hit by Player's attacks
  const handleBossHit = useCallback((pos: THREE.Vector3, isCrit: boolean, damage: number) => {
    const boss = bossRef.current;
    if (!boss || boss.isDying) return;

    sound.playHit();
    
    boss.health = Math.max(0, boss.health - 1);
    setBossHealth(boss.health);

    boss.flashRedTimer = 0.35;
    handleHitImpact(pos, isCrit, damage);

    if (boss.health === 0) {
      sound.playAttack2(); // celebratory high-impact attack noise
      boss.isDying = true;
      setBossIsDying(true);
      
      const pushAngle = Math.random() * Math.PI * 2;
      boss.dyingVelocity.set(Math.sin(pushAngle) * 5.0, 12.0, Math.cos(pushAngle) * 5.0);
      boss.flashWhiteTimer = 2.0;

      // Spawn Portal warp gate after 2 seconds
      setTimeout(() => {
        setWarpGateActive(true);
      }, 2000);
    }
  }, [handleHitImpact]);

  // Handler for normal enemy defeated count increments to trigger Boss Spawn
  const handleEnemyDefeated = useCallback(() => {
    const newCount = defeatedCountRef.current + 1;
    setDefeatedCount(newCount);

    if (newCount >= 10 && !bossActiveRef.current && !bossIsDyingRef.current) {
      setBossActive(true);
      // Spawn sound
      sound.playAttack2();
    }
  }, []);

  // Fireball explosion and damage calculation
  const handleFireballExplode = useCallback((id: string, targetPos: THREE.Vector3) => {
    sound.playHit(); // explosive impact sound

    // Trigger ring effect at the explosion center
    setEnergyRings((prev) => [
      ...prev,
      {
        id: Math.random(),
        position: [targetPos.x, targetPos.y, targetPos.z] as [number, number, number],
        radius: 0.1,
        maxRadius: 2.5,
        opacity: 1.0,
        color: "#f97316"
      }
    ]);

    // Check collision with Player
    const pPos = playerPosRef.current;
    const dx = targetPos.x - pPos.x;
    const dz = targetPos.z - pPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 1.6 && !isGameOver && !endingSceneActiveRef.current) {
      if (invulnerableTimerRef.current <= 0) {
        sound.playHurt();
        setPlayerLives((prev) => {
          const next = Math.max(0, prev - 1);
          if (next === 0) {
            setIsGameOver(true);
            sound.playGameOver();
          }
          return next;
        });
        invulnerableTimerRef.current = 1.2; // Invulnerable frame duration
      }
    }

    // Clean up fireball
    setFireballs((prev) => prev.filter((f) => f.id !== id));
  }, [isGameOver]);

  // Player tracking positions and camera shaking references
  const playerPosRef = useRef(new THREE.Vector3(0, 0, 0));
  const shakeIntensityRef = useRef(0);

  // Optimizations HTML reader refs
  const posXNodeRef = useRef<HTMLSpanElement | null>(null);
  const posZNodeRef = useRef<HTMLSpanElement | null>(null);

  // Controller states
  const [playerAnimState, setPlayerAnimState] = useState(0); // 0=Standing, 1=Walk, 2=Attack, 3=Dance
  const [playerFacingLeft, setPlayerFacingLeft] = useState(false);

  // High performance keyboard actions ref
  const keysRef = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    p: false,
    o: false,
    y: false
  });

  // Track physical keyboards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return;
      const key = e.key.toLowerCase();

      // Block normal page jumping on control actions
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.key)) {
        e.preventDefault();
      }

      const keys = keysRef.current;
      if (key === "w" || e.key === "ArrowUp") keys.w = true;
      if (key === "s" || e.key === "ArrowDown") keys.s = true;
      if (key === "a" || e.key === "ArrowLeft") keys.a = true;
      if (key === "d" || e.key === "ArrowRight") keys.d = true;
      if (key === "p") keys.p = true;
      if (key === "o") keys.o = true;
      if (key === "y") keys.y = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const keys = keysRef.current;
      if (key === "w" || e.key === "ArrowUp") keys.w = false;
      if (key === "s" || e.key === "ArrowDown") keys.s = false;
      if (key === "a" || e.key === "ArrowLeft") keys.a = false;
      if (key === "d" || e.key === "ArrowRight") keys.d = false;
      if (key === "p") keys.p = false;
      if (key === "o") keys.o = false;
      if (key === "y") keys.y = false;
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isGameOver]);

  // Sync volume muted setting
  useEffect(() => {
    sound.setVolume(isMuted ? 0 : settings.volume);
  }, [isMuted, settings.volume]);

  // Combo timer decays
  useEffect(() => {
    const checkComboDecay = setInterval(() => {
      if (comboCount > 0 && Date.now() - lastComboTime > 3000) {
        setComboCount(0);
      }
    }, 500);
    return () => clearInterval(checkComboDecay);
  }, [comboCount, lastComboTime]);

  // Helper: Spawns a potion randomly on the 50x50 map
  const spawnPotion = useCallback(() => {
    const id = `potion-${Math.random().toString(36).substr(2, 9)}`;
    const rx = (Math.random() - 0.5) * 40;
    const rz = (Math.random() - 0.5) * 40;
    setPotionsList((prev) => [...prev, { id, spawnPos: [rx, 0.8, rz] }]);
  }, []);

  // Helper: Spawns an enemy randomly on the outer edge of the 50x50 map
  const spawnEnemy = useCallback(() => {
    const id = `enemy-${Math.random().toString(36).substr(2, 9)}`;
    // Spawn enemies a bit further away from the player
    const angle = Math.random() * Math.PI * 2;
    const radius = 12 + Math.random() * 10;
    const rx = playerPosRef.current.x + Math.sin(angle) * radius;
    const rz = playerPosRef.current.z + Math.cos(angle) * radius;

    const names = ["Shadow Hunter", "Neon Raider", "Quantum Glitch", "Viper Agent", "Pixel Assassin"];
    const randomName = names[Math.floor(Math.random() * names.length)];

    const newEnemy = {
      id,
      position: new THREE.Vector3(
        Math.max(-23, Math.min(23, rx)),
        1.25,
        Math.max(-23, Math.min(23, rz))
      ),
      velocity: new THREE.Vector3(0, 0, 0),
      health: 2, // Starts at 2 hits, dies on 2nd hit
      maxHealth: 2,
      facingLeft: Math.random() > 0.5,
      animState: 0,
      frame: 0,
      animAccumulator: 0,
      flashRedTimer: 0,
      flashWhiteTimer: 0,
      isDying: false,
      dyingVelocity: new THREE.Vector3(0, 0, 0),
      dyingRotation: new THREE.Vector3(0, 0, 0),
      label: randomName
    };

    enemiesRef.current.push(newEnemy);
    setEnemiesList([...enemiesRef.current]);
    setEnemiesState(
      enemiesRef.current.filter(e => !e.isDying).map((e) => ({
        id: e.id,
        health: e.health,
        maxHealth: e.maxHealth,
        label: e.label
      }))
    );
  }, []);

  // Spawn initial enemies and set up interval timers
  useEffect(() => {
    // Reset any previous state
    enemiesRef.current = [];
    setEnemiesList([]);
    setPotionsList([]);

    // Spawn 3 initial enemies
    for (let i = 0; i < 3; i++) {
      spawnEnemy();
    }

    // Spawn 2 initial potions
    for (let i = 0; i < 2; i++) {
      spawnPotion();
    }

    // Periodically spawn potions and new enemies to keep action alive
    const enemyInterval = setInterval(() => {
      if (!isGameOver && enemiesRef.current.filter(e => !e.isDying).length < 5) {
        spawnEnemy();
      }
    }, 4500);

    const potionInterval = setInterval(() => {
      if (!isGameOver) {
        setPotionsList((prev) => {
          if (prev.length < 4) {
            const id = `potion-${Math.random().toString(36).substr(2, 9)}`;
            const rx = (Math.random() - 0.5) * 40;
            const rz = (Math.random() - 0.5) * 40;
            return [...prev, { id, spawnPos: [rx, 0.8, rz] }];
          }
          return prev;
        });
      }
    }, 6000);

    return () => {
      clearInterval(enemyInterval);
      clearInterval(potionInterval);
    };
  }, [isGameOver, spawnEnemy, spawnPotion]);

  // Handler: Enemy attacks player
  const handleEnemyAttackPlayer = useCallback(() => {
    if (isGameOver || invulnerableTimerRef.current > 0) return;

    sound.playHurt();
    setPlayerLives((prev) => {
      const nextLives = Math.max(0, prev - 1);
      if (nextLives === 0) {
        setIsGameOver(true);
        sound.playGameOver();
      }
      return nextLives;
    });

    // 1.5 seconds of invulnerability frame
    invulnerableTimerRef.current = 1.5;

    if (settings.screenShake) {
      shakeIntensityRef.current = 0.9;
    }
  }, [isGameOver, settings.screenShake]);

  // Handler: Potion is collected by player
  const handlePotionCollected = useCallback((id: string, pos: THREE.Vector3) => {
    sound.playHeal();
    setPlayerLives((prev) => Math.min(5, prev + 1));
    setPotionsList((prev) => prev.filter((p) => p.id !== id));

    // Render floating heal popup
    const textId = Math.random();
    setDamageTexts((prev) => [
      ...prev,
      {
        id: textId,
        text: "HEAL +1 💖",
        position: [pos.x, pos.y + 0.6, pos.z] as [number, number, number],
        velocity: [0, 2.5, 0] as [number, number, number],
        color: "#10b981",
        life: 1.2
      }
    ]);
  }, []);

  // Reset/Restart game completely
  const handleResetDummies = () => {
    sound.playClick();
    setPlayerLives(5);
    setIsGameOver(false);
    invulnerableTimerRef.current = 0;
    setComboCount(0);
    playerPosRef.current.set(0, 0, 0);

    // Reset Boss & Ending states
    setDefeatedCount(0);
    setBossActive(false);
    setBossHealth(15);
    setBossIsDying(false);
    bossRef.current.health = 15;
    bossRef.current.isDying = false;
    bossRef.current.position.set(0, 3.5, -8);
    bossRef.current.pattern = "idle";
    bossRef.current.patternTimer = 2.0;
    setFireballs([]);
    setWarpGateActive(false);
    setEndingSceneActive(false);
    setNpcArrived(false);
    setDialogueIndex(0);
    setShowFinishScreen(false);

    enemiesRef.current = [];
    setEnemiesList([]);
    setPotionsList([]);

    // Spawn 3 initial enemies
    for (let i = 0; i < 3; i++) {
      spawnEnemy();
    }

    // Spawn 2 initial potions
    for (let i = 0; i < 2; i++) {
      spawnPotion();
    }
  };

  // Set on screen touch virtual bindings
  const handleTouchAction = (action: string, isActive: boolean) => {
    const keys = keysRef.current;
    if (action === "MOVE_LEFT") keys.a = isActive;
    if (action === "MOVE_RIGHT") keys.d = isActive;
    if (action === "MOVE_UP" || action === "JUMP") keys.w = isActive;
    if (action === "MOVE_DOWN") keys.s = isActive;
    if (action === "ATTACK_1") keys.p = isActive;
    if (action === "ATTACK_2") keys.o = isActive;
    if (action === "DANCE") keys.y = isActive;

    if (isActive && settings.vibration && navigator.vibrate) {
      navigator.vibrate(12);
    }
  };

  return (
    <div
      id="game-test-arena-viewport"
      className="relative w-full h-screen overflow-hidden bg-[#07070d] text-white flex flex-col justify-between select-none font-sans"
    >
      {/* 3D CANVAS VIEWPORT AREA */}
      <div className="absolute inset-0 w-full h-full z-0">
        <Canvas shadows gl={{ antialias: true }} camera={{ fov: 50, position: [0, 8, 12] }}>
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 12, 5]}
            intensity={0.95}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <pointLight position={[-10, 5, -10]} intensity={0.3} color="#a855f7" />
          <fog attach="fog" args={["#07070d", 15, 30]} />

          <Suspense
            fallback={
              <Html center>
                <div className="flex flex-col items-center justify-center bg-[#07070d]/90 p-8 rounded-2xl border border-cyan-500/20">
                  <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mb-4" />
                  <span className="font-mono text-cyan-300 text-xs tracking-widest uppercase font-bold animate-pulse">
                    LOADING 3D GAMEPLAY ASSETS...
                  </span>
                </div>
              </Html>
            }
          >
            {/* Ground Plane */}
            <GroundPlane />

            {/* Active Hostile Enemies */}
            {!endingSceneActive && enemiesList.map((enemy) => (
              <EnemySprite
                key={enemy.id}
                enemyData={enemy}
                playerPosRef={playerPosRef}
                isGameOver={isGameOver}
                onPlayerHit={handleEnemyAttackPlayer}
                hitboxViewer={hitboxViewer}
              />
            ))}

            {/* Active Recover Potions */}
            {!endingSceneActive && potionsList.map((potion) => (
              <PotionSprite
                key={potion.id}
                id={potion.id}
                spawnPos={potion.spawnPos}
              />
            ))}

            {/* Collision Collector logic */}
            {!endingSceneActive && (
              <PotionCollector
                potions={potionsList}
                playerPosRef={playerPosRef}
                onCollect={handlePotionCollected}
              />
            )}

            {/* Active Boss Sprite */}
            {bossActive && !endingSceneActive && (
              <BossSprite
                bossRef={bossRef}
                playerPosRef={playerPosRef}
                isGameOver={isGameOver}
                onPlayerHit={handleEnemyAttackPlayer}
                hitboxViewer={hitboxViewer}
                isThai={isThai}
                spawnFireball={() => {
                  if (isGameOver || endingSceneActiveRef.current) return;
                  sound.playAttack1();
                  const target1 = playerPosRef.current.clone();
                  const angle2 = Math.random() * Math.PI * 2;
                  const dist2 = 3.0 + Math.random() * 2.0;
                  const target2 = playerPosRef.current.clone().add(new THREE.Vector3(Math.sin(angle2) * dist2, 0, Math.cos(angle2) * dist2));
                  const angle3 = Math.random() * Math.PI * 2;
                  const dist3 = 4.0 + Math.random() * 2.5;
                  const target3 = playerPosRef.current.clone().add(new THREE.Vector3(Math.sin(angle3) * dist3, 0, Math.cos(angle3) * dist3));

                  const targets = [target1, target2, target3];
                  setFireballs((prev) => {
                    const updated = [...prev];
                    targets.forEach((target, index) => {
                      const id = `fireball-${Math.random().toString(36).substr(2, 9)}`;
                      const startPos = bossRef.current.position.clone();
                      startPos.y += 1.0;
                      updated.push({
                        id,
                        position: startPos.clone(),
                        startPosition: startPos,
                        targetPosition: target,
                        progress: 0,
                        duration: 1.8 + index * 0.4,
                        hasExploded: false
                      });
                    });
                    return updated;
                  });
                }}
              />
            )}

            {/* Flying fireballs */}
            {!endingSceneActive && fireballs.map((fb) => (
              <FireballSprite
                key={fb.id}
                fireball={fb}
                playerPosRef={playerPosRef}
                onExplode={handleFireballExplode}
              />
            ))}

            {/* Warp portal */}
            {warpGateActive && !endingSceneActive && (
              <WarpGateSprite
                position={[0, 1.25, -5.0]}
                playerPosRef={playerPosRef}
                onEnter={() => {
                  sound.playHeal();
                  setEndingSceneActive(true);
                  playerPosRef.current.set(-2.0, 1.25, 0); // Lock player left for conversation cinematic
                }}
                isThai={isThai}
              />
            )}

            {/* Master Jin NPC walking towards the player inside ending scene */}
            {endingSceneActive && (
              <NPCSprite
                position={npcPosition}
                targetPosition={new THREE.Vector3(2.0, 1.25, 0)} // Walk from right to left center
                facingLeft={true}
                setArrival={setNpcArrived}
              />
            )}

            {/* Interactive Player Billboard */}
            <PlayerSprite
              selectedCharacter={selectedCharacter}
              keysRef={keysRef}
              playerPos={playerPosRef}
              onHit={handleHitImpact}
              setEnergyRings={setEnergyRings}
              currentState={playerAnimState}
              setCurrentState={setPlayerAnimState}
              facingLeft={playerFacingLeft}
              setFacingLeft={setPlayerFacingLeft}
              hitboxViewer={hitboxViewer}
              posXNodeRef={posXNodeRef}
              posZNodeRef={posZNodeRef}
              enemiesRef={enemiesRef}
              spawnEnemy={spawnEnemy}
              setEnemiesList={setEnemiesList}
              setEnemiesState={setEnemiesState}
              invulnerableTimerRef={invulnerableTimerRef}
              bossActive={bossActive}
              bossRef={bossRef}
              onBossHit={handleBossHit}
              onEnemyDefeated={handleEnemyDefeated}
            />

            {/* Shared hit visual rendering effects */}
            <EffectsRenderer
              damageTexts={damageTexts}
              setDamageTexts={setDamageTexts}
              particles={particles}
              setParticles={setParticles}
              energyRings={energyRings}
              setEnergyRings={setEnergyRings}
            />

            {/* Smooth Tracking Camera Manager */}
            <CameraManager
              playerPos={playerPosRef}
              shakeIntensityRef={shakeIntensityRef}
              settings={settings}
              endingSceneActive={endingSceneActive}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* --- FLOATING HEADER HUD OVERLAY --- */}
      <header className="relative w-full px-6 py-4 flex items-center justify-between border-b border-purple-500/10 bg-[#07070d]/80 backdrop-blur-md z-10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <button
            id="btn-quit-game"
            onClick={() => {
              sound.playClick();
              onBack();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-500/30 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-900/30 hover:text-white hover:border-cyan-400 transition-all cursor-pointer font-bold uppercase tracking-wider text-xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{isThai ? "ออกจากลานประลอง" : "Exit Arena"}</span>
          </button>

          <button
            id="btn-toggle-hitbox"
            onClick={() => {
              sound.playClick();
              setHitboxViewer((prev) => !prev);
            }}
            className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg border transition-all cursor-pointer font-bold uppercase tracking-wider text-xs ${
              hitboxViewer
                ? "border-amber-500 bg-amber-950/30 text-amber-300"
                : "border-purple-500/20 bg-purple-950/10 text-purple-300 hover:border-amber-500/40"
            }`}
          >
            {hitboxViewer ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{isThai ? "ขอบเขตโจมตี" : "Hitbox Overlay"}</span>
          </button>
        </div>

        {/* Selected Warrior Avatar Badge info */}
        <div className="flex items-center gap-3 bg-slate-950/75 border border-purple-500/15 px-4 py-1.5 rounded-xl">
          <span className="text-2xl animate-bounce duration-1000">{selectedCharacter.avatar}</span>
          <div className="text-left">
            <div className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-purple-300 uppercase italic">
              {isThai ? selectedCharacter.thaiName : selectedCharacter.name}
            </div>
            <div className="text-[9px] font-mono font-bold text-cyan-400/80 uppercase tracking-widest">
              {isThai ? selectedCharacter.thaiTitle : selectedCharacter.title}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Reset Targets */}
          <button
            onClick={handleResetDummies}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-rose-500/20 bg-rose-950/10 text-xs text-rose-300 hover:bg-rose-950/30 hover:text-white hover:border-rose-400 transition-all cursor-pointer font-bold uppercase tracking-wider"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isThai ? "เริ่มเกมใหม่" : "Restart Game"}</span>
          </button>

          {/* Sound volume controller */}
          <button
            onClick={() => setIsMuted((p) => !p)}
            className="p-2 rounded-lg border border-slate-500/20 bg-slate-950/30 text-slate-300 hover:text-white hover:bg-slate-900/30 transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* --- MAIN HUD VIEWPORTS PANEL CONTROL --- */}
      <main className="relative flex-1 w-full pointer-events-none z-10">
        {/* Boss Health Bar HUD */}
        {bossActive && !endingSceneActive && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto w-full max-w-lg px-6 flex flex-col gap-1.5 z-40">
            <div className="flex justify-between items-end text-xs font-mono">
              <span className="text-red-400 font-black tracking-widest uppercase flex items-center gap-1">
                👑 {isThai ? "บอส: ราชาปีศาจ" : "BOSS: ARENA DEMON KING"}
              </span>
              <span className="text-red-400 font-bold bg-red-950/40 px-2 py-0.5 rounded border border-red-500/20 shadow-md">
                {bossHealth} / 15 HP
              </span>
            </div>
            <div className="w-full h-2.5 bg-black/60 rounded-full border border-red-500/10 overflow-hidden shadow-[0_0_15px_rgba(239,68,68,0.15)]">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-red-500 shadow-[0_0_8px_#ef4444] transition-all duration-300"
                style={{ width: `${(bossHealth / 15) * 100}%` }}
              />
            </div>
          </div>
        )}
        {/* Core Stats Widget Left overlay */}
        <div className="absolute top-4 left-4 w-64 pointer-events-auto flex flex-col gap-3">
          {/* Warrior Core Info Stats Card */}
          <div className="p-4 rounded-xl border border-purple-500/10 vibrant-glass shadow-[0_10px_35px_rgba(0,0,0,0.6)] text-left">
            <h3 className="text-[10px] font-mono tracking-widest text-cyan-400 font-bold uppercase mb-2 flex items-center gap-1.5 border-b border-purple-500/15 pb-1">
              <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
              {isThai ? "สถานะนักรบปัจจุบัน" : "WARRIOR BIOMETRICS"}
            </h3>

            {/* Stats readouts */}
            <div className="space-y-2.5 text-xs">
              {/* Hearts Lives */}
              <div>
                <div className="flex justify-between font-bold text-rose-400 text-[10px] uppercase mb-1">
                  <span>{isThai ? "พลังชีวิตนักรบ" : "SURVIVAL INTEGRITY"}</span>
                  <span className="text-rose-400 font-mono font-black">{playerLives}/5</span>
                </div>
                <div className="flex gap-1.5 bg-rose-950/20 px-2 py-1.5 rounded-lg border border-rose-500/10">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`text-base transition-all duration-300 ${
                        idx < playerLives ? "text-rose-500 scale-110 drop-shadow-[0_0_6px_#f43f5e] animate-pulse" : "text-slate-800 scale-90 opacity-40"
                      }`}
                    >
                      ❤️
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-300 text-[10px] uppercase mb-0.5">
                  <span>{isThai ? "ความเร็ว" : "Speed"}</span>
                  <span className="text-cyan-300 font-mono">{selectedCharacter.stats.speed}/10</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
                    style={{ width: `${selectedCharacter.stats.speed * 10}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-300 text-[10px] uppercase mb-0.5">
                  <span>{isThai ? "พลังโจมตี" : "Power"}</span>
                  <span className="text-amber-300 font-mono">{selectedCharacter.stats.power}/10</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 shadow-[0_0_8px_#fbbf24]"
                    style={{ width: `${selectedCharacter.stats.power * 10}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-300 text-[10px] uppercase mb-0.5">
                  <span>{isThai ? "กระโดด" : "Jump Force"}</span>
                  <span className="text-purple-300 font-mono">{selectedCharacter.stats.jump}/10</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-400 shadow-[0_0_8px_#c084fc]"
                    style={{ width: `${selectedCharacter.stats.jump * 10}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Coordinates visual readout - bypass react state changes */}
            <div className="mt-4 pt-3 border-t border-purple-500/10 flex items-center justify-between font-mono text-[9px] text-slate-400">
              <span className="uppercase font-bold text-cyan-400">[POSITION MATRIX]</span>
              <span className="bg-black/40 px-1.5 py-0.5 rounded text-[10px]">
                X: <span ref={posXNodeRef} className="text-white font-bold">0.00</span> | Z:{" "}
                <span ref={posZNodeRef} className="text-white font-bold">0.00</span>
              </span>
            </div>
          </div>

          {/* Active Threats list overlay health metrics */}
          <div className="p-4 rounded-xl border border-purple-500/10 vibrant-glass shadow-[0_10px_35px_rgba(0,0,0,0.6)] text-left">
            <h3 className="text-[10px] font-mono tracking-widest text-red-400 font-bold uppercase mb-2 flex items-center gap-1.5 border-b border-purple-500/15 pb-1">
              <Shield className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              {isThai ? "สัญญาณตรวจจับอริ" : "HOSTILE RADAR TELEMETRY"}
            </h3>

            <div className="space-y-2 mt-1">
              {enemiesState.length === 0 ? (
                <div className="text-[9px] font-mono text-slate-500 italic uppercase py-2">
                  {isThai ? "ตรวจไม่พบศัตรูในระยะ" : "No hostile signatures detected"}
                </div>
              ) : (
                enemiesState.map((enemy) => (
                  <div key={enemy.id} className="text-[10px]">
                    <div className="flex justify-between font-mono text-[9px] text-slate-400 mb-0.5">
                      <span className="truncate w-36 uppercase font-black">
                        {enemy.health <= 0 ? "☠️ [VANISHED] " : "🔴 "}
                        {enemy.label}
                      </span>
                      <span className="text-rose-400 font-bold">
                        {enemy.health}/2 HP
                      </span>
                    </div>
                    <div className="w-full h-1 bg-black/50 rounded overflow-hidden">
                      <div
                        className={`h-full transition-all duration-150 ${
                          enemy.health <= 0 ? "bg-[#334155]" : "bg-red-500 shadow-[0_0_4px_#ef4444]"
                        }`}
                        style={{ width: `${(enemy.health / enemy.maxHealth) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Action instruction manual Right Panel overlay */}
        <div className="absolute top-4 right-4 w-60 pointer-events-auto hidden md:flex flex-col gap-3">
          <div className="p-4 rounded-xl border border-purple-500/10 vibrant-glass shadow-[0_10px_35px_rgba(0,0,0,0.6)] text-left">
            <h3 className="text-[10px] font-mono tracking-widest text-cyan-400 font-bold uppercase mb-2.5 flex items-center gap-1.5 border-b border-purple-500/15 pb-1">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              {isThai ? "ปุ่มควบคุมและคู่มือ" : "LAB CONSOLE CONTROLS"}
            </h3>

            <div className="space-y-2 text-[10.5px]">
              {/* Keyboard bindings */}
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-400">{isThai ? "เดิน 8 ทิศทาง:" : "8-Way Move:"}</span>
                <span className="font-mono bg-black/60 px-2 py-0.5 rounded border border-white/10 text-cyan-300 font-bold">
                  WASD / ◀▶▲▼
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-400">{isThai ? "ต่อยโจมตีตัว:" : "Punch / Strike:"}</span>
                <span className="font-mono bg-black/60 px-2 py-0.5 rounded border border-white/10 text-amber-400 font-black">
                  [ P ] Key
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-400">{isThai ? "ระเบิดพลังสกิล:" : "AoE Skill Ring:"}</span>
                <span className="font-mono bg-black/60 px-2 py-0.5 rounded border border-white/10 text-purple-400 font-black">
                  [ O ] Key
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-400">{isThai ? "เต้นรำฉลอง:" : "Celebrate Dance:"}</span>
                <span className="font-mono bg-black/60 px-2 py-0.5 rounded border border-white/10 text-pink-400 font-black">
                  [ Y ] Key
                </span>
              </div>
            </div>

            {/* Quick Toggle mobile button view helper */}
            <button
              onClick={() => setIsMobileEmulator((v) => !v)}
              className="w-full mt-4 text-center py-1.5 rounded bg-cyan-950/40 border border-cyan-500/20 text-[9px] font-mono font-black tracking-widest text-cyan-300 hover:bg-cyan-900/30 transition-all uppercase cursor-pointer"
            >
              {isMobileEmulator
                ? (isThai ? "ปิดจำลองปุ่มมือถือ" : "DISABLE TOUCH OVERLAYS")
                : (isThai ? "เปิดจำลองปุ่มมือถือ" : "ENABLE TOUCH OVERLAYS")}
            </button>
          </div>
        </div>

        {/* COMBO MULTIPLIER POPUP SCREEN HUD */}
        <AnimatePresence>
          {comboCount > 1 && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, x: "-50%" }}
              animate={{ scale: 1.1, opacity: 1, x: "-50%" }}
              exit={{ scale: 0.8, opacity: 0, x: "-50%" }}
              className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-none text-center bg-black/60 border border-amber-500/25 px-5 py-2.5 rounded-2xl backdrop-blur-md shadow-[0_0_25px_rgba(245,158,11,0.25)] flex flex-col items-center gap-0.5"
            >
              <div className="flex items-center gap-1.5 text-amber-400 font-black text-2xl tracking-tight italic select-none">
                <Flame className="w-6 h-6 fill-amber-500 text-amber-500 animate-pulse" />
                <span className="vibrant-glow-purple">{comboCount}</span>
                <span className="text-white text-base font-black tracking-wider ml-1 uppercase">
                  {isThai ? "คอมโบเดือด!" : "HIT COMBO"}
                </span>
              </div>
              <div className="w-24 h-1 bg-slate-900 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500"
                  style={{
                    width: `${Math.max(0, Math.min(100, (1.0 - (Date.now() - lastComboTime) / 3000) * 100))}%`
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic visual keys indicator HUD overlay */}
        <div className="absolute bottom-6 left-6 hidden sm:flex items-center gap-2 font-mono">
          <div className="bg-[#07070d]/90 p-3 rounded-xl border border-purple-500/10 pointer-events-auto flex flex-col gap-1 text-[9.5px]">
            <div className="text-slate-400 uppercase font-black mb-1.5 border-b border-purple-500/10 pb-0.5 tracking-wider text-center text-[9px]">
              [ CONTROLLER KEY HUB ]
            </div>
            <div className="grid grid-cols-3 gap-1.5 w-32 justify-center mx-auto">
              <div />
              <div
                className={`w-9 h-9 border rounded-lg flex items-center justify-center font-bold text-xs shadow transition-all ${
                  keysRef.current.w ? "bg-cyan-500 text-black border-cyan-400 font-black shadow-[0_0_10px_#22d3ee]" : "border-purple-500/15 text-slate-500 bg-slate-950/40"
                }`}
              >
                W
              </div>
              <div />
              <div
                className={`w-9 h-9 border rounded-lg flex items-center justify-center font-bold text-xs shadow transition-all ${
                  keysRef.current.a ? "bg-cyan-500 text-black border-cyan-400 font-black shadow-[0_0_10px_#22d3ee]" : "border-purple-500/15 text-slate-500 bg-slate-950/40"
                }`}
              >
                A
              </div>
              <div
                className={`w-9 h-9 border rounded-lg flex items-center justify-center font-bold text-xs shadow transition-all ${
                  keysRef.current.s ? "bg-cyan-500 text-black border-cyan-400 font-black shadow-[0_0_10px_#22d3ee]" : "border-purple-500/15 text-slate-500 bg-slate-950/40"
                }`}
              >
                S
              </div>
              <div
                className={`w-9 h-9 border rounded-lg flex items-center justify-center font-bold text-xs shadow transition-all ${
                  keysRef.current.d ? "bg-cyan-500 text-black border-cyan-400 font-black shadow-[0_0_10px_#22d3ee]" : "border-purple-500/15 text-slate-500 bg-slate-950/40"
                }`}
              >
                D
              </div>
            </div>

            <div className="flex gap-2 justify-center mt-2 border-t border-purple-500/10 pt-2">
              <div
                className={`px-3.5 py-1.5 border rounded-lg flex items-center justify-center font-black text-xs shadow transition-all ${
                  keysRef.current.p ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_10px_#fbbf24]" : "border-purple-500/15 text-slate-500 bg-slate-950/40"
                }`}
              >
                P [ATK]
              </div>
              <div
                className={`px-3.5 py-1.5 border rounded-lg flex items-center justify-center font-black text-xs shadow transition-all ${
                  keysRef.current.o ? "bg-purple-500 text-white border-purple-400 shadow-[0_0_10px_#c084fc]" : "border-purple-500/15 text-slate-500 bg-slate-950/40"
                }`}
              >
                O [SKILL]
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE CONTROLS OVERLAY - TOUCH BUTTONS MAPPING */}
        {(isMobileEmulator ||
          ("ontouchstart" in window && mobileLayout.layoutType !== undefined)) && (
          <div className="absolute inset-0 w-full h-full pointer-events-none z-10 select-none">
            {/* Handedness alignment: swapping left / right side layouts */}
            <div className="absolute bottom-6 inset-x-6 flex items-end justify-between pointer-events-none select-none">
              {/* Left Column (Dpad/Joystick or Actions) based on layout configuration */}
              <div className="pointer-events-auto flex items-center justify-center select-none">
                {mobileLayout.handedness === "left" ? (
                  /* Action Buttons on Left side if Left Handed */
                  <div className="flex gap-2.5 items-center">
                    <button
                      onMouseDown={() => handleTouchAction("ATTACK_1", true)}
                      onMouseUp={() => handleTouchAction("ATTACK_1", false)}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        handleTouchAction("ATTACK_1", true);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        handleTouchAction("ATTACK_1", false);
                      }}
                      className="w-16 h-16 rounded-full border border-amber-500/40 bg-amber-950/30 text-amber-300 font-black text-lg shadow-[0_0_15px_rgba(245,158,11,0.2)] active:scale-90 flex flex-col items-center justify-center"
                    >
                      <span className="text-[8px] tracking-tight font-mono text-amber-400 uppercase">PUNCH</span>
                      <span className="text-lg">⚔️</span>
                    </button>

                    <button
                      onMouseDown={() => handleTouchAction("ATTACK_2", true)}
                      onMouseUp={() => handleTouchAction("ATTACK_2", false)}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        handleTouchAction("ATTACK_2", true);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        handleTouchAction("ATTACK_2", false);
                      }}
                      className="w-14 h-14 rounded-full border border-purple-500/40 bg-purple-950/30 text-purple-300 font-black text-xs shadow-[0_0_15px_rgba(168,85,247,0.2)] active:scale-90 flex flex-col items-center justify-center"
                    >
                      <span className="text-[7px] tracking-tight font-mono text-purple-400 uppercase">BURST</span>
                      <span className="text-base">🔥</span>
                    </button>

                    <button
                      onMouseDown={() => handleTouchAction("DANCE", true)}
                      onMouseUp={() => handleTouchAction("DANCE", false)}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        handleTouchAction("DANCE", true);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        handleTouchAction("DANCE", false);
                      }}
                      className="w-11 h-11 rounded-full border border-pink-500/40 bg-pink-950/30 text-pink-300 font-black text-[9px] shadow-[0_0_15px_rgba(236,72,153,0.15)] active:scale-90 flex items-center justify-center"
                    >
                      🕺
                    </button>
                  </div>
                ) : (
                  /* Movement Controller on Left side if Right Handed (standard) */
                  <div className="flex flex-col gap-1 bg-[#0c0c14]/40 p-2.5 rounded-2xl border border-white/5 backdrop-blur-sm shadow-xl">
                    <div className="flex justify-center">
                      <button
                        onMouseDown={() => handleTouchAction("MOVE_UP", true)}
                        onMouseUp={() => handleTouchAction("MOVE_UP", false)}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          handleTouchAction("MOVE_UP", true);
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          handleTouchAction("MOVE_UP", false);
                        }}
                        className="w-12 h-10 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 active:bg-cyan-500 active:text-black flex items-center justify-center font-bold text-sm shadow cursor-pointer"
                      >
                        ▲
                      </button>
                    </div>
                    <div className="flex items-center gap-6">
                      <button
                        onMouseDown={() => handleTouchAction("MOVE_LEFT", true)}
                        onMouseUp={() => handleTouchAction("MOVE_LEFT", false)}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          handleTouchAction("MOVE_LEFT", true);
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          handleTouchAction("MOVE_LEFT", false);
                        }}
                        className="w-12 h-10 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 active:bg-cyan-500 active:text-black flex items-center justify-center font-bold text-sm shadow cursor-pointer"
                      >
                        ◀
                      </button>
                      <button
                        onMouseDown={() => handleTouchAction("MOVE_RIGHT", true)}
                        onMouseUp={() => handleTouchAction("MOVE_RIGHT", false)}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          handleTouchAction("MOVE_RIGHT", true);
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          handleTouchAction("MOVE_RIGHT", false);
                        }}
                        className="w-12 h-10 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 active:bg-cyan-500 active:text-black flex items-center justify-center font-bold text-sm shadow cursor-pointer"
                      >
                        ▶
                      </button>
                    </div>
                    <div className="flex justify-center">
                      <button
                        onMouseDown={() => handleTouchAction("MOVE_DOWN", true)}
                        onMouseUp={() => handleTouchAction("MOVE_DOWN", false)}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          handleTouchAction("MOVE_DOWN", true);
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          handleTouchAction("MOVE_DOWN", false);
                        }}
                        className="w-12 h-10 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 active:bg-cyan-500 active:text-black flex items-center justify-center font-bold text-sm shadow cursor-pointer"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (Movement or Action Touch buttons) */}
              <div className="pointer-events-auto flex items-center justify-center select-none">
                {mobileLayout.handedness === "left" ? (
                  /* Movement Controller on Right side if Left Handed */
                  <div className="flex flex-col gap-1 bg-[#0c0c14]/40 p-2.5 rounded-2xl border border-white/5 backdrop-blur-sm shadow-xl">
                    <div className="flex justify-center">
                      <button
                        onMouseDown={() => handleTouchAction("MOVE_UP", true)}
                        onMouseUp={() => handleTouchAction("MOVE_UP", false)}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          handleTouchAction("MOVE_UP", true);
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          handleTouchAction("MOVE_UP", false);
                        }}
                        className="w-12 h-10 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 active:bg-cyan-500 active:text-black flex items-center justify-center font-bold text-sm shadow cursor-pointer"
                      >
                        ▲
                      </button>
                    </div>
                    <div className="flex items-center gap-6">
                      <button
                        onMouseDown={() => handleTouchAction("MOVE_LEFT", true)}
                        onMouseUp={() => handleTouchAction("MOVE_LEFT", false)}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          handleTouchAction("MOVE_LEFT", true);
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          handleTouchAction("MOVE_LEFT", false);
                        }}
                        className="w-12 h-10 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 active:bg-cyan-500 active:text-black flex items-center justify-center font-bold text-sm shadow cursor-pointer"
                      >
                        ◀
                      </button>
                      <button
                        onMouseDown={() => handleTouchAction("MOVE_RIGHT", true)}
                        onMouseUp={() => handleTouchAction("MOVE_RIGHT", false)}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          handleTouchAction("MOVE_RIGHT", true);
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          handleTouchAction("MOVE_RIGHT", false);
                        }}
                        className="w-12 h-10 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 active:bg-cyan-500 active:text-black flex items-center justify-center font-bold text-sm shadow cursor-pointer"
                      >
                        ▶
                      </button>
                    </div>
                    <div className="flex justify-center">
                      <button
                        onMouseDown={() => handleTouchAction("MOVE_DOWN", true)}
                        onMouseUp={() => handleTouchAction("MOVE_DOWN", false)}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          handleTouchAction("MOVE_DOWN", true);
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          handleTouchAction("MOVE_DOWN", false);
                        }}
                        className="w-12 h-10 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 active:bg-cyan-500 active:text-black flex items-center justify-center font-bold text-sm shadow cursor-pointer"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Action Buttons on Right side if Right Handed (standard) */
                  <div className="flex gap-2.5 items-center">
                    <button
                      onMouseDown={() => handleTouchAction("ATTACK_1", true)}
                      onMouseUp={() => handleTouchAction("ATTACK_1", false)}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        handleTouchAction("ATTACK_1", true);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        handleTouchAction("ATTACK_1", false);
                      }}
                      className="w-16 h-16 rounded-full border border-amber-500/40 bg-amber-950/30 text-amber-300 font-black text-lg shadow-[0_0_15px_rgba(245,158,11,0.2)] active:scale-90 flex flex-col items-center justify-center"
                    >
                      <span className="text-[8px] tracking-tight font-mono text-amber-400 uppercase">PUNCH [P]</span>
                      <span className="text-lg">⚔️</span>
                    </button>

                    <button
                      onMouseDown={() => handleTouchAction("ATTACK_2", true)}
                      onMouseUp={() => handleTouchAction("ATTACK_2", false)}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        handleTouchAction("ATTACK_2", true);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        handleTouchAction("ATTACK_2", false);
                      }}
                      className="w-14 h-14 rounded-full border border-purple-500/40 bg-purple-950/30 text-purple-300 font-black text-xs shadow-[0_0_15px_rgba(168,85,247,0.2)] active:scale-90 flex flex-col items-center justify-center"
                    >
                      <span className="text-[7px] tracking-tight font-mono text-purple-400 uppercase">BURST [O]</span>
                      <span className="text-base">🔥</span>
                    </button>

                    <button
                      onMouseDown={() => handleTouchAction("DANCE", true)}
                      onMouseUp={() => handleTouchAction("DANCE", false)}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        handleTouchAction("DANCE", true);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        handleTouchAction("DANCE", false);
                      }}
                      className="w-11 h-11 rounded-full border border-pink-500/40 bg-pink-950/30 text-pink-300 font-black text-[9px] shadow-[0_0_15px_rgba(236,72,153,0.15)] active:scale-90 flex items-center justify-center"
                    >
                      🕺
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- FOOTER BANNER METADATA STATUS OVERLAY --- */}
      <footer className="relative w-full px-6 py-4 flex items-center justify-between z-10 border-t border-purple-500/10 bg-[#07070d]/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-mono text-[9.5px] text-slate-400 uppercase tracking-widest">
            {isThai
              ? "ระบบสัมผัสจอยสติ๊ก และแป้นพิมพ์ 3D ThreeJS Fiber ทำงานพร้อมกันแล้ว"
              : "3D REAL-TIME COLLISION & TACTILE CONTROLLER HARMONY ONLINE"}
          </span>
        </div>

        <div className="text-[9.5px] font-mono text-cyan-400 flex items-center gap-3 font-bold">
          <span>[ CONTROLLER STATUS: ONLINE ]</span>
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
        </div>
      </footer>

      {/* GAME OVER FULLSCREEN BANNER OVERLAY */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#020204]/95 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-xl pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ type: "spring", damping: 15 }}
              className="max-w-md w-full bg-[#08080f] border border-rose-500/25 p-8 rounded-2xl shadow-[0_0_50px_rgba(244,63,94,0.15)] text-center flex flex-col items-center gap-6"
            >
              {/* Glowing skull emblem icon */}
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/35 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                💀
              </div>

              <div>
                <h2 className="text-4xl font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-amber-500 italic filter drop-shadow-[0_2px_10px_rgba(244,63,94,0.2)]">
                  {isThai ? "เกมโอเวอร์" : "GAME OVER"}
                </h2>
                <p className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase mt-1">
                  {isThai ? "พลังชีวิตของคุณหมดลงแล้ว!" : "Your survival shields are depleted!"}
                </p>
              </div>

              <div className="w-full bg-slate-950/80 border border-white/5 p-4 rounded-xl font-mono text-left text-xs space-y-2">
                <div className="flex justify-between border-b border-white/5 pb-1.5 text-slate-400">
                  <span>{isThai ? "นักรบที่เลือก" : "Warrior Sprite"}</span>
                  <span className="text-white font-bold">{selectedCharacter.avatar} {selectedCharacter.name}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1.5 text-slate-400">
                  <span>{isThai ? "คะแนนต่อยคอมโบ" : "Max Combos Reached"}</span>
                  <span className="text-amber-400 font-bold">{comboCount} Hits</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{isThai ? "สถานะการเอาชีวิตรอด" : "Mission Status"}</span>
                  <span className="text-rose-400 font-black tracking-wider uppercase">{isThai ? "ล้มเหลว" : "FAILED"}</span>
                </div>
              </div>

              <div className="flex gap-4 w-full">
                <button
                  onClick={handleResetDummies}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-rose-950/50 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  {isThai ? "เล่นใหม่อีกครั้ง" : "REPLAY ARENA"}
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    onBack();
                  }}
                  className="flex-1 py-3.5 rounded-xl bg-slate-950/80 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-900 font-bold uppercase tracking-wider text-xs transition-all cursor-pointer"
                >
                  {isThai ? "กลับเมนูหลัก" : "QUIT SYSTEM"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RPG DIALOGUE OVERLAY DURING ENDING CUTSCENE */}
      <AnimatePresence>
        {endingSceneActive && !showFinishScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 bottom-24 z-40 px-6 flex justify-center pointer-events-auto"
          >
            <div className="max-w-xl w-full bg-slate-950/90 border border-indigo-500/30 p-5 rounded-2xl shadow-[0_0_35px_rgba(99,102,241,0.15)] flex flex-col gap-3 backdrop-blur-md">
              {/* Speakers row with Avatars */}
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                {/* Player Character info (Speaker left) */}
                <div className={`flex items-center gap-2 transition-all duration-200 ${dialogueLines[dialogueIndex]?.speaker === "player" ? "opacity-100 scale-105" : "opacity-40"}`}>
                  <span className="text-xl bg-slate-900 w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 shadow-sm">
                    {selectedCharacter.avatar}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[9.5px] font-mono tracking-wider text-slate-400 uppercase">
                      {isThai ? "ผู้กล้าอารีน่า" : "ARENA WARRIOR"}
                    </span>
                    <span className="text-xs font-black uppercase text-white tracking-wide">
                      {selectedCharacter.name}
                    </span>
                  </div>
                </div>

                {/* VS indicator */}
                <span className="text-[9px] font-mono font-black text-indigo-400 uppercase tracking-widest bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-500/20">
                  TALK
                </span>

                {/* NPC Character info (Speaker right) */}
                <div className={`flex items-center gap-2 flex-row-reverse text-right transition-all duration-200 ${dialogueLines[dialogueIndex]?.speaker === "npc" ? "opacity-100 scale-105" : "opacity-40"}`}>
                  <span className="text-xl bg-slate-900 w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 shadow-sm">
                    🧙‍♂️
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[9.5px] font-mono tracking-wider text-slate-400 uppercase">
                      {isThai ? "ปรมาจารย์" : "LEGENDARY MASTER"}
                    </span>
                    <span className="text-xs font-black uppercase text-indigo-300 tracking-wide">
                      {isThai ? "จิน" : "JIN"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Speech box */}
              <div className="min-h-[72px] flex items-center justify-center text-center px-2 py-1">
                {!npcArrived ? (
                  <p className="text-xs font-mono font-bold tracking-widest text-slate-400 animate-pulse uppercase">
                    {isThai ? "* ปรมาจารย์จิน กำลังเดินเข้ามาหา... *" : "* GRAND MASTER JIN IS APPROACHING... *"}
                  </p>
                ) : (
                  <motion.p
                    key={dialogueIndex}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm font-medium leading-relaxed text-slate-200"
                  >
                    "{isThai ? dialogueLines[dialogueIndex].textTH : dialogueLines[dialogueIndex].textEN}"
                  </motion.p>
                )}
              </div>

              {/* Action row */}
              <div className="flex justify-between items-center mt-1 pt-2 border-t border-white/5 text-[10px] font-mono text-slate-500">
                <span>
                  {isThai ? `บทสนทนา ${dialogueIndex + 1}/8` : `Sentence ${dialogueIndex + 1}/8`}
                </span>
                
                {npcArrived && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      if (dialogueIndex < dialogueLines.length - 1) {
                        setDialogueIndex((prev) => prev + 1);
                      } else {
                        setShowFinishScreen(true);
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-wider text-[9.5px] transition-all cursor-pointer shadow-lg shadow-indigo-950/50"
                  >
                    <span>{isThai ? "ถัดไป" : "NEXT"}</span>
                    <span className="animate-ping text-[6px]">▶</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FINISH GAME FULLSCREEN OVERLAY */}
      <AnimatePresence>
        {showFinishScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#020205]/98 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-2xl pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.8, y: 25 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 25 }}
              transition={{ type: "spring", damping: 15 }}
              className="max-w-md w-full bg-[#04040a] border border-cyan-500/25 p-8 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.2)] text-center flex flex-col items-center gap-6"
            >
              {/* Triumphant Medal badge */}
              <div className="w-20 h-20 rounded-full bg-cyan-500/10 border-2 border-cyan-400 flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(6,182,212,0.4)] animate-bounce">
                🏆
              </div>

              <div>
                <h2 className="text-4xl font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-emerald-400 italic filter drop-shadow-[0_2px_12px_rgba(6,182,212,0.3)]">
                  {isThai ? "ผ่านการฝึกตน!" : "TRAINING FINISHED!"}
                </h2>
                <p className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase mt-1 animate-pulse">
                  {isThai ? "คุณคือสุดยอดนักรบแห่งอารีน่า!" : "You are the Ultimate Arena Legend!"}
                </p>
              </div>

              <div className="w-full bg-slate-950/80 border border-white/5 p-5 rounded-2xl font-mono text-left text-xs space-y-3">
                <div className="flex justify-between border-b border-white/5 pb-2 text-slate-400">
                  <span>{isThai ? "นักรบที่สำเร็จการฝึก" : "Certified Warrior"}</span>
                  <span className="text-white font-bold">{selectedCharacter.avatar} {selectedCharacter.name}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2 text-slate-400">
                  <span>{isThai ? "คอมโบสูงสุดที่ทำได้" : "Max Combos Hits"}</span>
                  <span className="text-amber-400 font-bold">{comboCount} Hits</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2 text-slate-400">
                  <span>{isThai ? "ศัตรูที่ถูกกำจัด" : "Normal Threat Cleared"}</span>
                  <span className="text-cyan-400 font-bold">10+ {isThai ? "ตัว" : "Units"}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{isThai ? "สถานะการประลอง" : "Arena Evaluation"}</span>
                  <span className="text-emerald-400 font-black tracking-wider uppercase">{isThai ? "สำเร็จเสร็จสิ้น" : "MASTERED"}</span>
                </div>
              </div>

              <div className="flex gap-4 w-full">
                <button
                  onClick={handleResetDummies}
                  className="flex-1 py-3.5 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-white font-bold uppercase tracking-wider text-xs transition-all cursor-pointer"
                >
                  {isThai ? "เล่นใหม่อีกครั้ง" : "REPLAY GAME"}
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    onBack();
                  }}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-cyan-950/50 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  {isThai ? "กลับเมนูหลัก" : "RETURN TO TITLE"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
