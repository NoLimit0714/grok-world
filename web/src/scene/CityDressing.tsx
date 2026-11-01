import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { BUILDINGS, PATH_NODES, STATION_WORLD } from "./layout";

function Prop({
  url,
  position,
  scale = 1,
  rotation = 0,
}: {
  url: string;
  position: [number, number, number];
  scale?: number;
  rotation?: number;
}) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return (
    <primitive object={cloned} position={position} scale={scale} rotation={[0, rotation, 0]} />
  );
}

function PathRibbon({
  a,
  b,
  color = "#c4a27a",
}: {
  a: [number, number, number];
  b: [number, number, number];
  color?: string;
}) {
  const mid: [number, number, number] = [(a[0] + b[0]) / 2, 0.05, (a[2] + b[2]) / 2];
  const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const rot = Math.atan2(b[0] - a[0], b[2] - a[2]);
  return (
    <mesh position={mid} rotation={[-Math.PI / 2, 0, -rot]}>
      <planeGeometry args={[0.55, len]} />
      <meshStandardMaterial color={color} roughness={0.95} metalness={0.05} />
    </mesh>
  );
}

function Lamp({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 1.1, 6]} />
        <meshStandardMaterial color="#3a3348" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function StationPad({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.04, position[2]]}>
      <circleGeometry args={[0.55, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.35}
        transparent
        opacity={0.55}
        toneMapped={false}
      />
    </mesh>
  );
}

export function CityDressing() {
  const plaza = PATH_NODES.plaza;
  const segments: [keyof typeof PATH_NODES, keyof typeof PATH_NODES][] = [
    ["plaza", "north"],
    ["plaza", "south"],
    ["plaza", "east"],
    ["plaza", "west"],
    ["north", "ne"],
    ["north", "nw"],
    ["south", "se"],
    ["south", "sw"],
    ["east", "ne"],
    ["east", "se"],
    ["west", "nw"],
    ["west", "sw"],
  ];

  return (
    <group>
      {/* Harbor plaza disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[plaza[0], 0.07, plaza[2]]}>
        <circleGeometry args={[2.6, 40]} />
        <meshStandardMaterial color="#6d5a48" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[plaza[0], 0.09, plaza[2]]}>
        <ringGeometry args={[1.1, 1.35, 32]} />
        <meshStandardMaterial
          color="#ffb27a"
          emissive="#ff9a62"
          emissiveIntensity={0.8}
          toneMapped={false}
        />
      </mesh>
      {/* Glow crystal / city heart */}
      <mesh position={[0, 0.85, 0]}>
        <octahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial
          color="#ffc49a"
          emissive="#ff8a4a"
          emissiveIntensity={2.4}
          toneMapped={false}
          roughness={0.25}
          metalness={0.4}
        />
      </mesh>
      <pointLight position={[0, 1.4, 0]} intensity={1.1} color="#ffb27a" distance={14} />

      {segments.map(([a, b]) => (
        <PathRibbon key={`${a}-${b}`} a={PATH_NODES[a]} b={PATH_NODES[b]} />
      ))}

      {BUILDINGS.map((b) => {
        const gateKey =
          b.id === "bridge"
            ? "north"
            : b.id === "tenforward"
              ? "south"
              : b.id === "engineering"
                ? "ne"
                : b.id === "holodeck"
                  ? "se"
                  : b.id === "readyroom"
                    ? "nw"
                    : "sw";
        return (
          <PathRibbon
            key={`gate-${b.id}`}
            a={PATH_NODES[gateKey]}
            b={[b.position[0] * 0.78, 0.05, b.position[2] * 0.78]}
            color="#a89070"
          />
        );
      })}

      {Object.entries(STATION_WORLD).map(([id, pos]) => {
        const room =
          (id.startsWith("bridge") && BUILDINGS.find((b) => b.id === "bridge")) ||
          (id.startsWith("ready") && BUILDINGS.find((b) => b.id === "readyroom")) ||
          (id.startsWith("eng") && BUILDINGS.find((b) => b.id === "engineering")) ||
          (id.startsWith("sick") && BUILDINGS.find((b) => b.id === "sickbay")) ||
          (id.startsWith("tf") && BUILDINGS.find((b) => b.id === "tenforward")) ||
          (id.startsWith("holo") && BUILDINGS.find((b) => b.id === "holodeck")) ||
          BUILDINGS[0];
        return <StationPad key={id} position={pos} color={room.glowColor} />;
      })}

      <Lamp position={[-2.2, 0, -2.2]} color="#ffb27a" />
      <Lamp position={[2.2, 0, -2.2]} color="#7ec8ff" />
      <Lamp position={[-2.2, 0, 2.2]} color="#7dffb3" />
      <Lamp position={[2.2, 0, 2.2]} color="#e8a0ff" />
      <Lamp position={[0, 0, -5.5]} color="#7ec8ff" />
      <Lamp position={[6.2, 0, 0]} color="#ff9f43" />

      <Prop url="/assets/buildings/platform.glb" position={[0, 0.02, 0]} scale={1.8} />
      <Prop url="/assets/buildings/satellite.glb" position={[10.5, 0.2, -7]} scale={1.2} rotation={0.4} />
      <Prop url="/assets/buildings/satellite.glb" position={[-10.2, 0.2, 6.5]} scale={1.0} rotation={2.1} />
      <Prop url="/assets/nature/tree_palm.glb" position={[-5.5, 0.1, 0.5]} scale={1.15} />
      <Prop url="/assets/nature/tree_oak.glb" position={[5.2, 0.1, 1.2]} scale={1.1} />
      <Prop url="/assets/nature/rock_largeA.glb" position={[0.8, 0.1, -10.5]} scale={1.5} />
    </group>
  );
}

useGLTF.preload("/assets/buildings/platform.glb");
useGLTF.preload("/assets/buildings/satellite.glb");
