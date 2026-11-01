import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { BotPanel } from "../components/BotPanel";
import type { AgentState, StatusEvent, WorldAction } from "../lib/types";
import { Building } from "./Building";
import { Bot } from "./Bot";
import { CameraRig } from "./CameraRig";
import { CityDressing } from "./CityDressing";
import { CREW_SET } from "./crewRoster";
import { DuskSky } from "./DuskSky";
import { Island } from "./Island";
import { BUILDINGS } from "./layout";

export function IslandScene(props: {
  agents: AgentState[];
  status: StatusEvent | null;
  actions: WorldAction[];
  connected: boolean;
  error: string | null;
}) {
  const [focus, setFocus] = useState<[number, number, number] | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [selectedBot, setSelectedBot] = useState<string | null>("grok");

  const crew = useMemo(
    () => props.agents.filter((a) => CREW_SET.has(a.id)),
    [props.agents]
  );

  const selectedAgent =
    crew.find((a) => a.id === selectedBot) ?? crew.find((a) => a.id === "grok") ?? crew[0] ?? null;

  return (
    <div className="island-root">
      <Canvas
        className="island-canvas"
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        camera={{ fov: 42, near: 0.1, far: 200, position: [16, 13, 16] }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 0.95;
        }}
        onPointerMissed={() => {
          setSelectedBuilding(null);
        }}
      >
        <color attach="background" args={["#1a1235"]} />
        <fog attach="fog" args={["#4a2f6e", 18, 58]} />

        <hemisphereLight args={["#ffc49a", "#241848", 0.75]} />
        <directionalLight position={[-10, 6, -6]} intensity={1.2} color="#ff9a62" />
        <directionalLight position={[5, 3, 9]} intensity={0.4} color="#7a8fff" />
        <ambientLight intensity={0.28} color="#5a4a78" />
        <pointLight position={[0, 2.5, 0]} intensity={0.45} color="#ffb27a" distance={28} />

        <DuskSky />

        <Suspense fallback={null}>
          <Island />
          <CityDressing />
          {BUILDINGS.map((b) => (
            <Building
              key={b.id}
              layout={b}
              selected={selectedBuilding === b.id}
              onSelect={(id, position) => {
                setSelectedBuilding(id);
                setFocus(position);
              }}
            />
          ))}
          {crew.map((a) => (
            <Bot
              key={a.id}
              agent={a}
              selected={selectedAgent?.id === a.id}
              onSelect={(id) => {
                setSelectedBot(id);
                const agent = crew.find((x) => x.id === id);
                if (!agent) return;
                const b = BUILDINGS.find((x) => x.id === agent.room);
                if (b) setFocus(b.position);
              }}
            />
          ))}
        </Suspense>

        <CameraRig focus={focus} />

        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom
            luminanceThreshold={0.82}
            luminanceSmoothing={0.28}
            intensity={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

      <BotPanel
        agent={selectedAgent}
        agents={crew}
        status={props.status}
        actions={props.actions}
        connected={props.connected}
        error={props.error}
        onSelectAgent={(id) => {
          setSelectedBot(id);
          const agent = crew.find((x) => x.id === id);
          const b = agent && BUILDINGS.find((x) => x.id === agent.room);
          if (b) setFocus(b.position);
        }}
      />
    </div>
  );
}
