import { useEffect, useMemo, useRef, useState } from "react";
import { Html, useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import type { AgentState } from "../lib/types";
import { flavorFor } from "./crewRoster";
import {
  CHARACTER_ASSETS,
  botHomeOffset,
  buildingForRoom,
  characterAssetFor,
  pathTo,
  stationWorld,
} from "./layout";
import { statusRingColor } from "./statusColor";

const WALK_SPEED = 3.6;

function destinationFor(agent: AgentState): {
  room: string;
  stationId: string | null;
  point: [number, number, number];
} {
  const stationId = agent.stationId ?? null;
  const room = agent.room || flavorFor(agent.id).homeRoom;
  if (stationId && stationWorld(stationId)) {
    return { room, stationId, point: stationWorld(stationId)! };
  }
  const status = (agent.status || "").toLowerCase();
  if (status === "idle" || status === "at_station") {
    return { room, stationId: null, point: botHomeOffset(agent.id) };
  }
  return {
    room,
    stationId: null,
    point: [
      buildingForRoom(room).position[0] * 0.72,
      0.08,
      buildingForRoom(room).position[2] * 0.72,
    ],
  };
}

function isWorking(status: string) {
  const s = status.toLowerCase();
  return s.includes("work") || s.includes("inspect") || s === "at_station" || s === "update";
}

export function Bot({
  agent,
  selected,
  onSelect,
}: {
  agent: AgentState;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const flavor = flavorFor(agent.id);
  const url = characterAssetFor(agent.id);
  const { scene, animations } = useGLTF(url);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, clone);

  const [phase, setPhase] = useState<"walk" | "idle" | "work">("idle");
  const pos = useRef(new THREE.Vector3());
  const facing = useRef(0);
  const ready = useRef(false);
  const waypoints = useRef<[number, number, number][]>([]);
  const destKey = useRef("");

  const dest = useMemo(
    () => destinationFor(agent),
    // Recompute when bridge moves this agent
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agent.room, agent.stationId, agent.status, agent.id, agent.detail]
  );

  useEffect(() => {
    const key = `${dest.room}|${dest.stationId ?? ""}|${dest.point.join(",")}`;
    if (key === destKey.current && ready.current) return;
    destKey.current = key;

    if (!ready.current) {
      waypoints.current = [dest.point];
      return;
    }

    const path = pathTo(pos.current, dest.room, dest.stationId);
    // If station/home point differs from room approach, ensure exact end
    const last = path[path.length - 1];
    if (
      !last ||
      Math.hypot(last[0] - dest.point[0], last[2] - dest.point[2]) > 0.15
    ) {
      path.push(dest.point);
    }
    waypoints.current = path;
    setPhase("walk");
  }, [dest]);

  useEffect(() => {
    const walk = actions.walk;
    const idle = actions.idle ?? actions.static;
    const work =
      actions["interact-right"] ??
      actions["interact-left"] ??
      actions["holding-right"] ??
      actions.idle;

    walk?.stop();
    idle?.stop();
    work?.stop();

    if (phase === "walk") {
      walk?.reset().fadeIn(0.18).play();
      if (walk) walk.setEffectiveTimeScale(1.2);
    } else if (phase === "work") {
      work?.reset().fadeIn(0.2).play();
    } else {
      idle?.reset().fadeIn(0.22).play();
    }

    return () => {
      walk?.fadeOut(0.08);
      idle?.fadeOut(0.08);
      work?.fadeOut(0.08);
    };
  }, [phase, actions]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;

    if (!ready.current) {
      pos.current.set(...dest.point);
      g.position.copy(pos.current);
      ready.current = true;
      setPhase(isWorking(agent.status) ? "work" : "idle");
      return;
    }

    const queue = waypoints.current;
    if (queue.length > 0) {
      const target = queue[0];
      const goal = new THREE.Vector3(target[0], target[1], target[2]);
      const dist = pos.current.distanceTo(goal);

      if (dist > 0.06) {
        if (phase !== "walk") setPhase("walk");
        const step = Math.min(1, (WALK_SPEED * dt) / dist);
        pos.current.lerp(goal, step);
        const dirx = goal.x - pos.current.x;
        const dirz = goal.z - pos.current.z;
        if (dirx * dirx + dirz * dirz > 1e-6) {
          facing.current = Math.atan2(dirx, dirz);
        }
        g.position.copy(pos.current);
        g.rotation.y = THREE.MathUtils.damp(g.rotation.y, facing.current, 10, dt);
      } else {
        pos.current.copy(goal);
        g.position.copy(goal);
        waypoints.current = queue.slice(1);
        if (waypoints.current.length === 0) {
          setPhase(isWorking(agent.status) ? "work" : "idle");
        }
      }
      return;
    }

    // Soft work bob when working in place
    if (isWorking(agent.status)) {
      if (phase !== "work") setPhase("work");
      g.position.y = dest.point[1] + Math.sin(performance.now() * 0.008) * 0.03;
    } else if (phase !== "idle" && phase !== "walk") {
      setPhase("idle");
      g.position.y = dest.point[1];
    }
  });

  const ring = statusRingColor(agent.status);
  const accent = agent.color || flavor.accent;
  const showBubble = Boolean(agent.bubble && String(agent.bubble).trim());
  const taskLine = agent.detail || flavor.tagline;

  return (
    <group
      ref={group}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(agent.id);
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <group scale={0.9}>
        <primitive object={clone} />
      </group>

      {/* Department accent orb */}
      <mesh position={[0.28, 1.05, 0.05]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <torusGeometry args={[0.42, 0.05, 8, 28]} />
        <meshStandardMaterial
          color={ring}
          emissive={ring}
          emissiveIntensity={selected ? 2.6 : 1.5}
          toneMapped={false}
          roughness={0.35}
        />
      </mesh>

      {phase === "work" ? (
        <mesh position={[0, 1.7, 0]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshStandardMaterial
            color="#4da3ff"
            emissive="#4da3ff"
            emissiveIntensity={2.8}
            toneMapped={false}
          />
        </mesh>
      ) : null}

      <Html position={[0, 1.7, 0]} center distanceFactor={13} style={{ pointerEvents: "none" }}>
        <div className={`bot-stack${selected ? " on" : ""}`}>
          <div className="bot-tag">
            <span className="bot-rank">{agent.rank || ""}</span> {agent.name}
          </div>
          {phase === "work" || isWorking(agent.status) ? (
            <div className="bot-task">{taskLine}</div>
          ) : null}
          {showBubble ? <div className="bot-bubble">{agent.bubble}</div> : null}
        </div>
      </Html>
    </group>
  );
}

for (const url of CHARACTER_ASSETS) {
  useGLTF.preload(url);
}
