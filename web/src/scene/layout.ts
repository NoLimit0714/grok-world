import { flavorFor } from "./crewRoster";

export const ROOM_IDS = [
  "bridge",
  "readyroom",
  "engineering",
  "sickbay",
  "tenforward",
  "holodeck",
] as const;

export type RoomId = (typeof ROOM_IDS)[number];

export interface BuildingLayout {
  id: RoomId;
  label: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
  asset: string;
  glowColor: string;
  district: string;
}

/** Island districts — one building per bridge room id. */
export const BUILDINGS: BuildingLayout[] = [
  {
    id: "bridge",
    label: "Bridge Spire",
    position: [0, 0.15, -8.2],
    rotation: 0,
    scale: 1.7,
    asset: "/assets/buildings/bridge.glb",
    glowColor: "#7ec8ff",
    district: "Command Rise",
  },
  {
    id: "readyroom",
    label: "Ready Loft",
    position: [-7.2, 0.15, -4.2],
    rotation: Math.PI * 0.18,
    scale: 1.4,
    asset: "/assets/buildings/readyroom.glb",
    glowColor: "#f0b27a",
    district: "Command Rise",
  },
  {
    id: "engineering",
    label: "Core Works",
    position: [7.4, 0.15, -3.8],
    rotation: -Math.PI * 0.22,
    scale: 1.55,
    asset: "/assets/buildings/engineering.glb",
    glowColor: "#ff9f43",
    district: "Forge Ward",
  },
  {
    id: "sickbay",
    label: "Care Dome",
    position: [-7.8, 0.15, 3.8],
    rotation: Math.PI * 0.62,
    scale: 1.55,
    asset: "/assets/buildings/sickbay.glb",
    glowColor: "#7dffb3",
    district: "Wellspring",
  },
  {
    id: "tenforward",
    label: "Sky Lounge",
    position: [0.2, 0.15, 4.2],
    rotation: Math.PI,
    scale: 1.65,
    asset: "/assets/buildings/tenforward.glb",
    glowColor: "#e8a0ff",
    district: "Harbor Plaza",
  },
  {
    id: "holodeck",
    label: "Dream Gate",
    position: [8.0, 0.15, 4.8],
    rotation: -Math.PI * 0.55,
    scale: 1.45,
    asset: "/assets/buildings/holodeck.glb",
    glowColor: "#5eead4",
    district: "Dream Reach",
  },
];

export const BUILDING_BY_ID = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b])
) as Record<RoomId, BuildingLayout>;

export function buildingForRoom(room: string): BuildingLayout {
  return BUILDING_BY_ID[room as RoomId] ?? BUILDINGS[0];
}

/** Work stations from the bridge, placed in 3D around each building. */
export const STATION_WORLD: Record<string, [number, number, number]> = {
  bridge_ops: [-1.6, 0.08, -6.4],
  bridge_tactical: [1.7, 0.08, -6.6],
  ready_desk: [-5.6, 0.08, -3.4],
  eng_core: [5.8, 0.08, -2.6],
  eng_diag: [7.0, 0.08, -5.0],
  sick_biobed: [-6.2, 0.08, 2.6],
  sick_lab: [-8.4, 0.08, 5.0],
  tf_bar: [-1.4, 0.08, 3.2],
  holo_arch: [6.4, 0.08, 3.6],
  holo_grid: [8.6, 0.08, 6.0],
};

/** Central plaza + path hubs for walking routes between districts. */
export const PATH_NODES: Record<string, [number, number, number]> = {
  plaza: [0, 0.08, 0],
  north: [0, 0.08, -4.2],
  east: [4.2, 0.08, 0],
  west: [-4.2, 0.08, 0],
  south: [0, 0.08, 3.2],
  ne: [3.6, 0.08, -3.2],
  nw: [-3.6, 0.08, -3.2],
  se: [3.8, 0.08, 3.4],
  sw: [-3.8, 0.08, 3.4],
};

const ROOM_GATE: Record<string, string> = {
  bridge: "north",
  readyroom: "nw",
  engineering: "ne",
  sickbay: "sw",
  tenforward: "south",
  holodeck: "se",
};

export function stationWorld(stationId?: string | null): [number, number, number] | null {
  if (!stationId) return null;
  return STATION_WORLD[stationId] ?? null;
}

export function roomApproach(room: string): [number, number, number] {
  const b = buildingForRoom(room);
  return [b.position[0] * 0.72, 0.08, b.position[2] * 0.72];
}

/** Build a short waypoint path from A → destination (room / station). */
export function pathTo(
  from: [number, number, number] | { x: number; y: number; z: number },
  destRoom: string,
  stationId?: string | null
): [number, number, number][] {
  const end = stationWorld(stationId) ?? roomApproach(destRoom);
  const gate = PATH_NODES[ROOM_GATE[destRoom] ?? "plaza"] ?? PATH_NODES.plaza;
  const plaza = PATH_NODES.plaza;
  const start: [number, number, number] = Array.isArray(from)
    ? from
    : [from.x, from.y, from.z];

  const nearPlaza =
    Math.hypot(start[0] - plaza[0], start[2] - plaza[2]) < 2.2 &&
    Math.hypot(end[0] - plaza[0], end[2] - plaza[2]) < 5;

  if (nearPlaza) return [end];

  const sameDistrict =
    Math.hypot(start[0] - end[0], start[2] - end[2]) < 4.5;

  if (sameDistrict) return [end];

  return [plaza, gate, end];
}

export function botHomeOffset(agentId: string): [number, number, number] {
  const flavor = flavorFor(agentId);
  const home = buildingForRoom(flavor.homeRoom).position;
  const hash = [...agentId].reduce((a, c) => a + c.charCodeAt(0), 0);
  const a = (hash % 7) * 0.55 + 0.4;
  const r = 1.1 + (hash % 5) * 0.15;
  return [home[0] + Math.cos(a) * r, 0.08, home[2] + Math.sin(a) * r];
}

export function characterAssetFor(agentId: string): string {
  return flavorFor(agentId).asset;
}

export const CHARACTER_ASSETS = [
  "/assets/characters/character-male-a.glb",
  "/assets/characters/character-male-b.glb",
  "/assets/characters/character-male-c.glb",
  "/assets/characters/character-female-a.glb",
  "/assets/characters/character-female-b.glb",
  "/assets/characters/character-female-c.glb",
] as const;

export function botSlotOffset(agentId: string, indexInRoom: number): [number, number, number] {
  const angle = (indexInRoom * 1.1 + agentId.length * 0.17) % (Math.PI * 2);
  const r = 1.35 + (indexInRoom % 3) * 0.35;
  return [Math.cos(angle) * r, 0, Math.sin(angle) * r];
}
